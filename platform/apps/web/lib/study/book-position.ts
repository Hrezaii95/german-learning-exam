import type { ScopedBookItem, PlayScope } from "./scope";
import { matchesPlayScope } from "./scope";

/** The printed book position is confirmed by the learner; pages are never inferred. */
export type BookPosition = { v: 1; book: string; lesson: number; page?: number; lessonDone: boolean };
export type BookPositionStore = {
  getDoc<T = unknown>(key: string): T | undefined;
  setDoc(key: string, value: unknown): unknown;
  refresh?(): void;
  getSnapshot?(): { docs: readonly { key: string; schemaVersion: number; value: unknown }[] };
};
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function positive(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= 10000;
}
export class BookDocumentReadOnlyError extends Error {
  constructor() { super("Please update the app before changing your book position or practice selection."); this.name = "BookDocumentReadOnlyError"; }
}
export function requireBookDocumentsWritable(store: BookPositionStore, keys: readonly ("study.position" | "study.scope")[]): void {
  store.refresh?.();
  const docs = store.getSnapshot?.().docs;
  for (const key of keys) {
    const doc = docs?.find(value => value.key === key);
    const value = store.getDoc(key);
    if (doc && doc.schemaVersion > 1 || record(value) && typeof value.v === "number" && value.v > 1) throw new BookDocumentReadOnlyError();
  }
}
/** Also checks the result so a future record arriving during a local write is not reported as saved. */
export function setBookDocument(store: BookPositionStore, key: "study.position" | "study.scope", value: unknown): void {
  requireBookDocumentsWritable(store, [key]);
  const written = store.setDoc(key, value);
  if (record(written) && typeof written.schemaVersion === "number" && written.schemaVersion > 1) throw new BookDocumentReadOnlyError();
  if (JSON.stringify(store.getDoc(key)) !== JSON.stringify(value)) throw new Error("This change could not be saved. Review your book position and selection again.");
}

/** Accepts the original unversioned document and upgrades it to the versioned shape. */
export function parseBookPosition(value: unknown): BookPosition {
  if (!record(value) || value.v !== undefined && value.v !== 1 || typeof value.book !== "string"
    || !value.book.trim() || value.book.length > 200 || !positive(value.lesson)
    || value.page !== undefined && !positive(value.page)
    || value.lessonDone !== undefined && typeof value.lessonDone !== "boolean") throw new Error("Invalid book position");
  return { v: 1, book: value.book, lesson: value.lesson,
    ...(value.page === undefined ? {} : { page: value.page as number }), lessonDone: value.lessonDone === true };
}
export function readBookPosition(value: unknown): BookPosition | null {
  try { return parseBookPosition(value); } catch { return null; }
}
export function resolveBookPosition(personal: unknown, classDefault: unknown, book: string): BookPosition | null {
  const own = readBookPosition(personal);
  if (own?.book === book) return own;
  const shared = readBookPosition(classDefault);
  return shared?.book === book ? shared : null;
}

/** Whole lessons are represented by normal lesson filters so shared links keep the same meaning. */
export function positionScope(position: BookPosition, includeWholeCurrentLesson = false): PlayScope {
  const checked = parseBookPosition(position);
  if (checked.lessonDone || includeWholeCurrentLesson) {
    return { v: 1, book: checked.book, lessons: Array.from({ length: checked.lesson }, (_, index) => index + 1) };
  }
  if (checked.page === undefined) return { v: 1, book: checked.book, lessons: Array.from({ length: checked.lesson - 1 }, (_, index) => index + 1) };
  return { v: 1, book: checked.book, upTo: { lesson: checked.lesson,
    ...(checked.page === undefined ? {} : { page: checked.page }) } };
}
export function matchesBookPosition(item: ScopedBookItem, position: BookPosition,
  options: { includeWholeCurrentLesson?: boolean } = {}): boolean {
  return matchesPlayScope(item, positionScope(position, options.includeWholeCurrentLesson), {
    includeWholeCurrentLesson: options.includeWholeCurrentLesson === true, lessonDone: position.lessonDone,
  });
}

export type BookAdvanceTrigger =
  | { kind: "page"; book: string; lesson: number; page: number }
  | { kind: "lesson-complete"; book: string; lesson: number };
export type BookAdvanceProposal = {
  kind: "later-page" | "lesson-complete"; from: BookPosition; to: BookPosition; message: string;
};

/** Exported for book/lesson surfaces: opening a page merely proposes an advance. */
export function proposeBookAdvance(current: BookPosition, trigger: BookAdvanceTrigger): BookAdvanceProposal | null {
  const from = parseBookPosition(current);
  if (trigger.book !== from.book || !positive(trigger.lesson)) return null;
  if (trigger.kind === "lesson-complete") {
    if (trigger.lesson !== from.lesson || from.lessonDone) return null;
    return { kind: "lesson-complete", from, to: { ...from, lessonDone: true },
      message: `Mark Lesson ${from.lesson} complete and include its whole lesson in practice?` };
  }
  if (!positive(trigger.page) || trigger.lesson < from.lesson || from.lessonDone && trigger.lesson === from.lesson
    || trigger.lesson === from.lesson && from.page !== undefined && trigger.page <= from.page) return null;
  const to: BookPosition = { v: 1, book: from.book, lesson: trigger.lesson, page: trigger.page, lessonDone: false };
  return { kind: "later-page", from, to,
    message: `Move your book position to Lesson ${to.lesson}, page ${to.page}?` };
}

function equalPosition(left: BookPosition, right: BookPosition): boolean {
  return left.book === right.book && left.lesson === right.lesson && left.page === right.page && left.lessonDone === right.lessonDone;
}
export function confirmBookAdvance(store: BookPositionStore, proposal: BookAdvanceProposal,
  options: { classPosition?: unknown } = {}): BookPosition {
  requireBookDocumentsWritable(store, ["study.position", "study.scope"]);
  const from = parseBookPosition(proposal.from);
  const current = resolveBookPosition(store.getDoc("study.position"), options.classPosition, from.book);
  const to = parseBookPosition(proposal.to);
  if (!current || !equalPosition(current, from)) throw new Error("Your book position changed. Review the new position before confirming.");
  const expected = proposal.kind === "lesson-complete"
    ? proposeBookAdvance(from, { kind: "lesson-complete", book: to.book, lesson: to.lesson })
    : to.page === undefined ? null : proposeBookAdvance(from, { kind: "page", book: to.book, lesson: to.lesson, page: to.page });
  if (!expected || !equalPosition(expected.to, to)) throw new Error("Invalid book position advance");
  setBookDocument(store, "study.position", to);
  return to;
}
