import { translate } from './i18n.js';
import type { Locale } from './catalog.js';

// Source-qualification overlay; the immutable candidate remains unchanged.
export function imageOnlyObject(page: number, objectId: string) {
  return (page === 15 && objectId === 'obj-021') || (page === 24 && objectId === 'obj-006');
}
export function pageQualification(page: number, lang: Locale): string | null {
  const t = (de: string, en: string) => translate(de, en, lang);
  if (page === 15 || page === 24) return t('Der Hinweis am inneren Seitenrand ist nicht vollständig bestätigt. Lies ihn im Scan; die unbestätigte Erweiterung wird hier nicht als Verlagstext angezeigt.', 'The inner-gutter note is not fully confirmed. Read it in the scan; the unconfirmed expansion is not displayed here as publisher text.');
  if (page === 32 || (page >= 35 && page <= 44)) return t('Einzelne Zeichen am Falz oder am Ende von Hinweisen bleiben unklar. Vergleiche diese Stellen mit dem Scan.', 'Some gutter characters and hint endings remain unclear. Compare these passages with the scan.');
  if (page === 84 || page === 86) return t('Die Zielwörter sind erfasst; die genaue Einbeziehung benachbarter Satzzeichen in Unterstreichungen ist nicht bestätigt.', 'Target words are captured; exact inclusion of adjacent punctuation in underlines is not certified.');
  if (page === 85) return t('Die Spalten der Redemitteltabelle sind unabhängige Kategorien. Wörter in derselben Zeile sind nicht automatisch Synonyme.', 'The phrase-table columns are independent categories. Entries on the same row are not automatically synonyms.');
  return null;
}
