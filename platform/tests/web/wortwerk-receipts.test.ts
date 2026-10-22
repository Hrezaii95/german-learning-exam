import { describe, it, expect } from "vitest";
import { encodeReceipt, decodeReceipt, parseReceipt, ReceiptCodeError, encodeStudentCode, type CompletionReceipt } from "../../apps/web/lib/wortwerk/receipts";
import { encodeChallenge, decodeChallenge, challengeHref, parseChallenge, rememberAssignment, readPendingAssignments, PENDING_ASSIGNMENTS_KEY, pendingAssignmentHref, type BlitzChallenge, resolveChallengeTarget, completedAssignmentIds } from "../../apps/web/lib/wortwerk/challenges";
import { createWortwerkStore } from "../../apps/web/lib/wortwerk/store";
const receipt: CompletionReceipt = { v: 1, assignmentId: "class-ä", packId: "sample-pack", bySkill: { meaning: { answered: 3, correct: 2 }, listening: { answered: 2, correct: 2 } }, completedAt: "2026-10-22T12:30:00.000Z", answered: 5, correct: 4 };
const challenge: BlitzChallenge = { v: 1, packId: "sample", difficultyId: "custom", scope: { v: 1, book: "Überall", lessons: [2, 3], tags: ["hobbies"], sources: ["course"], skills: ["meaning"] }, score: 120, durationSeconds: 60 };
describe("Wortwerk student result codes", () => {
    it("round trips unicode, stable skill order and totals", () => {
        const code = encodeReceipt(receipt);
        expect(code).toMatch(/^WRC1\.[A-Za-z0-9_-]+\.[a-f0-9]{8}$/u);
        expect(decodeReceipt(` ${code}\n`)).toEqual(receipt);
        expect(encodeReceipt({ ...receipt, bySkill: { listening: receipt.bySkill.listening!, meaning: receipt.bySkill.meaning! } })).toBe(code);
    });
    it("detects copied-code typos and rejects unknown future versions", () => {
        const code = encodeReceipt(receipt);
        const parts = code.split(".");
        parts[1] = (parts[1]!.startsWith("A") ? "B" : "A") + parts[1]!.slice(1);
        expect(() => decodeReceipt(parts.join("."))).toThrow(/checksum/u);
        expect(() => decodeReceipt(code.replace(/^WRC1/u, "WRC2"))).toThrow(/update/u);
        expect(() => decodeReceipt(encodeStudentCode("WRC1", { ...receipt, v: 2 }))).toThrow(/update/u);
        for (const value of ["", code.repeat(100), "WRC1.bad!.12345678", "wrong", code + ".extra"])
            expect(() => decodeReceipt(value)).toThrow(ReceiptCodeError);
    });
    it("rejects malformed counts, mismatched skills, invalid dates and prototype keys", () => {
        const invalid = [{ ...receipt, correct: 6 }, { ...receipt, answered: -1 }, { ...receipt, answered: NaN }, { ...receipt, answered: 100001 }, { ...receipt, correct: 2.5 }, { ...receipt, bySkill: { meaning: { answered: 5, correct: 3 } } }, { ...receipt, bySkill: { meaning: { answered: 3, correct: 4 } } }, { ...receipt, completedAt: "2026-02-30T12:30:00.000Z" }, { ...receipt, packId: "" }, { ...receipt, bySkill: JSON.parse('{"__proto__":{"answered":5,"correct":4}}') as unknown }];
        for (const value of invalid)
            expect(() => parseReceipt(value)).toThrow();
    });
    it("accepts an empty zero-answer receipt and ignores unknown fields", () => {
        expect(parseReceipt({ v: 1, packId: "sample", bySkill: {}, completedAt: receipt.completedAt, answered: 0, correct: 0, extra: "ignored" })).toEqual({ v: 1, packId: "sample", bySkill: {}, completedAt: receipt.completedAt, answered: 0, correct: 0 });
    });
});
describe("Wortwerk challenges and remembered assignments", () => {
    it("ignores unknown, future and malformed assignment completion evidence", () => {
        const state = createWortwerkStore(undefined, { deviceId: "evidence", now: () => new Date("2026-10-22T12:00:00.000Z") });
        const event = state.appendEvent("assignment.progress", { assignmentId: "homework", answered: 5, correct: 4, bySkill: { meaning: { answered: 5, correct: 4 } }, completed: true });
        const now = new Date("2026-10-22T12:01:00.000Z");
        expect([...completedAssignmentIds([event], now)]).toEqual(["homework"]);
        expect([...completedAssignmentIds([{ ...event, schemaVersion: 2 }], now)]).toEqual([]);
        expect([...completedAssignmentIds([{ ...event, createdAt: "2026-10-23T12:00:00.000Z" }], now)]).toEqual([]);
        expect([...completedAssignmentIds([{ ...event, payload: { ...event.payload as object, answered: 9 } }], now)]).toEqual([]);
    });
    it("compares a shared target only for exactly the same scope and difficulty", () => {
        const code = encodeChallenge(challenge);
        expect(resolveChallengeTarget(code, challenge).challenge?.score).toBe(120);
        expect(resolveChallengeTarget(code, { ...challenge, difficultyId: "other" }).challenge).toBeNull();
        expect(resolveChallengeTarget(code, { ...challenge, scope: { v: 1, lessons: [9] } }).challenge).toBeNull();
        expect(resolveChallengeTarget("invalid", challenge).error).toBeTruthy();
    });
    it("round trips a scope+difficulty-specific60second challenge", () => {
        expect(decodeChallenge(encodeChallenge(challenge))).toEqual(challenge);
        const href = challengeHref(challenge);
        expect(href).toMatch(/^\/play\/blitz\?/u);
        const url = new URL(href, "https://example.test");
        expect(decodeChallenge(url.searchParams.get("challenge")!)).toEqual(challenge);
        expect(url.searchParams.get("pack")).toBe(challenge.packId);
        expect(url.searchParams.get("difficulty")).toBe(challenge.difficultyId);
    });
    it("rejects scores and durations that cannot describe the same Blitz", () => {
        for (const value of [{ ...challenge, score: -1 }, { ...challenge, score: 1.2 }, { ...challenge, score: 100001 }, { ...challenge, score: Infinity }, { ...challenge, durationSeconds: 30 }, { ...challenge, difficultyId: "" }, { ...challenge, scope: { v: 9 } }])
            expect(() => parseChallenge(value)).toThrow();
    });
    it("remembers assignments idempotently as a doc, preserving raw event history", () => {
        const store = createWortwerkStore(undefined, { deviceId: "test-device" });
        const event = store.appendEvent("answer", { itemId: "word" });
        rememberAssignment(challenge.scope, "task1", store, challenge.packId);
        const first = store.getSnapshot();
        rememberAssignment(challenge.scope, "task1", store, challenge.packId);
        expect(store.getSnapshot()).toBe(first);
        const rows = readPendingAssignments(store.getDoc(PENDING_ASSIGNMENTS_KEY));
        expect(rows).toHaveLength(1);
        expect(rows[0]?.assignmentId).toBe("task1");
        expect(pendingAssignmentHref(rows[0]!)).toContain("assignment=task1");
        expect(store.getSnapshot().events).toEqual([event]);
        rememberAssignment({ ...challenge.scope, count: 10 }, "task1", store, challenge.packId);
        expect(readPendingAssignments(store.getDoc(PENDING_ASSIGNMENTS_KEY))).toHaveLength(1);
    });
    it("bounds the local task list and preserves future assignment documents", () => {
        const store = createWortwerkStore(undefined, { deviceId: "test-device" });
        for (let i = 0; i < 30; i++)
            rememberAssignment({ v: 1 }, `task-${i}`, store);
        expect(readPendingAssignments(store.getDoc(PENDING_ASSIGNMENTS_KEY))).toHaveLength(25);
        store.setDoc(PENDING_ASSIGNMENTS_KEY, { v: 2, assignments: [], future: true });
        expect(() => rememberAssignment({ v: 1 }, "new", store)).toThrow(/update/u);
        expect(store.getDoc(PENDING_ASSIGNMENTS_KEY)).toEqual({ v: 2, assignments: [], future: true });
        expect(readPendingAssignments({ v: 1, assignments: [null, { assignmentId: "bad", scope: { v: 9 }, receivedAt: "bad" }] })).toEqual([]);
    });
});
