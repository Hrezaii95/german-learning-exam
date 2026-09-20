import {
  createEmptyLearnerState, defaultMigrationRegistry, hydrateLearnerState,
  LEARNER_STATE_STORAGE_KEY, type LearnerStateEnvelope,
} from "@german-learning/learning";
import { ALPHA_CONTENT_BUNDLE, learnerPublishedContentResolver } from "../learner-state/registry";
import { defaultStudyScope, parseStudyScope, STUDY_SCOPE_KEY, type StudyScope } from "./scope";
import { emptyStudy, parseStudy, STUDY_KEY } from "./storage";
import type { StudyState } from "./types";

export type BackupStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type CompleteBackup = {
  format: "german-learning-complete";
  version: 1;
  exportedAt: string;
  learner: LearnerStateEnvelope;
  study: StudyState;
  scope: StudyScope;
};
export type ImportedBackup = Partial<Pick<CompleteBackup, "learner" | "study" | "scope">>;
export const BACKUP_KEYS = [LEARNER_STATE_STORAGE_KEY, STUDY_KEY, STUDY_SCOPE_KEY] as const;
const validation = { publishedIds: learnerPublishedContentResolver, expectedContentBundle: ALPHA_CONTENT_BUNDLE };

function validateLearner(value: unknown): LearnerStateEnvelope {
  return hydrateLearnerState(defaultMigrationRegistry.migrateToCurrent(value, validation), { ...validation, now: new Date() }).state;
}

export function createCompleteBackup(store: BackupStore): CompleteBackup {
  const learner = store.getItem(LEARNER_STATE_STORAGE_KEY);
  return {
    format: "german-learning-complete", version: 1, exportedAt: new Date().toISOString(),
    learner: validateLearner(learner ? JSON.parse(learner) : createEmptyLearnerState({ contentBundle: ALPHA_CONTENT_BUNDLE })),
    study: parseStudy(store.getItem(STUDY_KEY)), scope: parseStudyScope(store.getItem(STUDY_SCOPE_KEY)),
  };
}

/** Older partial backups replace only the data they contain. */
export function parseBackup(text: string): ImportedBackup {
  if (new TextEncoder().encode(text).byteLength > 20_000_000) throw new Error("This backup exceeds 20 MB.");
  const data: unknown = JSON.parse(text);
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("This is not a learning backup.");
  if ("format" in data) {
    const full = data as CompleteBackup;
    if (full.format !== "german-learning-complete" || full.version !== 1 || !full.study || !full.scope || !full.learner) throw new Error("Unsupported or incomplete backup.");
    return { learner: validateLearner(full.learner), study: parseStudy(JSON.stringify(full.study)), scope: parseStudyScope(JSON.stringify(full.scope)) };
  }
  if ("schemaVersion" in data) return { learner: validateLearner(data) };
  if ("version" in data && "saved" in data) return { study: parseStudy(text) };
  throw new Error("This is not a supported learning backup.");
}

function union<T>(imported: readonly T[], current: readonly T[], key: (item: T) => string): T[] {
  return [...new Map([...imported, ...current].map(item => [key(item), item])).values()];
}

export function mergeBackup(current: CompleteBackup, incoming: ImportedBackup): ImportedBackup {
  const merged: ImportedBackup = {};
  if (incoming.study) {
    const a = incoming.study, b = current.study;
    merged.study = { ...b, ...(b.lastLesson === undefined && a.lastLesson !== undefined ? { lastLesson: a.lastLesson } : {}), saved: { ...a.saved, ...b.saved }, bookmarks: [...new Set([...a.bookmarks, ...b.bookmarks])],
      completedPages: [...new Set([...a.completedPages, ...b.completedPages])], resume: b.resume ?? a.resume,
      lessonSessions: { ...a.lessonSessions, ...b.lessonSessions }, reviewedProfessions: [...new Set([...(a.reviewedProfessions ?? []), ...(b.reviewedProfessions ?? [])])],
      ...(b.reader ?? a.reader ? { reader: b.reader ?? a.reader } : {}),
      ...(a.audioProgress || b.audioProgress ? { audioProgress: { ...a.audioProgress, ...b.audioProgress } } : {}) };
  }
  if (incoming.learner) {
    const a = incoming.learner, b = current.learner;
    merged.learner = validateLearner({ ...b, resume: b.resume ?? a.resume,
      activityProgress: union(a.activityProgress, b.activityProgress, item => item.activityId),
      events: union(a.events, b.events, item => item.eventId), reviewCards: union(a.reviewCards, b.reviewCards, item => item.cardId),
      notes: union(a.notes, b.notes, item => item.contentId), tags: union(a.tags, b.tags, item => `${item.contentId}:${item.tag}`),
      recordings: union(a.recordings, b.recordings, item => item.recordingId) });
  }
  // Merge preserves this device's settings, selection and conflicting items.
  return merged;
}

/** Validate every section before writing; roll back completed writes on failure. */
export function applyBackup(store: BackupStore, incoming: ImportedBackup): void {
  const writes: [string, string][] = [];
  if (incoming.learner) writes.push([LEARNER_STATE_STORAGE_KEY, JSON.stringify(validateLearner(incoming.learner))]);
  if (incoming.study) writes.push([STUDY_KEY, JSON.stringify(parseStudy(JSON.stringify(incoming.study)))]);
  if (incoming.scope) writes.push([STUDY_SCOPE_KEY, JSON.stringify(parseStudyScope(JSON.stringify(incoming.scope)))]);
  const previous = new Map(writes.map(([key]) => [key, store.getItem(key)]));
  const changed: string[] = [];
  try {
    for (const [key, value] of writes) { store.setItem(key, value); changed.push(key); }
  } catch {
    let restored = true;
    for (const key of changed.reverse()) {
      try { const old = previous.get(key); if (old == null) store.removeItem(key); else store.setItem(key, old); }
      catch { restored = false; }
    }
    throw new Error(restored ? "Import could not be saved. Your previous data was preserved." : "Storage failed during recovery. Keep your backup file and restore again when browser storage is available.");
  }
}

export function emptyCompleteBackup(): ImportedBackup {
  return { learner: createEmptyLearnerState({ contentBundle: ALPHA_CONTENT_BUNDLE }), study: emptyStudy(), scope: defaultStudyScope() };
}
