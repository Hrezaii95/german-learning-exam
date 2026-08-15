/**
 * @vitest-environment jsdom
 *
 * P6-02 findings 2, 3, 5, 6 and 7 — driven through the real components.
 *
 *  - 4.1.3 Status Messages: every feedback live region exists before its first
 *    message, and a repeated identical outcome is still a distinct
 *    announcement (the grader returns constant strings, so string inequality
 *    can never be the trigger).
 *  - 2.5.3 Label in Name: every audio control's accessible name starts with
 *    the words the learner can see, so "click Listen" works by voice.
 *  - 3.1.2 Language of Parts: the German the learner must read or produce
 *    inside controls is marked `lang="de"`.
 */
import { createElement, type ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { LearnerEvent } from "@german-learning/learning";
import { loadLearnerProjection } from "../../apps/web/lib/content/access.js";
import { createPracticeUuid } from "../../apps/web/lib/games/index.js";
import { loadLearnerDetailProjection } from "../../apps/web/lib/content/access.js";
import { getEnrichedActivity } from "../../apps/web/lib/content/enrichment-client.js";
import type {
  LearnerMediaAvailability,
  LearnerQaDetail,
  LearnerVerbDetail,
} from "../../apps/web/lib/content/detail-types.js";
import type { EnrichedActivity } from "../../apps/web/lib/content/enrichment-types.js";
import type { LearnerActivity } from "../../apps/web/lib/content/types.js";

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    className?: string;
    "aria-label"?: string;
    "data-game-id"?: string;
    "data-availability"?: string;
    "data-conversation-entry"?: string;
  }) {
    return createElement("a", { href, ...rest }, children);
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

/** Visible label of a control: its text with aria-hidden subtrees removed. */
function visibleLabel(element: Element): string {
  const clone = element.cloneNode(true) as HTMLElement;
  for (const hidden of clone.querySelectorAll('[aria-hidden="true"]')) {
    hidden.remove();
  }
  return (clone.textContent ?? "").replace(/\s+/gu, " ").trim();
}

/** Accessible name as a browser computes it for these controls. */
function accessibleName(element: Element): string {
  const label = element.getAttribute("aria-label");
  if (label !== null && label.trim().length > 0) return label.trim();
  return visibleLabel(element);
}

function statusRegions(): readonly HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role="status"]')];
}

function seqOf(element: Element): number {
  const raw = element.getAttribute("data-announcement-seq");
  if (raw === null) throw new Error("live region has no announcement counter");
  return Number.parseInt(raw, 10);
}

