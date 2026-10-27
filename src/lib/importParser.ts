import type { Course } from './alumni';

/**
 * Turns a spreadsheet (CSV, Google Forms export, or the official OMSU "Graduate Tracer"
 * Excel sheet) into tracer records. Pure function so it can be tested on its own.
 */

export type Cell = string | number | boolean | Date | null | undefined;

export interface ParsedRow {
  email: string | null;
  course: Course | null;
  givenName: string;
  middleName: string;
  lastName: string;
  yearGraduated: number;
  sex: 'Male' | 'Female' | '';
  dateOfBirth: string;
  civilStatus: string;
  mobileNo: string;
  presentAddress: string;
  permanentAddress: string;
  facebookName: string;
  twitter: string;
  campus: string;
  employerAddress: string;
  employerContact: string;
  lengthOfService: string;
  jobDescription: string;
  status: 'Employed' | 'Self-Employed' | 'Unemployed' | 'Not Tracked';
  position: string;
  company: string;
  employerType: string;
  employmentType: string;
  jobLevel: string;
  isIP: boolean;
  suggestions: string;
  fatherName: string;
  fatherContact: string;
  motherName: string;
  motherContact: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  /** Rows whose program could not be determined from the file or its name */
  unknownProgram: number;
  programsFound: Course[];
  format: 'tracer-sheet' | 'table';
  skipped: number;
}

// Header text (lower-cased, partial match) for each field. More specific keys come first.
const COLUMNS: { key: string; match: string[]; not?: string[] }[] = [
  // Recognized only so a Student ID column isn't mistaken for another field; it is not stored
  { key: 'studentId', match: ['student id', 'student no', 'student number', 'id number', 'id no'] },
  { key: 'fatherName', match: ["father's name", 'father name', 'name of father'] },
  { key: 'motherName', match: ["mother's name", 'mother name', 'name of mother'] },
  { key: 'fullName', match: ['name of graduate', 'full name', 'complete name', 'name of alumni'], not: ['organization', 'company', 'employer', 'agency', 'father', 'mother'] },
  { key: 'lastName', match: ['last name', 'surname', 'family name'] },
  { key: 'givenName', match: ['first name', 'given name'] },
  { key: 'middleName', match: ['middle name', 'middle initial'] },
  { key: 'email', match: ['email'] },
  { key: 'facebookName', match: ['facebook', 'fb name', 'fb account'] },
  { key: 'twitter', match: ['twitter'] },
  { key: 'campus', match: ['campus'] },
  { key: 'program', match: ['program', 'course', 'degree'] },
  { key: 'yearGraduated', match: ['year graduated', 'batch', 'academic year', 'school year'] },
  { key: 'sex', match: ['sex', 'gender'] },
  { key: 'dateOfBirth', match: ['birth', 'bithdate'] },
  { key: 'civilStatus', match: ['civil status'] },
  // Employer columns first, so "company address" or "office contact" aren't read as the graduate's own
  { key: 'employerAddress', match: ['employer address', 'address of employer', 'company address', 'address of company', 'organization address', 'office address', 'business address'] },
  { key: 'employerContact', match: ['employer contact', 'company contact', 'office contact', 'organization contact', 'employer tel', 'company tel', 'office tel'] },
  { key: 'mobileNo', match: ['mobile', 'contact number', 'phone'] },
  { key: 'permanentAddress', match: ['permanent address', 'home address'] },
  { key: 'presentAddress', match: ['present address', 'address'] },
  { key: 'lengthOfService', match: ['length of service', 'years of service', 'years in service'] },
  { key: 'jobDescription', match: ['job description', 'description of work', 'duties'] },
  { key: 'employerType', match: ['employer type', 'type of employer', 'sector', 'company type', 'type of company', 'kind of company'] },
  { key: 'employmentType', match: ['nature of employment', 'employment type'] },
  // Recognized only so a Job Level column isn't mistaken for another field; it is not stored
  { key: 'jobLevel', match: ['job level'] },
  { key: 'status', match: ['employment status', 'are you employed', 'currently employed', 'status'] },
  { key: 'position', match: ['position', 'job title', 'designation'] },
  { key: 'company', match: ['name of company', 'company', 'employer', 'agency', 'organization'] },
  { key: 'isIP', match: ['indigenous', 'ip member'] },
  { key: 'suggestions', match: ['suggestion', 'feedback', 'comment'] },
];

const LOOKS_LIKE_PROGRAM = /bachelor|^bs\b|^bs[a-z]|^ab\b|education|science|technology|administration|arts|program|course/i;

