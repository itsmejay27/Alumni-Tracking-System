import React, { useState } from 'react';
import { Upload, X, FileSpreadsheet, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { AlumniRecord, Course } from '@/lib/alumni';
import { PROGRAMS } from '@/lib/programs';
import { Cell, ParsedRow, parseTracerTable, yearFromFileName } from '@/lib/importParser';

/** Minimal CSV parser that handles quoted fields, commas and new lines inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function readTable(file: File): Promise<Cell[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import('read-excel-file/browser');
    return (await readSheet(file)) as Cell[][];
  }
  if (/\.xls$/i.test(file.name)) throw new Error('Old .xls files are not supported. In Excel, use File → Save As → Excel Workbook (.xlsx).');
  return parseCsv(await file.text());
}

const TEMPLATE_HEADERS = [
  'Last Name', 'First Name', 'Middle Name', 'Email', 'Program', 'Year Graduated', 'Sex', 'Date of Birth',
  'Civil Status', 'Mobile Number', 'Present Address', 'Employment Status', 'Position', 'Company',
  'Employer Type', 'Job Level', 'Nature of Employment', 'Indigenous Peoples (IP) Member', 'Suggestions',
];

const THIS_YEAR = new Date().getFullYear();
const key = (r: { lastName: string; givenName: string; course: string | null; yearGraduated: number }) =>
  `${r.lastName}|${r.givenName}|${r.course}|${r.yearGraduated}`.toUpperCase();

export function CsvImport({
  scope,
  existing,
  onDone,
  onClose,
}: {
  scope: Course | null;
  existing: AlumniRecord[];
  onDone: () => void;
  onClose: () => void;
}) {
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [problem, setProblem] = useState('');
  const [info, setInfo] = useState<{ format: string; skipped: number } | null>(null);
  const [defaultProgram, setDefaultProgram] = useState<Course>(scope || 'BSIT');
  const [year, setYear] = useState<number>(THIS_YEAR);
  const [hasYearColumn, setHasYearColumn] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileName(file.name);
    setParsed([]);
    setProblem('');
    setInfo(null);

    let table: Cell[][];
    try {
      table = await readTable(file);
    } catch (err: any) {
      setProblem(err.message || 'Could not read this file.');
      return;
    }

    const guessYear = yearFromFileName(file.name) || THIS_YEAR;
    const result = parseTracerTable(table, { defaultYear: guessYear, fileName: file.name });
    if (!result.rows.length) {
      setProblem('No graduates were found in this file. Make sure it has a "Name of Graduate" column or First/Last Name columns.');
      return;
    }

    // Program chairs can only import their own program's graduates
    if (scope) {
      const others = result.programsFound.filter((p) => p !== scope);
      if (others.length) {
        const n = result.rows.filter((r) => r.course && r.course !== scope).length;
        setProblem(
          `This file contains ${n} graduate${n === 1 ? '' : 's'} from ${others.join(', ')}. You can only import ${scope} records. Upload a file that has ${scope} graduates only.`
        );
        return;
      }
    }

    setHasYearColumn(result.rows.some((r) => r.yearGraduated !== guessYear));
    setYear(guessYear);
    setParsed(result.rows);
    setInfo({ format: result.format, skipped: result.skipped });
  };

  // Apply the chosen year/program, and leave out graduates already in the system
  const finalRows = parsed.map((r) => ({
    ...r,
    course: (scope || r.course || defaultProgram) as Course,
    yearGraduated: hasYearColumn ? r.yearGraduated : year,
  }));
  const existingKeys = new Set(existing.map((r) => key(r)));
  const existingEmails = new Set(existing.map((r) => (r.email || '').toLowerCase()).filter(Boolean));
  const toImport = finalRows.filter((r) => !existingKeys.has(key(r)) && !(r.email && existingEmails.has(r.email)));
  const duplicates = finalRows.length - toImport.length;
  const counts = {
    employed: toImport.filter((r) => r.status === 'Employed' || r.status === 'Self-Employed').length,
    unemployed: toImport.filter((r) => r.status === 'Unemployed').length,
    notTracked: toImport.filter((r) => r.status === 'Not Tracked').length,
  };

  const runImport = async () => {
    setImporting(true);
    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const payload = toImport.map((r) => {
      const employed = r.status === 'Employed' || r.status === 'Self-Employed';
      const job = employed
        ? {
            id: crypto.randomUUID(),
            position: r.position,
            company: r.company,
            employerType: /gov/i.test(r.employerType) ? 'Government' : r.employerType || 'Private',
            employmentStatus: r.employmentType || (r.status === 'Self-Employed' ? 'Self-Employed' : ''),
            jobLevel: r.jobLevel || 'Rank and File',
            recordedAt: new Date().toISOString(),
          }
        : null;
      return {
        email: r.email,
        course: r.course,
        batch: `${r.yearGraduated - 1}-${r.yearGraduated}`,
        data: {
          givenName: r.givenName,
          middleName: r.middleName,
          lastName: r.lastName,
          email: r.email || '',
          yearGraduated: r.yearGraduated,
          sex: r.sex,
          dateOfBirth: r.dateOfBirth,
          civilStatus: r.civilStatus,
          mobileNo: r.mobileNo,
          presentAddress: r.presentAddress,
          permanentAddress: r.presentAddress,
          facebookName: '',
          status: r.status,
          currentPosition: job?.position,
          currentCompany: job?.company,
          employerType: job?.employerType,
          jobLevel: job?.jobLevel,
          employmentHistory: job ? [job] : [],
          isIP: r.isIP,
          suggestions: r.suggestions,
          lastUpdated: now,
          importedFrom: fileName,
        },
      };
    });

    let done = 0;
    for (let i = 0; i < payload.length; i += 200) {
      const chunk = payload.slice(i, i + 200);
      const { error } = await supabase.from('alumni_records').insert(chunk);
      if (error) {
        toast.error(`Stopped after ${done} records: ${error.message}`);
        setImporting(false);
        if (done) onDone();
        return;
      }
      done += chunk.length;
    }
    setImporting(false);
    toast.success(`Imported ${done} graduates`);
    onDone();
    onClose();
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_HEADERS.join(',') + '\n'], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'OMSU_Tracer_Import_Template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-lg">Import graduates</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload the official Graduate Tracer Excel sheet (.xlsx), or a Google Forms / spreadsheet export (.csv).
              {scope && ` Only ${scope} graduates are accepted.`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 cursor-pointer hover:bg-muted/40">
          <input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFile} className="hidden" />
          {fileName ? <FileSpreadsheet className="text-primary" size={28} /> : <Upload className="text-muted-foreground" size={28} />}
          <span className="text-sm font-medium">{fileName || 'Choose an Excel (.xlsx) or CSV file'}</span>
        </label>

        {problem && (
          <div className="flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <p>{problem}</p>
          </div>
        )}

        {parsed.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium">Year graduated</span>
                {hasYearColumn ? (
                  <p className="mt-1.5 text-sm text-muted-foreground">Taken from the file</p>
                ) : (
                  <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="mt-1.5 w-full filter-select">
                    {Array.from({ length: THIS_YEAR - 1999 }, (_, i) => THIS_YEAR - i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                )}
              </label>
              <label className="block">
                <span className="text-sm font-medium">Program</span>
                {scope || parsed.every((r) => r.course) ? (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {scope || [...new Set(parsed.map((r) => r.course))].join(', ')}
                  </p>
                ) : (
                  <select value={defaultProgram} onChange={(e) => setDefaultProgram(e.target.value as Course)} className="mt-1.5 w-full filter-select">
                    {PROGRAMS.map((p) => <option key={p.code} value={p.code}>{p.code}</option>)}
                  </select>
                )}
              </label>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-1">
              <p className="font-semibold">{toImport.length} graduates ready to import</p>
              <p className="text-muted-foreground">
                {counts.employed} employed · {counts.unemployed} unemployed · {counts.notTracked} not tracked (no status yet)
              </p>
              {duplicates > 0 && <p className="text-muted-foreground">{duplicates} already in the system will be skipped.</p>}
              {info?.format === 'tracer-sheet' && <p className="text-muted-foreground">Read as the official Graduate Tracer sheet.</p>}
            </div>
          </>
        )}

        <button onClick={downloadTemplate} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <Download size={15} /> Download a CSV template
        </button>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium bg-muted">Cancel</button>
          <button
            onClick={runImport}
            disabled={!toImport.length || importing}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50"
          >
            {importing ? 'Importing...' : `Import ${toImport.length || ''} graduates`}
          </button>
        </div>
      </div>
    </div>
  );
}
