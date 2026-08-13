/**
 * @vitest-environment jsdom
 *
 * User-level coverage for the P4C local learner-state surfaces. These tests
 * deliberately cross the provider/storage boundary instead of asserting
 * implementation state.
 */
import { createElement, type ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LEARNER_EVENT_SCHEMA_VERSION } from "@german-learning/learning";
import { practiceActivityId, type PracticeGameId } from "../../apps/web/lib/games/index.js";

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    onClick?: () => void;
    className?: string;
  }) {
    const { onClick, ...anchorProps } = rest;
    return createElement("a", {
      href,
      ...anchorProps,
      onClick: (event: { preventDefault(): void }) => {
        event.preventDefault();
        onClick?.();
      },
    }, children);
  },
}));

vi.mock("@/components/games/GameRenderer", async () => {
  const { createElement: h } = await import("react");
  let eventIndex = 1;
  return {
    PracticeGameBody({
      gameId,
      sessionId,
      onEvent,
    }: {
      gameId: PracticeGameId;
      sessionId: string;
      onEvent: (event: unknown) => void;
    }) {
      const measuredDimension = gameId === "flashcards"
        ? "recall"
        : gameId === "picture-word-match" || gameId === "article-choice"
          ? "recognition"
          : gameId === "word-order"
            ? "production"
            : "form";
      const taskFamily = gameId === "picture-word-match"
        ? "pictureRecognition"
        : gameId === "article-choice"
          ? "multipleChoice"
          : gameId === "word-order"
            ? "sentenceOrder"
            : "formManipulation";
      return h(
        "button",
        {
          type: "button",
          onClick: () => {
            const eventId = `00000000-0000-4000-8000-${String(eventIndex++).padStart(12, "0")}`;
            onEvent(gameId === "flashcards"
              ? {
                  schemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
                  kind: "selfRatedAttempt",
                  eventId,
                  sessionId,
                  timestamp: new Date().toISOString(),
                  conceptId: "lex:architekt",
                  activityId: practiceActivityId(gameId),
                  sourceActivityMode: "review",
                  measuredDimensions: ["recall"],
                  taskFamily: "flashcard",
                  rating: "good",
                  latencyMs: 100,
                  hintsUsed: 0,
                }
              : {
                  schemaVersion: LEARNER_EVENT_SCHEMA_VERSION,
                  kind: "objectiveAttempt",
                  eventId,
                  sessionId,
                  timestamp: new Date().toISOString(),
                  conceptId: "lex:architekt",
                  activityId: practiceActivityId(gameId),
                  sourceActivityMode: "review",
                  measuredDimensions: [measuredDimension],
                  taskFamily,
                  graderOutcome: "correct",
                  latencyMs: 100,
                  hintsUsed: 0,
                });
          },
        },
        `Complete ${gameId}`,
      );
    },
  };
});

import { WorkbookAudioPanel } from "../../apps/web/components/audio/WorkbookAudioPanel.js";
import { LearnerStateProvider } from "../../apps/web/components/learner-state/LearnerStateProvider.js";
import { SettingsView } from "../../apps/web/components/learner-state/SettingsView.js";
import { ReviewSession, ReviewSetup } from "../../apps/web/components/review/ReviewViews.js";
import { createLearnerStateController } from "../../apps/web/lib/learner-state/index.js";
import type { WorkbookAudioTrack } from "../../apps/web/lib/audio/workbook-audio.js";

const REVIEW_CONFIG_KEY = "german-learning-os:review-config:v1";

async function seedLearnerState(options: {
  review?: boolean;
  preferredAudioSpeed?: number;
} = {}) {
  const controller = createLearnerStateController({
    store: window.localStorage,
    now: () => new Date(),
  });
  await controller.initialize();
  if (options.review) {
    await controller.addReviewCardsForConcept("lex:architekt");
    await controller.addReviewCardsForConcept("verb:sein");
    await controller.toggleTag("lex:architekt", "Difficult");
  }
  if (options.preferredAudioSpeed !== undefined) {
    await controller.updateSettings({
      timezone: "Europe/Berlin",
      preferredAudioSpeed: options.preferredAudioSpeed,
    });
  }
}