const FOOTER = /^(total|prepared by|noted by|approved by|certified|female|male\b|\d+\s*"?employed)/i;

const text = (v: Cell) => {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).replace(/\s+/g, ' ').trim();
};

export function detectProgram(v: string): Course | null {
  const s = v.toUpperCase();
  if (s.includes('INFORMATION TECH') || /\bBSIT\b/.test(s)) return 'BSIT';
  if (s.includes('ELEMENTARY') || /\bBEED\b/.test(s)) return 'BEED';
  if (s.includes('FINANCIAL') || /BSBA[\s_-]*FM/.test(s)) return 'BSBA-FM';
  if (s.includes('OPERATION') || /BSBA[\s_-]*OM/.test(s)) return 'BSBA-OM';
  if (s.includes('OFFICE ADMIN') || /\bBSOA\b/.test(s)) return 'BSOA';
  return null;
}

function toStatus(v: string): ParsedRow['status'] {
  const s = v.toLowerCase().trim();
  if (!s || s.includes('not tracked') || s === 'n/a' || s === 'na') return 'Not Tracked';
  if (s.includes('self')) return 'Self-Employed';
  if (s.includes('unemployed') || s === 'u' || s === 'no' || s.includes('not employed')) return 'Unemployed';
  if (s.includes('employed') || s === 'e' || s === 'yes') return 'Employed';
  return 'Not Tracked';
}

/** Keeps digits only and restores the leading 0 Excel drops from mobile numbers (9171234567 -> 09171234567). */
const toPhone = (v: string) => {
  const d = v.replace(/\.0$/, '').replace(/\D/g, '');
  if (/^9\d{9}$/.test(d)) return `0${d}`;
  if (/^639\d{9}$/.test(d)) return `0${d.slice(2)}`;
  return d;
};

const toYear = (v: string) => {
  const years = v.match(/(19|20)\d{2}/g);
  return years ? Number(years[years.length - 1]) : 0;
};

/** "LAST, FIRST SECOND MIDDLE" -> parts. With 2+ given words, the last one is the middle name. */
function splitFullName(full: string, surnameFirst: boolean) {
  let [last, rest = ''] = full.split(',').map((s) => s.trim());
  if (!rest) {
    const words = full.trim().split(/\s+/);
    if (!surnameFirst) return { lastName: words.pop() || '', givenName: words.join(' '), middleName: '' };
    // "SURNAME FIRST MIDDLE" written without the comma
    last = words.shift() || '';
    rest = words.join(' ');
  }
  const words = rest.replace(/\./g, '. ').split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words[words.length - 1].length > 2) {
    return { lastName: last, givenName: words.slice(0, -1).join(' '), middleName: words[words.length - 1] };
  }
  return { lastName: last, givenName: words.join(' '), middleName: '' };
}

const looksLikeHeader = (row: Cell[]) =>
  row.filter((c) => {
    const t = text(c).toLowerCase();
    return t && COLUMNS.some((col) => col.match.some((m) => t.includes(m)));
  }).length >= 2;

