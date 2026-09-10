/**
 * Source credits for the course material this app teaches from.
 *
 * ADR-016 makes the owner's grant of full Momente A1.1 / A1.2 content rights
 * conditional on crediting the book and the audio as sources, so this list is
 * a release obligation rather than a nicety. Every entry names a work that is
 * really registered in `content/source-index/source-manifest.json` — nothing
 * here is a decorative bibliography, and `tools/audit-attribution.mjs` checks
 * that the rendered page still names each required work.
 *
 * Learner-facing wording only: German titles keep their real spelling, and the
 * plain-English line says what the learner actually gets from that work.
 */

export type ReferenceWork = Readonly<{
  id: string;
  /** Title exactly as the work is called, in German where that is its name. */
  title: string;
  /** Short role chip — what kind of book or disc this is. */
  role: string;
  /** Plain-English sentence: what this app took from it. */
  contribution: string;
}>;

export type ReferenceGroup = Readonly<{
  id: string;
  title: string;
  intro: string;
  works: readonly ReferenceWork[];
}>;

export const REFERENCES_PUBLISHER = "Hueber Verlag";

export const REFERENCE_GROUPS: readonly ReferenceGroup[] = Object.freeze([
  Object.freeze({
    id: "books",
    title: "Course books and study material",
    intro:
      "The words, dialogues, grammar and exercises you study here are taken from the Momente A1.1 course.",
    works: Object.freeze([
      Object.freeze({
        id: "kursbuch",
        title: "Momente A1.1 Kursbuch",
        role: "Coursebook",
        contribution:
          "Original pages and lesson content: greetings, introductions, family, jobs, furniture, prices and opinions.",
      }),
      Object.freeze({
        id: "arbeitsbuch",
        title: "Momente A1.1 Arbeitsbuch",
        role: "Workbook",
        contribution:
          "The practice exercises, including the listening exercises whose recordings you can play in this app.",
      }),
      Object.freeze({
        id: "glossar-de-en",
        title: "Momente A1.1 KB Glossar Deutsch–Englisch",
        role: "Glossary",
        contribution:
          "The German–English word list behind the meanings and the example wording shown on vocabulary cards.",
      }),
      Object.freeze({
        id: "glossar-de-es",
        title: "Momente A1.1 KB Glossar Deutsch–Spanisch",
        role: "Glossary",
        contribution:
          "The German–Spanish word list, used to cross-check meanings and word forms.",
      }),
      Object.freeze({
        id: "transskriptionen",
        title: "Momente AB A1.1 Transskriptionen",
        role: "Audio transcripts",
        contribution:
          "The source transcripts shown beside workbook recordings in the book, listening hub and lesson activities.",
      }),
      Object.freeze({
        id: "kursbuch-transkriptionen",
        title: "Momente A1.1 Kursbuch Transkriptionen",
        role: "Audio transcripts",
        contribution:
          "Publisher transcripts for the coursebook recordings in Lessons 1–4, shown on demand so you can listen first and then read along.",
      }),
      Object.freeze({
        id: "loesungen",
        title: "Momente A1.1 KB Lösungen",
        role: "Answer key",
        contribution:
          "The official answers, used to check that the exercises in this app expect the correct solution.",
      }),
    ]),
  }),
  Object.freeze({
    id: "audio",
    title: "Audio recordings",
    intro:
      "The listening tracks in this app are the original recordings from the course CDs that accompany the Momente A1.1 books. They are played here as they were recorded — nothing is re-recorded or imitated.",
    works: Object.freeze([
      Object.freeze({
        id: "ab-cd1",
        title: "Momente A1.1 Arbeitsbuch CD 1",
        role: "Workbook audio",
        contribution:
          "Original workbook recordings for Lessons 1–4, mapped to their printed exercises in the interactive book; the earlier Listening activities remain available.",
      }),
      Object.freeze({
        id: "ab-cd2",
        title: "Momente A1.1 Arbeitsbuch CD 2",
        role: "Workbook audio",
        contribution:
          "Recordings for later workbook lessons, outside the Lessons 1–4 book in this release.",
      }),
      Object.freeze({
        id: "kb-cd1",
        title: "Momente A1.1 Kursbuch CD 1",
        role: "Coursebook audio",
        contribution:
          "Original coursebook recordings for Lessons 1–4, playable beside the matching pages in the interactive book.",
      }),
      Object.freeze({
        id: "kb-cd2",
        title: "Momente A1.1 Kursbuch CD 2",
        role: "Coursebook audio",
        contribution:
          "The coursebook recordings for the later lessons, again outside what this release builds.",
      }),
    ]),
  }),
]);

export const REFERENCE_WORK_COUNT = REFERENCE_GROUPS.reduce(
  (total, group) => total + group.works.length,
  0,
);
