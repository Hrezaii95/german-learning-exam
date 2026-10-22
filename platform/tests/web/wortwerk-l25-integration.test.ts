/// <reference lib="dom" />
/** @vitest-environment jsdom */
import { createElement, type ComponentType } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { GeneratedTask, GradeResult, TaskAnswer, TaskFeedback } from "../../packages/wortwerk/src/tasks.js";
import { PLAY_TEMPLATES } from "../../apps/web/lib/wortwerk/runtime.js";
import { CORNERS_TEMPLATES } from "../../packages/wortwerk/src/templates/corners.js";
import { GRAMMAR_LISTENING_TEMPLATES } from "../../packages/wortwerk/src/templates/grammar-listening.js";
import { LITERACY_TEMPLATES } from "../../packages/wortwerk/src/templates/literacy.js";
import { wortwerkStore } from "../../apps/web/lib/wortwerk/store.js";
const rendererPath = "../../apps/web/components/wortwerk/TaskRenderer.js";
const feedbackPath = "../../apps/web/components/wortwerk/TaskFeedback.js";
const { TaskRenderer } = await import(rendererPath) as { TaskRenderer: ComponentType<{ task: GeneratedTask; onAnswer: (answer: TaskAnswer) => void; result?: GradeResult | null; disabled?: boolean; onLearn?: (word: string) => void }> };
const { TaskFeedback: Feedback } = await import(feedbackPath) as { TaskFeedback: ComponentType<{ feedback: TaskFeedback; result: GradeResult; lang: string }> };
const task: GeneratedTask = { id: "reading-attempt", itemId: "source-text", packId: "fixture", templateId: "read.tap", skill: "reading", mechanic: "hotspot", dimension: "reading", format: "recognition", testedDimensions: ["reading"], revealFields: ["modelAnswers"], question: { instruction: "Read and save a word.", passage: "One unfamiliar word.", options: [], input: "self-check", lang: "en", helperKeys: [] }, solution: { selfCheck: true }, feedback: { answer: "Your response", summary: "Compare with the source.", modelAnswers: ["An authored model"] } };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it("registers all ten mechanics from the complete deduplicated template catalogue", () => {
  const expected = [...new Set([...CORNERS_TEMPLATES, ...GRAMMAR_LISTENING_TEMPLATES, ...LITERACY_TEMPLATES].map(template => template.id))].sort();
  expect(PLAY_TEMPLATES.map(template => template.id).sort()).toEqual(expected);
  expect(new Set(PLAY_TEMPLATES.map(template => template.mechanic))).toEqual(new Set(["corners", "sort", "build", "order", "gap", "listen", "hotspot", "match", "record", "write"]));
});
it("persists Tap-to-Learn words by pack and source item once per interaction", () => {
  const append = vi.spyOn(wortwerkStore, "appendEvent");
  render(createElement(TaskRenderer, { task, onAnswer: vi.fn() }));
  fireEvent.click(screen.getByRole("button", { name: "unfamiliar" }));
  fireEvent.click(screen.getByRole("button", { name: "unfamiliar" }));
  expect(append).toHaveBeenCalledTimes(1);
  expect(append).toHaveBeenCalledWith("deck.add", { packId: "fixture", itemId: "source-text", word: "unfamiliar" });
});
it("allows preview to provide a no-op instead of writing to the learner deck", () => {
  const append = vi.spyOn(wortwerkStore, "appendEvent");
  render(createElement(TaskRenderer, { task, onAnswer: vi.fn(), onLearn: () => undefined }));
  fireEvent.click(screen.getByRole("button", { name: "unfamiliar" }));
  expect(append).not.toHaveBeenCalled();
});
it("labels self-check feedback and reveals authored models after submission", () => {
  render(createElement(Feedback, { feedback: task.feedback, result: { outcome: "correct", correct: true, hinted: true, normalizedAnswer: "self:complete", assessment: "self" }, lang: "en" }));
  expect(screen.getByRole("heading", { name: "Self-check recorded" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Correct" })).toBeNull();
  expect(screen.getByRole("heading", { name: "Model responses" })).toBeTruthy();
  expect(screen.getByText("An authored model")).toBeTruthy();
});
