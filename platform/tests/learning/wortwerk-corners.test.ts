import { describe, expect, it } from "vitest";
import type { ContentPack, DifficultyProfile, LanguageProfile, PackLexeme } from "../../packages/content/src/types/packs.js";
import de from "../../content/languages/de.json";
import xx from "../fixtures/languages/xx.json";
import fixture from "../fixtures/packs/de-b2-sample/pack.json";
import fixtureItems from "../fixtures/packs/de-b2-sample/items/all.json";
import { seededRng, shuffle } from "../../packages/wortwerk/src/random.js";
import { chooseDistractors } from "../../packages/wortwerk/src/distractors.js";
import { CORNERS_TEMPLATES, generateCornersTask, gradeCornersTask } from "../../packages/wortwerk/src/templates/corners.js";

const profile = de as LanguageProfile;
const difficulty: DifficultyProfile = { schemaVersion: 1, id: "fixture", optionsCount: 4, timerSeconds: 60, audioSpeedRange: [0.7, 1], hintsAllowed: true, maxPassageLength: 200, distractorCloseness: 1, typedAnswerRatio: 0 };
const base: PackLexeme = { type: "lexeme", id: "target", lemma: "Buch", pos: "noun", meaning: "book", gender: "neuter", article: "das", forms: { singular: ["Buch"], plural: ["Bücher", "Buecher"], pluralPattern: ["umlaut-er"] }, unitId: "u1", bookRef: { book: "fixture-book", lesson: 1 }, source: "course", tags: ["home"], image: "/images/target.svg", audio: { src: "/audio/target.mp3", text: "das Buch", review: "preview" }, sourceRef: { cardId: "card", href: "/cheat-sheets/words#card", lessons: [1], sources: ["course"] } };
const others: PackLexeme[] = [
  { ...base, id: "near", lemma: "Haus", meaning: "house", forms: { plural: ["Häuser"], pluralPattern: ["umlaut-er"] } },
  { ...base, id: "table", lemma: "Tisch", meaning: "table", gender: "male", article: "der", forms: { plural: ["Tische"], pluralPattern: ["e"] } },
  { ...base, id: "room", lemma: "Zimmer", meaning: "room", forms: { plural: ["Zimmer"], pluralPattern: ["unchanged"] } },
  { ...base, id: "door", lemma: "Tür", meaning: "door", gender: "female", article: "die", forms: { plural: ["Türen"], pluralPattern: ["en-n"] } },
].map((item, index) => ({ ...item, image: `/images/option-${index}.svg`, audio: { src: `/audio/option-${index}.mp3`, review: "preview" } }));
const pack: ContentPack = { ...fixture, items: [base, ...others] } as ContentPack;
const make = (templateId: string, seed = 1, overrides: Partial<Parameters<typeof generateCornersTask>[0]> = {}) => generateCornersTask({ templateId, item: base, pack, profile, difficulty, random: seededRng(seed), ...overrides });

