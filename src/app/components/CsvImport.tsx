import React, { useState } from 'react';
import { Upload, X, FileSpreadsheet, Download, Trash2, Loader2 } from 'lucide-react';
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

// Same order as the paper Graduate Tracer Survey Form
const TEMPLATE_HEADERS = [
  'Last Name', 'Given Name', 'Middle Name', 'Present Address', 'Permanent Address', 'Sex', 'Date of Birth',
  'Civil Status', 'Mobile No.', 'Email Address', 'Facebook', 'Twitter', 'Program', 'Year Graduated', 'Campus',
  'Employment Status', 'Complete Name of Organization', 'Company Address', 'Company Contact No.', 'Job Title',
  'Job Description', 'Length of Service', 'Type of Company', 'Nature of Employment', 'Suggestions',
];

const THIS_YEAR = new Date().getFullYear();
const key = (r: { lastName: string; givenName: string; course: string | null; yearGraduated: number }) =>
  `${r.lastName}|${r.givenName}|${r.course}|${r.yearGraduated}`.toUpperCase();

/** One uploaded file and the choices made for it. */
interface FileEntry {
  id: string;
  name: string;
  rows: ParsedRow[];
  problem: string;
  format: string;
  skipped: number;
  year: number;
  hasYearColumn: boolean;
  program: Course;
}

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
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);

  const update = (id: string, patch: Partial<FileEntry>) => setFiles((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  /** Reads one file into rows, or explains why it can't be imported. */
  const readFile = async (file: File): Promise<FileEntry> => {
    const guessYear = yearFromFileName(file.name) || THIS_YEAR;
    const entry: FileEntry = {
      id: crypto.randomUUID(),
      name: file.name,
      rows: [],
      problem: '',
      format: '',
      skipped: 0,
      year: guessYear,
      hasYearColumn: false,
      program: scope || 'BSIT',
    };
    let table: Cell[][];
    try {
      table = await readTable(file);
    } catch (err: any) {
      return { ...entry, problem: err.message || 'Could not read this file.' };
    }
    const result = parseTracerTable(table, { defaultYear: guessYear, fileName: file.name });
    if (!result.rows.length) {
      return { ...entry, problem: 'No graduates were found in this file. Make sure it has a "Name of Graduate" column or First/Last Name columns.' };
    }
    // Program chairs can only import their own program's graduates. The file must say which
    // program it is for (a program column, or the program in the file name, e.g. BSIT_2025.xlsx).
    if (scope) {
      const others = result.programsFound.filter((p) => p !== scope);
      if (others.length) {
        const n = result.rows.filter((r) => r.course && r.course !== scope).length;
        return {
          ...entry,
          problem: `This file contains ${n} graduate${n === 1 ? '' : 's'} from ${others.join(', ')}. You can only import ${scope} records.`,
        };
      }
      if (result.unknownProgram > 0) {
        return {
          ...entry,
          problem: `This file doesn't say which program its graduates are from. Add a "Program" column, or put ${scope} in the file name (for example ${scope}_${THIS_YEAR}.xlsx).`,
        };
      }
    }
    const fileProgram = result.programsFound.length === 1 ? result.programsFound[0] : null;
    return {
      ...entry,
      rows: result.rows,
      format: result.format,
      skipped: result.skipped,
      hasYearColumn: result.rows.some((r) => r.yearGraduated !== guessYear),
      program: scope || fileProgram || 'BSIT',
    };
  };

  const addFiles = async (list: FileList | File[] | null) => {
    const picked = Array.from(list || []).filter((f) => /\.(xlsx|xls|csv)$/i.test(f.name));
    if (!picked.length) return;
    setReading(true);
    const entries: FileEntry[] = [];
    for (const f of picked) entries.push(await readFile(f));
    setFiles((cur) => [...cur, ...entries]);
    setReading(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    addFiles(list);
  };

  // Apply each file's year/program, and leave out graduates already in the system or repeated
  // in another file
  const existingKeys = new Set(existing.map((r) => key(r)));
  const existingEmails = new Set(existing.map((r) => (r.email || '').toLowerCase()).filter(Boolean));
  const seenKeys = new Set<string>();
  const seenEmails = new Set<string>();
  const perFile = files.map((f) => {
    const finalRows = f.rows.map((r) => ({
      ...r,
      course: (scope || r.course || f.program) as Course,
      yearGraduated: f.hasYearColumn ? r.yearGraduated : f.year,
    }));
    const ready = finalRows.filter((r) => {
      const k = key(r);
      const dup = existingKeys.has(k) || seenKeys.has(k) || (!!r.email && (existingEmails.has(r.email) || seenEmails.has(r.email)));
      seenKeys.add(k);
      if (r.email) seenEmails.add(r.email);
      return !dup;
    });
    return { file: f, ready, duplicates: finalRows.length - ready.length };
  });
  const toImport = perFile.flatMap((p) => p.ready.map((r) => ({ ...r, fileName: p.file.name })));
  // Rows without a birthday or sex: sign-up matches them by name and fills the missing details in
  const missingSignUp = toImport.filter((r) => !r.dateOfBirth || !r.sex).length;
  const duplicates = perFile.reduce((n, p) => n + p.duplicates, 0);
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
            employerAddress: r.employerAddress || undefined,
            employerContact: r.employerContact || undefined,
            lengthOfService: r.lengthOfService || undefined,
            jobDescription: r.jobDescription || undefined,
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
          permanentAddress: r.permanentAddress || r.presentAddress,
          campus: r.campus,
          twitter: r.twitter,
          fatherName: r.fatherName,
          fatherContact: r.fatherContact,
          motherName: r.motherName,
          motherContact: r.motherContact,
          facebookName: r.facebookName,
          status: r.status,
          currentPosition: job?.position,
          currentCompany: job?.company,
          employerType: job?.employerType,
          employerAddress: job?.employerAddress,
          employerContact: job?.employerContact,
          lengthOfService: job?.lengthOfService,
          jobDescription: job?.jobDescription,
          employmentHistory: job ? [job] : [],
          isIP: r.isIP,
          suggestions: r.suggestions,
          lastUpdated: now,
          importedFrom: r.fileName,
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
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-lg">Import graduates</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload one or more official Graduate Tracer Excel sheets (.xlsx), or Google Forms / spreadsheet exports (.csv).
              {scope && ` Only ${scope} graduates are accepted.`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 cursor-pointer hover:bg-muted/40 ${
            dragging ? 'border-primary bg-muted/40' : 'border-border'
          }`}
        >
          <input
            type="file"
            multiple
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFile}
            className="hidden"
          />
          {reading ? <Loader2 className="text-primary animate-spin" size={28} /> : <Upload className="text-muted-foreground" size={28} />}
          <span className="text-sm font-medium text-center">
            {reading ? 'Reading files...' : files.length ? 'Add more files' : 'Choose or drop Excel (.xlsx) or CSV files'}
          </span>
          <span className="text-xs text-muted-foreground">You can pick several files at once.</span>
        </label>

        {files.length > 0 && (
          <div className="space-y-3">
            {perFile.map(({ file: f, ready, duplicates: dup }) => (
              <div key={f.id} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className={f.problem ? 'text-red-600 shrink-0' : 'text-primary shrink-0'} size={20} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{f.name}</p>
                    {f.problem ? (
                      <p className="text-xs text-red-700 mt-0.5">{f.problem}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ready.length} to import{dup > 0 ? ` · ${dup} already in the system` : ''}
                        {f.format === 'tracer-sheet' ? ' · official Graduate Tracer sheet' : ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setFiles((list) => list.filter((x) => x.id !== f.id))}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
                    aria-label={`Remove ${f.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                {!f.problem && (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-medium">Year graduated</span>
                      {f.hasYearColumn ? (
                        <p className="mt-1 text-sm text-muted-foreground">Taken from the file</p>
                      ) : (
                        <select value={f.year} onChange={(e) => update(f.id, { year: Number(e.target.value) })} className="mt-1 w-full filter-select">
                          {Array.from({ length: THIS_YEAR - 1999 }, (_, i) => THIS_YEAR - i).map((y) => (
                            <option key={y} value={y}>
                              {y - 1}-{y}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium">Program</span>
                      {scope || f.rows.every((r) => r.course) ? (
                        <p className="mt-1 text-sm text-muted-foreground">{scope || [...new Set(f.rows.map((r) => r.course))].join(', ')}</p>
                      ) : (
                        <select value={f.program} onChange={(e) => update(f.id, { program: e.target.value as Course })} className="mt-1 w-full filter-select">
                          {PROGRAMS.map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.code}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>
                  </div>
                )}
              </div>
            ))}

            {toImport.length > 0 && (
              <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-1">
                <p className="font-semibold">
                  {toImport.length} graduates ready to import from {perFile.filter((p) => p.ready.length).length} file
                  {perFile.filter((p) => p.ready.length).length === 1 ? '' : 's'}
                </p>
                <p className="text-muted-foreground">
                  {counts.employed} employed · {counts.unemployed} unemployed · {counts.notTracked} not tracked (no status yet)
                </p>
                {duplicates > 0 && <p className="text-muted-foreground">{duplicates} already in the system or repeated in another file will be skipped.</p>}
                {missingSignUp > 0 && (
                  <p className="text-muted-foreground">
                    {missingSignUp} have no birthday or sex in the file. They can still create an account with their first and last name, and the birthday and sex they enter are then saved to their record.
                  </p>
                )}
              </div>
            )}
          </div>
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
