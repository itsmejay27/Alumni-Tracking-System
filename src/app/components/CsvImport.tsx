import React, { useState } from 'react';
import { Upload, X, FileSpreadsheet, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Course } from '@/lib/alumni';
import { PROGRAMS } from '@/lib/programs';

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
  return rows.filter((r) => r.some((v) => v.trim()));
}

// Which CSV header (lower-cased, partial match) fills which field. Covers the
// template below and typical Google Form question wording.
const COLUMNS: { key: string; match: string[] }[] = [
  { key: 'lastName', match: ['last name', 'surname', 'family name'] },
  { key: 'givenName', match: ['first name', 'given name'] },
  { key: 'middleName', match: ['middle name', 'middle initial'] },
  { key: 'email', match: ['email'] },
  { key: 'program', match: ['program', 'course', 'degree'] },
  { key: 'yearGraduated', match: ['year graduated', 'graduated', 'batch', 'academic year'] },
  { key: 'sex', match: ['sex', 'gender'] },
  { key: 'dateOfBirth', match: ['birth'] },
  { key: 'civilStatus', match: ['civil status'] },
  { key: 'mobileNo', match: ['mobile', 'contact number', 'phone'] },
  { key: 'presentAddress', match: ['present address', 'address'] },
  { key: 'employerType', match: ['employer type', 'type of employer', 'sector', 'company type'] },
  { key: 'employmentType', match: ['nature of employment', 'employment type', 'permanent'] },
  { key: 'jobLevel', match: ['job level', 'level'] },
  { key: 'status', match: ['employment status', 'are you employed', 'currently employed', 'status'] },
  { key: 'position', match: ['position', 'job title', 'designation'] },
  { key: 'company', match: ['company', 'employer', 'agency', 'organization'] },
  { key: 'isIP', match: ['indigenous', 'ip member', 'ips'] },
  { key: 'suggestions', match: ['suggestion', 'feedback', 'comment'] },
];

const TEMPLATE_HEADERS = [
  'Last Name', 'First Name', 'Middle Name', 'Email', 'Program', 'Year Graduated', 'Sex', 'Date of Birth',
  'Civil Status', 'Mobile Number', 'Present Address', 'Employment Status', 'Position', 'Company',
  'Employer Type', 'Job Level', 'Nature of Employment', 'Indigenous Peoples (IP) Member', 'Suggestions',
];

function mapHeaders(headers: string[]) {
  const used = new Set<number>();
  const map: Record<string, number> = {};
  for (const col of COLUMNS) {
    const idx = headers.findIndex((h, i) => !used.has(i) && col.match.some((m) => h.toLowerCase().includes(m)));
    if (idx >= 0) {
      map[col.key] = idx;
      used.add(idx);
    }
  }
  return map;
}

function toProgram(v: string): Course | null {
  const s = v.toUpperCase();
  if (s.includes('INFORMATION TECH') || /\bBSIT\b/.test(s)) return 'BSIT';
  if (s.includes('ELEMENTARY') || /\bBEED\b/.test(s)) return 'BEED';
  if (s.includes('FINANCIAL') || s.includes('BSBA-FM') || s.includes('BSBA FM')) return 'BSBA-FM';
  if (s.includes('OPERATION') || s.includes('BSBA-OM') || s.includes('BSBA OM')) return 'BSBA-OM';
  if (s.includes('OFFICE ADMIN') || /\bBSOA\b/.test(s)) return 'BSOA';
  return null;
}

function toStatus(v: string) {
  const s = v.toLowerCase();
  if (s.includes('self')) return 'Self-Employed';
  if (s.includes('unemployed') || s === 'no' || s.includes('not employed')) return 'Unemployed';
  if (s.includes('employed') || s === 'yes') return 'Employed';
  return 'Unemployed';
}

function toYear(v: string) {
  const years = v.match(/\d{4}/g);
  return years ? Number(years[years.length - 1]) : 0;
}

