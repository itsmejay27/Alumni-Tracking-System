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

/**
 * Link for a Facebook name as alumni typed it: a profile link stays a link, a username
 * opens that profile, and a plain name opens a Facebook people search for it.
 * Always https://www.facebook.com, so a typed value can never point elsewhere.
 */
export function facebookUrl(value: string | null | undefined): string | null {
  const v = (value || '').trim();
  if (!v) return null;
  const link = v.match(/^(?:https?:\/\/)?(?:www\.|m\.|web\.)?(?:facebook|fb)\.com\/(.+)$/i);
  if (link) {
    const path = link[1].split(/[?#]/)[0].replace(/\/+$/, '');
    if (/^profile\.php$/i.test(path)) {
      const id = v.match(/[?&]id=(\d+)/);
      return id ? `https://www.facebook.com/profile.php?id=${id[1]}` : null;
    }
    return /^[A-Za-z0-9.\-_/]+$/.test(path) ? `https://www.facebook.com/${path}` : null;
  }
  if (/^@?[A-Za-z0-9.]{5,50}$/.test(v) && !/\s/.test(v)) return `https://www.facebook.com/${v.replace(/^@/, '')}`;
  return `https://www.facebook.com/search/people/?q=${encodeURIComponent(v)}`;
}