function renderWithLearnerState(child: ReactNode) {
  return render(createElement(LearnerStateProvider, null, child));
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("P4C learner UI behavior", () => {
  it("carries the chosen review filters into the session", async () => {
    await seedLearnerState({ review: true });
    const user = userEvent.setup();
    renderWithLearnerState(createElement(ReviewSetup));

    await screen.findByRole("heading", { name: "Build mission" });
    await user.selectOptions(screen.getByLabelText("Mission size"), "5");
    await user.selectOptions(screen.getByLabelText("Lesson"), "lesson:02");
    await user.click(screen.getByRole("checkbox", { name: /Difficult or confusing only/i }));
    await user.click(screen.getByRole("link", { name: "Start mission" }));

    expect(JSON.parse(window.sessionStorage.getItem(REVIEW_CONFIG_KEY) ?? "null"))
      .toEqual({ size: 5, lesson: "lesson:02", onlyDifficult: true, teacherAssignment: false });

    cleanup();
    renderWithLearnerState(createElement(ReviewSession));
    expect(await screen.findByText("Today’s mission · 1/4")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Architekt/i })).toBeTruthy();
  });

  it("advances across the frozen mission one card at a time without skipping", async () => {
    await seedLearnerState({ review: true });
    window.sessionStorage.setItem(REVIEW_CONFIG_KEY, JSON.stringify({
      size: 5,
      lesson: "lesson:02",
      onlyDifficult: true,
      teacherAssignment: false,
    }));
    const user = userEvent.setup();
    renderWithLearnerState(createElement(ReviewSession));

    expect(await screen.findByText("Today’s mission · 1/4")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^Complete / }));
    expect(await screen.findByText("Today’s mission · 2/4")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^Complete / }));
    expect(await screen.findByText("Today’s mission · 3/4")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^Complete / }));
    expect(await screen.findByText("Today’s mission · 4/4")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^Complete / }));
    expect(await screen.findByRole("heading", { name: "Mission finished" })).toBeTruthy();
  });

  it("hydrates stored settings into the editable controls", async () => {
    await seedLearnerState({ preferredAudioSpeed: 1.25 });
    renderWithLearnerState(createElement(SettingsView));

    const timezone = await screen.findByDisplayValue("Europe/Berlin");
    const speed = screen.getByLabelText("Audio speed") as HTMLSelectElement;
    expect(timezone).toBeTruthy();
    expect(speed.value).toBe("1.25");
  });

  it("keeps workbook speed controls grouped per track and updates playback", async () => {
    await seedLearnerState({ preferredAudioSpeed: 1.25 });
    const tracks: readonly WorkbookAudioTrack[] = [
      { id: "1_01", filename: "one.mp3", exercise: "AB 3", purpose: "Names and spelling", durationSeconds: 36 },
      { id: "1_02", filename: "two.mp3", exercise: "AB 3", purpose: "Names and spelling", durationSeconds: 31 },
    ];
    const user = userEvent.setup();
    renderWithLearnerState(createElement(WorkbookAudioPanel, { tracks }));

    const preferred = await screen.findAllByRole("button", { name: "Preferred 1.25×" });
    expect(preferred).toHaveLength(2);
    await waitFor(() => expect(preferred[0]!.getAttribute("aria-pressed")).toBe("true"));
    expect(screen.getByRole("group", { name: "Playback speed for 1_01" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Playback speed for 1_02" })).toBeTruthy();

    const studyButtons = screen.getAllByRole("button", { name: "Study 0.8×" });
    await user.click(studyButtons[0]!);
    const firstAudio = screen.getAllByLabelText("AB 3, Names and spelling")[0] as HTMLAudioElement;
    expect(firstAudio.playbackRate).toBe(0.8);
    expect(studyButtons[0]!.getAttribute("aria-pressed")).toBe("true");
    expect(studyButtons[1]!.getAttribute("aria-pressed")).toBe("false");
    await waitFor(() => expect(preferred[1]!.getAttribute("aria-pressed")).toBe("true"));
  });

  it("keeps a chosen study speed when tracks rerender with a new array identity", async () => {
    await seedLearnerState({ preferredAudioSpeed: 1.25 });
    const makeTracks = (): readonly WorkbookAudioTrack[] => [
      { id: "1_01", filename: "one.mp3", exercise: "AB 3", purpose: "Names and spelling", durationSeconds: 36 },
    ];
    const user = userEvent.setup();
    const view = renderWithLearnerState(createElement(WorkbookAudioPanel, { tracks: makeTracks() }));

    await screen.findByRole("button", { name: "Preferred 1.25×" });
    await user.click(screen.getByRole("button", { name: "Study 0.8×" }));
    expect(screen.getByRole("button", { name: "Study 0.8×" }).getAttribute("aria-pressed")).toBe("true");

    // Structurally equal but referentially new tracks — as any parent
    // re-render produces — must not reset the learner's chosen speed.
    view.rerender(createElement(
      LearnerStateProvider,
      null,
      createElement(WorkbookAudioPanel, { tracks: makeTracks() }),
    ));

    expect(screen.getByRole("button", { name: "Study 0.8×" }).getAttribute("aria-pressed")).toBe("true");
    const audio = screen.getByLabelText("AB 3, Names and spelling") as HTMLAudioElement;
    expect(audio.playbackRate).toBe(0.8);
  });
});
