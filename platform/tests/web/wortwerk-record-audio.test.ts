/// <reference lib="dom" />
/** @vitest-environment jsdom */
import { createElement, type ComponentType } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { RecorderController, RecorderPhase, RecorderSnapshot } from "../../apps/web/lib/recorder/recorder-types.js";
import type { GeneratedTask, TaskAnswer } from "../../packages/wortwerk/src/tasks.js";
import type { PackAudio } from "../../packages/content/src/types/packs.js";
const recorder = vi.hoisted(() => ({ controller: undefined as unknown, listener: undefined as unknown }));
vi.mock("../../apps/web/lib/recorder/createMediaRecorderController.js", () => ({ createMediaRecorderController: ({ onChange }: { onChange: (snapshot: RecorderSnapshot) => void }) => {
  recorder.listener = onChange;
  onChange((recorder.controller as RecorderController).snapshot);
  return recorder.controller;
} }));
const recordPath = "../../apps/web/components/wortwerk/mechanics/Record.js";
const audioPath = "../../apps/web/components/wortwerk/QuestionAudio.js";
const { Record } = await import(recordPath) as { Record: ComponentType<{ task: GeneratedTask; onAnswer: (answer: TaskAnswer) => void }> };
const { QuestionAudio } = await import(audioPath) as { QuestionAudio: ComponentType<{ audio: PackAudio; disabled?: boolean }> };
const audio: PackAudio = { src: "/audio/source.mp3", review: "preview" };
const task: GeneratedTask = { id: "record-audio", packId: "fixture", itemId: "source", templateId: "record.echo", mechanic: "record", skill: "speaking", dimension: "speaking", format: "recall", testedDimensions: ["speaking"], revealFields: ["audio.text"], question: { instruction: "Listen and practise.", audio, options: [], input: "self-check", lang: "en", helperKeys: [] }, solution: { selfCheck: true }, feedback: { answer: "Your response", summary: "Self-check" } };
let trace: string[];
function snapshot(phase: RecorderPhase): RecorderSnapshot { return { phase, hasRecording: true, recordCompleted: true, playbackCompleted: phase === "finalized", objectUrl: null, errorCode: null, guidance: null }; }
function publish(phase: RecorderPhase) { (recorder.listener as (value: RecorderSnapshot) => void)(snapshot(phase)); }
beforeEach(() => {
  trace = [];
  const noop = () => undefined;
  recorder.controller = { snapshot: snapshot("finalized"), requestPermission: async () => undefined,
    startRecording: async () => { trace.push("capture"); publish("permission-pending"); },
    stopRecording: async () => { publish("stop-pending"); },
    playRecording: async () => { trace.push("learner-play"); publish("playback"); },
    stopPlayback: () => { publish("finalized"); }, retry: noop, discard: noop, dispose: noop } satisfies RecorderController;
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) { trace.push("source-pause"); this.dispatchEvent(new Event("pause")); });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("pauses the source before microphone capture, blocks busy phases, and permits source playback after recording", async () => {
  render(createElement(Record, { task, onAnswer: vi.fn() }));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Play audio" })); });
  trace.length = 0;
  fireEvent.click(screen.getByRole("button", { name: "Start recording" }));
  expect(trace).toContain("source-pause");
  expect(trace).toContain("capture");
  expect(trace.indexOf("source-pause")).toBeLessThan(trace.indexOf("capture"));
  for (const phase of ["permission-pending", "recording", "stop-pending"] as const) {
    act(() => publish(phase));
    const source = screen.getByRole("button", { name: "Play audio" }) as HTMLButtonElement;
    expect(source.disabled).toBe(true);
    fireEvent.click(source);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  }
  act(() => publish("finalized"));
  expect((screen.getByRole("button", { name: "Play audio" }) as HTMLButtonElement).disabled).toBe(false);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Play audio" })); });
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
});

it("pauses the source before learner playback and prevents simultaneous source playback until it stops", async () => {
  render(createElement(Record, { task, onAnswer: vi.fn() }));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Play audio" })); });
  trace.length = 0;
  fireEvent.click(screen.getByRole("button", { name: "Play my recording" }));
  expect(trace).toContain("source-pause");
  expect(trace).toContain("learner-play");
  expect(trace.indexOf("source-pause")).toBeLessThan(trace.indexOf("learner-play"));
  const source = screen.getByRole("button", { name: "Play audio" }) as HTMLButtonElement;
  expect(source.disabled).toBe(true);
  fireEvent.click(source);
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Stop playback" }));
  expect((screen.getByRole("button", { name: "Play audio" }) as HTMLButtonElement).disabled).toBe(false);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Play audio" })); });
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
});

it.each(["resolve", "reject"] as const)("invalidates a pending source play on disable even when its promise later %ss", async settlement => {
  let resolve!: () => void; let reject!: (reason: Error) => void;
  const pending = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  vi.mocked(HTMLMediaElement.prototype.play).mockReturnValueOnce(pending);
  const view = render(createElement(QuestionAudio, { audio }));
  fireEvent.click(screen.getByRole("button", { name: "Play audio" }));
  view.rerender(createElement(QuestionAudio, { audio, disabled: true }));
  expect((screen.getByRole("button", { name: "Play audio" }) as HTMLButtonElement).disabled).toBe(true);
  const pauses = vi.mocked(HTMLMediaElement.prototype.pause).mock.calls.length;
  expect(pauses).toBeGreaterThan(0);
  await act(async () => { if (settlement === "resolve") resolve(); else reject(new Error("cancelled")); await pending.catch(() => undefined); });
  if (settlement === "resolve") expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(pauses + 1);
  expect(screen.queryByRole("button", { name: "Audio unavailable" })).toBeNull();
  view.rerender(createElement(QuestionAudio, { audio }));
  expect((screen.getByRole("button", { name: "Play audio" }) as HTMLButtonElement).disabled).toBe(false);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Play audio" })); });
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
});
