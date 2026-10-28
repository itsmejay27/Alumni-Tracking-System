/** Rough exchange rate used to show foreign pay in pesos (same as the job email filters). */
export const USD_TO_PHP = 58;

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;

/**
 * Shows a salary in Philippine pesos. Dollar amounts such as "$8 to $9/hour" become
 * "₱464 to ₱522/hour (approx.)". Salaries already in pesos are left as they are.
 */
export function salaryInPesos(salary: string | null | undefined): string {
  const s = (salary || '').trim();
  if (!s) return '';
  if (!/\$|usd|us dollars?|dollars?/i.test(s)) return s;
  const converted = s
    .replace(/\$\s*|\bUSD\b\s*|\bUS\s*dollars?\b|\bdollars?\b/gi, '')
    .replace(/(\d[\d,]*(?:\.\d+)?)(\s*k\b)?/gi, (_m, num: string, k: string) => {
      const n = Number(num.replace(/,/g, '')) * (k ? 1000 : 1);
      return Number.isFinite(n) ? peso(n * USD_TO_PHP) : _m;
    })
    .replace(/\s{2,}/g, ' ')
    .trim();
  return `${converted} (approx.)`;
}
