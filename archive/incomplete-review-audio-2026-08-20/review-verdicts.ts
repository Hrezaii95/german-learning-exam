/**
 * Reviewer verdicts for the pronunciation listening surface.
 *
 * Pure data. No DOM, no storage, no clock: the browser hands in the stored
 * string and the timestamp, this module decides what the next book looks like.
 * That is what makes the whole verdict lifecycle testable without a browser.
 *
 * TWO RULES THIS FILE EXISTS TO ENFORCE
 *
 * 1. Reviewer verdicts are not learner state. They live under their own key
 *    (`REVIEW_VERDICT_STORAGE_KEY`), in their own shape, and nothing here can
 *    reach the learner store: mixing a reviewer opinion into a learner profile
 *    would corrupt someone else's progress with an internal judgement.
 *
 * 2. A verdict judges a specific recording, not a name. Every entry carries the
 *    SHA-256 of the audio that was playing when it was recorded, so if the
 *    clip is ever regenerated the export can say plainly that the verdict is
 *    about bytes that no longer ship, instead of silently carrying an approval
 *    forward onto a different recording.
 *
 * Nothing here approves anything. A verdict is one named person saying what
 * they heard; what happens next is a human decision made elsewhere.
 */
import type { PronunciationReviewClip, SoundClassId } from "./pronunciation-review";

/**
 * The reviewer's own key. Deliberately nothing like
 * `german-learning:learner-state:v1` — a reader scanning storage should never
 * have to work out which of two similar keys holds a learner's progress.
 */
export const REVIEW_VERDICT_STORAGE_KEY =
  "german-learning:pronunciation-listening-review:v1" as const;

export const REVIEW_VERDICT_BOOK_VERSION = 1 as const;
export const REVIEW_EXPORT_SCHEMA_VERSION = 1 as const;

export type ReviewVerdictChoice = "approve" | "re-record" | "reject";

export const REVIEW_VERDICT_CHOICES: readonly ReviewVerdictChoice[] =
  Object.freeze(["approve", "re-record", "reject"]);

/** Button wording, in the order the controls appear. */
export const REVIEW_VERDICT_LABELS: Readonly<
  Record<ReviewVerdictChoice, string>
> = Object.freeze({
  approve: "Sounds right",
  "re-record": "Needs re-recording",
  reject: "Wrong",
});

/** One clip, one listener, one sitting. */
export type ReviewVerdictEntry = Readonly<{
  clipId: string;
  /** SHA-256 of the audio this opinion was formed about. */
  sha256: string;
  /** null means a note was written but no decision made yet. */
  choice: ReviewVerdictChoice | null;
  note: string;
  /** ISO timestamp handed in by the caller. */
  decidedAt: string;
}>;

export type ReviewVerdictBook = Readonly<{
  schemaVersion: typeof REVIEW_VERDICT_BOOK_VERSION;
  /** Who is listening. Empty until they type their name. */
  reviewer: string;
  entries: Readonly<Record<string, ReviewVerdictEntry>>;
}>;

export function emptyVerdictBook(): ReviewVerdictBook {
  return Object.freeze({
    schemaVersion: REVIEW_VERDICT_BOOK_VERSION,
    reviewer: "",
    entries: Object.freeze({}),
  });
}

function isChoice(value: unknown): value is ReviewVerdictChoice {
  return (
    typeof value === "string" &&
    (REVIEW_VERDICT_CHOICES as readonly string[]).includes(value)
  );
}

/**
 * Read a stored book back.
 *
 * Deliberately forgiving in one direction only: anything unreadable becomes an
 * empty book rather than an exception, because a reviewer three hours into a
 * sitting must never meet a blank screen. It is strict about entry contents —
 * a row missing its clip id or its hash is dropped, because a verdict that
 * cannot say what it judged is not evidence of anything.
 */