export function parseTracerTable(table: Cell[][], opts: { defaultYear: number; fileName: string }): ParseResult {
  // 1. Find the header row (skips letterheads above the table)
  let h = table.findIndex((r, i) => i < 40 && looksLikeHeader(r));
  if (h < 0) h = 0;
  const width = Math.max(...table.slice(h, h + 3).map((r) => r.length), 0);
  let headers = Array.from({ length: width }, (_, j) => text(table[h]?.[j]));
  let start = h + 1;
  // The official sheet splits headers over two rows (e.g. Birthdate, Email on the second)
  if (table[h + 1] && looksLikeHeader(table[h + 1]) && !table[h + 1].some((c) => /@/.test(text(c)))) {
    headers = headers.map((t, j) => `${t} ${text(table[h + 1][j])}`.trim());
    start = h + 2;
  }
  const lower = headers.map((x) => x.toLowerCase());

  const map: Record<string, number> = {};
  const used = new Set<number>();
  for (const col of COLUMNS) {
    const idx = lower.findIndex(
      (t, i) => !used.has(i) && t && col.match.some((m) => t.includes(m)) && !col.not?.some((n) => t.includes(n))
    );
    if (idx >= 0) {
      map[col.key] = idx;
      used.add(idx);
    }
  }
  // The official sheet puts a "Contact Number" column right after each parent's name
  for (const parent of ['father', 'mother']) {
    const i = map[`${parent}Name`];
    if (i != null && /contact|mobile|phone/.test(lower[i + 1] || '')) {
      map[`${parent}Contact`] = i + 1;
      used.add(i + 1);
    }
  }
  const format: ParseResult['format'] = map.fullName != null ? 'tracer-sheet' : 'table';
  const get = (r: Cell[], k: string) => (map[k] != null ? text(r[map[k]]) : '');

  const fileProgram = detectProgram(opts.fileName.replace(/[_.]/g, ' '));
  const programsFound = new Set<Course>();
  let currentProgram: Course | null = null;
  let currentUnknown = false;
  // Official sheets group graduates under MALE / FEMALE section rows
  const isMarker = (r: Cell[], word: string) => r.slice(0, 2).some((c) => text(c).toUpperCase() === word);
  const hasFemaleMarker = table.slice(start).some((r) => isMarker(r, 'FEMALE'));
  const hasMaleMarker = table.slice(start).some((r) => isMarker(r, 'MALE'));
  let currentSex: '' | 'Male' | 'Female' = hasFemaleMarker && !hasMaleMarker ? 'Male' : '';
  let skipped = 0;
  const rows: ParsedRow[] = [];

  for (const r of table.slice(start)) {
    const cells = r.map(text);
    if (!cells.some(Boolean)) continue;
    if (isMarker(r, 'FEMALE')) currentSex = 'Female';
    else if (isMarker(r, 'MALE')) currentSex = 'Male';

    // Program names are often merged cells: carry the last one down
    const progCell = get(r, 'program');
    const rowProgram = progCell ? detectProgram(progCell) : null;
    if (rowProgram) {
      currentProgram = rowProgram;
      currentUnknown = false;
    } else if (LOOKS_LIKE_PROGRAM.test(progCell)) {
      // A program we don't trace (e.g. BSED): never fall back to the file name for these rows
      currentProgram = null;
      currentUnknown = true;
    }

    let lastName = get(r, 'lastName');
    let givenName = get(r, 'givenName');
    let middleName = get(r, 'middleName');
    const full = get(r, 'fullName');
    if (full && !lastName && !givenName) ({ lastName, givenName, middleName } = splitFullName(full, format === 'tracer-sheet'));

    if (!lastName && !givenName) continue; // section titles, campus names, blank rows
    // In the official sheet every graduate row has a running number before the name
    const numbered = format !== 'tracer-sheet' || cells.slice(0, map.fullName).some((c) => /^\d+$/.test(c));
    if (FOOTER.test(full || lastName || givenName) || (format === 'tracer-sheet' && !numbered)) {
      skipped++;
      continue;
    }

    const course = currentUnknown ? null : currentProgram || fileProgram;
    if (course) programsFound.add(course);
    const sexText = get(r, 'sex');
    const ip = get(r, 'isIP').toLowerCase();
    const email = get(r, 'email').toLowerCase();

    rows.push({
      email: /@/.test(email) ? email : null,
      course,
      givenName: givenName.toUpperCase(),
      middleName: middleName.toUpperCase(),
      lastName: lastName.toUpperCase(),
      yearGraduated: toYear(get(r, 'yearGraduated')) || opts.defaultYear,
      sex: /^f/i.test(sexText) ? 'Female' : /^m/i.test(sexText) ? 'Male' : currentSex,
      dateOfBirth: get(r, 'dateOfBirth').slice(0, 10),
      civilStatus: get(r, 'civilStatus') || 'Single',
      mobileNo: toPhone(get(r, 'mobileNo')),
      presentAddress: get(r, 'presentAddress'),
      permanentAddress: get(r, 'permanentAddress'),
      facebookName: get(r, 'facebookName'),
      twitter: get(r, 'twitter'),
      campus: get(r, 'campus'),
      employerAddress: get(r, 'employerAddress'),
      employerContact: get(r, 'employerContact'),
      lengthOfService: get(r, 'lengthOfService'),
      jobDescription: get(r, 'jobDescription'),
      status: toStatus(get(r, 'status')),
      position: get(r, 'position'),
      company: /^none$/i.test(get(r, 'company')) ? '' : get(r, 'company'),
      employerType: get(r, 'employerType'),
      employmentType: get(r, 'employmentType'),
      jobLevel: get(r, 'jobLevel'),
      isIP: ip.startsWith('y') || ip === 'true',
      suggestions: get(r, 'suggestions'),
      fatherName: get(r, 'fatherName').toUpperCase(),
      fatherContact: toPhone(get(r, 'fatherContact')),
      motherName: get(r, 'motherName').toUpperCase(),
      motherContact: toPhone(get(r, 'motherContact')),
    });
  }

  return { rows, programsFound: [...programsFound], format, skipped, unknownProgram: rows.filter((r) => !r.course).length };
}

/** Guess the graduation year from a file name like "BSIT_2024-2025.xlsx" (-> 2025). */
export const yearFromFileName = (name: string) => toYear(name);
