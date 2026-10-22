import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ContentPack, DifficultyProfile, LanguageProfile, PackItem, PackText } from "../../packages/content/src/types/packs.js";
import { buildCapabilityIndex } from "../../packages/wortwerk/src/capabilities.js";
import { buildPlayableCapabilityIndex, eligibilitySeed } from "../../packages/wortwerk/src/playable-capabilities.js";
import { TASK_TEMPLATES, deduplicateTemplates, getTaskTemplate } from "../../packages/wortwerk/src/template-registry.js";
import { seededRng } from "../../packages/wortwerk/src/random.js";
import { loadPackRegistry } from "../../packages/wortwerk/src/loader.server.js";
import { validatePacks } from "../../packages/wortwerk/scripts/validate-packs.js";
import { PLAY_TEMPLATES, playableCapabilities, materializeTask } from "../../apps/web/lib/wortwerk/runtime.js";
import manifest from "../fixtures/packs/de-b2-sample/pack.json";
import fixtureItems from "../fixtures/packs/de-b2-sample/items/all.json";
import de from "../../content/languages/de.json";
import toy from "../fixtures/languages/xx.json";
import b2 from "../fixtures/packs/de-b2-sample/difficulty.json";

const profile = de as LanguageProfile;
const difficulty = b2 as DifficultyProfile;
const pack = (): ContentPack => structuredClone({ ...manifest, items: fixtureItems }) as unknown as ContentPack;
const lexemes = (value: ContentPack) => value.items.filter(item => item.type === "lexeme");
function reading(value: ContentPack): PackText {
  const source = value.items.find(item => item.type === "text") as PackText;
  return { ...source, body: "The meeting is at noon.", questions: [{ id: "time", type: "multipleChoice", prompt: "When is the meeting?",
    choices: [{ id: "noon", label: "At noon." }, { id: "evening", label: "In the evening." }, { id: "morning", label: "In the morning." }], answer: { type: "choice", correctIds: ["noon"] } }] };
}

