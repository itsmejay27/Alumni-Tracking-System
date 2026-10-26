import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FIL } from './fil';

/** Per-device display preferences: colour theme and language. */
export type ThemePref = 'light' | 'dark' | 'system';
export type Lang = 'en' | 'fil';

const THEME_KEY = 'omsu-theme';
const LANG_KEY = 'omsu-lang';

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked: the choice lasts until the page is closed */
  }
};

interface Prefs {
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
  /** The theme actually shown, after resolving "system" */
  resolvedTheme: 'light' | 'dark';
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Translate an English UI string; {name} placeholders are filled from vars. */
  t: (text: string, vars?: Record<string, string | number>) => string;
}

const PrefsContext = createContext<Prefs | null>(null);

const systemDark = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>(() => (read(THEME_KEY) as ThemePref) || 'light');
  const [lang, setLangState] = useState<Lang>(() => (read(LANG_KEY) as Lang) || 'en');
  const [sysDark, setSysDark] = useState(systemDark());

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const on = () => setSysDark(mq.matches);
    mq?.addEventListener?.('change', on);
    return () => mq?.removeEventListener?.('change', on);
  }, []);

  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? (sysDark ? 'dark' : 'light') : theme;

  const setTheme = useCallback((t: ThemePref) => {
    setThemeState(t);
    write(THEME_KEY, t);
  }, []);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    write(LANG_KEY, l);
  }, []);

  const t = useCallback(
    (text: string, vars?: Record<string, string | number>) => {
      let out = (lang === 'fil' && FIL[text]) || text;
      if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
      return out;
    },
    [lang],
  );

  const value = useMemo(() => ({ theme, setTheme, resolvedTheme, lang, setLang, t }), [theme, setTheme, resolvedTheme, lang, setLang, t]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

const fallback: Prefs = {
  theme: 'light',
  setTheme: () => {},
  resolvedTheme: 'light',
  lang: 'en',
  setLang: () => {},
  t: (text, vars) => {
    let out = text;
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
    return out;
  },
};

/** Theme, language and the translate function. Works (in English) outside the provider too. */
export const usePrefs = () => useContext(PrefsContext) || fallback;
export const useT = () => usePrefs().t;

/** Applies dark mode and the page language while the signed-in app is shown (the landing page stays light). */
export function useApplyPreferences(active: boolean) {
  const { resolvedTheme, lang } = usePrefs();
  useEffect(() => {
    const dark = active && resolvedTheme === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document.documentElement.lang = active && lang === 'fil' ? 'fil' : 'en';
  }, [active, resolvedTheme, lang]);
}
