"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LocaleDocumentTitle } from './LocaleDocumentTitle';
import {
  DEFAULT_LOCALE, LOCALE_KEY, LOCALE_LABELS, SUPPORTED_LOCALES,
  isLocale, translate, type Locale,
} from '@/lib/i18n/catalog';

// Isolated components retain their English source-language API in previews/tests.
const Context = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({
  locale: 'en',
  setLocale: () => {},
});

export const useLocale = () => useContext(Context);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setValue] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_KEY);
      if (isLocale(saved)) setValue(saved);
    } catch {
      // Session language still works if browser storage is unavailable.
    }
    const sync = (event: StorageEvent) => {
      if (event.key === LOCALE_KEY || event.key === null) {
        setValue(isLocale(event.newValue) ? event.newValue : DEFAULT_LOCALE);
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = 'ltr';
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    if (!isLocale(next)) return;
    setValue(next);
    try {
      localStorage.setItem(LOCALE_KEY, next);
    } catch {
      // Do not block language changes when browser storage is unavailable.
    }
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <Context.Provider value={value}>
    {children}
    <Suspense fallback={null}><LocaleDocumentTitle locale={locale}/></Suspense>
  </Context.Provider>;
}

export function LanguageSelector() {
  const { locale, setLocale } = useLocale();
  const label = translate('Interface language', locale);
  return <label className="language-selector">
    <span>{label}</span>
    <select aria-label={label} value={locale} onChange={event => {
      if (isLocale(event.target.value)) setLocale(event.target.value);
    }}>
      {SUPPORTED_LOCALES.map(option => <option key={option} value={option} lang={option} translate="no">
        {LOCALE_LABELS[option]}
      </option>)}
    </select>
  </label>;
}
