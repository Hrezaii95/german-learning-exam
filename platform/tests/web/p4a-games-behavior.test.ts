/**
 * @vitest-environment jsdom
 *
 * Genuine component interaction tests for P4A practice games.
 * Static markup grep alone is not sufficient — these drive selection,
 * submit, reveal/hint, feedback, event emission, retry/reset, keyboard,
 * and audio/empty non-emission through the real client components.
 */
import { createElement, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { LearnerEvent } from "@german-learning/learning";
import { createPracticeUuid } from "../../apps/web/lib/games/index.js";

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    className?: string;
    "aria-current"?: string;
    "aria-label"?: string;
    "data-game-id"?: string;
    "data-availability"?: string;
    "data-practise-link"?: string;
  }) {
    return createElement("a", { href, ...rest }, children);
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

function feedbackEl(): HTMLElement {
  const el = document.querySelector("[data-feedback]");
  if (!(el instanceof HTMLElement)) {
    throw new Error("expected feedback element with data-feedback");
  }
  return el;
}

describe("P4A practice behavioral interactions", () => {
  let ArticleChoiceGame: (props: {
    sessionId: string;
    onEvent?: (event: LearnerEvent) => void;
  }) => ReactNode;
  let FlashcardsGame: (props: {
    sessionId: string;
    onEvent?: (event: LearnerEvent) => void;
  }) => ReactNode;
  let VerbBuilderGame: (props: {
    sessionId: string;
    onEvent?: (event: LearnerEvent) => void;
  }) => ReactNode;
  let PictureWordMatchGame: (props: {
    sessionId: string;
    onEvent?: (event: LearnerEvent) => void;
  }) => ReactNode;
  let AudioMatchGame: (props: {
    sessionId: string;
    onEvent?: (event: LearnerEvent) => void;
  }) => ReactNode;
  let MorphologyPuzzleGame: (props: {
    sessionId: string;
    onEvent?: (event: LearnerEvent) => void;
  }) => ReactNode;

  beforeAll(async () => {
    ArticleChoiceGame = (
      await import("../../apps/web/components/games/ArticleChoiceGame.tsx")
    ).ArticleChoiceGame as typeof ArticleChoiceGame;
    FlashcardsGame = (
      await import("../../apps/web/components/games/FlashcardsGame.tsx")
    ).FlashcardsGame as typeof FlashcardsGame;
    VerbBuilderGame = (
      await import("../../apps/web/components/games/VerbBuilderGame.tsx")
    ).VerbBuilderGame as typeof VerbBuilderGame;
    PictureWordMatchGame = (
      await import("../../apps/web/components/games/PictureWordMatchGame.tsx")
    ).PictureWordMatchGame as typeof PictureWordMatchGame;
    AudioMatchGame = (
      await import("../../apps/web/components/games/AudioMatchGame.tsx")
    ).AudioMatchGame as typeof AudioMatchGame;
    MorphologyPuzzleGame = (
      await import("../../apps/web/components/games/MorphologyPuzzleGame.tsx")
    ).MorphologyPuzzleGame as typeof MorphologyPuzzleGame;
  });

  afterEach(() => {
    cleanup();
  });

  it("article-choice: empty submit does not emit; selection+submit emits correct", async () => {
    const user = userEvent.setup();
    const onEvent = vi.fn();
    render(
      createElement(ArticleChoiceGame, {
        sessionId: createPracticeUuid(),
        onEvent,
      }),
    );

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(feedbackEl().getAttribute("data-feedback")).toBe("empty");
    expect(onEvent).not.toHaveBeenCalled();

    await user.click(screen.getByRole("radio", { name: /^der$/i }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(feedbackEl().getAttribute("data-feedback")).toBe("correct");
    expect(onEvent).toHaveBeenCalledTimes(1);
    const event = onEvent.mock.calls[0]![0] as LearnerEvent;
    expect(event.kind).toBe("objectiveAttempt");
    if (event.kind === "objectiveAttempt") {
      expect(event.graderOutcome).toBe("correct");
      expect(event.taskFamily).toBe("multipleChoice");
    }
  });

  it("article-choice: reveal then matching submit is partial; retry resets", async () => {
    const user = userEvent.setup();
    const onEvent = vi.fn();
    render(
      createElement(ArticleChoiceGame, {
        sessionId: createPracticeUuid(),
        onEvent,
      }),
    );

    await user.click(screen.getByRole("button", { name: "Reveal" }));
    expect(feedbackEl().getAttribute("data-feedback")).toBe("revealed");

    await user.click(screen.getByRole("radio", { name: /^der$/i }));
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(feedbackEl().getAttribute("data-feedback")).toBe("partial");
    expect(onEvent).toHaveBeenCalledTimes(1);
    const event = onEvent.mock.calls[0]![0] as LearnerEvent;
    if (event.kind === "objectiveAttempt") {
      expect(event.graderOutcome).toBe("partial");
      expect(event.hintsUsed).toBeGreaterThan(0);
    }

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(feedbackEl().getAttribute("data-feedback")).toBe("retry");
    const der = screen.getByRole("radio", { name: /^der$/i });
    expect((der as HTMLInputElement).checked).toBe(false);
  });

  it("picture-word-match: selection + submit emits recognition objectiveAttempt", async () => {
    const user = userEvent.setup();
    const onEvent = vi.fn();
    render(
      createElement(PictureWordMatchGame, {
        sessionId: createPracticeUuid(),
        onEvent,
      }),
    );

    await user.click(screen.getByRole("radio", { name: /der Architekt/i }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(feedbackEl().getAttribute("data-feedback")).toBe("correct");
    expect(onEvent).toHaveBeenCalledTimes(1);
    const event = onEvent.mock.calls[0]![0] as LearnerEvent;
    if (event.kind === "objectiveAttempt") {
      expect(event.taskFamily).toBe("pictureRecognition");
      expect(event.graderOutcome).toBe("correct");
    }
  });

  it("flashcards: self-rate emits selfRatedAttempt only; flip has keyboard activation", async () => {
    const user = userEvent.setup();
    const onEvent = vi.fn();
    render(
      createElement(FlashcardsGame, {
        sessionId: createPracticeUuid(),
        onEvent,
      }),
    );

    const card = screen.getByRole("button", { pressed: false });
    // fireEvent avoids user-event Enter→click synthesis double-toggling the card.
    fireEvent.keyDown(card, { key: "Enter" });
    expect(card.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(card, { key: " " });
    expect(card.getAttribute("aria-pressed")).toBe("false");

    await user.click(screen.getByRole("button", { name: "good" }));
    expect(feedbackEl().getAttribute("data-feedback")).toBe("self-rated");
    expect(onEvent).toHaveBeenCalledTimes(1);
    const event = onEvent.mock.calls[0]![0] as LearnerEvent;
    expect(event.kind).toBe("selfRatedAttempt");

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(feedbackEl().getAttribute("data-feedback")).toBe("retry");
  });

  it("verb-builder: Enter key submits typed answer and emits form event", async () => {
    const user = userEvent.setup();
    const onEvent = vi.fn();
    render(
      createElement(VerbBuilderGame, {
        sessionId: createPracticeUuid(),
        onEvent,
      }),
    );

    const input = screen.getByLabelText(/present form/i);
    await user.type(input, "bin{Enter}");

    expect(feedbackEl().getAttribute("data-feedback")).toBe("correct");
    expect(onEvent).toHaveBeenCalledTimes(1);
    const event = onEvent.mock.calls[0]![0] as LearnerEvent;
    if (event.kind === "objectiveAttempt") {
      expect(event.taskFamily).toBe("formManipulation");
      expect(event.graderOutcome).toBe("correct");
    }
  });

  it("morphology-puzzle: incorrect submit emits incorrect; hint path stays non-strong", async () => {
    const user = userEvent.setup();
    const onEvent = vi.fn();
    render(
      createElement(MorphologyPuzzleGame, {
        sessionId: createPracticeUuid(),
        onEvent,
      }),
    );

    const input = screen.getByLabelText(/feminine lemma/i);
    await user.type(input, "wrong");
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(feedbackEl().getAttribute("data-feedback")).toBe("incorrect");
    expect(onEvent).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Retry" }));
    await user.click(screen.getByRole("button", { name: "Reveal" }));
    expect(feedbackEl().getAttribute("data-feedback")).toBe("revealed");
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(feedbackEl().getAttribute("data-feedback")).toBe("partial");
    const last = onEvent.mock.calls.at(-1)![0] as LearnerEvent;
    if (last.kind === "objectiveAttempt") {
      expect(last.graderOutcome).toBe("partial");
    }
  });

  it("audio-match: unavailable UI never emits and has no Submit", () => {
    const onEvent = vi.fn();
    render(
      createElement(AudioMatchGame, {
        sessionId: createPracticeUuid(),
        onEvent,
      }),
    );

    expect(screen.queryByRole("button", { name: "Submit" })).toBeNull();
    expect(feedbackEl().getAttribute("data-feedback")).toBe("unavailable");
    expect(document.body.textContent ?? "").toMatch(/listening-approved/i);
    expect(document.querySelector('[data-availability="unavailable"]')).not.toBeNull();
    expect(onEvent).not.toHaveBeenCalled();
  });
});
