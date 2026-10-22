/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/** @vitest-environment jsdom */
import { createElement, type ComponentType } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentPack, DifficultyProfile, LanguageProfile, PackItem, PackLexeme, PackText } from "../../packages/content/src/types/packs.js";
import type { GeneratedTask, TaskTemplate, GradeResult, TaskAnswer } from "../../packages/wortwerk/src/tasks.js";
import de from "../../content/languages/de.json";
import xx from "../fixtures/languages/xx.json";
import manifest from "../fixtures/packs/de-b2-sample/pack.json";
import fixtureItems from "../fixtures/packs/de-b2-sample/items/all.json";
import { CORNERS_TEMPLATES } from "../../packages/wortwerk/src/templates/corners.js";
import { GRAMMAR_LISTENING_TEMPLATES } from "../../packages/wortwerk/src/templates/grammar-listening.js";
import { LITERACY_TEMPLATES } from "../../packages/wortwerk/src/templates/literacy.js";
import { seededRng } from "../../packages/wortwerk/src/random.js";
const rendererPath = "../../apps/web/components/wortwerk/TaskRenderer.js";
const { TaskRenderer } = await import(rendererPath) as { TaskRenderer: ComponentType<{ task: GeneratedTask; onAnswer: (answer: TaskAnswer) => void; result?: GradeResult | null; disabled?: boolean; onLearn?: (word: string) => void }> };

const profile = de as LanguageProfile;
const difficulty: DifficultyProfile = { schemaVersion: 1, id: "fixture-difficulty", optionsCount: 4, timerSeconds: 60, audioSpeedRange: [0.7, 1.2], hintsAllowed: true, maxPassageLength: 1000, distractorCloseness: 1, typedAnswerRatio: 0.5 };
const templates: readonly TaskTemplate[] = [...CORNERS_TEMPLATES, ...GRAMMAR_LISTENING_TEMPLATES, ...LITERACY_TEMPLATES];
const fixture: ContentPack = { ...manifest, items: fixtureItems } as ContentPack;
const lexeme = fixture.items.find((item): item is PackLexeme => item.type === "lexeme")!;
const sourceAudio = lexeme.audio!;
const base = { unitId: "u1", bookRef: { book: "fixture-book", lesson: 1 }, source: "study-extra" as const, tags: ["fixture"] };
const privateModel = "PRIVATE-MODEL-ANSWER-ONLY-AFTER-RESPONSE";