export function CsvImport({ scope, onDone, onClose }: { scope: Course | null; onDone: () => void; onClose: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [fileName, setFileName] = useState('');
  const [defaultProgram, setDefaultProgram] = useState<Course>(scope || 'BSIT');
  const [importing, setImporting] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileName(file.name);
    const table = parseCsv(await file.text());
    if (table.length < 2) {
      toast.error('That file has no data rows');
      return;
    }
    const [headers, ...data] = table;
    const m = mapHeaders(headers);
    if (m.lastName == null && m.givenName == null) {
      toast.error('Could not find name columns. Use the template headers.');
      return;
    }
    const get = (r: string[], k: string) => (m[k] != null ? (r[m[k]] || '').trim() : '');
    let skip = 0;
    const parsed = data
      .map((r) => {
        const givenName = get(r, 'givenName').toUpperCase();
        const lastName = get(r, 'lastName').toUpperCase();
        if (!givenName && !lastName) {
          skip++;
          return null;
        }
        const program = scope || toProgram(get(r, 'program')) || defaultProgram;
        const year = toYear(get(r, 'yearGraduated'));
        const status = toStatus(get(r, 'status'));
        const employed = status !== 'Unemployed';
        const employerType = get(r, 'employerType') || (employed ? 'Private' : '');
        const job = employed
          ? {
              id: crypto.randomUUID(),
              position: get(r, 'position'),
              company: get(r, 'company'),
              employerType: /gov/i.test(employerType) ? 'Government' : employerType || 'Private',
              employmentStatus: get(r, 'employmentType') || (status === 'Self-Employed' ? 'Self-Employed' : 'Permanent'),
              jobLevel: get(r, 'jobLevel') || 'Rank and File',
              recordedAt: new Date().toISOString(),
            }
          : null;
        const ip = get(r, 'isIP').toLowerCase();
        return {
          email: get(r, 'email').toLowerCase() || null,
          course: program,
          batch: year ? `${year - 1}-${year}` : '',
          data: {
            givenName,
            lastName,
            middleName: get(r, 'middleName').toUpperCase(),
            yearGraduated: year,
            sex: /^f/i.test(get(r, 'sex')) ? 'Female' : 'Male',
            dateOfBirth: get(r, 'dateOfBirth'),
            civilStatus: get(r, 'civilStatus') || 'Single',
            mobileNo: get(r, 'mobileNo'),
            presentAddress: get(r, 'presentAddress'),
            permanentAddress: get(r, 'presentAddress'),
            facebookName: '',
            status,
            currentPosition: job?.position,
            currentCompany: job?.company,
            employerType: job?.employerType,
            jobLevel: job?.jobLevel,
            employmentHistory: job ? [job] : [],
            isIP: ip.startsWith('y') || ip === 'true',
            suggestions: get(r, 'suggestions'),
            lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            importedFrom: file.name,
          },
        };
      })
      .filter(Boolean);
    setRows(parsed);
    setSkipped(skip);
  };

  const runImport = async () => {
    setImporting(true);
    let done = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200).map((r) => ({ ...r, email: r.email, data: { ...r.data, email: r.email || '' } }));
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
    toast.success(`Imported ${done} alumni records`);
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

  const byProgram = PROGRAMS.map((p) => ({ code: p.code, n: rows.filter((r) => r.course === p.code).length })).filter((x) => x.n);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-lg">Import from Google Forms (CSV)</h3>
            <p className="text-sm text-muted-foreground mt-1">
              In Google Forms, open Responses → Link to Sheets, then File → Download → CSV. Upload that file here.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <button onClick={downloadTemplate} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <Download size={15} /> Download a template with the expected column names
        </button>

        {!scope && (
          <label className="block">
            <span className="text-sm font-medium">Program to use when a row has none</span>
            <select value={defaultProgram} onChange={(e) => setDefaultProgram(e.target.value as Course)} className="mt-1.5 w-full filter-select">
              {PROGRAMS.map((p) => <option key={p.code} value={p.code}>{p.code}</option>)}
            </select>
          </label>
        )}

        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 cursor-pointer hover:bg-muted/40">
          <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
          {fileName ? <FileSpreadsheet className="text-primary" size={28} /> : <Upload className="text-muted-foreground" size={28} />}
          <span className="text-sm font-medium">{fileName || 'Choose a CSV file'}</span>
        </label>

        {rows.length > 0 && (
          <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-1">
            <p className="font-medium">{rows.length} records ready to import</p>
            <p className="text-muted-foreground">{byProgram.map((x) => `${x.code}: ${x.n}`).join(' · ')}</p>
            {skipped > 0 && <p className="text-muted-foreground">{skipped} rows without a name will be skipped.</p>}
            {scope && <p className="text-muted-foreground">All rows will be saved under {scope}.</p>}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium bg-muted">Cancel</button>
          <button
            onClick={runImport}
            disabled={!rows.length || importing}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50"
          >
            {importing ? 'Importing...' : `Import ${rows.length || ''} records`}
          </button>
        </div>
      </div>
    </div>
  );
}