describe("P6 status messages (WCAG 4.1.3)", () => {
  let ArticleChoiceGame: (props: {
    sessionId: string;
    onEvent?: (event: LearnerEvent) => void;
  }) => ReactNode;
  let ActivityInteraction: (props: {
    activity: LearnerActivity;
    enrichment: EnrichedActivity | null;
  }) => ReactNode;

  beforeAll(async () => {
    ArticleChoiceGame = (
      await import("../../apps/web/components/games/ArticleChoiceGame.tsx")
    ).ArticleChoiceGame as typeof ArticleChoiceGame;
    ActivityInteraction = (
      await import("../../apps/web/components/activities/ActivityInteraction.tsx")
    ).ActivityInteraction as typeof ActivityInteraction;
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("mounts the practice feedback region before the first message arrives", () => {
    render(createElement(ArticleChoiceGame, { sessionId: createPracticeUuid() }));

    const regions = statusRegions();
    expect(regions.length).toBe(1);
    expect(regions[0]!.getAttribute("aria-live")).toBe("polite");
    expect(regions[0]!.textContent).toBe("");
    // Idle, but rendered — a display:none region is not monitored.
    expect(regions[0]!.className).toContain("live-region--idle");
    // No outcome has happened yet, so no outcome kind is claimed.
    expect(regions[0]!.hasAttribute("data-feedback")).toBe(false);
  });

  it("announces a second identical wrong answer instead of falling silent", async () => {
    const user = userEvent.setup();
    render(createElement(ArticleChoiceGame, { sessionId: createPracticeUuid() }));

    const wrong = screen
      .getAllByRole("radio")
      .find((radio) => (radio as HTMLInputElement).value !== "der")!;
    await user.click(wrong);
    await user.click(screen.getByRole("button", { name: "Submit" }));

    const region = statusRegions()[0]!;
    const firstText = region.textContent ?? "";
    const firstSeq = seqOf(region);
    expect(firstText).toMatch(/does not match/i);
    expect(region.getAttribute("data-feedback")).toBe("incorrect");
    const firstNode = region.firstElementChild;

    await user.click(screen.getByRole("button", { name: "Submit" }));

    const after = statusRegions()[0]!;
    // Same words — the grader returns a constant string.
    expect(after.textContent).toBe(firstText);
    // …but a new announcement: counter bumped and the message node replaced.
    expect(seqOf(after)).toBe(firstSeq + 1);
    expect(after.firstElementChild).not.toBe(firstNode);
  });

  it("announces every repeated wrong answer inside a lesson activity", async () => {
    const user = userEvent.setup();
    const projection = loadLearnerProjection();
    const activity = projection.activities.find(
      (item) => item.id === "activity:lesson-01-greeting-farewell-match",
    )!;
    render(
      createElement(ActivityInteraction, {
        activity,
        enrichment: getEnrichedActivity(activity.id),
      }),
    );

    const feedback = () =>
      document.querySelector<HTMLElement>('p.activity-feedback[role="status"]') ??
      document.querySelector<HTMLElement>('p.live-region[role="status"]')!;

    // Present and empty before anything is submitted.
    expect(feedback().textContent).toBe("");

    const wrongChoice = screen
      .getAllByRole("radio")
      .find((radio) => !/goodbye/iu.test((radio as HTMLInputElement).value))!;
    await user.click(wrongChoice);
    await user.click(screen.getByRole("button", { name: /check answer/iu }));
    const firstText = feedback().textContent ?? "";
    const firstSeq = seqOf(feedback());
    expect(firstText).toMatch(/not yet/iu);

    await user.click(screen.getByRole("button", { name: /check answer/iu }));
    expect(feedback().textContent).toBe(firstText);
    expect(seqOf(feedback())).toBe(firstSeq + 1);
  });
});

describe("P6 label in name (WCAG 2.5.3)", () => {
  let MeaningPlate: (props: Record<string, unknown>) => ReactNode;
  let PronunciationControl: (props: {
    media: LearnerMediaAvailability;
    label?: string;
  }) => ReactNode;
  let GameSelector: (props: Record<string, unknown>) => ReactNode;
  let HubDirectoryView: (props: Record<string, unknown>) => ReactNode;
  let QaConstruction: (props: { detail: LearnerQaDetail }) => ReactNode;

  beforeAll(async () => {
    MeaningPlate = (await import("../../apps/web/components/media/MeaningPlate.tsx"))
      .MeaningPlate as typeof MeaningPlate;
    PronunciationControl = (
      await import("../../apps/web/components/audio/PronunciationControl.tsx")
    ).PronunciationControl as typeof PronunciationControl;
    GameSelector = (await import("../../apps/web/components/games/GameSelector.tsx"))
      .GameSelector as typeof GameSelector;
    HubDirectoryView = (await import("../../apps/web/components/hubs/HubViews.tsx"))
      .HubDirectoryView as typeof HubDirectoryView;
    QaConstruction = (await import("../../apps/web/components/details/QaPractice.tsx"))
      .QaConstruction as typeof QaConstruction;
  });

  afterEach(cleanup);

  /** WCAG 2.5.3: the name must contain the visible label; we require it first. */
  function expectNameStartsWithVisibleLabel(element: Element) {
    const visible = visibleLabel(element);
    expect(visible.length).toBeGreaterThan(0);
    const name = accessibleName(element);
    expect(
      name.toLowerCase().startsWith(visible.toLowerCase())
        ? null
        : `accessible name "${name}" does not start with visible label "${visible}"`,
    ).toBeNull();
  }

  it("names the meaning-plate audio button after its visible Listen label", () => {
    render(
      createElement(MeaningPlate, {
        lemma: "Lehrer",
        article: "der",
        gloss: "teacher",
        variant: "card",
        audio: { publicPath: "/audio/x.mp3", spokenText: "der Lehrer" },
      }),
    );
    const button = document.querySelector("button.meaning-plate__audio-btn")!;
    expect(visibleLabel(button)).toBe("Listen");
    expectNameStartsWithVisibleLabel(button);
    // The lemma is still in the name, so the control says what it will play.
    expect(accessibleName(button)).toContain("der Lehrer");
  });

  it("names the pronunciation control after its visible Play pronunciation label", () => {
    const media: LearnerMediaAvailability = {
      state: "preview",
      publicPath: "/audio/tts-de-de-v1/tts-62dc09ce76149784.mp3",
      spokenText: "der Friseur",
      voice: "de-DE-KatjaNeural",
      generationRate: "+4%",
    } as LearnerMediaAvailability;
    render(createElement(PronunciationControl, { media, label: "der Friseur" }));

    const button = document.querySelector("button.audio-control__btn")!;
    expect(visibleLabel(button)).toBe("Play pronunciation");
    expectNameStartsWithVisibleLabel(button);
    expect(accessibleName(button)).toContain("der Friseur");
  });

  it("names the unavailable pronunciation control after its visible label too", () => {
    const media = {
      state: "pending-review",
      spokenText: "der Elektriker",
    } as unknown as LearnerMediaAvailability;
    render(createElement(PronunciationControl, { media, label: "der Elektriker" }));

    const button = document.querySelector("button.audio-control__btn")!;
    expect(visibleLabel(button)).toBe("Pronunciation unavailable");
    expectNameStartsWithVisibleLabel(button);
    expect(accessibleName(button)).toContain("der Elektriker");
  });

  it("leaves the hub search entry named by the words it shows", () => {
    render(
      createElement(HubDirectoryView, {
        projection: { hubs: [], hubsById: {} },
      }),
    );
    const link = document.querySelector("a.hub-mobile-search__link")!;
    expect(visibleLabel(link)).toBe("Search all content");
    expect(link.hasAttribute("aria-label")).toBe(false);
    expectNameStartsWithVisibleLabel(link);
  });

  it("keeps the practice card description and availability inside the name", () => {
    render(createElement(GameSelector, {}));

    const cards = [...document.querySelectorAll("a.game-selector__card")];
    expect(cards.length).toBe(8);
    for (const card of cards) {
      expect(card.hasAttribute("aria-label")).toBe(false);
      const name = accessibleName(card);
      const title = card.querySelector(".game-selector__title")!.textContent!;
      const description = card.querySelector(".game-selector__desc")!.textContent!;
      const chip = card.querySelector(".meta-chip")!.textContent!;
      expect(name).toContain(title);
      expect(name).toContain(description);
      expect(name).toContain(chip);
    }
  });

  it("leaves no operable control in any practice game named against its own words", async () => {
    const { PracticeGameBody } = (await import(
      "../../apps/web/components/games/GameRenderer.tsx"
    )) as {
      PracticeGameBody: (props: {
        gameId: string;
        sessionId: string;
        onEvent: () => void;
      }) => ReactNode;
    };
    const { PRACTICE_GAME_IDS } = await import("../../apps/web/lib/games/index.js");

    let checked = 0;
    for (const gameId of PRACTICE_GAME_IDS) {
      render(
        createElement(PracticeGameBody, {
          gameId,
          sessionId: createPracticeUuid(),
          onEvent: () => undefined,
        }),
      );
      // Label in Name applies to operable controls, not to grouping wrappers.
      for (const control of document.querySelectorAll(
        'button, a[href], [role="button"], [role="link"]',
      )) {
        if (visibleLabel(control).length === 0) continue;
        checked += 1;
        expectNameStartsWithVisibleLabel(control);
      }
      cleanup();
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("names the Q&A answer field with the label the learner can see", () => {
    const details = loadLearnerDetailProjection();
    const detail = details.details.find(
      (item): item is LearnerQaDetail => item.kind === "QAPair",
    )!;
    render(createElement(QaConstruction, { detail }));

    const input = document.querySelector<HTMLInputElement>("#qa-construction-input")!;
    expect(input.hasAttribute("aria-label")).toBe(false);
    // The visible <label for> is now the only name source, and it matches.
    expect(screen.getByLabelText("Your answer pattern")).toBe(input);
  });
});

describe("P6 language of parts (WCAG 3.1.2)", () => {
  let VerbSelfCheck: (props: { detail: LearnerVerbDetail }) => ReactNode;
  let ActivityInteraction: (props: {
    activity: LearnerActivity;
    enrichment: EnrichedActivity | null;
  }) => ReactNode;

  beforeAll(async () => {
    VerbSelfCheck = (await import("../../apps/web/components/details/VerbSelfCheck.tsx"))
      .VerbSelfCheck as typeof VerbSelfCheck;
    ActivityInteraction = (
      await import("../../apps/web/components/activities/ActivityInteraction.tsx")
    ).ActivityInteraction as typeof ActivityInteraction;
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  /** Nearest `lang` in scope — the value a screen reader would actually use. */
  function inheritedLang(element: Element | null): string | null {
    let node: Element | null = element;
    while (node) {
      const lang = node.getAttribute("lang");
      if (lang) return lang;
      node = node.parentElement;
    }
    return null;
  }

  it("marks the German pronouns in the verb self-check as German", () => {
    const detail = loadLearnerDetailProjection().details.find(
      (item): item is LearnerVerbDetail => item.kind === "Verb",
    )!;
    render(createElement(VerbSelfCheck, { detail }));

    const select = document.querySelector<HTMLSelectElement>("#verb-selfcheck-person")!;
    expect(select.getAttribute("lang")).toBe("de");
    // Options inherit from the select, which is why marking it once is enough.
    const options = [...select.querySelectorAll("option")];
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(inheritedLang(option)).toBe("de");
    }
  });

  it("marks the German word-order tokens and the typing field as German", () => {
    const projection = loadLearnerProjection();
    const builder = projection.activities.find(
      (item) => item.id === "activity:lesson-02-profession-qa-builder",
    )!;
    render(
      createElement(ActivityInteraction, {
        activity: builder,
        enrichment: getEnrichedActivity(builder.id),
      }),
    );

    const tokens = [...document.querySelectorAll("button.activity-token")];
    expect(tokens.length).toBeGreaterThan(0);
    for (const tokenButton of tokens) {
      expect(inheritedLang(tokenButton)).toBe("de");
    }
  });

  it("marks the typed-recall input as German, like the Q&A field already was", () => {
    let typedRecallScreens = 0;
    for (const activity of loadLearnerProjection().activities) {
      render(
        createElement(ActivityInteraction, {
          activity,
          enrichment: getEnrichedActivity(activity.id),
        }),
      );
      const input = document.querySelector("input.activity-text-input");
      if (input) {
        typedRecallScreens += 1;
        expect(inheritedLang(input)).toBe("de");
      }
      cleanup();
    }
    // The assertion above is only meaningful if such a field actually renders.
    expect(typedRecallScreens).toBeGreaterThan(0);
  });
});
