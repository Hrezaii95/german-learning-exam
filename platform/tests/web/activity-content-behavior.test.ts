/**
 * @vitest-environment jsdom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { EnrichedActivity } from "../../apps/web/lib/content/enrichment-types.js";
import type { LearnerActivity } from "../../apps/web/lib/content/types.js";
import { getEnrichedActivity } from "../../apps/web/lib/content/enrichment-client.js";
import { loadLearnerProjection } from "../../apps/web/lib/content/access.js";

describe("lesson activity interaction behavior", () => {
  const projection = loadLearnerProjection();
  let ActivityInteraction: (props: {
    activity: LearnerActivity;
    enrichment: EnrichedActivity | null;
    onAttempt?: (() => void) | undefined;
    onSolved?: (() => void) | undefined;
  }) => React.ReactNode;

  beforeAll(async () => {
    ActivityInteraction = (
      await import("../../apps/web/components/activities/ActivityInteraction.tsx")
    ).ActivityInteraction as typeof ActivityInteraction;
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  function activity(id: string): LearnerActivity {
    const found = projection.activities.find((item) => item.id === id);
    if (!found) throw new Error(`Missing fixture activity ${id}`);
    return found;
  }

  it("requires a real listening note and media confirmation before completing an ungraded activity", async () => {
    const user = userEvent.setup();
    const onAttempt = vi.fn();
    const onSolved = vi.fn();
    const target = activity("activity:lesson-01-alphabet-listen-spell");
    render(createElement(ActivityInteraction, {
      activity: target,
      enrichment: getEnrichedActivity(target.id),
      onAttempt,
      onSolved,
    }));

    await user.click(screen.getByRole("button", { name: /finish listening check/i }));
    expect(screen.getByRole("status").textContent).toMatch(/add a short listening note/i);
    expect(onAttempt).toHaveBeenCalledTimes(1);
    expect(onSolved).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/what did you hear/i), "A, B, C");
    await user.click(screen.getByRole("checkbox", { name: /used the linked lesson audio/i }));
    await user.click(screen.getByRole("button", { name: /finish listening check/i }));
    expect(screen.getByRole("status").textContent).toMatch(/listening pass complete/i);
    expect(onSolved).toHaveBeenCalledTimes(1);
  });

  it("checks matching answers with native radios and advances only on correctness", async () => {
    const user = userEvent.setup();
    const target = activity("activity:lesson-01-greeting-farewell-match");
    render(createElement(ActivityInteraction, {
      activity: target,
      enrichment: getEnrichedActivity(target.id),
    }));

    await user.click(screen.getByRole("button", { name: /check answer/i }));
    expect(screen.getByRole("status").textContent).toMatch(/choose or enter/i);

    await user.click(screen.getByRole("radio", { name: /goodbye/i }));
    await user.click(screen.getByRole("button", { name: /check answer/i }));
    expect(screen.getByRole("status").textContent).toMatch(/correct/i);
    expect(screen.getByText("2 / 5")).toBeTruthy();
  });

  it("supports a keyboard-operable phrase builder and exact source-backed checking", async () => {
    const user = userEvent.setup();
    const target = activity("activity:lesson-02-profession-qa-builder");
    render(createElement(ActivityInteraction, {
      activity: target,
      enrichment: getEnrichedActivity(target.id),
    }));

    for (const token of ["Was", "bist", "du", "von", "Beruf?"]) {
      await user.click(screen.getByRole("button", { name: token }));
    }
    await user.click(screen.getByRole("button", { name: /check answer/i }));
    expect(screen.getByRole("status").textContent).toMatch(/correct/i);
    expect(screen.getByText("2 / 3")).toBeTruthy();
  });

  it.each([
    ["activity:lesson-02-core-professions", "lex:architekt", "der Architekt"],
    ["activity:lesson-02-person-form-morphology", "lex:architekt", "der Architekt"],
    ["activity:lesson-02-sein-arbeiten-contrast", "verb:sein", "sein"],
    ["activity:lesson-02-profession-qa-builder", "qa:profession-casual-main", "Was bist du von Beruf?"],
  ] as const)("persists the registered attempt owner for %s", async (activityId, conceptId, expected) => {
    const user = userEvent.setup();
    const { LearnerStateProvider } = await import(
      "../../apps/web/components/learner-state/LearnerStateProvider.tsx"
    );
    const target = activity(activityId);
    render(createElement(
      LearnerStateProvider,
      null,
      createElement(ActivityInteraction, {
        activity: target,
        enrichment: getEnrichedActivity(target.id),
      }),
    ));

    const radio = screen.queryByRole("radio", { name: expected });
    const textInput = screen.queryByLabelText(/your german answer/i);
    if (radio) {
      await user.click(radio);
    } else if (textInput) {
      await user.type(textInput, expected);
    } else {
      for (const token of expected.split(/\s+/u)) {
        await user.click(screen.getByRole("button", { name: token }));
      }
    }
    await user.click(screen.getByRole("button", { name: /check answer/i }));
    expect(await screen.findByText(/attempt saved on this device/i)).toBeTruthy();

    const stored = Object.values(window.localStorage)
      .map((value) => String(value))
      .join("\n");
    expect(stored).toContain("objectiveAttempt");
    expect(stored).toContain(conceptId);
    expect(stored).toContain(target.id);
  });
});
