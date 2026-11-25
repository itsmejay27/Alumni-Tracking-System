import React, { useEffect, useState } from 'react';
import { friendlyError } from '@/lib/errors';
import { plural } from '@/lib/text';
import { tr } from '@/lib/preferences';
import { Upload, X, FileSpreadsheet, Download, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { AlumniRecord, Course, patchRecord } from '@/lib/alumni';
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
/** Letters only, so "Avrielle Joy" and "AVRIELLE-JOY" compare the same (like sign-up does). */
const nk = (s: string | undefined) => (s || '').toUpperCase().replace(/[^A-ZÑ]/g, '');
/** Ways a graduate can be matched: first name alone, or first + middle name (two-word first names). */
const nameKeys = (r: { lastName?: string; givenName?: string; middleName?: string; course?: string | null; yearGraduated?: number }) => {
  const tail = `|${nk(r.lastName)}|${r.course}|${r.yearGraduated}`;
  return [...new Set([nk(r.givenName) + tail, nk((r.givenName || '') + (r.middleName || '')) + tail])];
};

// Details compared when a graduate in the file is already in the system
const COMPARE: { field: keyof ParsedRow & string; label: string }[] = [
  { field: 'middleName', label: 'Middle name' },
  { field: 'sex', label: 'Sex' },
  { field: 'dateOfBirth', label: 'Birthday' },
  { field: 'civilStatus', label: 'Civil status' },
  { field: 'mobileNo', label: 'Mobile number' },
  { field: 'email', label: 'Email' },
  { field: 'presentAddress', label: 'Present address' },
  { field: 'permanentAddress', label: 'Permanent address' },
  { field: 'facebookName', label: 'Facebook' },
  { field: 'twitter', label: 'Twitter' },
  { field: 'campus', label: 'Campus' },
  { field: 'fatherName', label: "Father's name" },
  { field: 'fatherContact', label: "Father's contact" },
  { field: 'motherName', label: "Mother's name" },
  { field: 'motherContact', label: "Mother's contact" },
];
const same = (a: unknown, b: unknown) => String(a ?? '').trim().toUpperCase() === String(b ?? '').trim().toUpperCase();

interface RawRecord {
  id: string;
  user_id: string | null;
  data: Record<string, any>;
}
interface FieldChange {
  field: string;
  label: string;
  from: string;
  to: string;
}
/** What the file would change on a graduate already in the system. */
interface RecordUpdate {
  id: string;
  name: string;
  /** The graduate has an account and keeps their own details: only empty details are filled */
  ownRecord: boolean;
  fills: FieldChange[];
  changes: FieldChange[];
  /** Employment from the file, added only when the system has none */
  employment: ParsedRow | null;
}

/** The job from a file row, or null when the graduate isn't working. */
function jobFrom(r: ParsedRow) {
  const employed = r.status === 'Employed' || r.status === 'Self-Employed';
  if (!employed) return null;
  return {
    id: crypto.randomUUID(),
    position: r.position,
    company: r.company,
    // The sheet may not say; don't guess "Private"
    employerType: /gov/i.test(r.employerType) ? 'Government' : r.employerType || 'Not specified',
    employmentStatus: r.employmentType || (r.status === 'Self-Employed' ? 'Self-Employed' : ''),
    employerAddress: r.employerAddress || undefined,
    employerContact: r.employerContact || undefined,
    lengthOfService: r.lengthOfService || undefined,
    jobDescription: r.jobDescription || undefined,
    recordedAt: new Date().toISOString(),
  };
}
const employmentFields = (job: ReturnType<typeof jobFrom>) => ({
  currentPosition: job?.position,
  currentCompany: job?.company,
  employerType: job?.employerType,
  employerAddress: job?.employerAddress,
  employerContact: job?.employerContact,
  lengthOfService: job?.lengthOfService,
  jobDescription: job?.jobDescription,
  employmentHistory: job ? [job] : [],
});

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

  // Apply each file's year/program. Graduates already in the system are compared with the file
  // instead of being added again; graduates repeated in another file are left out.
  const existingIdByKey = new Map<string, string>();
  for (const r of existing) for (const k of nameKeys(r)) if (!existingIdByKey.has(k)) existingIdByKey.set(k, r.id);
  const existingIdByEmail = new Map(existing.filter((r) => r.email).map((r) => [(r.email || '').toLowerCase(), r.id] as const));
  const seenKeys = new Set<string>();
  const seenEmails = new Set<string>();
  const seenIds = new Set<string>();
  const perFile = files.map((f) => {
    const finalRows = f.rows.map((r) => ({
      ...r,
      course: (scope || r.course || f.program) as Course,
      yearGraduated: f.hasYearColumn ? r.yearGraduated : f.year,
    }));
    const ready: typeof finalRows = [];
    const matched: { row: (typeof finalRows)[number]; id: string }[] = [];
    let repeated = 0;
    for (const r of finalRows) {
      const keys = nameKeys(r);
      const id = keys.map((k) => existingIdByKey.get(k)).find(Boolean) || (r.email ? existingIdByEmail.get(r.email) : undefined);
      if (id) {
        if (seenIds.has(id)) repeated++;
        else {
          seenIds.add(id);
          matched.push({ row: r, id });
        }
      } else if (keys.some((k) => seenKeys.has(k)) || (!!r.email && seenEmails.has(r.email))) repeated++;
      else ready.push(r);
      keys.forEach((k) => seenKeys.add(k));
      if (r.email) seenEmails.add(r.email);
    }
    return { file: f, ready, matched, repeated };
  });

  // The stored details of matched graduates (the list on screen fills in display defaults)
  const [rawById, setRawById] = useState<Record<string, RawRecord>>({});
  const [loadingRaw, setLoadingRaw] = useState(false);
  const matchedIds = perFile.flatMap((p) => p.matched.map((m) => m.id));
  const missingIds = matchedIds.filter((id) => !rawById[id]).join(',');
  useEffect(() => {
    if (!missingIds) return;
    let cancelled = false;
    (async () => {
      setLoadingRaw(true);
      const ids = missingIds.split(',');
      const found: Record<string, RawRecord> = {};
      for (let i = 0; i < ids.length; i += 200) {
        const { data } = await supabase.from('alumni_records').select('id, user_id, data').in('id', ids.slice(i, i + 200));
        (data || []).forEach((r: any) => (found[r.id] = r));
      }
      if (!cancelled) {
        setRawById((cur) => ({ ...cur, ...found }));
        setLoadingRaw(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [missingIds]);

  const [replaceChanged, setReplaceChanged] = useState(false);
  const updates: RecordUpdate[] = perFile.flatMap((p) =>
    p.matched.flatMap(({ row, id }) => {
      const raw = rawById[id];
      if (!raw) return [];
      const d = raw.data || {};
      const fills: FieldChange[] = [];
      const changes: FieldChange[] = [];
      for (const { field, label } of COMPARE) {
        const to = String((row as any)[field] ?? '').trim();
        const from = String(d[field] ?? (field === 'email' ? '' : '')).trim();
        if (!to || same(from, to)) continue;
        (from ? changes : fills).push({ field, label, from, to });
      }
      const hasJob = (Array.isArray(d.employmentHistory) && d.employmentHistory.length > 0) || ['Employed', 'Self-Employed', 'Unemployed'].includes(d.status);
      const employment = !hasJob && row.status !== 'Not Tracked' ? row : null;
      if (!fills.length && !changes.length && !employment) return [];
      const name = `${d.givenName || row.givenName} ${d.lastName || row.lastName}`.trim();
      return [{ id, name, ownRecord: !!raw.user_id, fills, changes, employment }];
    })
  );
  const updatesToApply = updates.filter((u) => u.fills.length || u.employment || (replaceChanged && !u.ownRecord && u.changes.length));
  const withChanges = updates.filter((u) => u.changes.length);
  const upToDate = matchedIds.filter((id) => rawById[id]).length - updates.length;
  const toImport = perFile.flatMap((p) => p.ready.map((r) => ({ ...r, fileName: p.file.name })));
  // Rows without a birthday or sex: sign-up matches them by name and fills the missing details in
  const missingSignUp = toImport.filter((r) => !r.dateOfBirth || !r.sex).length;
  const repeated = perFile.reduce((n, p) => n + p.repeated, 0);
  const counts = {
    employed: toImport.filter((r) => r.status === 'Employed' || r.status === 'Self-Employed').length,
    unemployed: toImport.filter((r) => r.status === 'Unemployed').length,
    notTracked: toImport.filter((r) => r.status === 'Not Tracked').length,
  };

  const runImport = async () => {
    setImporting(true);
    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const payload = toImport.map((r) => {
      const job = jobFrom(r);
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
          ...employmentFields(job),
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
        toast.error(`${tr(plural(done, 'Stopped after {n} record.', 'Stopped after {n} records.'), { n: done })} ${friendlyError(error)}`);
        setImporting(false);
        if (done) onDone();
        return;
      }
      done += chunk.length;
    }

    // Graduates already in the system: fill empty details (and replace changed ones if chosen)
    let updated = 0;
    const failed: string[] = [];
    const todo = updatesToApply;
    for (let i = 0; i < todo.length; i += 5) {
      await Promise.all(
        todo.slice(i, i + 5).map(async (u) => {
          const items = [...u.fills, ...(replaceChanged && !u.ownRecord ? u.changes : [])];
          const patch: Record<string, unknown> = {};
          for (const c of items) patch[c.field] = c.to;
          // A real birthday replaces the unreadable one kept from an earlier list
          if (patch.dateOfBirth) patch.dateOfBirthImported = undefined;
          if (u.employment) {
            const job = jobFrom(u.employment);
            Object.assign(patch, { status: u.employment.status, ...employmentFields(job) });
          }
          patch.lastUpdated = now;
          const res = await patchRecord(u.id, patch as any, 'email' in patch ? { email: (patch.email as string) || null } : {});
          if (res.ok) updated++;
          else failed.push(u.name);
        })
      );
    }
    setImporting(false);
    if (done) toast.success(tr(plural(done, 'Imported {n} graduate.', 'Imported {n} graduates.'), { n: done }));
    if (updated) toast.success(tr(plural(updated, 'Updated {n} graduate already in the system.', 'Updated {n} graduates already in the system.'), { n: updated }));
    if (failed.length) toast.error(tr('Could not update: {names}', { names: failed.slice(0, 5).join(', ') + (failed.length > 5 ? ' …' : '') }));
    onDone();
    if (!failed.length) onClose();
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
            <h3 className="font-semibold text-lg">{tr("Import graduates")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload one or more official Graduate Tracer Excel sheets (.xlsx), or Google Forms / spreadsheet exports (.csv).
              {scope && ` Only ${scope} graduates are accepted.`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted" aria-label={tr("Close")}>
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
            {reading ? 'Reading files...' : files.length ? tr('Add more files') : tr('Choose or drop Excel (.xlsx) or CSV files')}
          </span>
          <span className="text-xs text-muted-foreground">{tr("You can pick several files at once.")}</span>
        </label>

        {files.length > 0 && (
          <div className="space-y-3">
            {perFile.map(({ file: f, ready, matched, repeated: rep }) => (
              <div key={f.id} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className={f.problem ? 'text-red-600 shrink-0' : 'text-primary shrink-0'} size={20} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{f.name}</p>
                    {f.problem ? (
                      <p className="text-xs text-red-700 mt-0.5">{f.problem}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tr(plural(ready.length, '{n} new graduate', '{n} new graduates'), { n: ready.length })}
                        {matched.length > 0 && ` · ${tr(plural(matched.length, '{n} already in the system', '{n} already in the system'), { n: matched.length })}`}
                        {rep > 0 && ` · ${tr(plural(rep, '{n} repeated', '{n} repeated'), { n: rep })}`}
                        {f.format === 'tracer-sheet' ? ` · ${tr('official Graduate Tracer sheet')}` : ''}
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
                      <span className="text-xs font-medium">{tr("Year graduated")}</span>
                      {f.hasYearColumn ? (
                        <p className="mt-1 text-sm text-muted-foreground">{tr("Taken from the file")}</p>
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
                      <span className="text-xs font-medium">{tr("Program")}</span>
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
              <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-1" data-testid="new-summary">
                <p className="font-semibold">
                  {tr(plural(toImport.length, '{n} graduate ready to import', '{n} graduates ready to import'), { n: toImport.length })}{' '}
                  {tr(plural(perFile.filter((p) => p.ready.length).length, 'from {n} file', 'from {n} files'), { n: perFile.filter((p) => p.ready.length).length })}
                </p>
                <p className="text-muted-foreground">
                  {counts.employed} employed · {counts.unemployed} unemployed · {counts.notTracked} not tracked (no status yet)
                </p>
                {repeated > 0 && <p className="text-muted-foreground">{tr(plural(repeated, '{n} graduate repeated in another file is left out.', '{n} graduates repeated in another file are left out.'), { n: repeated })}</p>}
                {missingSignUp > 0 && (
                  <p className="text-muted-foreground">
                    {tr(plural(missingSignUp, '{n} has no birthday or sex in the file. They can still create an account with their first and last name; the program chair approves the link.', '{n} have no birthday or sex in the file. They can still create an account with their first and last name; the program chair approves the link.'), { n: missingSignUp })}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {matchedIds.length > 0 && (
          <div className="rounded-xl border border-border p-4 text-sm space-y-3" data-testid="update-summary">
            <p className="font-semibold">{tr('Graduates already in the system')}</p>
            {loadingRaw ? (
              <p className="text-muted-foreground inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> {tr('Comparing the file with the system...')}
              </p>
            ) : (
              <>
                <ul className="text-muted-foreground space-y-0.5">
                  {updates.filter((u) => u.fills.length || u.employment).length > 0 && (
                    <li>
                      {tr(plural(updates.filter((u) => u.fills.length || u.employment).length, '{n} has details the system is missing (for example a birthday). These are filled in.', '{n} have details the system is missing (for example a birthday). These are filled in.'), {
                        n: updates.filter((u) => u.fills.length || u.employment).length,
                      })}
                    </li>
                  )}
                  {withChanges.length > 0 && (
                    <li>{tr(plural(withChanges.length, '{n} has details that are different from the system.', '{n} have details that are different from the system.'), { n: withChanges.length })}</li>
                  )}
                  {upToDate > 0 && <li>{tr(plural(upToDate, '{n} is already up to date.', '{n} are already up to date.'), { n: upToDate })}</li>}
                </ul>
                {withChanges.length > 0 && (
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" className="mt-1" checked={replaceChanged} onChange={(e) => setReplaceChanged(e.target.checked)} />
                    <span>
                      {tr('Also replace the different details with the ones in the file')}
                      <span className="block text-xs text-muted-foreground">
                        {tr("Graduates who updated their own profile keep their answers; only their empty details are filled in.")}
                      </span>
                    </span>
                  </label>
                )}
                {updates.length > 0 && (
                  <details className="rounded-lg bg-muted/40 p-3">
                    <summary className="cursor-pointer font-medium">{tr('See what will change')}</summary>
                    <ul className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                      {updates.map((u) => (
                        <li key={u.id}>
                          <p className="font-semibold">
                            {u.name}
                            {u.ownRecord && <span className="ml-2 text-xs font-normal text-muted-foreground">({tr('updated by the graduate')})</span>}
                          </p>
                          <ul className="text-xs text-muted-foreground pl-3">
                            {u.fills.map((c) => (
                              <li key={c.field}>
                                {tr(c.label)}: <span className="text-emerald-700">{c.to}</span> <span>({tr('was empty')})</span>
                              </li>
                            ))}
                            {u.employment && <li>{tr('Employment')}: <span className="text-emerald-700">{tr(u.employment.status)}{u.employment.company ? ` · ${u.employment.company}` : ''}</span> <span>({tr('was empty')})</span></li>}
                            {u.changes.map((c) => (
                              <li key={c.field} className={replaceChanged && !u.ownRecord ? '' : 'opacity-60'}>
                                {tr(c.label)}: {c.from} → <span className={replaceChanged && !u.ownRecord ? 'text-amber-700' : ''}>{c.to}</span>
                                {(!replaceChanged || u.ownRecord) && <span> ({tr('kept as is')})</span>}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
          </div>
        )}

        <button onClick={downloadTemplate} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <Download size={15} /> {tr("Download a CSV template")}
        </button>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium bg-muted">{tr("Cancel")}</button>
          <button
            onClick={runImport}
            disabled={(!toImport.length && !updatesToApply.length) || importing || loadingRaw}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50"
          >
            {importing
              ? tr('Importing...')
              : toImport.length && updatesToApply.length
                ? tr('Add {a} and update {b}', { a: toImport.length, b: updatesToApply.length })
                : updatesToApply.length
                  ? tr(plural(updatesToApply.length, 'Update {n} graduate', 'Update {n} graduates'), { n: updatesToApply.length })
                  : tr(plural(toImport.length, 'Import {n} graduate', 'Import {n} graduates'), { n: toImport.length })}
          </button>
        </div>
      </div>
    </div>
  );
}
