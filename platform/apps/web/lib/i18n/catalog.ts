import messages from './messages.json';
import germanMessages from './messages.de.json';
import { translateStudyDynamic } from './study-dynamic';
import { translateStudyReference } from './study-references';

export const SUPPORTED_LOCALES = ['hy', 'ru', 'en', 'de'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'hy';
export const LOCALE_KEY = 'german-learning-locale-v1';
export const LOCALE_LABELS: Record<Locale, string> = {
  hy: 'Հայերեն',
  ru: 'Русский',
  en: 'English',
  de: 'Deutsch',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && SUPPORTED_LOCALES.some(locale => locale === value);
}

type TranslatedLocale = Exclude<Locale, 'en'>;
type Translation = Record<TranslatedLocale, string>;

// JSX entity spellings become characters before they reach a component.
// Decode those spellings in keys/values as text, never as HTML.
function decodeEntities(value: string): string {
  const entities: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0',
    hellip: '…', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’',
    ldquo: '“', rdquo: '”', times: '×', copy: '©',
  };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
    if (!name.startsWith('#')) return entities[name.toLowerCase()] ?? entity;
    const point = name[1]?.toLowerCase() === 'x' ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1));
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
  });
}
const normalizeSource = (value: string) => decodeEntities(value).trim().replace(/\s+/g, ' ');

// English is the source language, never another locale's fallback dictionary.
// Keep German separate so missing German entries cannot silently become Armenian.
const german: Record<string, string> = germanMessages;
const catalog = new Map<string, Translation>(Object.entries(messages).map(([source, entry]) => [
  normalizeSource(source),
  { hy: decodeEntities(entry.hy), ru: decodeEntities(entry.ru), de: decodeEntities(german[source] ?? source) },
]));
const folded = new Map([...catalog].map(([source, entry]) => [source.toLowerCase(), entry]));

const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const numericParameters = new Set(['count', 'current', 'total', 'completed', 'percent', 'number', 'correct']);

// Only explicitly translated UI templates are interpolated. Captured lesson
// text, answers and names remain verbatim; they are never translated as words.
const templates = [...catalog]
  .filter(([source]) => /\{[a-z]+\}/i.test(source))
  .sort(([left], [right]) => right.length - left.length)
  .map(([source, translations]) => {
    const parameters: string[] = [];
    let previous = 0;
    let pattern = '^';
    for (const match of source.matchAll(/\{([a-z]+)\}/gi)) {
      const name = match[1]!;
      pattern += escapePattern(source.slice(previous, match.index));
      pattern += numericParameters.has(name) ? '([0-9]+(?:[.,][0-9]+)?)'
        : name === 'translatedword' ? '([^.!?]+?)' : '(.+?)';
      parameters.push(name);
      previous = match.index! + match[0].length;
    }
    pattern += escapePattern(source.slice(previous)) + '$';
    return { pattern: new RegExp(pattern), parameters, translations, hasSeparator: source.includes(' · ') };
  });

function translateKnownText(source: string, locale: TranslatedLocale, depth = 0, missing?: Set<string>): string {
  if (depth > 8) { missing?.add(source); return source; }
  const dynamic = translateStudyDynamic(source, locale);
  if (dynamic !== null) return dynamic;
  const reference = translateStudyReference(source, locale);
  if (reference !== null) return reference;
  const exact = catalog.get(source) ?? folded.get(source.toLowerCase());
  if (exact) return exact[locale];

  for (const template of templates) {
    // A broad label such as "Lesson {valuea}" must not swallow an adjacent
    // independent label, e.g. "Lesson 12 · Practice".
    if (source.includes(' · ') && !template.hasSeparator) continue;
    const match = source.match(template.pattern);
    if (!match) continue;
    return template.translations[locale].replace(/\{([a-z]+)\}/gi, (placeholder, name: string) => {
      const index = template.parameters.indexOf(name);
      if (index < 0) return placeholder;
      const value = match[index + 1]!;
      // Only explicitly marked English display values are localized. German
      // stimuli, answers, names and arbitrary supplied values stay verbatim.
      return name.startsWith('translated') ? translateKnownText(value, locale, depth + 1, missing) : value;
    });
  }

  // Separators connect independent UI labels. Unknown sections, such as
  // German book titles, retain their original text.
  if (source.includes(' · ')) {
    return source.split(' · ').map(part => translateKnownText(part, locale, depth + 1, missing)).join(' · ');
  }

  const numbered = source.match(/^(Lesson|Lessons|Through Lesson|Step|Page|Question|Level|Round|Track) (\d+(?:\s*[-–/]\s*\d+)?)$/);
  if (numbered) return `${catalog.get(numbered[1]!)![locale]} ${numbered[2]}`;

  const counted = source.match(/^(\d+) (lessons|activities|minutes|words|items|pages|cards|saved review items|guided activities|concepts)$/);
  if (counted) return `${counted[1]} ${catalog.get(counted[2]!)![locale]}`;

  const arrow = source.match(/^(←\s*)(.+)$|^(.+?)(\s*[→↗])$/);
  if (arrow) return arrow[1]
    ? `${arrow[1]}${translateKnownText(arrow[2]!, locale, depth + 1, missing)}`
    : `${translateKnownText(arrow[3]!, locale, depth + 1, missing)}${arrow[4]}`;

  if (source.includes(' — ')) {
    return source.split(' — ').map(part => translateKnownText(part, locale, depth + 1, missing)).join(' — ');
  }
  // Vocabulary cards merge independently authored meanings with a slash.
  if (source.includes(' / ')) {
    return source.split(' / ').map(part => translateKnownText(part, locale, depth + 1, missing)).join(' / ');
  }
  const sentences = source.split(/(?<=[.!?])\s+/);
  if (sentences.length > 1) {
    return sentences.map(sentence => translateKnownText(sentence, locale, depth + 1, missing)).join(' ');
  }

  missing?.add(source);
  return source;
}

/** Report untranslated English-source fragments, including inside UI templates. */
export function untranslatedSourceFragments(text: string): string[] {
  const missing = new Set<string>();
  translateKnownText(normalizeSource(text), 'hy', 0, missing);
  return [...missing].filter(part => /[a-z]/i.test(part));
}

export function translate(text: string, locale: Locale): string {
  if (locale === 'en' || !text.trim()) return text;
  const source = normalizeSource(text);
  const translated = translateKnownText(source, locale);
  // Preserve whitespace in unknown source content and around JSX text nodes.
  return translated === source ? text : text.replace(text.trim(), () => translated);
}

/** Translate a known UI message while keeping its supplied values untouched. */
export function translateMessage(
  source: string,
  values: Record<string, string | number>,
  locale: Locale,
): string {
  return translate(source, locale).replace(/\{([a-z]+)\}/gi, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder,
  );
}
