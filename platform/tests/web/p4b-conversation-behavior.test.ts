/**
 * @vitest-environment jsdom
 *
 * Genuine component interaction tests for P4B conversation ladder.
 */
import { createElement, type ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { LearnerEvent } from "@german-learning/learning";
import { CONVERSATION_ANSWER_REALIZATIONS } from "../../apps/web/lib/conversation/index.js";

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
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

async function completeThroughSubstitution(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(
    screen.getByRole("button", { name: /Mark studied \/ continue/i }),
  );
  await user.click(
    screen.getByRole("radio", {
      name: CONVERSATION_ANSWER_REALIZATIONS[0]!,
    }),
  );
  await user.click(screen.getByRole("button", { name: "Submit" }));
  expect(feedbackEl().getAttribute("data-feedback")).toBe("correct");
  await user.click(screen.getByRole("button", { name: "Continue" }));

  for (const token of CONVERSATION_ANSWER_REALIZATIONS[1]!.split(/\s+/)) {
    await user.click(screen.getByRole("button", { name: token }));
  }
  await user.click(screen.getByRole("button", { name: "Submit" }));
  expect(feedbackEl().getAttribute("data-feedback")).toBe("correct");
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

describe("P4B conversation behavioral interactions", () => {
  let ConversationLadder: (props: {
    onEvent?: (event: LearnerEvent) => void;
  }) => ReactNode;

  beforeAll(async () => {
    ConversationLadder = (
      await import("../../apps/web/components/conversation/ConversationLadder.tsx")
    ).ConversationLadder as typeof ConversationLadder;
  });

  afterEach(() => {
    cleanup();
  });

  it("locks later levels until prior completion; construction feedback works", async () => {
    const user = userEvent.setup();
    const onEvent = vi.fn();
    render(createElement(ConversationLadder, { onEvent }));

    const substitutionBtn = document.querySelector(
      '[data-level-id="substitution"]',
    );
    expect(substitutionBtn).toBeTruthy();
    expect((substitutionBtn as HTMLButtonElement).disabled).toBe(true);

    await completeThroughSubstitution(user);
    expect(onEvent.mock.calls.some((c) => c[0].kind === "exposure")).toBe(
      true,
    );

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(feedbackEl().getAttribute("data-feedback")).toBe("empty");

    await user.type(
      screen.getByLabelText(/Type your answer/i),
      CONVERSATION_ANSWER_REALIZATIONS[2]!,
    );
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(feedbackEl().getAttribute("data-feedback")).toBe("correct");
  });

  it("hint/reveal prevents correct strong evidence on construction", async () => {
    const user = userEvent.setup();
    const onEvent = vi.fn();
    render(createElement(ConversationLadder, { onEvent }));

    await completeThroughSubstitution(user);

    await user.click(screen.getByRole("button", { name: "Hint" }));
    await user.type(
      screen.getByLabelText(/Type your answer/i),
      CONVERSATION_ANSWER_REALIZATIONS[0]!,
    );
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(feedbackEl().getAttribute("data-feedback")).toBe("partial");
    const last = onEvent.mock.calls.at(-1)![0] as LearnerEvent;
    expect(last.kind).toBe("objectiveAttempt");
    if (last.kind === "objectiveAttempt") {
      expect(last.graderOutcome).toBe("partial");
      expect(last.taskFamily).toBe("productionTask");
    }
  });

  it("correct submit without Continue does not unlock next level", async () => {
    const user = userEvent.setup();
    render(createElement(ConversationLadder));

    await user.click(
      screen.getByRole("button", { name: /Mark studied \/ continue/i }),
    );

    const substitutionBefore = document.querySelector(
      '[data-level-id="substitution"]',
    ) as HTMLButtonElement;
    expect(substitutionBefore.disabled).toBe(true);

    await user.click(
      screen.getByRole("radio", {
        name: CONVERSATION_ANSWER_REALIZATIONS[0]!,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(feedbackEl().getAttribute("data-feedback")).toBe("correct");

    const substitutionAfter = document.querySelector(
      '[data-level-id="substitution"]',
    ) as HTMLButtonElement;
    expect(substitutionAfter.disabled).toBe(true);
    expect(substitutionAfter.getAttribute("data-accessible")).toBe("false");

    const guidedStillCurrent = document.querySelector(
      '[data-level-id="guided-recognition"]',
    ) as HTMLButtonElement;
    expect(guidedStillCurrent.getAttribute("data-current")).toBe("true");

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      (
        document.querySelector(
          '[data-level-id="substitution"]',
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
});
