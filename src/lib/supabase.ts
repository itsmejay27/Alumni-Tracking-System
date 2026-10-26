import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && key);

if (!isSupabaseConfigured) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.');
}

export const supabase = createClient(url || 'http://localhost', key || 'missing-key');

/**
 * Turns password-update errors into plain messages. If the session has ended (for example the
 * password was already changed on another device, which signs out every other device), the user
 * is signed out here so they can log in again.
 */
export async function passwordUpdateError(error: { message: string; code?: string; status?: number }) {
  if (/session/i.test(error.message) || error.code === 'session_not_found') {
    await supabase.auth.signOut({ scope: 'local' });
    return 'Your session has ended, possibly because the password was changed on another device. Please log in again.';
  }
  if (error.code === 'same_password') return 'Your new password must be different from your current one.';
  return error.message;
}