/** These are test-only data, not a promoted content pack or invented production media. */
function augmentedPack(): ContentPack {
  const texts: PackText[] = Array.from({ length: 6 }, (_, index) => ({ ...base, type: "text", id: `private-text-source-${index}`, title: `Fixture headline ${index}`, body: `Opening paragraph ${index} has a distinct detail.\n\nClosing paragraph ${index} adds another detail.`,
    questions: [{ id: `private-reading-question-${index}`, type: "multipleChoice", prompt: "Which detail is described?", choices: [{ id: "private-correct-choice", label: `Detail ${index}` }, { id: "private-wrong-choice", label: `Other detail ${index}` }], answer: { type: "choice", correctIds: ["private-correct-choice"] } }] }));
  const pairs: PackLexeme[] = Array.from({ length: 2 }, (_, index) => ({ ...lexeme, id: `private-pair-source-${index}`, lemma: `Pairword${index}`, meaning: `Pair meaning ${index}`, tags: ["minimal-pair", "private-pair-set"], forms: { singular: [`Pairword${index}`], plural: [`Pairwords${index}`], pluralPattern: [profile.pluralPatterns[0]!.id] }, audio: { ...sourceAudio, text: `PRIVATE-SPOKEN-TRANSCRIPT-${index}` } }));
  const speaking: PackItem = { ...base, type: "speakingPrompt", id: "private-speaking-source", prompt: "Describe this scene in your own words.", checklist: ["One independent detail"], modelAnswers: [privateModel], audio: { ...sourceAudio, text: "PRIVATE-SPEAKING-TRANSCRIPT" }, image: lexeme.image! };
  const sentence: PackItem = { ...base, type: "sentence", id: "private-sentence-source", text: "PRIVATE target sentence.", translation: "An independent meaning prompt.", tokens: ["PRIVATE", "target", "sentence."], audio: { ...sourceAudio, text: "PRIVATE target sentence." } };
  const dialogue: PackItem = { ...base, type: "dialogue", id: "private-dialogue-source", turns: [{ speaker: "A", text: "PRIVATE-DIALOGUE-TRANSCRIPT", audio: { ...sourceAudio, text: "PRIVATE-DIALOGUE-TRANSCRIPT" } }], questions: [{ id: "private-dialogue-question", type: "multipleChoice", prompt: "Which platform is mentioned?", choices: [{ id: "private-platform-answer", label: "Platform Seven" }, { id: "private-platform-distractor", label: "Platform Three" }], answer: { type: "choice", correctIds: ["private-platform-answer"] } }] };
  return { ...fixture, id: "private-augmented-pack", items: [...fixture.items, ...texts, ...pairs, speaking, sentence, dialogue] };
}
function toyPack(): ContentPack {
  const toy = xx as LanguageProfile;
  return { ...fixture, id: "private-toy-pack", language: toy.id, items: Array.from({ length: 8 }, (_, index): PackLexeme => {
    const gender = toy.genders[index % toy.genders.length]!;
    return { ...base, type: "lexeme", id: `private-toy-source-${index}`, lemma: `Løn${index}`, meaning: `Idea ${index}`, pos: "noun", gender: gender.id, article: gender.article, forms: { plural: [`Løns${index}`], pluralPattern: [toy.pluralPatterns[0]!.id] }, image: lexeme.image!, audio: { ...sourceAudio, text: `${gender.article} Løn${index}` } };
  }) };
}
const cases = [{ pack: fixture, profile }, { pack: augmentedPack(), profile }, { pack: toyPack(), profile: xx as LanguageProfile }];

