/**
 * Server-rendered behavioral UI tests for P4A practice games.
 */
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDetailPracticeNavigationContext,
  buildHubNavigationContext,
  parseNavigationContextParam,
  resolveBackHref,
  serializeNavigationContext,
} from "../../apps/web/lib/content/navigation-context.js";
import { projectPublishedLearnerDetails } from "../../apps/web/lib/content/detail-project.js";
import type { ShellNavCurrent } from "../../apps/web/lib/content/nav.js";
import { PRACTICE_GAME_IDS } from "../../apps/web/lib/games/index.js";
import { conversationCanonicalPath } from "../../apps/web/lib/conversation/index.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const practiceState = vi.hoisted(() => ({
  query: "",
  scope: null as import("../../apps/web/lib/study/scope.js").StudyScope | null,
}));

vi.mock("../../apps/web/components/study/StudyScope.tsx", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../apps/web/components/study/StudyScope.tsx")>();
  const pure = await import("../../apps/web/lib/study/scope.js");
  return {
    ...actual,
    useStudyScope: () => {
      const scope = practiceState.scope ?? pure.defaultStudyScope();
      return { scope, connected: false, ready: true, error: "", setScope: () => {},
        matches: (tags: Parameters<typeof pure.matchesStudyScope>[0]) => pure.matchesStudyScope(tags, scope) };
    },
  };
});

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
    prefetch,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    prefetch?: boolean;
    className?: string;
    "aria-current"?: string;
    "aria-label"?: string;
    "data-game-id"?: string;
    "data-availability"?: string;
    "data-practise-link"?: string;
  }) {
    void prefetch;
    return createElement("a", { href, ...rest }, children);
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(practiceState.query),
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

function renderedLink(html: string, attribute: string): URL {
  const anchor = html.match(new RegExp(`<a\\b[^>]*${attribute}[^>]*>`))?.[0];
  expect(anchor, attribute).toBeDefined();
  const href = /href="([^"]*)"/.exec(anchor!)?.[1];
  expect(href, attribute).toBeDefined();
  return new URL(href!.replaceAll("&amp;", "&"), "https://test.local");
}

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
  let PracticeHub: (props: { navigation?: ReturnType<typeof buildDetailPracticeNavigationContext> }) => ReactNode;
  let PracticeHubWithNav: () => ReactNode;
  let StudyProvider: (props: { dictionary: []; children: ReactNode }) => ReactNode;
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
    const hubMod = await import("../../apps/web/components/study/PracticeHub.tsx");
    const studyMod = await import("../../apps/web/components/study/StudyProvider.tsx");
    PracticeHub = hubMod.PracticeHub as typeof PracticeHub;
    PracticeHubWithNav = hubMod.PracticeHubWithNav;
    StudyProvider = studyMod.StudyProvider as typeof StudyProvider;
  });

  beforeEach(() => {
    practiceState.query = "";
    practiceState.scope = null;
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
    // The cue must stay honestly labelled as a meaning cue rather than a photograph.
    expect(picture).toContain("not a photo");
    expect(picture).toContain('data-tone="male"');
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

  it("links the owned practice hub from all three representative details with exact bounded Back context", () => {
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
      const link = renderedLink(html, 'data-practise-link="true"');
      expect(link.pathname).toBe("/practice");
      const context = parseNavigationContextParam(link.searchParams.get("nav"));
      expect(context).toEqual(buildDetailPracticeNavigationContext({
        hubId: detail.hubSegment, detailPath: detail.canonicalPath, resultId: detail.id,
      }));
      expect(resolveBackHref(context)).toBe(detail.canonicalPath);
      expect(html).toContain(`aria-label="Open practice hub for ${detail.displayText}"`);
      expect(html).toContain(">Open practice hub</a>");
      expect(html).not.toContain("games related to");
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

  it("composes retained CoursePractice with one heading and a plain Play entry", () => {
    const html = renderToStaticMarkup(createElement(StudyProvider, {
      dictionary: [], children: createElement(PracticeHub, {}),
    }));
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain("Loading your practice cards");
    expect(html).toContain('data-practice-hub="true"');
    expect(html).toContain('href="/play"');
    expect(html).toContain(">Open Play</a>");
    expect(html).not.toContain("Focused games");
    expect(html).not.toContain("data-game-id=");
    expect(html).not.toMatch(/href="\/practice\//);
  });

  it("keeps exact detail Back and conversation context below the URL boundary", () => {
    const detail = details.representativesById["qa:profession-casual-main"];
    const context = buildDetailPracticeNavigationContext({
      hubId: detail.hubSegment, detailPath: detail.canonicalPath, resultId: detail.id,
    })!;
    practiceState.query = new URLSearchParams({ nav: serializeNavigationContext(context) }).toString();
    const html = renderToStaticMarkup(createElement(PracticeHubWithNav));
    expect(renderedLink(html, 'class="back-link"').pathname).toBe(detail.canonicalPath);
    const conversation = renderedLink(html, 'data-conversation-entry="true"');
    expect(conversation.pathname).toBe(conversationCanonicalPath());
    expect(parseNavigationContextParam(conversation.searchParams.get("nav"))).toEqual(context);
    expect(html).toContain("game-selector__card--related");
    const playHref = /href="([^"]*)"[^>]*>Open Play/.exec(html)?.[1];
    if (playHref === undefined) throw new Error("Play link has no href");
    expect(new URL(playHref, "https://test.local").search).toBe("");
  });

  it.each([
    JSON.stringify({ entryContext: "hub", returnPath: "https://evil.test" }),
    "x".repeat(4000),
  ])("rejects hostile or excessive public hub navigation (%#)", nav => {
    practiceState.query = new URLSearchParams({ nav }).toString();
    const html = renderToStaticMarkup(createElement(PracticeHubWithNav));
    expect(renderedLink(html, 'class="back-link"').pathname).toBe("/cheat-sheets");
    expect(renderedLink(html, 'data-conversation-entry="true"').search).toBe("");
    expect(html).not.toContain("evil.test");
  });

  it.each([
    { lessons: [2], concepts: ["people"], source: "course", visible: true },
    { lessons: [1], concepts: ["people"], source: "course", visible: false },
    { lessons: [2], concepts: ["food"], source: "course", visible: false },
    { lessons: [2], concepts: ["people"], source: "teacher-extra", visible: false },
  ] as const)("qualifies conversation by the actual lesson, concept and source predicate (%#)", selection => {
    practiceState.scope = { mode: "one", lessons: [...selection.lessons], concepts: [...selection.concepts], source: selection.source };
    const html = renderToStaticMarkup(createElement(PracticeHub, {}));
    expect(html.includes('data-conversation-entry="true"')).toBe(selection.visible);
    expect(html).toContain(">Open Play</a>");
  });

});
