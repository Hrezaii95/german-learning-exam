/**
 * Reviewer verdicts for the pronunciation listening surface.
 *
 * Pure data. No DOM, no storage, no clock: the browser hands in the stored
 * string and the timestamp, this module decides what the next book looks like.
 * That is what makes the whole verdict lifecycle testable without a browser,
 * and it is also why a client component may import it (see the header of
 * `pronunciation-review.ts` for the build failure that rule prevents).
 *
 * TWO RULES THIS FILE EXISTS TO ENFORCE
 *
 * 1. Reviewer verdicts are not learner state. They live under their own key in
 *    their own namespace (`REVIEW_VERDICT_STORAGE_KEY`), in their own shape,
 *    and nothing here can reach the learner store: mixing a reviewer opinion
 *    into a learner profile would corrupt somebody's progress with an internal
 *    judgement about a recording.
 *
 * 2. A verdict judges a specific recording, not a name. Every entry carries the
 *    SHA-256 of the audio that was playing when it was recorded, so if a clip
 *    is ever regenerated the download can say plainly that the verdict is about
 *    bytes that no longer ship, instead of silently carrying an approval
 *    forward onto a different recording.
 *
 * Nothing here approves anything. A verdict is one named person saying what
 * they heard; what happens next is a human decision made elsewhere.
 */
import type {
  PronunciationReviewClip,
  PronunciationRiskTagId,
} from "./pronunciation-review";

/**
 * The reviewer's own key, in its own namespace.
 *
 * Learner progress lives under `german-learning:learner-state:v1`. This key
 * deliberately does not share that prefix, so anyone reading a storage dump
 * can tell at a glance which entry belongs to a learner and which belongs to
 * somebody auditing a voice.
 */
export const REVIEW_VERDICT_STORAGE_KEY =
  "german-learning-reviewer-tools:pronunciation-listening:v1" as const;

export const REVIEW_VERDICT_BOOK_VERSION = 1 as const;
export const REVIEW_EXPORT_SCHEMA_VERSION = 1 as const;

export type ReviewVerdict = "approve" | "needs-re-record" | "reject";

export const REVIEW_VERDICTS: readonly ReviewVerdict[] = Object.freeze([
  "approve",
  "needs-re-record",
  "reject",
]);

/** Button wording, in the order the controls appear. */
export const REVIEW_VERDICT_LABELS: Readonly<Record<ReviewVerdict, string>> =
  Object.freeze({
    approve: "Approve",
    "needs-re-record": "Needs re-record",
    reject: "Reject",
  });

/** The sentence under each control, so a first-time listener knows the scale. */
export const REVIEW_VERDICT_HINTS: Readonly<Record<ReviewVerdict, string>> =
  Object.freeze({
    approve: "Good enough to teach a beginner with.",
    "needs-re-record": "Understandable, but a learner would copy something wrong.",
    reject: "Not the German this is meant to say.",
  });

/** One clip, one listener, one sitting. */
export type ReviewVerdictEntry = Readonly<{
  clipId: string;
  /** SHA-256 of the audio this opinion was formed about. */
  sha256: string;
  /** null means a note was written but no verdict chosen yet. */
  verdict: ReviewVerdict | null;
  note: string;
  /** ISO timestamp handed in by the caller. */
  recordedAt: string;
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

export function isReviewVerdict(value: unknown): value is ReviewVerdict {
  return (
    typeof value === "string" &&
    (REVIEW_VERDICTS as readonly string[]).includes(value)
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

  const source = parsed as { reviewer?: unknown; entries?: unknown };
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
      verdict: isReviewVerdict(row.verdict) ? row.verdict : null,
      note: typeof row.note === "string" ? row.note : "",
      recordedAt: typeof row.recordedAt === "string" ? row.recordedAt : "",
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

/** Record a verdict. An existing note on the same clip is kept. */
export function recordVerdict(
  book: ReviewVerdictBook,
  input: Readonly<{
    clipId: string;
    sha256: string;
    verdict: ReviewVerdict;
    recordedAt: string;
  }>,
): ReviewVerdictBook {
  const existing = verdictFor(book, input.clipId);
  return withEntry(
    book,
    input.clipId,
    Object.freeze({
      clipId: input.clipId,
      sha256: input.sha256,
      verdict: input.verdict,
      note: existing?.note ?? "",
      recordedAt: input.recordedAt,
    }),
  );
}

/** Record a note. A note on its own does not count as a reviewed clip. */
export function recordNote(
  book: ReviewVerdictBook,
  input: Readonly<{
    clipId: string;
    sha256: string;
    note: string;
    recordedAt: string;
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
      verdict: existing?.verdict ?? null,
      note: input.note,
      recordedAt: input.recordedAt,
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

/** A clip counts as reviewed only once one of the three answers is chosen. */
export function isReviewed(book: ReviewVerdictBook, clipId: string): boolean {
  return verdictFor(book, clipId)?.verdict != null;
}

export function reviewedCount(
  book: ReviewVerdictBook,
  clips: readonly PronunciationReviewClip[],
): number {
  return clips.filter((clip) => isReviewed(book, clip.id)).length;
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
  riskTags: readonly PronunciationRiskTagId[];
  usedOn: readonly string[];
  verdict: ReviewVerdict | null;
  note: string;
  reviewer: string;
  recordedAt: string;
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
  clipsReviewed: number;
  rows: readonly ReviewExportRow[];
}>;

/**
 * What the listener carries out of the room.
 *
 * Self-contained on purpose: whoever opens this file later gets the German, the
 * hash, the duration, the sounds to check and where the clip is used, so they
 * can act on it without this app, this repository, or this page being
 * available. The reviewer's name is repeated on every row for the same reason —
 * rows get pasted into other documents one at a time.
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
        riskTags: clip.riskTags,
        usedOn: Object.freeze(clip.usages.map((usage) => usage.label)),
        verdict: entry?.verdict ?? null,
        note: entry?.note ?? "",
        reviewer: book.reviewer,
        recordedAt: entry?.recordedAt ?? "",
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
      "records what was heard; it changes nothing in the app.",
    voice: first?.voice ?? "",
    generationRate: first?.rate ?? "",
    clipsInApp: clips.length,
    clipsInWholeGeneratedSet: input.clipsInWholeGeneratedSet,
    clipsReviewed: reviewedCount(book, clips),
    rows: Object.freeze(rows),
  });
}

/** Stable, sortable filename: one download per sitting, no collisions. */
export function reviewExportFilename(generatedAt: string): string {
  const stamp = generatedAt.replace(/[:.]/g, "-").replace(/Z$/, "");
  return `german-pronunciation-listening-notes-${stamp}.json`;
}
