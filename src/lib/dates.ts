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

/**
 * Length of service between two dates (YYYY-MM-DD or YYYY-MM), e.g. "1 year 3 months".
 * An empty end date means the job is current, so it counts up to today.
 * Returns '' when the start date is missing or after the end date.
 */
export function serviceLength(start: string | null | undefined, end?: string | null): string {
  const parse = (v: string) => {
    const m = v.trim().match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
    return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3] || 1) } : null;
  };
  const a = start ? parse(start) : null;
  const b = parse(end || todayIso());
  if (!a || !b) return '';
  let months = (b.y - a.y) * 12 + (b.m - a.m) - (b.d < a.d ? 1 : 0);
  if (months < 0) return '';
  return formatMonths(months);
}

/** 15 -> "1 year 3 months", 0 -> "Less than a month" */
export function formatMonths(total: number): string {
  if (!Number.isFinite(total) || total < 0) return '';
  const y = Math.floor(total / 12);
  const m = Math.round(total % 12);
  const parts = [];
  if (y) parts.push(`${y} ${y === 1 ? 'year' : 'years'}`);
  if (m) parts.push(`${m} ${m === 1 ? 'month' : 'months'}`);
  return parts.join(' ') || 'Less than a month';
}