const feedbackSentinels = ["PRIVATE-FEEDBACK-ANSWER", "PRIVATE-FEEDBACK-SUMMARY", "PRIVATE-FEEDBACK-MEANING", "PRIVATE-FEEDBACK-FORM", "PRIVATE-FEEDBACK-MODEL", "PRIVATE-FEEDBACK-TRANSCRIPT", "/private-feedback-image.svg", "/private-feedback-audio.mp3", "/private-feedback-source"];
function sentinelFeedback(task: GeneratedTask): GeneratedTask {
  return { ...task, feedback: { answer: feedbackSentinels[0]!, summary: feedbackSentinels[1]!, meaning: feedbackSentinels[2]!, forms: [feedbackSentinels[3]!], modelAnswers: [feedbackSentinels[4]!], audio: { src: feedbackSentinels[7]!, text: feedbackSentinels[5]!, review: "preview" }, image: feedbackSentinels[6]!, sourceHref: feedbackSentinels[8]!, toneToken: "--tone-masc" } };
}
function revealValues(item: PackItem, fields: readonly string[]): string[] {
  const strings = (value: unknown): string[] => typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];
  return fields.flatMap(field => {
    let value: unknown = item;
    for (const part of field.split(".")) {
      if (!value || typeof value !== "object" || !Object.hasOwn(value, part)) return [field];
      value = (value as Record<string, unknown>)[part];
    }
    return strings(value);
  });
}
const genericMetadata = new Set(["true", "false", "none", "off", "on", "polite", "status", "button", "group", "text", "choice", "sequence", "img"]);
function metadata(container: HTMLElement): Array<{ name: string; value: string }> {
  return [...container.querySelectorAll("*")].flatMap(node => [...node.attributes].filter(attribute => /^(?:aria-|data-)/u.test(attribute.name) || ["class", "id", "title", "alt", "style", "placeholder"].includes(attribute.name)).map(attribute => ({ name: attribute.name, value: attribute.value.normalize("NFC") })));
}
function sourceIds(pack: ContentPack): string[] {
  const ids = new Set<string>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    for (const [key, entry] of Object.entries(value)) {
      if ((key === "id" || key === "cardId") && typeof entry === "string") ids.add(entry);
      else if (key === "sourceIds" && Array.isArray(entry)) entry.forEach(id => { if (typeof id === "string") ids.add(id); });
      else visit(entry);
    }
  };
  pack.items.forEach(visit);
  return [...ids];
}
function assertInitialQuestion(container: HTMLElement, task: GeneratedTask, item: PackItem, label: string, forbiddenSourceIds: readonly string[]) {
  expect(container.querySelector(".ww-feedback, [aria-label='Answer feedback']"), label).toBeNull();
  expect(container.querySelector("[data-correct], [data-solution], [data-score]"), label).toBeNull();
  for (const marker of feedbackSentinels) expect(container.innerHTML, `${label}: feedback projection ${marker}`).not.toContain(marker);
  for (const model of task.feedback.modelAnswers ?? []) expect(container.textContent, `${label}: authored model stays hidden`).not.toContain(model);
  expect(container.textContent, label).not.toMatch(/(?:pronunciation|accuracy|score)\s*[:=]?\s*\d+\s*(?:%|\/100)/iu);
  // Full source passages, symmetrical choices, and shuffled tiles may naturally contain
  // answer words. They never receive answer-specific metadata or correctness markers.
  const hidden = [...new Set([item.id, item.sourceRef?.cardId, ...(task.solution.accepted ?? []), ...(task.feedback.modelAnswers ?? []), ...revealValues(item, task.revealFields)].filter((value): value is string => !!value && value.length > 2))];
  for (const attribute of metadata(container)) {
    expect(attribute.name, label).not.toMatch(/^data-(?:correct(?:-|$)|solution(?:-|$)|answer(?:-|$)|score(?:-|$)|source(?:-|$)|item-id$)/u);
    const exposedId = forbiddenSourceIds.find(id => id.length > 2 ? attribute.value.includes(id) : attribute.value === id);
    expect(exposedId, `${label}: source id in ${attribute.name}`).toBeUndefined();
    if (attribute.name === "class") expect(attribute.value, label).not.toMatch(/(?:^|[\s_-])(?:correct|wrong|success|solution|feedback|answer-key)(?:$|[\s_-])/iu);
    if (genericMetadata.has(attribute.value.toLocaleLowerCase())) continue;
    const exposedAnswer = hidden.find(value => attribute.value.includes(value.normalize("NFC")));
    expect(exposedAnswer, `${label}: answer in ${attribute.name}`).toBeUndefined();
  }
  for (const field of container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input:not([type=checkbox]), textarea")) expect(field.value, `${label}: blank response`).toBe("");
  const groups = container.querySelectorAll(".ww-corners__options, .ww-options, [aria-label='Answer choices'], [aria-label='Left cards'], [aria-label='Right cards']");
  for (const group of groups) {
    const options = [...group.querySelectorAll<HTMLButtonElement>(":scope > button")];
    const styles = options.map(option => JSON.stringify({ className: option.className, style: option.getAttribute("style"), disabled: option.disabled,
      children: [...option.querySelectorAll("*")].map(child => ({ tag: child.tagName, className: child.className, style: child.getAttribute("style") })) }));
    expect(new Set(styles).size, `${label}: symmetric option styles`).toBeLessThanOrEqual(1);
  }
  if (task.testedDimensions.includes("gender")) {
    expect(task.question.audio, label).toBeUndefined();
    expect(container.querySelector("audio"), label).toBeNull();
    expect(metadata(container).some(attribute => /(?:--tone-(?:masc|fem|neut|plural)|subject-tone-|tone-(?:male|female|neuter))/u.test(attribute.value)), label).toBe(false);
    if (item.type === "lexeme") expect(task.question.text, `${label}: bare lemma`).toBe(item.lemma);
  }
  if (task.testedDimensions.includes("plural")) expect(container.innerHTML, label).not.toMatch(/(?:chip-(?:ending|umlaut)|ending-chip|umlaut-chip|highlight-chip)/u);
  if (task.templateId.startsWith("corners.meaning") || task.templateId.startsWith("corners.picture")) {
    const prompt = container.querySelector(".ww-corners__prompt, .ww-recall .ww-task__text");
    expect(prompt, `${label}: prompt projection exists`).not.toBeNull();
    expect(prompt!.querySelector("img"), `${label}: no meaning prompt illustration`).toBeNull();
  }
  if (task.templateId.startsWith("corners.reverse")) expect(container.querySelector("audio"), `${label}: no reverse answer audio`).toBeNull();
  if (task.question.input === "sequence" && task.mechanic !== "match") expect(container.querySelector("[aria-label='Your tile order']")?.children.length ?? 0, `${label}: no prefilled sequence`).toBe(0);
  if (task.dimension === "listening") {
    const withoutOptions = container.cloneNode(true) as HTMLElement;
    withoutOptions.querySelectorAll(".ww-corners__options, .ww-options, [aria-label='Answer choices']").forEach(node => node.remove());
    for (const answer of task.solution.accepted ?? []) if (answer.length > 2) expect(withoutOptions.textContent, `${label}: no listening transcript outside symmetric options`).not.toContain(answer);
    expect(task.question.audio?.text, label).toBeUndefined();
    expect(task.question.audioSequence?.some(audio => audio.text !== undefined), label).not.toBe(true);
    for (const image of container.querySelectorAll<HTMLImageElement>("img")) expect(image.alt, `${label}: ordinal image labels`).toMatch(/^Option \d+$/u);
  }
}

beforeEach(() => { vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined); vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Wortwerk no-giveaway DOM matrix", () => {
  it("renders every playable fixture item × template, across all ten actual mechanics", () => {
    const seenTemplates = new Set<string>();
    const seenMechanics = new Set<string>();
    const seenTypes = new Set<string>();
    let generated = 0;
    for (const { pack, profile } of cases) for (const item of pack.items) for (const template of templates) {
      if (!template.requires(item)) continue;
      const task = template.generate(item, pack, profile, difficulty, seededRng(`${pack.id}:${item.id}:${template.id}`));
      if (!task) continue;
      const label = `${pack.id}/${item.id}/${template.id}`;
      expect(task.format, `${label}: declared ladder rung`).toBe(template.format);
      const view = render(createElement(TaskRenderer, { task: sentinelFeedback(task), onAnswer: () => undefined }));
      assertInitialQuestion(view.container, task, item, label, sourceIds(pack));
      seenTemplates.add(template.id); seenMechanics.add(task.mechanic); seenTypes.add(item.type); generated += 1;
      cleanup();
    }
    expect(generated).toBeGreaterThan(250);
    expect([...seenMechanics].sort()).toEqual(["build", "corners", "gap", "hotspot", "listen", "match", "order", "record", "sort", "write"]);
    expect([...seenTypes].sort()).toEqual(["dialogue", "drill", "lexeme", "sentence", "speakingPrompt", "text", "writingPrompt"]);
    expect([...seenTemplates].sort()).toEqual([...new Set(templates.map(template => template.id))].sort());
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  }, 60_000);

  it("uses a second language's two gender labels with the same neutral question renderer", () => {
    const pack = cases[2]!.pack;
    const toy = cases[2]!.profile;
    const item = pack.items[0]!;
    const template = CORNERS_TEMPLATES.find(template => template.id === "corners.gender")!;
    const task = template.generate(item, pack, toy, difficulty, seededRng("toy-gender"))!;
    const view = render(createElement(TaskRenderer, { task, onAnswer: () => undefined }));
    assertInitialQuestion(view.container, task, item, "toy-gender", sourceIds(pack));
    expect(task.question.options.map(option => option.text).sort()).toEqual(toy.genders.map(gender => `${gender.article} · ${gender.label}`).sort());
    expect(view.container.querySelectorAll(".ww-corners__option")).toHaveLength(2);
  });
});
