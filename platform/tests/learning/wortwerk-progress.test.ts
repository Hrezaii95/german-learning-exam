import { describe, expect, it } from "vitest";
import { deriveProgress, summarizeProgress } from "../../packages/learning/src/wortwerk/progress.js";
import type { LearningAnswer, LearningCapability } from "../../packages/learning/src/wortwerk/types.js";

const capability: LearningCapability = { packId: "fixture", itemId: "item", dimensions: ["meaning", "gender", "plural"], templates: [] };
const at = (day: number): Date => new Date(Date.UTC(2026, 8, day, 12));
function answer(n: number, override: Partial<LearningAnswer> = {}): LearningAnswer {
  return { eventId: `event-${n}`, packId: "fixture", itemId: "item", dimension: "meaning", templateId: "fixture.recall",
    format: "recall", correct: true, hinted: false, createdAt: at(n).toISOString(), studyDate: at(n).toISOString().slice(0, 10), ...override };
}
function meaning(events: LearningAnswer[], now = at(5)) {
  return deriveProgress([capability], events, now)[0]!.segments.meaning!;
}

describe("Wortwerk evidence-derived dimensions", () => {
  it("gets all segments from capabilities and preserves unknown language dimensions", () => {
    const data = deriveProgress([{ ...capability, dimensions: ["case", "noun-class", "noun-class"] }], [], at(5));
    expect(Object.keys(data[0]!.segments)).toEqual(["case", "noun-class"]);
    expect(data[0]!.complete).toBe(false);
    expect(summarizeProgress(data)).toMatchObject({ items: 1, complete: 0, segments: 2, secured: 0, due: 0, strength: 0 });
  });

  it("requires unhinted recall on two dates and ignores recognition for secured milestones", () => {
    expect(meaning([answer(1), answer(2, { format: "recognition" })]).state).toBe("learning");
    expect(meaning([answer(1), answer(2, { hinted: true })]).state).toBe("learning");
    expect(meaning([answer(1), answer(2, { studyDate: "2026-09-01" })]).state).toBe("learning");
    expect(meaning([answer(1), answer(2)]).state).toBe("secured");
  });

  it("uses actual calendar dates rather than the habit grace boundary for securing", () => {
    const history = [answer(1, { calendarDate: "2026-09-02", studyDate: "2026-09-01" }),
      answer(2, { calendarDate: "2026-09-02", studyDate: "2026-09-02" })];
    expect(meaning(history).state).toBe("learning");
    expect(meaning(history).recallDates).toEqual(["2026-09-02"]);
  });

  it("keeps secured milestones on lapse while strength drops and a due dot appears", () => {
    const secured = meaning([answer(1), answer(2)], at(2));
    const lapsed = meaning([answer(1), answer(2), answer(3, { correct: false })], at(3));
    expect(lapsed.securedAt).toBe(secured.securedAt);
    expect(lapsed.state).toBe("secured");
    expect(lapsed.strength).toBe(0);
    expect(lapsed.due).toBe(true);
    expect(lapsed.lapses).toBe(1);
  });

  it("moves the ladder through fewer cues and down again after a miss", () => {
    expect(meaning([answer(1, { format: "recognition" }), answer(2, { format: "recognition" })]).format).toBe("reduced-cues");
    const history = [answer(1, { format: "recognition" }), answer(2, { format: "recognition" }),
      answer(3, { format: "reduced-cues" }), answer(4, { format: "reduced-cues" })];
    expect(meaning(history).format).toBe("recall");
    expect(meaning([...history, answer(5, { correct: false })]).format).toBe("reduced-cues");
  });

  it("deduplicates events, orders sync arrivals, rejects invalid/future evidence, separates packs and dimensions", () => {
    const history = [answer(2), answer(1), answer(1), answer(3, { packId: "other" }),
      answer(4, { createdAt: "invalid" }), answer(10), answer(3, { studyDate: "2026-02-30" })];
    expect(meaning(history).attempts).toBe(2);
    expect(meaning(history).recallDates).toEqual(["2026-09-01", "2026-09-02"]);
    expect(deriveProgress([capability], history, at(5))[0]!.segments.gender!.attempts).toBe(0);
  });

  it("only completes all supported segments and earns Gold after delayed recall at 30+ days", () => {
    const history = ["meaning", "gender", "plural"].flatMap((dimension, index) => [
      answer(1, { eventId: `a${index}`, dimension }), answer(2, { eventId: `b${index}`, dimension }),
    ]);
    expect(deriveProgress([capability], history, at(2))[0]).toMatchObject({ complete: true, gold: false });
    const delayed = history.concat(["meaning", "gender", "plural"].map((dimension, index) => answer(31, { eventId: `c${index}`, dimension })));
    expect(deriveProgress([capability], delayed, at(31))[0]).toMatchObject({ complete: true, gold: true });
  });
});