describe("Wortwerk Corners engine", () => {
  it("replays a seed and shuffles without mutating input", () => {
    const items = [1, 2, 3, 4];
    expect(shuffle(items, seededRng("same"))).toEqual(shuffle(items, seededRng("same")));
    expect(items).toEqual([1, 2, 3, 4]);
    expect(make("corners.meaning", 4)).toEqual(make("corners.meaning", 4));
  });
  it("distributes the correct answer across all four positions over 1,000 tasks", () => {
    const positions = [0, 0, 0, 0];
    for (let seed = 0; seed < 1000; seed++) {
      const task = make("corners.meaning", seed)!;
      const position = task.question.options.findIndex(option => task.solution.optionIds?.includes(option.id));
      positions[position] = positions[position]! + 1;
      expect(task.question.options.map(option => option.id)).toEqual(["option-1", "option-2", "option-3", "option-4"]);
    }
    for (const count of positions) expect(count).toBeGreaterThan(190);
    for (const count of positions) expect(count).toBeLessThan(310);
  });
  it("ranks same-cell candidates before unit, then shared tags, with no unrelated fallback", () => {
    const same = { ...base, id: "same", lemma: "cell", meaning: "cell" };
    const unit = { ...base, id: "unit", lemma: "unit", meaning: "unit", gender: "female", tags: ["away"] };
    const tag = { ...base, id: "tag", lemma: "tag", meaning: "tag", unitId: "u2", gender: "female" };
    const unrelated = { ...tag, id: "unrelated", meaning: "unrelated", tags: ["away"] };
    const p = { ...pack, maps: [{ id: "cell", title: "Cell", rows: "gender", cols: "tags" }], items: [base, unrelated, tag, unit, same] };
    expect(chooseDistractors(base, p, profile, i => i.type === "lexeme" ? [i.meaning] : [], ["book"], 3, seededRng(4)).map(i => i.id)).toEqual(["same", "unit", "tag"]);
  });
  it("excludes all accepted variants and synonymous reverse options", () => {
    const alias = { ...others[0]!, id: "alias", forms: { plural: ["Bu\u0308cher"] } };
    const t = make("corners.plural", 1, { pack: { ...pack, items: [...pack.items, alias] } })!;
    expect(t.question.options.filter(option => ["Bücher", "Buecher", "Bu\u0308cher"].includes(option.text ?? ""))).toHaveLength(1);
    const synonym = { ...others[0]!, id: "synonym", lemma: "Volume", meaning: "book" };
    const reverse = make("corners.reverse", 1, { pack: { ...pack, items: [...pack.items, synonym] } })!;
    expect(reverse.question.options.some(option => option.text === "Volume")).toBe(false);
  });
  it("never synthesizes incorrect plural forms; unavailable pools return null", () => {
    const task = make("corners.plural")!;
    const realForms = pack.items.flatMap(i => i.type === "lexeme" ? i.forms?.plural ?? [] : []);
    expect(task.question.options.every(option => realForms.includes(option.text!))).toBe(true);
    expect(make("corners.meaning", 1, { pack: { ...pack, items: [base] } })).toBeNull();
  });
  it("keeps gender, meaning, reverse and plural question projections neutral", () => {
    const gender = make("corners.gender")!;
    expect(gender.question.text).toBe("Buch");
    expect(gender.question.audio).toBeUndefined();
    expect(JSON.stringify(gender.question)).not.toContain("--tone-");
    expect(gender.question.options.every(o => Object.keys(o).sort().join() === "id,text")).toBe(true);
    const meaning = make("corners.meaning")!;
    expect(meaning.question.text).toBe("Buch");
    expect(meaning.question.audio).toEqual({ src: base.audio!.src, review: "preview" });
    expect(JSON.stringify(meaning.question)).not.toContain(base.image);
    const reverse = make("corners.reverse")!;
    expect(reverse.question.text).toBe("book");
    expect(reverse.question.audio).toBeUndefined();
    expect(make("corners.plural")!.question.text).toBe("Buch");
    expect(gender.feedback.answer).toBe("das Buch");
    expect(gender.feedback.toneToken).toBe("--tone-neut");
  });
  it("offers image-only listening options and withholds captions", () => {
    const task = make("listen.pick")!;
    expect(task.question.text).toBeUndefined();
    expect(task.question.audio?.text).toBeUndefined();
    expect(task.question.options.every(o => o.image && !o.text && !o.audio)).toBe(true);
    expect(task.feedback.answer).toBe(base.lemma);
  });
  it("rejects prompts that would repeat a recall answer or include the gender article", () => {
    expect(make("corners.picture.recall")).toBeNull();
    expect(make("corners.gender", 1, { item: { ...base, lemma: "das Buch" } })).toBeNull();
  });
  it("uses profile genders, labels and helper keys in a two-gender language", () => {
    const toy = { ...base, lemma: "Løn", article: "la", gender: "left", forms: { plural: ["Løns"], pluralPattern: ["suffix"] } };
    const task = make("corners.gender", 3, { item: toy, profile: xx as LanguageProfile, pack: { ...pack, language: "xx", items: [toy] } })!;
    expect(task.question.options.map(o => o.text).sort()).toEqual(["la · Left", "lo · Right"]);
    expect(task.question.lang).toBe("en");
    expect(task.question.helperKeys).toEqual(["ø"]);
    expect(task.feedback.answer).toBe("la Løn");
  });
  it("supports plural-pattern data without language-specific inflection code", () => {
    const task = make("corners.plural-pattern")!;
    expect(task.question.options.some(o => o.text === "Umlaut + -er")).toBe(true);
    expect(task.solution.accepted).toEqual(["Umlaut + -er", "umlaut-er"]);
    expect(make("corners.plural-pattern", 1, { item: { ...base, forms: { plural: ["Bücher"] } } })).toBeNull();
  });
  it("grades choice once, rejects multi-answer choice, and applies profile recall normalisation", () => {
    const task = make("corners.plural", 2)!;
    expect(gradeCornersTask(task, task.solution.optionIds![0]!, profile).correct).toBe(true);
    expect(gradeCornersTask(task, [task.solution.optionIds![0]!, "extra"], profile).correct).toBe(false);
    const recall = make("corners.plural.recall", 2, { item: { ...base, forms: { plural: ["Bücher"] } } })!;
    expect(recall.question.options).toEqual([]);
    expect(gradeCornersTask(recall, "Bu\u0308cher", profile).outcome).toBe("correct");
    expect(gradeCornersTask(recall, "Buecher", profile).outcome).toBe("almost");
    expect(gradeCornersTask(recall, "bücher", profile).outcome).toBe("incorrect");
  });
  it("generates and grades supported tasks across the all-type fixture", () => {
    const fixturePack = { ...fixture, items: fixtureItems } as ContentPack;
    for (const item of fixturePack.items) for (const template of CORNERS_TEMPLATES) {
      if (!template.requires(item)) continue;
      const task = template.generate(item, fixturePack, profile, difficulty, seededRng(item.id + template.id));
      if (!task) continue;
      const answer = task.question.input === "choice" ? task.solution.optionIds![0]! : task.solution.accepted![0]!;
      expect(template.grade(task, answer, profile).outcome, `${item.id}/${template.id}`).toBe("correct");
    }
  });
});