export function parseVerdictBook(raw: string | null): ReviewVerdictBook {
  if (!raw) return emptyVerdictBook();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyVerdictBook();
  }
  if (typeof parsed !== "object" || parsed === null) return emptyVerdictBook();

  const source = parsed as {
    reviewer?: unknown;
    entries?: unknown;
  };
  const entries: Record<string, ReviewVerdictEntry> = {};
  const rows =
    typeof source.entries === "object" && source.entries !== null
      ? (source.entries as Record<string, unknown>)
      : {};

  for (const [clipId, value] of Object.entries(rows)) {
    if (typeof value !== "object" || value === null) continue;
    const row = value as Record<string, unknown>;
    const sha256 = typeof row.sha256 === "string" ? row.sha256 : "";
    if (!clipId || !sha256) continue;
    entries[clipId] = Object.freeze({
      clipId,
      sha256,
      choice: isChoice(row.choice) ? row.choice : null,
      note: typeof row.note === "string" ? row.note : "",
      decidedAt: typeof row.decidedAt === "string" ? row.decidedAt : "",
    });
  }

  return Object.freeze({
    schemaVersion: REVIEW_VERDICT_BOOK_VERSION,
    reviewer: typeof source.reviewer === "string" ? source.reviewer : "",
    entries: Object.freeze(entries),
  });
}

export function serializeVerdictBook(book: ReviewVerdictBook): string {
  return JSON.stringify(book);
}

function withEntry(
  book: ReviewVerdictBook,
  clipId: string,
  entry: ReviewVerdictEntry | null,
): ReviewVerdictBook {
  const entries: Record<string, ReviewVerdictEntry> = { ...book.entries };
  if (entry === null) delete entries[clipId];
  else entries[clipId] = entry;
  return Object.freeze({
    schemaVersion: REVIEW_VERDICT_BOOK_VERSION,
    reviewer: book.reviewer,
    entries: Object.freeze(entries),
  });
}

export function verdictFor(
  book: ReviewVerdictBook,
  clipId: string,
): ReviewVerdictEntry | null {
  return book.entries[clipId] ?? null;
}

/** Record a decision. An existing note on the same clip is kept. */
export function recordChoice(
  book: ReviewVerdictBook,
  input: Readonly<{
    clipId: string;
    sha256: string;
    choice: ReviewVerdictChoice;
    decidedAt: string;
  }>,
): ReviewVerdictBook {
  const existing = verdictFor(book, input.clipId);
  return withEntry(
    book,
    input.clipId,
    Object.freeze({
      clipId: input.clipId,
      sha256: input.sha256,
      choice: input.choice,
      note: existing?.note ?? "",
      decidedAt: input.decidedAt,
    }),
  );
}

/** Record a note. A note on its own does not count as a decision. */
export function recordNote(
  book: ReviewVerdictBook,
  input: Readonly<{
    clipId: string;
    sha256: string;
    note: string;
    decidedAt: string;
  }>,
): ReviewVerdictBook {
  const existing = verdictFor(book, input.clipId);
  if (!existing && input.note.trim() === "") return book;
  return withEntry(
    book,
    input.clipId,
    Object.freeze({
      clipId: input.clipId,
      sha256: input.sha256,
      choice: existing?.choice ?? null,
      note: input.note,
      decidedAt: input.decidedAt,
    }),
  );
}

/** Undo everything recorded about one clip. */
export function clearVerdict(
  book: ReviewVerdictBook,
  clipId: string,
): ReviewVerdictBook {
  if (!book.entries[clipId]) return book;
  return withEntry(book, clipId, null);
}

export function withReviewer(
  book: ReviewVerdictBook,
  reviewer: string,
): ReviewVerdictBook {
  return Object.freeze({
    schemaVersion: REVIEW_VERDICT_BOOK_VERSION,
    reviewer,
    entries: book.entries,
  });
}

