/// <reference lib="dom" />
/** @vitest-environment jsdom */
import { createElement, type ComponentType } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ContentPack, DifficultyProfile, LanguageProfile } from "../../packages/content/src/types/packs.js";
import type { GeneratedTask, GradeResult, TaskAnswer } from "../../packages/wortwerk/src/tasks.js";
import { getTaskTemplate } from "../../packages/wortwerk/src/template-registry.js";
import { seededRng } from "../../packages/wortwerk/src/random.js";
import manifest from "../fixtures/packs/de-b2-sample/pack.json";
import items from "../fixtures/packs/de-b2-sample/items/all.json";
import profile from "../../content/languages/de.json";
import difficulty from "../fixtures/packs/de-b2-sample/difficulty.json";
const rendererPath = "../../apps/web/components/wortwerk/TaskRenderer.js";
const { TaskRenderer } = await import(rendererPath) as { TaskRenderer: ComponentType<{ task: GeneratedTask; onAnswer: (answer: TaskAnswer) => void; result?: GradeResult | null }> };
afterEach(cleanup);
it("lets an actual Error Hunt recall task accept a typed answer without revealing it first", () => {
  const pack = { ...manifest, items } as unknown as ContentPack;
  const item = pack.items.find(item => item.type === "drill" && item.drillType === "errorHunt")!;
  const template = getTaskTemplate("drill.errorHunt.recall")!;
  const task = template.generate(item, pack, profile as LanguageProfile, difficulty as DifficultyProfile, seededRng("error-hunt-recall"))!;
  expect(task).toMatchObject({ mechanic: "hotspot", format: "recall", question: { input: "text", options: [] } });
  const onAnswer = vi.fn();
  const view = render(createElement(TaskRenderer, { task, onAnswer }));
  const answer = task.solution.accepted![0]!;
  expect(view.container.innerHTML).not.toContain(answer);
  expect(screen.queryByRole("region", { name: "Answer feedback" })).toBeNull();
  expect((screen.getByRole("textbox", { name: "Your answer" }) as HTMLInputElement).value).toBe("");
  fireEvent.change(screen.getByRole("textbox", { name: "Your answer" }), { target: { value: answer } });
  fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
  fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
  expect(onAnswer).toHaveBeenCalledExactlyOnceWith(answer);
  const result = template.grade(task, onAnswer.mock.calls[0]![0] as TaskAnswer, profile as LanguageProfile);
  expect(result).toMatchObject({ correct: true, hinted: false });
  view.rerender(createElement(TaskRenderer, { task, onAnswer, result }));
  expect(screen.getByRole("region", { name: "Answer feedback" })).toBeTruthy();
  expect(view.container.textContent).toContain(answer);
});
