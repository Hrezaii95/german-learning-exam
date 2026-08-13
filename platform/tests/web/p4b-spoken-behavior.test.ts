/**
 * @vitest-environment jsdom
 *
 * SpokenRolePlayLevel UI gate with mocked recorder lifecycle.
 */
import { createElement, type ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { parseLearnerEvent, type LearnerEvent } from "@german-learning/learning";
import { createConversationUuid } from "../../apps/web/lib/conversation/index.js";
import type { RecorderController, RecorderSnapshot } from "../../apps/web/lib/recorder/recorder-types.js";

const useMediaRecorderMock = vi.fn();

vi.mock("@/lib/recorder", () => ({
  useMediaRecorder: () => useMediaRecorderMock(),
}));

function baseSnapshot(
  patch: Partial<RecorderSnapshot> = {},
): RecorderSnapshot {
  return Object.freeze({
    phase: "idle",
    errorCode: null,
    guidance: null,
    objectUrl: null,
    hasRecording: false,
    recordCompleted: false,
    playbackCompleted: false,
    ...patch,
  });
}

function mockController(): RecorderController {
  return {
    snapshot: baseSnapshot(),
    requestPermission: vi.fn(async () => undefined),
    startRecording: vi.fn(async () => undefined),
    stopRecording: vi.fn(async () => undefined),
    playRecording: vi.fn(async () => undefined),
    stopPlayback: vi.fn(),
    retry: vi.fn(),
    discard: vi.fn(),
    dispose: vi.fn(),
  };
}

function expectDisabled(el: HTMLElement) {
  expect((el as HTMLButtonElement).disabled).toBe(true);
}

describe("P4B spoken role-play behavioral gate", () => {
  let SpokenRolePlayLevel: (props: {
    sessionId: string;
    onEvent?: (event: LearnerEvent) => void;
    onComplete: () => void;
  }) => ReactNode;

  beforeAll(async () => {
    SpokenRolePlayLevel = (
      await import("../../apps/web/components/conversation/SpokenRolePlayLevel.tsx")
    ).SpokenRolePlayLevel as typeof SpokenRolePlayLevel;
  });

  afterEach(() => {
    cleanup();
    useMediaRecorderMock.mockReset();
  });

  it("disables mic actions while controller is initializing", async () => {
    const user = userEvent.setup();
    useMediaRecorderMock.mockReturnValue({
      snapshot: baseSnapshot(),
      controller: null,
    });
    render(
      createElement(SpokenRolePlayLevel, {
        sessionId: createConversationUuid(),
        onComplete: vi.fn(),
      }),
    );

    const section = document.querySelector("[data-level='spoken-role-play']");
    expect(section?.getAttribute("data-recorder-ready")).toBe("false");
    expect(section?.getAttribute("data-recorder-phase")).toBe("initializing");
    expect(
      document.querySelector("[data-recorder-initializing='true']"),
    ).toBeTruthy();

    const enable = screen.getByRole("button", { name: /Enable microphone/i });
    expectDisabled(enable);
    await user.click(enable);
    expectDisabled(enable);
  });

  it("does not complete until record+playback+self-check; one recordingCycle only", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onEvent = vi.fn();
    const controller = mockController();
    const sessionId = createConversationUuid();

    useMediaRecorderMock.mockReturnValue({
      snapshot: baseSnapshot({
        phase: "finalized",
        recordCompleted: false,
        playbackCompleted: false,
        hasRecording: false,
        guidance: "Recording saved locally on this device.",
      }),
      controller,
    });

    const { rerender } = render(
      createElement(SpokenRolePlayLevel, {
        sessionId,
        onEvent,
        onComplete,
      }),
    );

    await user.click(
      screen.getByRole("button", { name: /Review published prompt/i }),
    );
    await user.click(screen.getByRole("button", { name: /Complete speaking level/i }));
    expect(onComplete).not.toHaveBeenCalled();
    expect(onEvent).not.toHaveBeenCalled();
    expect(document.querySelector('[data-feedback="recording-incomplete"]')).toBeTruthy();

    useMediaRecorderMock.mockReturnValue({
      snapshot: baseSnapshot({
        phase: "finalized",
        recordCompleted: true,
        playbackCompleted: false,
        hasRecording: true,
        objectUrl: "blob:test-1",
      }),
      controller,
    });
    rerender(
      createElement(SpokenRolePlayLevel, {
        sessionId,
        onEvent,
        onComplete,
      }),
    );
    await user.click(screen.getByRole("button", { name: /Complete speaking level/i }));
    expect(onComplete).not.toHaveBeenCalled();

    useMediaRecorderMock.mockReturnValue({
      snapshot: baseSnapshot({
        phase: "finalized",
        recordCompleted: true,
        playbackCompleted: true,
        hasRecording: true,
        objectUrl: "blob:test-1",
      }),
      controller,
    });
    rerender(
      createElement(SpokenRolePlayLevel, {
        sessionId,
        onEvent,
        onComplete,
      }),
    );
    await user.click(screen.getByRole("button", { name: /Complete speaking level/i }));
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "good" }));
    await user.click(screen.getByRole("button", { name: /Complete speaking level/i }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledTimes(1);
    const event = parseLearnerEvent(onEvent.mock.calls[0]![0]);
    expect(event.kind).toBe("recordingCycle");
    if (event.kind === "recordingCycle") {
      expect(event.recordCompleted).toBe(true);
      expect(event.playbackCompleted).toBe(true);
      expect(event.selfCheckCompleted).toBe(true);
      expect(event.listenCompleted).toBe(true);
    }
    expect(JSON.stringify(event)).not.toMatch(
      /pronunciationAccuracy|pronunciationScore/,
    );

    await user.click(screen.getByRole("button", { name: /Complete speaking level/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledTimes(1);
  });
});
