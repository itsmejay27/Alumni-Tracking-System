import { supabase } from './supabase';

type Result = { ok?: boolean; error?: string; sentTo?: string; wait?: number; enabled?: boolean; needed?: boolean; authenticator?: boolean };

/** Calls the email two-step function and always returns a readable result (errors in `error`). */
export async function emailTwoStep(body: Record<string, unknown>): Promise<Result> {
  const { data, error } = await supabase.functions.invoke('email-2fa', { body });
  if (!error) return data as Result;
  try {
    const detail = await (error as { context?: Response }).context?.json();
    if (detail?.error) return detail as Result;
  } catch {
    /* no readable body */
  }
  return { error: error.message || 'Something went wrong. Please try again.' };
}
