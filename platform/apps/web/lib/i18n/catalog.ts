import messages from './messages.json';
export type Locale = 'hy' | 'ru' | 'en';
export const DEFAULT_LOCALE: Locale = 'hy';
export const LOCALE_KEY = 'german-learning-locale-v1';
export const isLocale = (value: unknown): value is Locale => value === 'hy' || value === 'ru' || value === 'en';
const catalog: Record<string, {hy:string;ru:string}> = messages;
const folded=Object.fromEntries(Object.entries(catalog).map(([key,value])=>[key.toLowerCase(),value]));
export function translate(text: string, locale: Locale): string {
  if(locale === 'en' || !text.trim()) return text;
  const key=text.trim().replace(/\s+/g,' ');
  const exact=(catalog[key]??folded[key.toLowerCase()])?.[locale];
  if(exact) return text.replace(text.trim(),exact);
  // Numbered labels retain their original IDs and counts; only presentation changes.
  const numbered=key.match(/^(Lesson|Lessons|Through Lesson|Step|Page|Question|Level|Round|Track) (.+)$/);
  if(numbered && catalog[numbered[1]!]) return `${catalog[numbered[1]!]![locale]} ${numbered[2]}`;
  // Separators join independent labels; never split German examples or user input.
  if(key.includes(' · ')) return key.split(' · ').map(part=>translate(part,locale)).join(' · ');
  const counted=key.match(/^(\d+) (lessons|activities|minutes|words|items|pages|cards|saved review items|guided activities|concepts)$/);
  if(counted && catalog[counted[2]!])return `${counted[1]} ${catalog[counted[2]!]![locale]}`;
  return text;
}
