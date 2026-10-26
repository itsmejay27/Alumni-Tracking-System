import type { Course } from './alumni';

/**
 * Program list with the chart colors the panel asked for (BSIT purple, CTE/BEED blue,
 * BSBA yellow). Order matters: it keeps similar hues apart and was checked for
 * color-blind separation. Each line also gets its own dash style so identity never
 * depends on color alone.
 */
export const PROGRAMS: { code: Course; name: string; short: string; color: string; dash?: string }[] = [
  { code: 'BSIT', name: 'BS Information Technology', short: 'BSIT', color: '#6250d6' },
  { code: 'BSBA-FM', name: 'BSBA Major in Financial Management', short: 'BSBA-FM', color: '#eda100', dash: '6 4' },
  { code: 'BEED', name: 'Bachelor of Elementary Education (CTE)', short: 'BEED', color: '#2a78d6', dash: '2 4' },
  { code: 'BSBA-OM', name: 'BSBA Major in Operations Management', short: 'BSBA-OM', color: '#eb6834', dash: '10 4 2 4' },
  { code: 'BSOA', name: 'BS Office Administration', short: 'BSOA', color: '#1baf7a', dash: '1 3' },
];

export const programName = (code: string) => PROGRAMS.find((p) => p.code === code)?.name || code;

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Alumni Affairs',
  'admin.bsit': 'BSIT Program Chair',
  'admin.beed': 'BEED Program Chair',
  'admin.bsba-fm': 'BSBA-FM Program Chair',
  'admin.bsba-om': 'BSBA-OM Program Chair',
  'admin.bsoa': 'BSOA Program Chair',
  alumni: 'Alumni',
};
export const roleLabel = (role: string) => ROLE_LABELS[role] || role;

export const EMPLOYMENT_STATUSES = ['Permanent', 'Probationary', 'Contractual', 'Job Order', 'Self-Employed'] as const;
export const JOB_LEVELS = ['Rank and File', 'Supervisory', 'Managerial / Executive', 'Job Order'] as const;
export const EMPLOYER_TYPES = ['Private', 'Government', 'Semi-Private', 'NGO/INGO', 'Self-Employed / Own Business'] as const;

/** Simple password strength rating used on every password form. */
export function passwordStrength(pw: string): { label: 'Weak' | 'Medium' | 'Strong'; score: number } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: 'Weak', score };
  if (score <= 3) return { label: 'Medium', score };
  return { label: 'Strong', score };
}
