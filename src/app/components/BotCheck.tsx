import React, { useEffect, useRef } from 'react';
import { TURNSTILE_SITE_KEY, captchaEnabled } from '@/lib/captcha';
import { usePrefs } from '@/lib/preferences';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
    __turnstileLoading?: Promise<void>;
  }
}

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!window.__turnstileLoading) {
    window.__turnstileLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Bot check could not load'));
      document.head.appendChild(s);
    });
  }
  return window.__turnstileLoading;
}

/**
 * "I'm not a robot" check. Calls onToken with a one-time token (or null when it expires).
 * A token works once: change `resetKey` after each sign-in attempt to get a new one.
 * Renders nothing when the bot check is not set up.
 */
export function BotCheck({ onToken, resetKey = 0, theme }: { onToken: (token: string | null) => void; resetKey?: number; theme?: 'light' | 'dark' }) {
  const box = useRef<HTMLDivElement>(null);
  const { lang, resolvedTheme } = usePrefs();
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!captchaEnabled || !box.current) return;
    let id: string | null = null;
    let cancelled = false;
    cb.current(null);
    loadTurnstile()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return;
        id = window.turnstile.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: theme || (resolvedTheme === 'dark' ? 'dark' : 'light'),
          language: lang === 'fil' ? 'tl' : 'en',
          callback: (token: string) => cb.current(token),
          'expired-callback': () => cb.current(null),
          'error-callback': () => cb.current(null),
        });
      })
      .catch(() => cb.current(null));
    return () => {
      cancelled = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [resetKey, lang, resolvedTheme, theme]);

  if (!captchaEnabled) return null;
  return <div ref={box} className="min-h-[65px] flex justify-center" />;
}
