/**
 * Capitalizes the first letter of each word and lowercases the rest, for names typed in
 * any case: "jUAN dela cruz" -> "Juan Dela Cruz". Keeps "Ma." / "Jr." style dots and
 * hyphenated or apostrophe names ("Anne-Marie", "O'Neil").
 * keepCase only raises first letters, so "IT specialist" stays "IT Specialist".
 */
export function capitalizeWords(value: string, keepCase = false): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return (keepCase ? clean : clean.toLowerCase())
    .replace(/(^|[\s\-'’.(])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}
