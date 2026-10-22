/// <reference lib="dom" />
/** @vitest-environment jsdom */
import { createElement, type ComponentType } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratedTask, GradeResult, TaskAnswer } from "../../packages/wortwerk/src/tasks.js";

import type { PackAudio } from "../../packages/content/src/types/packs.js";

// The pure engine compiler has no JSX option; the web compiler checks both components.
const cornersPath = "../../apps/web/components/wortwerk/mechanics/Corners.js";
const audioPath = "../../apps/web/components/wortwerk/QuestionAudio.js";
const { Corners } = await import(cornersPath) as { Corners: ComponentType<{ task: GeneratedTask; onAnswer: (answer: TaskAnswer) => void; result?: GradeResult | null; disabled?: boolean }> };
const { QuestionAudio } = await import(audioPath) as { QuestionAudio: ComponentType<{ audio: PackAudio; playbackRate?: number }> };

const correct: GradeResult = { outcome: "correct", correct: true, hinted: false, normalizedAnswer: "choice-b" };
function task(overrides: Partial<GeneratedTask> = {}): GeneratedTask {
  return {
    id: "opaque-task", templateId: "corners.gender", itemId: "source-item", packId: "fixture",
    skill: "vocabulary", mechanic: "corners", dimension: "gender", format: "recognition",
    testedDimensions: ["gender"], revealFields: ["article", "tone", "forms"],
    question: { instruction: "Choose the article", text: "Lampe", options: [{ id: "choice-a", text: "das" }, { id: "choice-b", text: "die" }, { id: "choice-c", text: "der" }], input: "choice", lang: "de-DE", helperKeys: ["ä", "ö", "ü"] },
    solution: { optionIds: ["choice-b"] },
    feedback: { answer: "die Lampe", summary: "You can review this form again.", forms: ["die Lampen"], toneToken: "--tone-fem", image: "/media/revealed-lamp.svg", audio: { src: "/audio/revealed-article.mp3", text: "die Lampe", review: "preview" }, sourceHref: "/vocabulary/" },
    ...overrides,
  };
}

beforeEach(() => { vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined); });

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Corners question and feedback", () => {
  it("renders symmetric neutral targets and keeps reveal fields out of question metadata", () => {
    const { container } = render(createElement(Corners, { task: task(), onAnswer: vi.fn() }));
    expect(screen.getByRole("button", { name: "Lampe" })).not.toBeNull();
    const targets = screen.getByRole("group", { name: "Answer choices" }).querySelectorAll("button");
    expect(new Set(Array.from(targets).map(button => button.className)).size).toBe(1);
    expect(Array.from(targets).every(button => !button.hasAttribute("style") && !button.hasAttribute("data-correct"))).toBe(true);
    for (const hidden of ["die Lampe", "die Lampen", "tone-fem", "revealed-", "choice-b"]) expect(container.innerHTML).not.toContain(hidden);
    expect(container.querySelector("audio")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByRole("region", { name: "Answer feedback" })).toBeNull();
  });

  it("submits once while waiting, then reveals and focuses feedback", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    const value = task();
    const { container, rerender } = render(createElement(Corners, { task: value, onAnswer }));
    await user.click(screen.getByRole("button", { name: "die" }));
    await user.click(screen.getByRole("button", { name: "der" }));
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith("choice-b");
    expect(container.innerHTML).not.toContain("die Lampe");
    rerender(createElement(Corners, { task: value, onAnswer, result: correct }));
    expect(screen.getByText("die Lampe")).not.toBeNull();
    expect(screen.getByText("die Lampen")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Correct" })).toBe(document.activeElement);
    expect(screen.getByRole("status").textContent).toBe("Correct.");
    expect(container.innerHTML).toContain("var(--tone-fem");
    expect(screen.getByRole("link", { name: "Open the source card" }).getAttribute("href")).toMatch(/^\/vocabulary\/?$/u);
  });

  it("reveals the source transcript only in feedback and rejects unsafe card URLs", () => {
    const value = task({ dimension: "meaning", testedDimensions: ["meaning"] });
    value.feedback = { ...value.feedback, answer: "lamp", sourceHref: "/\\external.example" };
    const { rerender } = render(createElement(Corners, { task: value, onAnswer: vi.fn() }));
    expect(screen.queryByText("die Lampe")).toBeNull();
    rerender(createElement(Corners, { task: value, onAnswer: vi.fn(), result: correct }));
    expect(screen.getByText("die Lampe")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Open the source card" })).toBeNull();
  });

  it("supports arrow navigation and Enter with the same callback", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    render(createElement(Corners, { task: task(), onAnswer }));
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "das" })).toBe(document.activeElement);
    await user.keyboard("{ArrowRight}{Enter}");
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith("choice-b");
  });

  it("supports pointer drop without a second synthetic click submission", () => {
    vi.stubGlobal("PointerEvent", MouseEvent);
    const onAnswer = vi.fn();
    render(createElement(Corners, { task: task(), onAnswer }));
    const card = screen.getByRole("button", { name: "Lampe" });
    const target = screen.getByRole("button", { name: "die" });
    Object.defineProperty(document, "elementFromPoint", { configurable: true, value: () => target });
    fireEvent.pointerDown(card, { button: 0, clientX: 20, clientY: 20, pointerId: 1 });
    fireEvent.pointerUp(card, { button: 0, clientX: 150, clientY: 180, pointerId: 1 });
    fireEvent.click(target);
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith("choice-b");
  });

  it("exposes ordinal names for image choices without source captions", () => {
    const value = task({ dimension: "listening", testedDimensions: ["listening"] });
    value.question = { instruction: "Listen and choose", input: "choice", lang: "de-DE", helperKeys: [], audio: { src: "/audio/model.mp3", review: "preview", text: "secret transcript" }, options: [{ id: "one", image: "/media/one.svg", text: "Secret target" }, { id: "two", image: "/media/two.svg", text: "Other picture" }] };
    const { container } = render(createElement(Corners, { task: value, onAnswer: vi.fn() }));
    expect(screen.getByRole("button", { name: "Option 1" })).not.toBeNull();
    expect(Array.from(container.querySelectorAll("img")).every(image => image.alt === "")).toBe(true);
    for (const hidden of ["secret transcript", "Secret target", "Other picture"]) expect(container.innerHTML).not.toContain(hidden);
  });

  it("supports recall and profile keys, and resets submission for a new task", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();
    const value = task({ id: "recall-one", format: "recall" });
    value.question = { ...value.question, input: "text", options: [], helperKeys: ["ü"] };
    const { rerender } = render(createElement(Corners, { task: value, onAnswer }));
    expect(screen.queryByRole("group", { name: "Answer choices" })).toBeNull();
    await user.type(screen.getByRole("textbox", { name: "Your answer" }), "M");
    await user.click(screen.getByRole("button", { name: "ü" }));
    await user.keyboard("tter{Enter}");
    expect(onAnswer).toHaveBeenNthCalledWith(1, "Mütter");
    rerender(createElement(Corners, { task: { ...value, id: "recall-two" }, onAnswer }));
    expect((screen.getByRole("textbox", { name: "Your answer" }) as HTMLInputElement).value).toBe("");
    await user.type(screen.getByRole("textbox", { name: "Your answer" }), "Form{Enter}");
    expect(onAnswer).toHaveBeenNthCalledWith(2, "Form");
  });

  it("blocks disabled tasks and blank recall submissions", () => {
    const onAnswer = vi.fn();
    const { rerender } = render(createElement(Corners, { task: task(), onAnswer, disabled: true }));
    fireEvent.click(screen.getByRole("button", { name: "die" }));
    expect(onAnswer).not.toHaveBeenCalled();
    const value = task({ id: "blank" });
    value.question = { ...value.question, input: "text", options: [] };
    rerender(createElement(Corners, { task: value, onAnswer }));
    fireEvent.submit(screen.getByRole("textbox", { name: "Your answer" }).closest("form")!);
    expect(onAnswer).not.toHaveBeenCalled();
  });
});

