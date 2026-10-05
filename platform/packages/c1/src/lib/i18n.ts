import translations from './data/learner-translations.json' with { type: 'json' };

export type Locale = 'de' | 'en' | 'hy' | 'ru';
export const languages: { code: Locale; name: string }[] = [
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'English' },
  { code: 'hy', name: 'Հայերեն' },
  { code: 'ru', name: 'Русский' },
];
const messages: Record<string, string[]> = translations;

export function isLocale(value: unknown): value is Locale {
  return value === 'de' || value === 'en' || value === 'hy' || value === 'ru';
}

/** Source texts and user writing are not passed through this display-only layer. */
export function translate(de: string, en: string, locale: Locale): string {
  if (locale === 'de') return de;
  if (locale === 'en') return en;
  const index = locale === 'hy' ? 0 : 1;
  return (
    messages[en]?.[index] ??
    en
      .split('\n')
      .map((line) => messages[line]?.[index] ?? line)
      .join('\n')
  );
}

export function localize(
  value: { de: string; en: string } | null | undefined,
  locale: Locale,
): string {
  return value ? translate(value.de, value.en, locale) : '';
}

/** German mode retains the existing English gloss; custom glosses stay verbatim. */
export function wordMeaning(
  word: { id: string; en: string },
  locale: Locale,
  custom = false,
): string {
  return custom || word.id.startsWith('custom-')
    ? word.en
    : translate(word.en, word.en, locale);
}

export function supportText(english: string, locale: Locale): string {
  return translate(english, english, locale);
}
