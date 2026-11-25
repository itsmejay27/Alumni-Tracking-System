/**
 * Bot check (Cloudflare Turnstile) for sign-in, sign-up, password reset and password change.
 * It is on only when VITE_TURNSTILE_SITE_KEY is set (Vercel → Settings → Environment Variables)
 * AND the matching secret key is saved in Supabase → Authentication → Attack Protection.
 * Set the site key first and deploy, then turn on CAPTCHA in Supabase; the other order blocks sign-in.
 */
export const TURNSTILE_SITE_KEY: string = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() || '';
export const captchaEnabled = TURNSTILE_SITE_KEY.length > 0;

/** Adds the bot-check token to Supabase auth options when the check is on. */
export const withCaptcha = <T extends object>(options: T, token: string | null): T & { captchaToken?: string } =>
  captchaEnabled && token ? { ...options, captchaToken: token } : options;
