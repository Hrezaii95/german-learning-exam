import { describe, expect, it } from "vitest";
import type { ContentPack, DifficultyProfile, LanguageProfile } from "../../packages/content/src/types/packs.js";
import type { LearningAnswer } from "../../packages/learning/src/wortwerk/types.js";
import { deriveProgress } from "../../packages/learning/src/wortwerk/progress.js";
import { derivePatternMilestones, nearestPatternMilestone } from "../../apps/web/lib/wortwerk/milestones";
import { playableCapabilities } from "../../apps/web/lib/wortwerk/runtime";
import type { PlayScope } from "../../apps/web/lib/wortwerk/links";
import profile from "../../content/languages/de.json";
import manifest from "../fixtures/packs/de-b2-sample/pack.json";
import items from "../fixtures/packs/de-b2-sample/items/all.json";
import difficultyData from "../fixtures/packs/de-b2-sample/difficulty.json";

const now = new Date("2026-10-22T12:00:00Z");
const language = profile as LanguageProfile;
const difficulty = difficultyData as DifficultyProfile;
const pack: ContentPack = { ...manifest, maps: [{ id: "patterns", title: "Patterns", rows: "gender", cols: "forms.pluralPattern" }],
  items: items.filter(item => ["w0", "w1", "w2", "w4"].includes(item.id)) } as ContentPack;
const scope: PlayScope = { v: 1, skills: ["plural"] };
function evidence(ids: string[], patch: Partial<LearningAnswer> = {}): LearningAnswer[] {
  return ids.flatMap(itemId => [20, 21].map(day => ({ eventId: `${itemId}:${day}`, packId: pack.id, itemId,
    dimension: "plural", templateId: "corners.plural.recall", format: "recall" as const, correct: true, hinted: false,
    createdAt: `2026-10-${day}T12:00:00.000Z`, studyDate: `2026-10-${day}`, ...patch })));
}
function milestones(answers: LearningAnswer[] = [], selection: PlayScope = scope, selected = pack, profile = language) {
  const capabilities = playableCapabilities(selected, profile, difficulty, selection);
  return derivePatternMilestones(selected, profile, capabilities, deriveProgress(capabilities, answers, now), answers, now);
}

describe("scoped pattern learning goals and source-backed rewards", () => {
  it("shows the nearest achievable goal and holds one fixed authored same-pattern word", () => {
    const initial = milestones();
    expect(nearestPatternMilestone(initial)?.title).toBe("die × -(e)n");
    const male = initial.find(entry => entry.title === "der × -(e)n")!;
    expect(male.learningItemIds).toEqual(["w0", "w1"]);
    expect(male.challenge?.itemId).toBe("w2");
    const complete = milestones(evidence(["w0", "w1", "w4"]));
    const unlocked = complete.find(entry => entry.id === male.id)!;
    expect(unlocked).toMatchObject({ learningComplete: true, cellComplete: false, secured: 2, challengeSeen: false });
    expect(unlocked.learningItemIds).toEqual(male.learningItemIds);
    expect(unlocked.rule?.fields.map(field => field.value)).toEqual(["der · Masculine", "-(e)n"]);
    expect(unlocked.rule?.examples.map(example => example.item.id)).toEqual(["w0", "w1"]);
    expect(unlocked.rule?.examples[0]?.forms).toEqual(["die Namen"]);
    expect(unlocked.rule?.examples.some(example => example.item.id === "w2")).toBe(false);
    expect(nearestPatternMilestone(complete)).toBeUndefined();
  });

  it("never treats known, self-checked or differently practised holdouts as unfamiliar", () => {
    for (const patch of [{ dimension: "meaning" }, { selfAssessed: true }, { correct: false }, { hinted: true }]) {
      const answers = [...evidence(["w0", "w1"]), ...evidence(["w2"], patch)];
      const male = milestones(answers).find(entry => entry.title === "der × -(e)n")!;
      expect(male.challengeSeen).toBe(true);
      expect(male.learningItemIds).toEqual(["w0", "w1"]);
    }
    expect(milestones([...evidence(["w0", "w1"]), ...evidence(["w2"], { createdAt: "2026-10-23T12:00:00.000Z" })])
      .find(entry => entry.title === "der × -(e)n")?.challengeSeen).toBe(false);
  });

  it("keeps source, tag, page, item and skill restrictions for both goals and challenges", () => {
    for (const selection of [
      { ...scope, sources: ["teacher-extra" as const] }, { ...scope, tags: ["excluded"] },
      { ...scope, book: "fixture-book", upTo: { lesson: 1, page: 9 } }, { ...scope, items: [] },
    ]) expect(milestones([], selection)).toEqual([]);
    const single = milestones([], { ...scope, items: ["w0"] })[0]!;
    expect(single.learningItemIds).toEqual(["w0"]);
    expect(single.challenge).toBeNull();
    expect(single.rule).not.toBeNull();
    const genderOnly = milestones([], { ...scope, skills: ["gender"] }).find(entry => entry.title === "der × -(e)n")!;
    expect(genderOnly.challenge).toMatchObject({ itemId: "w2", dimension: "gender" });
    const throughPage = milestones([], { ...scope, book: "fixture-book", upTo: { lesson: 1, page: 11 } })[0]!;
    expect(throughPage.learningItemIds).toEqual(["w0"]);
    expect(throughPage.challenge?.itemId).toBe("w1");
    expect(milestones([], { ...scope, skills: ["speaking"] })).toEqual([]);
  });

  it("does not invent rules for arbitrary map groups or missing language profile fields", () => {
    const generic = { ...pack, maps: [{ id: "generic", title: "Groups", rows: "unitId", cols: "pos" }] };
    expect(milestones([], scope, generic)[0]).toMatchObject({ rule: null, challenge: null });
    const absent = { ...language, pluralPatterns: [] };
    expect(milestones([], scope, pack, absent).every(entry => entry.rule === null && entry.challenge === null)).toBe(true);
  });

  it("uses permanent secured states, scoped dimensions and only the selected pack's evidence", () => {
    const answers = evidence(["w0", "w1"]);
    const capabilities = playableCapabilities(pack, language, difficulty, scope);
    const progress = deriveProgress(capabilities, answers, now);
    for (const item of progress) for (const part of Object.values(item.segments)) part.due = true;
    const male = derivePatternMilestones(pack, language, capabilities, progress,
      [...answers, ...evidence(["w2"], { packId: "another-pack" })], now).find(entry => entry.title === "der × -(e)n")!;
    expect(male.learningComplete).toBe(true);
    expect(male.challengeSeen).toBe(false);
    const selfCapabilities = capabilities.map(capability => ({ ...capability, templates: capability.templates.map(template => ({ ...template, assessment: "self" as const })) }));
    expect(derivePatternMilestones(pack, language, selfCapabilities, progress, answers, now)).toEqual([]);
  });
});
