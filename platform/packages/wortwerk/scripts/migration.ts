import type { ContentPack, LanguageProfile, PackAudio, PackItem, PackManifest } from "../../content/src/types/packs.js";
import type { SubjectVocabularyItem } from "../../../apps/web/lib/study/subject-sheets";
import { classifyPluralPair } from "../../../apps/web/lib/study/plural-patterns";
import migrationConfig from "../../../content/packs/a1-migration.json";
import sourceProfile from "../../../content/languages/de.json";

const profile = sourceProfile as LanguageProfile;
const genderByTone: Readonly<Record<string, string>> = migrationConfig.genderByTone;

export type MigrationProblem = {
  code: "duplicate-headword" | "missing-lesson" | "invalid-row";
  headword: string;
  ids: string[];
  message: string;
};

export class A1MigrationError extends Error {
  constructor(public readonly problems: readonly MigrationProblem[]) {
    super([
      `${migrationConfig.manifest.title} migration stopped before writing files. Canonical source corrections belong to Lane 1.`,
      ...problems.map(problem => `${problem.code}: ${problem.message} [${problem.ids.join(", ")}]`),
    ].join("\n"));
    this.name = "A1MigrationError";
  }
}

/** A presentation article is stripped only when the source marks this row as a noun. */
function sourceArticle(item: Pick<SubjectVocabularyItem, "de" | "tone">): string | undefined {
  const genderId = genderByTone[item.tone];
  if (!genderId) return undefined;
  const firstWord = item.de.normalize("NFC").trim().split(/\s+/u)[0];
  return profile.genders.find(gender => gender.id === genderId && gender.article.toLocaleLowerCase(profile.locale) === firstWord?.toLocaleLowerCase(profile.locale))?.article;
}

export function a1BareHeadword(item: Pick<SubjectVocabularyItem, "de" | "tone">): string {
  const text = item.de.normalize("NFC").trim();
  return sourceArticle(item) ? text.replace(/^\S+\s+/u, "") : text;
}

export function inspectA1Vocabulary(items: readonly SubjectVocabularyItem[]): MigrationProblem[] {
  const problems: MigrationProblem[] = [];
  const headwords = new Map<string, { headword: string; ids: string[] }>();
  for (const item of items) {
    const headword = a1BareHeadword(item);
    if (!item.id.trim() || !headword || !item.meaning.trim()) {
      problems.push({ code: "invalid-row", headword, ids: [item.id], message: "A stable id, nonempty headword and meaning are required." });
    }
    const key = headword.replace(/\s+/gu, " ").toLocaleLowerCase(profile.locale);
    const previous = headwords.get(key);
    if (previous) previous.ids.push(item.id);
    else headwords.set(key, { headword, ids: [item.id] });
    if (!item.studyTags.lessons.some(lesson => Number.isInteger(lesson) && lesson > 0)) {
      problems.push({ code: "missing-lesson", headword, ids: [item.id], message: `${headword} has no source-attached lesson; no book position can be invented.` });
    }
  }
  for (const value of headwords.values()) {
    if (value.ids.length > 1) problems.push({ code: "duplicate-headword", ...value, message: `${value.headword} occurs more than once (NFC, article-free, case-folded comparison). Merge or disambiguate its canonical source rows.` });
  }
  return problems.sort((a, b) => a.code.localeCompare(b.code) || a.headword.localeCompare(b.headword, profile.locale));
}

const audio = (src: string, text: string): PackAudio => ({ src, text, review: "preview" });

function migrateItem(item: SubjectVocabularyItem): PackItem {
  const lessons = [...new Set(item.studyTags.lessons)].sort((a, b) => a - b);
  const article = sourceArticle(item);
  // Tone alone is not an article (notably country names). Preserve it as display metadata.
  const gender = article ? genderByTone[item.tone] : undefined;
  const lemma = a1BareHeadword(item);
  const plurals = [...new Set(item.plurals.map(form => form.text))];
  const pluralAudio = Object.fromEntries(item.plurals.filter(form => form.audio).map(form => [form.text, audio(form.audio!, form.text)]));
  const patterns = gender && item.tone !== "plural" ? [...new Set(plurals.map(form => classifyPluralPair(item.de, form)))] : [];
  const pos = gender ? migrationConfig.nounPos : item.category.toLocaleLowerCase("en").replace(/\s+/g, "-");
  return {
    type: "lexeme",
    id: item.id,
    unitId: `${migrationConfig.unitIdPrefix}${lessons[0]}`,
    // SubjectVocabularyItem has no exact coursebook page. In particular, a glossary
    // page is not a coursebook page, so none is guessed from source notes.
    bookRef: { book: migrationConfig.book, lesson: lessons[0]! },
    source: item.studyTags.source,
    tags: [...item.studyTags.concepts],
    lemma,
    pos,
    meaning: item.meaning,
    ...(gender ? { gender } : {}),
    ...(article ? { article } : {}),
    forms: { singular: [item.de], ...(plurals.length ? { plural: plurals } : {}), ...(patterns.length ? { pluralPattern: patterns } : {}) },
    examples: item.examples.map(example => ({ text: example.de, translation: example.en, ...(example.audio ? { audio: audio(example.audio, example.de) } : {}) })),
    ...(item.audio ? { audio: audio(item.audio, item.de) } : {}),
    ...(Object.keys(pluralAudio).length ? { pluralAudio } : {}),
    sourceRef: {
      cardId: item.cardId,
      href: item.href,
      lessons,
      sources: [...(item.studyTags.sources ?? [item.studyTags.source])],
      ...(item.studyTags.sourceLessons ? { sourceLessons: Object.fromEntries(Object.entries(item.studyTags.sourceLessons).map(([source, sourceLessons]) => [source, [...sourceLessons]])) } : {}),
    },
    display: { text: item.de, category: item.category, tone: item.tone, patterns: [...item.patterns], note: item.note },
    review: { status: "pending-german-review" },
  };
}

/** Pure, lossless row migration. Throws before returning any partial pack. */
export function migrateA1Vocabulary(items: readonly SubjectVocabularyItem[]): ContentPack {
  const problems = inspectA1Vocabulary(items);
  if (problems.length) throw new A1MigrationError(problems);
  const lessons = [...new Set(items.flatMap(item => item.studyTags.lessons))].sort((a, b) => a - b);
  return {
    ...structuredClone(migrationConfig.manifest) as PackManifest,
    units: lessons.map(lesson => ({ id: `${migrationConfig.unitIdPrefix}${lesson}`, title: `${migrationConfig.unitTitlePrefix}${lesson}`, canDo: [], bookRef: { book: migrationConfig.book, lesson } })),
    items: items.map(migrateItem),
  };
}
