/// <reference lib="dom" />
/** @vitest-environment jsdom */
import { createElement, type ComponentType } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentPack, DifficultyProfile, LanguageProfile, PackLexeme } from "../../packages/content/src/types/packs.js";
import type { GeneratedTask, GradeResult, TaskAnswer } from "../../packages/wortwerk/src/tasks.js";
import { generateCornersTask } from "../../packages/wortwerk/src/templates/corners.js";
import { seededRng } from "../../packages/wortwerk/src/random.js";
import manifest from "../fixtures/packs/de-b2-sample/pack.json";
import items from "../fixtures/packs/de-b2-sample/items/all.json";
import profile from "../../content/languages/de.json";
import difficulty from "../fixtures/packs/de-b2-sample/difficulty.json";
const rendererPath = "../../apps/web/components/wortwerk/TaskRenderer.js";
const { TaskRenderer } = await import(rendererPath) as { TaskRenderer: ComponentType<{ task: GeneratedTask; onAnswer: (answer: TaskAnswer, evidence?: { hinted?: boolean }) => void; allowHints?: boolean; disabled?: boolean; result?: GradeResult | null }> };
const pack = { ...manifest, items } as unknown as ContentPack;
const item = pack.items.find((item): item is PackLexeme => item.type === "lexeme" && !!item.image && !!item.gender)!;
function task(id = "corners.meaning", hintsAllowed = true, source = item): GeneratedTask {
  return generateCornersTask({ templateId: id, item: source, pack, profile: profile as LanguageProfile, difficulty: { ...difficulty, hintsAllowed } as DifficultyProfile, random: seededRng("hint") })!;
}
function chooseCorrect(value: GeneratedTask) {
  const answer = value.question.options.find(option => value.solution.optionIds?.includes(option.id))!;
  fireEvent.click(screen.getByRole("button", { name: answer.text! }));
  return answer.id;
}
beforeEach(() => { vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("optional meaning illustration hints", () => {
  it("enables authored illustration hints only for allowed meaning tasks across the ladder", () => {
    for (const templateId of ["corners.meaning", "corners.meaning.reduced", "corners.meaning.recall"]) {
      expect(task(templateId).question.hintsAllowed).toBe(true);
      expect(task(templateId, false).question.hintsAllowed).toBeUndefined();
    }
    const withoutImage = { ...item }; delete withoutImage.image;
    expect(task("corners.meaning", true, withoutImage).question.hintsAllowed).toBeUndefined();
    expect(task("corners.gender").question.hintsAllowed).toBeUndefined();
    expect(task("corners.reverse").question.hintsAllowed).toBeUndefined();
  });
  it("keeps the initial image absent, then reveals a neutral hint and records its use with the answer", () => {
    const value = task(); const onAnswer = vi.fn();
    const view = render(createElement(TaskRenderer, { task: value, onAnswer }));
    expect(view.container.querySelector("img")).toBeNull();
    expect(view.container.innerHTML).not.toContain(value.feedback.image);
    fireEvent.click(screen.getByRole("button", { name: "Show illustration hint" }));
    const image = screen.getByRole("img", { name: "Illustration hint" });
    expect(image.getAttribute("src")).toContain(value.feedback.image);
    expect(image.getAttribute("style")).toContain("grayscale(1)");
    expect(image.parentElement?.style.color).toContain("--ink");
    expect(view.container.innerHTML).not.toMatch(/--tone-(?:masc|fem|neut|plural)/u);
    expect(onAnswer).not.toHaveBeenCalled();
    const answer = chooseCorrect(value);
    expect(onAnswer).toHaveBeenCalledWith(answer, { hinted: true });
    expect(screen.queryByRole("button", { name: "Show illustration hint" })).toBeNull();
  });
  it("leaves answers unhinted when the illustration was not requested", () => {
    const value = task(); const onAnswer = vi.fn();
    render(createElement(TaskRenderer, { task: value, onAnswer }));
    const answer = chooseCorrect(value);
    expect(onAnswer).toHaveBeenCalledWith(answer);
    expect(screen.queryByRole("button", { name: "Show illustration hint" })).toBeNull();
  });
  it("resets the image and hint evidence when the task changes", () => {
    const value = task(); const onAnswer = vi.fn();
    const view = render(createElement(TaskRenderer, { task: value, onAnswer }));
    fireEvent.click(screen.getByRole("button", { name: "Show illustration hint" }));
    const next = { ...value, id: "next-attempt" };
    view.rerender(createElement(TaskRenderer, { task: next, onAnswer }));
    expect(view.container.querySelector("img")).toBeNull();
    expect(screen.getByRole("button", { name: "Show illustration hint" })).toBeTruthy();
    const answer = chooseCorrect(next);
    expect(onAnswer).toHaveBeenCalledWith(answer);
  });
  it("respects exam-level hint suppression and task difficulty", () => {
    const view = render(createElement(TaskRenderer, { task: task(), onAnswer: vi.fn(), allowHints: false }));
    expect(screen.queryByRole("button", { name: "Show illustration hint" })).toBeNull();
    expect(view.container.querySelector("img")).toBeNull();
    view.rerender(createElement(TaskRenderer, { task: { ...task("corners.meaning", false), id: "no-hint" }, onAnswer: vi.fn() }));
    expect(screen.queryByRole("button", { name: "Show illustration hint" })).toBeNull();
    expect(view.container.querySelector("img")).toBeNull();
  });
  it("does not offer a hint for an unavailable source image or a different tested dimension", () => {
    const value = task(); delete value.feedback.image;
    const view = render(createElement(TaskRenderer, { task: value, onAnswer: vi.fn() }));
    expect(screen.queryByRole("button", { name: "Show illustration hint" })).toBeNull();
    const gender = task("corners.gender"); gender.question.hintsAllowed = true;
    view.rerender(createElement(TaskRenderer, { task: gender, onAnswer: vi.fn() }));
    expect(screen.queryByRole("button", { name: "Show illustration hint" })).toBeNull();
  });
});
