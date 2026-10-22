import { describe, expect, it } from "vitest";
import { answerXp, deriveRewards } from "../../packages/learning/src/wortwerk/engagement.js";
import { parseWortwerkEvidence } from "../../apps/web/lib/wortwerk/learning-state.js";
import type { LearningAnswer } from "../../packages/learning/src/wortwerk/types.js";
import type { SyncEvent } from "../../apps/web/lib/wortwerk/sync-store.js";

const now = new Date("2026-10-22T12:00:00.000Z");
function answer(patch: Partial<LearningAnswer> = {}): LearningAnswer {
  return { eventId: "one", packId: "pack", itemId: "item", dimension: "writing", templateId: "write.sentence", skill: "writing",
    format: "recall", correct: true, hinted: false, createdAt: now.toISOString(), studyDate: "2026-10-22", ...patch };
}
describe("rewards distinguish self-check practice from objective retrieval", () => {
  it("uses the speaking and writing cycle rewards before generic hinted or corrected rewards", () => {
    expect(answerXp({ kind: "speaking", correct: true, hinted: true })).toBe(3);
    expect(answerXp({ kind: "writing", correct: true, hinted: true })).toBe(8);
    expect(answerXp({ kind: "speaking", correct: true, hinted: true, corrected: true })).toBe(3);
    expect(answerXp({ kind: "writing", correct: true, hinted: true, corrected: true })).toBe(8);
  });
  it("keeps objective writing as retrieval, and honors hinted and corrected retrieval", () => {
    expect(deriveRewards([answer()], [], now).xp).toBe(10);
    expect(deriveRewards([answer({ hinted: true })], [], now).xp).toBe(5);
    expect(deriveRewards([answer({ corrected: true })], [], now).xp).toBe(5);
    expect(deriveRewards([answer({ skill: "listening", templateId: "write.dictation" })], [], now).xp).toBe(3);
    expect(deriveRewards([answer({ skill: "writing", correct: false })], [], now).xp).toBe(0);
  });
  it("rebuilds explicit raw self evidence without inferring assessment from the skill label", () => {
    const row = answer();
    const { eventId: id, createdAt, ...payload } = row;
    const raw = (skill: string): SyncEvent => ({ id, createdAt, store: "wortwerk", schemaVersion: 1, deviceId: "device", type: "answer",
      payload: { ...payload, skill, selfAssessed: true, hinted: false } });
    for (const [skill, xp] of [["writing", 8], ["speaking", 3]] as const) {
      const evidence = parseWortwerkEvidence([raw(skill)], now);
      expect(evidence.answers[0]).toMatchObject({ selfAssessed: true, hinted: true });
      expect(deriveRewards(evidence.answers, [], now).xp).toBe(xp);
    }
    expect(deriveRewards([answer({ templateId: "write.prompt", hinted: true })], [], now).xp).toBe(8);
    expect(deriveRewards([answer({ templateId: "record.prompt", skill: "speaking", hinted: true })], [], now).xp).toBe(3);
  });
});