describe("question audio", () => {
  const play = vi.fn<() => Promise<void>>();
  beforeEach(() => {
    play.mockReset().mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  });

  it("uses deployed asset base, never autoplays, and hides source text", async () => {
    vi.stubEnv("NEXT_PUBLIC_GL_PAGES_BASE_PATH", "/fixture-base");
    const user = userEvent.setup();
    const { container } = render(createElement(QuestionAudio, { audio: { src: "/audio/clip.mp3", review: "preview", text: "answer hidden until feedback" } }));
    expect(container.querySelector("audio")?.getAttribute("src")).toBe("/fixture-base/audio/clip.mp3");
    expect(container.querySelector("audio")?.preload).toBe("none");
    expect(play).not.toHaveBeenCalled();
    expect(container.innerHTML).not.toContain("answer hidden");
    await user.click(screen.getByRole("button", { name: "Play audio" }));
    expect(play).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Pause audio" })).not.toBeNull();
  });

  it("applies source playback speed and pauses on unmount", async () => {
    const user = userEvent.setup();
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause");
    const { container, rerender, unmount } = render(createElement(QuestionAudio, { audio: { src: "/audio/clip.mp3", review: "reviewed" }, playbackRate: 0.8 }));
    const player = container.querySelector("audio");
    await user.click(screen.getByRole("button", { name: "Play audio" }));
    expect(player?.playbackRate).toBe(0.8);
    expect(player?.preservesPitch).toBe(true);
    rerender(createElement(QuestionAudio, { audio: { src: "/audio/clip.mp3", review: "reviewed" }, playbackRate: 1.2 }));
    expect(player?.playbackRate).toBe(1.2);
    unmount();
    expect(pause).toHaveBeenCalled();
  });

  it("reports clip failure without a speech synthesis fallback", async () => {
    play.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    const { container } = render(createElement(QuestionAudio, { audio: { src: "/audio/missing.mp3", review: "reviewed" } }));
    await user.click(screen.getByRole("button", { name: "Play audio" }));
    expect((screen.getByRole("button", { name: "Audio unavailable" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("source clip");
    expect(container.querySelector("audio")?.autoplay).toBe(false);
  });
});