describe("actual playable capability index", () => {
  it("generates and grades every enabled task in the installed data-only pack inventory", () => {
    const registry = loadPackRegistry("content");
    expect(registry.packs.length).toBeGreaterThan(0);
    for (const entry of registry.packs) {
      let played = 0;
      for (const [templateId, support] of Object.entries(entry.capabilities.templates)) {
        if (!support.enabled) continue;
        const template = getTaskTemplate(templateId)!;
        for (const itemId of support.itemIds) {
          const item = entry.pack.items.find(candidate => candidate.id === itemId)!;
          const generated = template.generate(item, entry.pack, entry.language, entry.difficulty, seededRng(eligibilitySeed(entry.pack.id, itemId, templateId)))!;
          expect(generated, `${entry.pack.id}/${itemId}/${templateId}`).not.toBeNull();
          const answer = generated.solution.selfCheck ? "self:complete" : generated.solution.order ?? generated.solution.optionIds?.[0] ?? generated.solution.accepted?.[0];
          expect(answer).toBeDefined();
          expect(template.grade(generated, answer!, entry.language).correct, `${entry.pack.id}/${itemId}/${templateId}`).toBe(true);
          played++;
        }
      }
      expect(played).toBeGreaterThan(0);
      expect(entry.enabledByDefault).toBe(entry.pack.review.status === "reviewed");
    }
  });

  it("indexes all implemented variants and every enabled item generates and grades a task", () => {
    const value = pack();
    value.items = value.items.map(item => item.type === "text" ? reading(value) : item);
    const index = buildPlayableCapabilityIndex(value, profile, difficulty);
    expect(index.templates["corners.meaning.recall"]?.enabled).toBe(true);
    expect(index.templates["read.quick.recall"]?.enabled).toBe(true);
    expect(index.templates["read.quick.reduced"]?.enabled).toBe(true);
    expect(index.templates["record.prompt"]?.enabled).toBe(true);
    expect(Object.hasOwn(index.templates, "exam.task")).toBe(false);
    expect(Object.hasOwn(index.templates, "read.text")).toBe(false);
    let checked = 0;
    for (const [id, entry] of Object.entries(index.templates)) {
      if (!entry.enabled) continue;
      expect(entry.itemIds.length).toBeGreaterThanOrEqual(entry.minItems);
      for (const itemId of entry.itemIds) {
        const template = getTaskTemplate(id)!;
        const item = value.items.find(candidate => candidate.id === itemId)!;
        const task = template.generate(item, value, profile, difficulty, seededRng(eligibilitySeed(value.id, itemId, id)));
        expect(task, `${itemId}/${id}`).not.toBeNull();
        const metadata = index.items[itemId]!.taskMetadata[id];
        expect(metadata).toEqual({ format: task!.format, assessment: task!.solution.selfCheck ? "self" : "objective" });
        const answer = task!.solution.selfCheck ? "self:complete" : task!.solution.order ?? task!.solution.optionIds?.[0] ?? task!.solution.accepted?.[0];
        expect(answer).toBeDefined();
        expect(template.grade(task!, answer!, profile).correct, `${itemId}/${id}`).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(buildPlayableCapabilityIndex({ ...value, items: [...value.items].reverse() }, profile, difficulty)).toEqual(index);
  });

  it("does not advertise a questionless reading, unusable drill or distractorless recognition", () => {
    const value = pack();
    const noun = lexemes(value)[0]!;
    const text = value.items.find(item => item.type === "text")!;
    const grammar = value.items.find(item => item.type === "grammarPoint")!;
    const source = value.items.find(item => item.type === "drill" && item.drillType === "sort")!;
    const unusable: PackItem = source.type === "drill" ? { ...source, answer: { type: "exact", accepted: ["a source value"] } } : source;
    const isolated = { ...value, items: [noun, text, grammar, unusable] };
    const index = buildPlayableCapabilityIndex(isolated, profile, difficulty);
    expect(index.templates["corners.meaning"]?.enabled).toBe(false);
    expect(index.templates["read.quick"]?.enabled).toBe(false);
    expect(index.templates["drill.sort"]?.enabled).toBe(false);
    expect(index.templates["corners.meaning.recall"]?.enabled).toBe(true);
    expect(index.templates["build.form"]?.enabled).toBe(true);
    expect(index.items[grammar.id]?.templateIds).toEqual([]);
    // The legacy predicate-only foundation API remains intentionally available.
    expect(buildCapabilityIndex(isolated).items[text.id]?.templateIds).toContain("read.text");
  });

  it("uses authored minima without applying a pack minimum to a single-item scope", () => {
    const value = pack();
    const six = { ...value, items: lexemes(value).slice(0, 6) };
    const index = buildPlayableCapabilityIndex(six, profile, difficulty);
    expect(index.templates["corners.meaning"]).toMatchObject({ minItems: 8, enabled: false });
    expect(index.templates["corners.meaning"]?.itemIds).toHaveLength(6);
    expect(index.templates["corners.meaning.recall"]).toMatchObject({ minItems: 1, enabled: true });
    expect(index.templates["match.meaning"]).toMatchObject({ minItems: 6, enabled: true });
    const capabilities = playableCapabilities(value, profile, difficulty, { v: 1, items: [lexemes(value)[0]!.id] });
    expect(capabilities).toHaveLength(1);
    expect(capabilities[0]?.templates.some(template => template.id === "corners.meaning")).toBe(true);
    const disabledRun = { packId: six.id, itemId: six.items[0]!.id, dimension: "meaning", templateId: "corners.meaning", skill: "vocabulary", format: "recognition" as const, reason: "new" as const };
    expect(materializeTask(disabledRun, six, profile, difficulty, "seed")).toBeNull();
  });

  it("reuses the same eligibility and assessment metadata in the app runtime", () => {
    const value = pack();
    value.items = value.items.map(item => item.type === "text" ? reading(value) : item);
    const index = buildPlayableCapabilityIndex(value, profile, difficulty);
    const capabilities = playableCapabilities(value, profile, difficulty);
    for (const capability of capabilities) {
      expect(capability.templates.map(template => template.id)).toEqual(index.items[capability.itemId]!.templateIds);
      for (const template of capability.templates) {
        expect(template).toMatchObject(index.items[capability.itemId]!.taskMetadata[template.id]!);
      }
    }
    const sentence = capabilities.find(item => item.templates.some(template => template.id === "write.sentence"));
    expect(sentence?.templates.find(template => template.id === "write.sentence")?.assessment).toBe("objective");
    const speaking = capabilities.find(item => item.templates.some(template => template.id === "record.prompt"));
    expect(speaking?.templates.find(template => template.id === "record.prompt")?.assessment).toBe("self");
    expect(PLAY_TEMPLATES).toBe(TASK_TEMPLATES);
    const first = TASK_TEMPLATES[0]!;
    const replacement = { ...first, skill: "replacement" };
    expect(deduplicateTemplates([first, replacement])).toEqual([replacement]);
  });

  it("works with a second language and only its two authored gender choices", () => {
    const value = pack();
    const items: PackItem[] = lexemes(value).map((item, index) => {
      const { audio: _audio, image: _image, pluralAudio: _pluralAudio, ...rest } = item;
      return { ...rest, lemma: `Løn${index}`, meaning: `meaning ${index}`, gender: index % 2 ? "right" : "left", article: index % 2 ? "lo" : "la",
        forms: { singular: [`Løn${index}`], plural: [`Løns${index}`], pluralPattern: ["suffix"] } };
    });
    const toyPack = { ...value, language: "xx", items };
    const index = buildPlayableCapabilityIndex(toyPack, toy as LanguageProfile, difficulty);
    expect(index.templates["corners.gender"]?.enabled).toBe(true);
    const template = getTaskTemplate("corners.gender")!;
    const task = template.generate(items[0]!, toyPack, toy as LanguageProfile, difficulty, seededRng("toy"))!;
    expect(task.question.options.map(option => option.text).sort()).toEqual(["la · Left", "lo · Right"]);
    expect(task.question.helperKeys).toEqual(["ø"]);
    expect(template.grade(task, task.solution.optionIds![0]!, toy as LanguageProfile).correct).toBe(true);
  });

  it("writes the actual server registry index through packs:validate", () => {
    const directory = mkdtempSync(join(tmpdir(), "wortwerk-index-"));
    try {
      mkdirSync(join(directory, "languages")); mkdirSync(join(directory, "difficulty"));
      const value = pack();
      const target = join(directory, "packs", value.id);
      mkdirSync(target, { recursive: true });
      writeFileSync(join(directory, "languages", `${profile.id}.json`), JSON.stringify(profile));
      writeFileSync(join(directory, "difficulty", `${difficulty.id}.json`), JSON.stringify(difficulty));
      const { itemFiles: _files, ...inline } = value;
      writeFileSync(join(target, "pack.json"), JSON.stringify(inline));
      const registry = loadPackRegistry(directory);
      expect(registry.packs[0]?.capabilities).toEqual(buildPlayableCapabilityIndex(value, profile, difficulty));
      validatePacks([directory, "--write-index"]);
      expect(JSON.parse(readFileSync(join(target, "capabilities.json"), "utf8"))).toEqual(registry.packs[0]?.capabilities);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
