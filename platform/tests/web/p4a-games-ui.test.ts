/**
 * Server-rendered behavioral UI tests for P4A practice games.
 */
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  buildDetailPracticeNavigationContext,
  buildHubNavigationContext,
} from "../../apps/web/lib/content/navigation-context.js";
import { projectPublishedLearnerDetails } from "../../apps/web/lib/content/detail-project.js";
import type { ShellNavCurrent } from "../../apps/web/lib/content/nav.js";
import { PRACTICE_GAME_IDS } from "../../apps/web/lib/games/index.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");

const FORBIDDEN = [
  "Architekten",
  "Architektinnen",
  ".mp3",
  "media/generated",
  "candidate-needs-listening-review",
] as const;

describe("P4A practice UI contracts", () => {
  let AppShell: (props: {
    current: ShellNavCurrent;
    children?: ReactNode;
  }) => ReactNode;
  let GameSelector: (props: {
    navigation?: ReturnType<typeof buildHubNavigationContext> | null;
    highlightConceptId?: string | null;
  }) => ReactNode;
  let GameRenderer: (props: {
    gameId: (typeof PRACTICE_GAME_IDS)[number];
    navigation?: ReturnType<typeof buildDetailPracticeNavigationContext> | null;
  }) => ReactNode;
  let DetailView: (props: {
    detail: ReturnType<
      typeof projectPublishedLearnerDetails
    >["representatives"][number];
  }) => ReactNode;
  let details: ReturnType<typeof projectPublishedLearnerDetails>;

  beforeAll(async () => {
    details = projectPublishedLearnerDetails(publishedDir);
    const shellMod = await import(
      "../../apps/web/components/shell/AppShell.tsx"
    );
    const selectorMod = await import(
      "../../apps/web/components/games/GameSelector.tsx"
    );
    const rendererMod = await import(
      "../../apps/web/components/games/GameRenderer.tsx"
    );
    const detailMod = await import(
      "../../apps/web/components/details/DetailViews.tsx"
    );
    AppShell = shellMod.AppShell as typeof AppShell;
    GameSelector = selectorMod.GameSelector as typeof GameSelector;
    GameRenderer = rendererMod.GameRenderer as typeof GameRenderer;
    DetailView = detailMod.DetailView as typeof DetailView;
  });

  it("renders selector with exact seven IDs and audio-match unavailable", () => {
    const html = renderToStaticMarkup(
      createElement(
        AppShell,
        { current: "practice" },
        createElement(GameSelector, {}),
      ),
    );
    expect(html.match(/<main\b/g)?.length).toBe(1);
    for (const id of PRACTICE_GAME_IDS) {
      expect(html).toContain(`data-game-id="${id}"`);
    }
    expect(html).toContain('data-availability="unavailable"');
    expect(html).toContain("/practice/flashcards");
    expect(html).toContain("Practice");
    for (const bad of FORBIDDEN) {
      expect(html).not.toContain(bad);
    }
  });

  it("renders enabled games with fieldsets/legends and 44px-capable controls", () => {
    const flash = renderToStaticMarkup(
      createElement(GameRenderer, { gameId: "flashcards" }),
    );
    expect(flash).toContain("Self rating");
    expect(flash).toContain("fieldset");
    expect(flash).toContain("again");
    expect(flash).toContain("never claim");

    const picture = renderToStaticMarkup(
      createElement(GameRenderer, { gameId: "picture-word-match" }),
    );
    expect(picture).toContain("semantic visual");
    expect(picture).toContain('data-gender="masculine"');
    expect(picture).toContain("der Architekt");
    expect(picture).toContain("die Architektin");
    expect(picture).toContain("Submit");
    expect(picture).toContain("Retry");
    expect(picture).toContain("Reveal");

    const article = renderToStaticMarkup(
      createElement(GameRenderer, { gameId: "article-choice" }),
    );
    expect(article).toContain("<fieldset");
    expect(article).toContain("<legend");
    expect(article).toContain(">der<");
    expect(article).toContain(">die<");

    const word = renderToStaticMarkup(
      createElement(GameRenderer, { gameId: "word-order" }),
    );
    expect(word).toContain("Was");
    expect(word).toContain("Beruf?");
    expect(word).toContain("Available tokens");

    const verb = renderToStaticMarkup(
      createElement(GameRenderer, { gameId: "verb-builder" }),
    );
    expect(verb).toContain('id="verb-builder-input"');
    expect(verb).toContain("sein");

    const morph = renderToStaticMarkup(
      createElement(GameRenderer, { gameId: "morphology-puzzle" }),
    );
    expect(morph).toContain("Architekt");
    expect(morph).toContain("-in");
  });

  it("renders audio-match unavailable state without graded controls", () => {
    const html = renderToStaticMarkup(
      createElement(GameRenderer, { gameId: "audio-match" }),
    );
    expect(html).toContain('data-availability="unavailable"');
    expect(html).toContain("not available yet");
    expect(html).toContain("aria-disabled");
    expect(html).toContain('data-feedback="unavailable"');
    expect(html).not.toContain("Submit");
    for (const bad of FORBIDDEN) {
      expect(html).not.toContain(bad);
    }
  });

  it("links Practise from all three representative details with typed back context", () => {
    for (const id of [
      "lex:architekt",
      "verb:sein",
      "qa:profession-casual-main",
    ] as const) {
      const detail = details.representativesById[id];
      const html = renderToStaticMarkup(
        createElement(DetailView, { detail }),
      );
      expect(html).toContain('data-practise-link="true"');
      expect(html).toContain("/practice?");
      expect(html).toContain("nav=");
      expect(html).toContain("Practise");
    }
  });

  it("preserves keyboard semantics attributes on interactive controls", () => {
    const html = renderToStaticMarkup(
      createElement(GameRenderer, { gameId: "flashcards" }),
    );
    expect(html).toContain('type="button"');
    expect(html).toContain("aria-pressed");
    const verb = renderToStaticMarkup(
      createElement(GameRenderer, { gameId: "verb-builder" }),
    );
    expect(verb).toContain('type="text"');
    expect(verb).toContain("aria-label");
  });
});
