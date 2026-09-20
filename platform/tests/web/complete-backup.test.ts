import { describe, expect, it } from "vitest";
import { LEARNER_STATE_STORAGE_KEY } from "@german-learning/learning";
import { applyBackup, createCompleteBackup, emptyCompleteBackup, mergeBackup, parseBackup, type BackupStore } from "../../apps/web/lib/study/backup";
import { emptyStudy, parseStudy, STUDY_KEY } from "../../apps/web/lib/study/storage";
import { defaultStudyScope, STUDY_SCOPE_KEY } from "../../apps/web/lib/study/scope";
import type { StudyState } from "../../apps/web/lib/study/types";

function memoryStore(): BackupStore & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: key => { values.delete(key); } };
}
const study: StudyState = {
  ...emptyStudy(), saved: { electrician: { id: "electrician", title: "der Elektriker", meaning: "electrician", kind: "word", href: "/collections/professions/01", note: "four forms", interval: 3, due: "2026-09-24T10:00:00Z" } },
  bookmarks: ["coursebook-74"], completedPages: ["coursebook-73"], resume: "coursebook-74",
  lessonSessions: { "12": { tab: "Practice", position: 1, answers: ["bin"], quizKey: "test-quiz" } }, reviewedProfessions: ["profession:01"],
};

describe("complete learning backup", () => {
  it("restores saved items, notes, review dates, bookmarks, sessions, scope and preferences into an empty device", () => {
    const source = memoryStore(); const learner = emptyCompleteBackup().learner!;
    applyBackup(source, { learner: { ...learner, settings: { timezone: "Asia/Tehran", preferredAudioSpeed: 0.75 } }, study, scope: { ...defaultStudyScope(), mode: "one", lessons: [12] } });
    const backup = createCompleteBackup(source); const target = memoryStore();
    applyBackup(target, parseBackup(JSON.stringify(backup)));
    const restored = createCompleteBackup(target);
    expect(restored.study).toEqual(study);
    expect(restored.learner.settings).toEqual(backup.learner.settings);
    expect(restored.scope.lessons).toEqual([12]);
  });

  it("rejects malformed or unsupported files before changing any existing section", () => {
    const store = memoryStore(); applyBackup(store, { study });
    const before = [...store.values];
    expect(() => applyBackup(store, parseBackup('{"format":"german-learning-complete","version":2}'))).toThrow();
    const corrupted = { ...createCompleteBackup(store), study: { ...study, saved: { broken: { id: "other" } } } };
    expect(() => applyBackup(store, parseBackup(JSON.stringify(corrupted)))).toThrow();
    expect([...store.values]).toEqual(before);
  });

  it("merges additions while keeping current conflicting notes, preferences and session progress", () => {
    const store = memoryStore(); applyBackup(store, { study });
    const current = createCompleteBackup(store);
    const imported = { ...study, saved: { electrician: { ...study.saved.electrician!, note: "older note" }, chair: { id: "chair", title: "der Stuhl", meaning: "chair", kind: "word" as const, href: "/vocabulary/l4-stuhl" } }, bookmarks: ["workbook-76"] };
    applyBackup(store, mergeBackup(current, { study: imported, learner: { ...current.learner, settings: { timezone: "UTC", preferredAudioSpeed: 1.5 } } }));
    const restored = createCompleteBackup(store);
    expect(Object.keys(restored.study.saved)).toHaveLength(2);
    expect(restored.study.saved.electrician?.note).toBe("four forms");
    expect(restored.study.bookmarks).toEqual(expect.arrayContaining(["coursebook-74", "workbook-76"]));
    expect(restored.learner.settings).toEqual(current.learner.settings);
    expect(restored.study.lessonSessions).toEqual(study.lessonSessions);
  });

  it("keeps the current course note when another device used a different note ID for the same content", () => {
    const store = memoryStore(); const learner = emptyCompleteBackup().learner!;
    const currentNote = { noteId: "00000000-0000-4000-8000-000000000001", contentId: "lex:architekt", text: "Current note", updatedAt: "2026-09-20T10:00:00.000Z" };
    applyBackup(store, { learner: { ...learner, notes: [currentNote] } });
    const incoming = { ...learner, notes: [{ ...currentNote, noteId: "00000000-0000-4000-8000-000000000002", text: "Other device note" }] };
    applyBackup(store, mergeBackup(createCompleteBackup(store), { learner: incoming }));
    expect(createCompleteBackup(store).learner.notes).toEqual([currentNote]);
  });

  it("accepts both old backup formats and replaces only sections present in the file", () => {
    const store = memoryStore(); applyBackup(store, { study, scope: { ...defaultStudyScope(), mode: "one", lessons: [12] } });
    const original = createCompleteBackup(store);
    applyBackup(store, parseBackup(JSON.stringify(original.learner)));
    expect(createCompleteBackup(store).study).toEqual(study);
    applyBackup(store, parseBackup(JSON.stringify(emptyStudy())));
    expect(createCompleteBackup(store).study.saved).toEqual({});
    expect(createCompleteBackup(store).scope).toEqual(original.scope);
    expect(createCompleteBackup(store).learner).toEqual(original.learner);
  });

  it("rolls back earlier writes if storage fails partway through replacement", () => {
    const store = memoryStore(); applyBackup(store, { study });
    const original = [...store.values]; let fail = true;
    const failing: BackupStore = { ...store, setItem(key, value) { if (key === STUDY_SCOPE_KEY && fail) { fail = false; throw new Error("full"); } store.setItem(key, value); } };
    expect(() => applyBackup(failing, emptyCompleteBackup())).toThrow(/previous data was preserved/);
    expect([...store.values]).toEqual(original);
    expect(store.getItem(LEARNER_STATE_STORAGE_KEY)).toBeNull();
  });

  it("reset clears both learning systems and scope while leaving unrelated browser data alone", () => {
    const store = memoryStore(); store.setItem("unrelated", "keep"); applyBackup(store, { study });
    applyBackup(store, emptyCompleteBackup());
    expect(createCompleteBackup(store).study).toEqual(emptyStudy());
    expect(store.getItem("unrelated")).toBe("keep");
  });

  it("preserves removed items after save and reload, and rejects invalid session state", () => {
    const store = memoryStore(); applyBackup(store, { study: { ...study, saved: {} } });
    expect(parseStudy(store.getItem(STUDY_KEY)).saved).toEqual({});
    expect(() => parseStudy(JSON.stringify({ ...study, lessonSessions: { "12": { ...study.lessonSessions!["12"], position: -1 } } }))).toThrow(/progress/);
  });
});