/** A clip counts as done only once someone has chosen one of the three answers. */
export function isDecided(
  book: ReviewVerdictBook,
  clipId: string,
): boolean {
  return verdictFor(book, clipId)?.choice != null;
}

export function decidedCount(
  book: ReviewVerdictBook,
  clips: readonly PronunciationReviewClip[],
): number {
  return clips.filter((clip) => isDecided(book, clip.id)).length;
}

/* ---------------------------------------------------------------------------
 * The downloadable record
 * ------------------------------------------------------------------------ */

export type ReviewExportRow = Readonly<{
  clipId: string;
  sha256: string;
  /** false when the clip has been regenerated since this verdict was formed. */
  audioMatchesVerdict: boolean;
  spokenText: string;
  audioPath: string;
  durationSeconds: number;
  soundClasses: readonly SoundClassId[];
  usedOn: readonly string[];
  choice: ReviewVerdictChoice | null;
  note: string;
  decidedAt: string;
}>;

export type ReviewExportDocument = Readonly<{
  schemaVersion: typeof REVIEW_EXPORT_SCHEMA_VERSION;
  documentKind: "german-pronunciation-listening-notes";
  generatedAt: string;
  reviewer: string;
  notice: string;
  voice: string;
  generationRate: string;
  clipsInApp: number;
  clipsInWholeGeneratedSet: number;
  clipsDecided: number;
  rows: readonly ReviewExportRow[];
}>;

/**
 * What the listener carries out of the room.
 *
 * Self-contained on purpose: whoever opens this file later gets the German, the
 * hash, the duration, the sound classes and where the clip is used, so they can
 * act on it without this app, this repository, or this page being available.
 *
 * `notice` travels inside the document rather than in a covering message,
 * because a covering message is the first thing lost when a file is forwarded.
 */
export function buildReviewExport(
  input: Readonly<{
    book: ReviewVerdictBook;
    clips: readonly PronunciationReviewClip[];
    clipsInWholeGeneratedSet: number;
    generatedAt: string;
  }>,
): ReviewExportDocument {
  const { book, clips } = input;
  const first = clips[0];

  const rows = clips
    .filter((clip) => verdictFor(book, clip.id) !== null)
    .map((clip) => {
      const entry = verdictFor(book, clip.id);
      const row: ReviewExportRow = Object.freeze({
        clipId: clip.id,
        sha256: clip.sha256,
        audioMatchesVerdict: entry?.sha256 === clip.sha256,
        spokenText: clip.spokenText,
        audioPath: clip.publicRelativePath,
        durationSeconds: clip.durationSeconds,
        soundClasses: clip.soundClasses,
        usedOn: Object.freeze(clip.usages.map((usage) => usage.label)),
        choice: entry?.choice ?? null,
        note: entry?.note ?? "",
        decidedAt: entry?.decidedAt ?? "",
      });
      return row;
    })
    .sort((left, right) => left.clipId.localeCompare(right.clipId, "en"));

  return Object.freeze({
    schemaVersion: REVIEW_EXPORT_SCHEMA_VERSION,
    documentKind: "german-pronunciation-listening-notes" as const,
    generatedAt: input.generatedAt,
    reviewer: book.reviewer,
    notice:
      "One named listener's opinion of a computer-generated German voice, " +
      "recorded against the exact audio identified by each sha256. This file " +
      "records what was heard; it does not change anything in the app.",
    voice: first?.voice ?? "",
    generationRate: first?.rate ?? "",
    clipsInApp: clips.length,
    clipsInWholeGeneratedSet: input.clipsInWholeGeneratedSet,
    clipsDecided: decidedCount(book, clips),
    rows: Object.freeze(rows),
  });
}

/** Stable, sortable filename: one download per sitting, no collisions. */
export function reviewExportFilename(generatedAt: string): string {
  const stamp = generatedAt.replace(/[:.]/g, "-").replace(/Z$/, "");
  return `german-pronunciation-listening-notes-${stamp}.json`;
}
