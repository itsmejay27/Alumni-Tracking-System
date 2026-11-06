/**
 * Shows a date as month/day/year, e.g. "10/28/2026".
 * Older job dates were saved as year-month only ("2026-10"); those show as "10/2026".
 */
export function mdy(value: string | null | undefined): string {
  const s = (value || '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${Number(m[2])}/${Number(m[3])}/${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})$/);
  if (m) return `${Number(m[2])}/${m[1]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

/** Today as YYYY-MM-DD in local time (used when a job ends). */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
