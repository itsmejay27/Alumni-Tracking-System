import { tr } from './preferences';

/**
 * Turns a raw database / network error into a clear message a user can act on.
 * `what` is a full sentence naming what failed, e.g. "Could not save your profile.",
 * shown before the reason.
 */
export function friendlyError(err: unknown, what?: string): string {
  const raw = err instanceof Error ? err.message : typeof err === 'object' && err && 'message' in err ? String((err as any).message) : String(err ?? '');
  const code = typeof err === 'object' && err && 'code' in err ? String((err as any).code) : '';
  let reason: string;
  if (/failed to fetch|network|load failed|fetch failed|timeout|timed out/i.test(raw))
    reason = tr('Please check your internet connection and try again.');
  else if (/jwt expired|session|not signed in|refresh token/i.test(raw) || code === 'PGRST301')
    reason = tr('Your session has ended. Please sign in again.');
  else if (/row-level security|permission denied|not allowed|policy/i.test(raw) || code === '42501')
    reason = tr('Your account is not allowed to do this. Please contact your program chair or the Alumni Affairs Office if you think this is a mistake.');
  else if (/duplicate key|already exists|unique/i.test(raw) || code === '23505')
    reason = tr('This entry already exists.');
  else if (/violates not-null|null value/i.test(raw) || code === '23502')
    reason = tr('A required field is empty. Please fill it in and try again.');
  else if (/too large|payload|file size|exceeded/i.test(raw))
    reason = tr('The file is too large. Please choose a smaller one.');
  else if (/rate limit|too many requests/i.test(raw) || code === '429')
    reason = tr('Too many tries. Please wait a minute and try again.');
  else if (/invalid input syntax|invalid date|out of range/i.test(raw))
    reason = tr('One of the values is not in the right format. Please check it and try again.');
  else reason = raw ? tr('Please try again. If it keeps happening, contact the Alumni Affairs Office. (Details: {details})', { details: raw }) : tr('Please try again.');
  return what ? `${tr(what)} ${reason}` : reason;
}

/**
 * Reads the message an edge function put in its response body ({ error }) and returns it
 * in the user's language; falls back to friendlyError for network/unknown failures.
 */
export async function functionError(error: any, what?: string): Promise<string> {
  let message = '';
  try {
    const body = await error?.context?.json();
    if (body?.error) message = String(body.error);
  } catch {
    /* no readable body */
  }
  if (message) return what ? `${tr(what)} ${tr(message)}` : tr(message);
  return friendlyError(error, what);
}
