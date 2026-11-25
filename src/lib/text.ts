/**
 * Capitalizes the first letter of each word and lowercases the rest, for names typed in
 * any case: "jUAN dela cruz" -> "Juan Dela Cruz". Keeps "Ma." / "Jr." style dots and
 * hyphenated or apostrophe names ("Anne-Marie", "O'Neil").
 * keepCase only raises first letters, so "IT specialist" stays "IT Specialist".
 */
export function capitalizeWords(value: string, keepCase = false): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  const out = (keepCase ? clean : clean.toLowerCase()).replace(/(^|[\s\-'’.(])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
  // Titles keep small joining words lowercase: "Master in IT", "Bachelor of Science in ..."
  return keepCase ? out.replace(/ (In|Of|And|The|For|On|At|To|Major) /g, (m) => m.toLowerCase()) : out;
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

export type FeedbackTone = 'Negative' | 'Positive' | 'Neutral';

// Simple word lists (English and Filipino) used to sort feedback for review. It is a guide for
// staff, not a judgment: anything with a negative word is shown under "Negative".
const NEGATIVE = [
  'bad', 'poor', 'worst', 'terrible', 'slow', 'difficult', 'hard', 'problem*', 'issue*', 'lack', 'lacking', 'outdated',
  'not good', 'no help', 'useless', 'disappoint*', 'complain*', 'unfair', 'rude', 'confusing', 'broken', 'error*', 'late', 'expensive',
  'pangit', 'hindi maganda', 'di maganda', 'mabagal', 'mahirap', 'kulang', 'sira', 'walang kwenta', 'nakakainis', 'bulok', 'magulo', 'luma',
];
const POSITIVE = [
  'good', 'great', 'excellent', 'helpful', 'thank*', 'love', 'nice', 'best', 'amazing', 'well done', 'satisfied', 'grateful', 'easy',
  'maganda', 'mahusay', 'salamat', 'magaling', 'masaya', 'ayos', 'malaking tulong', 'nakatulong',
];
// Whole words only ("hard" does not match "hardware"); a trailing * also matches longer words
const hasWord = (text: string, words: string[]) =>
  words.some((w) => {
    const stem = w.endsWith('*');
    const body = (stem ? w.slice(0, -1) : w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\p{L}])${body}${stem ? '' : '(?![\\p{L}])'}`, 'iu').test(text);
  });

/** Sorts a piece of feedback into Negative / Positive / Neutral for the staff review filter. */
export function feedbackTone(text: string | null | undefined): FeedbackTone {
  const t = (text || '').toLowerCase();
  if (!t.trim()) return 'Neutral';
  if (hasWord(t, NEGATIVE)) return 'Negative';
  if (hasWord(t, POSITIVE)) return 'Positive';
  return 'Neutral';
}

/** Picks the singular or plural text for a count: plural(1, 'graduate', 'graduates') -> 'graduate'. */
export const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
