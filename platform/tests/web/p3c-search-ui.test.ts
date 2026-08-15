/**
 * Server-rendered behavioral UI tests for P3C search + back context.
 * Typechecked by `npm run typecheck:web-tests` (dedicated JSX-capable config).
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { projectPublishedLearnerSearch } from "../../apps/web/lib/content/search-project.js";
import { projectPublishedLearnerHubs } from "../../apps/web/lib/content/hub-project.js";
import { projectPublishedLearnerWeb } from "../../apps/web/lib/content/project.js";
import {
  buildLessonNavigationContext,
  buildSearchNavigationContext,
  parseNavigationContextParam,
  type NavigationContext,
} from "../../apps/web/lib/content/navigation-context.js";
import type {
  LearnerSearchHit,
  LearnerSearchProjection,
} from "../../apps/web/lib/content/search-types.js";
import type { LearnerHubProjection } from "../../apps/web/lib/content/hub-types.js";
import type { LearnerWebProjection } from "../../apps/web/lib/content/types.js";
import type { ShellNavCurrent } from "../../apps/web/lib/content/nav.js";

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
  }) {
    return createElement("a", { href, ...rest }, children);
  },
}));

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");

const FORBIDDEN_RENDER_SNIPPETS = [
  "collection:teacher-professions",
  "activity:lesson-02-teacher-professions-deck",
  "lex:elektriker",
  "SourceAssertion",
  "assert:",
  ".mp3",
  "apiKey",
  "resources/original",
] as const;

const MALICIOUS_NAV_PAYLOADS = [
  JSON.stringify({
    entryContext: "search",
    returnPath: "https://evil.example/phish",
    q: "sein",
  }),
  JSON.stringify({
    entryContext: "hub",
    returnPath: "//evil.example",
    hubId: "vocabulary",
  }),
  JSON.stringify({
    entryContext: "lesson",
    returnPath: "/lessons/../secrets",
  }),
  JSON.stringify({
    entryContext: "lesson",
    returnPath: "/lessons/%2e%2e/admin",
  }),
  JSON.stringify({
    entryContext: "search",
    returnPath: "/search",
    q: "..\\..\\etc\\passwd",
  }),
  JSON.stringify({
    entryContext: "lesson",
    returnPath: "/unknown-root",
  }),
] as const;

function assertSafeRenderedHrefs(html: string): void {
  const hrefs = [...html.matchAll(/\bhref="([^"]*)"/g)].map((m) => m[1] ?? "");
  for (const href of hrefs) {
    expect(href).not.toMatch(/:\/\//);
    expect(href).not.toMatch(/^\/\//);
    expect(href).not.toContain("\\");
    expect(href).not.toContain("%2e%2e");
    expect(href).not.toContain("%2E%2E");
    expect(href).not.toContain("../");
    expect(href).not.toContain("evil");
    expect(href).not.toMatch(/^[a-zA-Z][a-zA-Z0-9+.-]*:/);
  }
  expect(html).not.toContain("evil.example");
  expect(html).not.toContain("attacker");
}

describe("P3C search UI + shell contracts", () => {
  let search: LearnerSearchProjection;
  let hubs: LearnerHubProjection;
  let lessons: LearnerWebProjection;
  let AppShell: (props: {
    current: ShellNavCurrent;
    children?: ReactNode;
  }) => ReactNode;
  let SearchView: (props: {
    projection: LearnerSearchProjection;
    searchParams: Record<string, string | string[] | undefined>;
    navigation?: NavigationContext | null;
  }) => ReactNode;
  let HubDirectoryView: (props: {
    projection: LearnerHubProjection;
  }) => ReactNode;
  let LessonOverview: (props: {
    lesson: LearnerWebProjection["lessons"][number];
    activities: LearnerWebProjection["activities"];
    navigation?: NavigationContext | null;
  }) => ReactNode;
  let ActivityScreen: (props: {
    lesson: LearnerWebProjection["lessons"][number];
    activity: LearnerWebProjection["activities"][number];
    navigation?: NavigationContext | null;
  }) => ReactNode;

  beforeAll(async () => {
    search = projectPublishedLearnerSearch(publishedDir);
    hubs = projectPublishedLearnerHubs(publishedDir);
    lessons = projectPublishedLearnerWeb(publishedDir);
    const shellMod = await import(
      "../../apps/web/components/shell/AppShell.tsx"
    );
    const searchMod = await import(
      "../../apps/web/components/search/SearchViews.tsx"
    );
    const hubMod = await import("../../apps/web/components/hubs/HubViews.tsx");
    const lessonMod = await import(
      "../../apps/web/components/lessons/ActivityAndBrowser.tsx"
    );
    AppShell = shellMod.AppShell as typeof AppShell;
    SearchView = searchMod.SearchView as typeof SearchView;
    HubDirectoryView = hubMod.HubDirectoryView as typeof HubDirectoryView;
    LessonOverview = lessonMod.LessonOverview as typeof LessonOverview;
    ActivityScreen = lessonMod.ActivityScreen as typeof ActivityScreen;
  });

  it("renders one main, aria-current for search, and keyboard-focusable search entry", () => {
    const html = renderToStaticMarkup(
      createElement(
        AppShell,
        { current: "search" },
        createElement(SearchView, {
          projection: search,
          searchParams: {},
        }),
      ),
    );
    expect(html.match(/<main\b/g)?.length).toBe(1);
    expect(html).toContain('href="#main-content"');
    expect((html.match(/aria-current="page"/g) ?? []).length).toBe(2);
    expect(html).toContain('href="/search"');
    expect(html).toContain('aria-label="Search learning content"');
    expect(html).toContain('type="search"');
    expect(html).toContain("Enter a search");
    expect(html).toContain("Type a German word, meaning, or label");
  });

  it("exposes accessible mobile search entry from /hubs without crowding bottom nav", () => {
    const directory = renderToStaticMarkup(
      createElement(
        AppShell,
        { current: "hubs" },
        createElement(HubDirectoryView, { projection: hubs }),
      ),
    );
    // The visible words compute the name; an aria-label would replace them.
    expect(directory).not.toContain('aria-label="Open global search"');
    expect(directory).toContain('href="/search"');
    expect(directory).toContain("Search all content");
    expect(directory).toContain('href="/hubs"');
    const bottomNavSearchLinks = (
      directory.match(/shell-bottomnav[\s\S]*?href="\/search"/) ?? []
    ).length;
    expect(bottomNavSearchLinks).toBe(0);
  });

  it("groups nonempty results and keeps deferred details non-linked", () => {
    const html = renderToStaticMarkup(
      createElement(SearchView, {
        projection: search,
        searchParams: { q: "sein" },
      }),
    );
    expect(html).toContain("Results (");
    // Meta chips must stay learner-readable — no internal field/reason codes or raw priority numbers.
    expect(html).toMatch(/Found in the \w+/);
    expect(html).toContain("Core vocabulary");
    expect(html).not.toMatch(/Matched \w+ · /);
    expect(html).not.toMatch(/Priority \d/);
    expect(html).not.toContain(">heissen<");
    for (const bad of FORBIDDEN_RENDER_SNIPPETS) {
      expect(html.includes(bad)).toBe(false);
    }
  });

  it("handles empty, no-match, array, and markup query honesty", () => {
    const empty = renderToStaticMarkup(
      createElement(SearchView, {
        projection: search,
        searchParams: {},
      }),
    );
    expect(empty).toContain("Enter a search");
    expect(empty).not.toContain("Results (");

    const none = renderToStaticMarkup(
      createElement(SearchView, {
        projection: search,
        searchParams: { q: "zzzz-no-such-term-xyz" },
      }),
    );
    expect(none).toContain("No matches");

    const arrayQ = renderToStaticMarkup(
      createElement(SearchView, {
        projection: search,
        searchParams: { q: ["sein", "ignored"] },
      }),
    );
    expect(arrayQ).toContain("Results (");

    const markup = renderToStaticMarkup(
      createElement(SearchView, {
        projection: search,
        searchParams: { q: "<script>alert(1)</script>" },
      }),
    );
    expect(markup).not.toContain("<script>");
    expect(markup).not.toContain("</script>");
    expect(markup).not.toMatch(/value="[^"]*<[^"]*"/);
  });

  it("preserves search back-context on lesson and activity screens", () => {
    const lesson = lessons.lessons[0]!;
    const activity = lessons.activities.find((a) => a.lessonId === lesson.id)!;
    const nav = buildSearchNavigationContext("sein", lesson.id);

    const overview = renderToStaticMarkup(
      createElement(LessonOverview, {
        lesson,
        activities: lessons.activities.filter((a) => a.lessonId === lesson.id),
        navigation: nav,
      }),
    );
    expect(overview).toContain("← Back");
    expect(overview).toContain("/search?q=sein");
    expect(overview).toContain("nav=");

    const screen = renderToStaticMarkup(
      createElement(ActivityScreen, {
        lesson,
        activity,
        navigation: nav,
      }),
    );
    expect(screen).toContain("← Back");
    expect(screen).toContain("/search?q=sein");

    const lessonOnly = renderToStaticMarkup(
      createElement(ActivityScreen, {
        lesson,
        activity,
        navigation: buildLessonNavigationContext(
          lesson.routeSegment === "02" ? "02" : "01",
        ),
      }),
    );
    expect(lessonOnly).toContain(`/lessons/${lesson.routeSegment}`);
  });

  it("renders malicious nav payloads as safe Back hrefs on lesson and activity", () => {
    const lesson = lessons.lessons[0]!;
    const activity = lessons.activities.find((a) => a.lessonId === lesson.id)!;
    const lessonActivities = lessons.activities.filter(
      (a) => a.lessonId === lesson.id,
    );

    for (const payload of MALICIOUS_NAV_PAYLOADS) {
      const navigation = parseNavigationContextParam(payload);
      const overview = renderToStaticMarkup(
        createElement(LessonOverview, {
          lesson,
          activities: lessonActivities,
          navigation,
        }),
      );
      assertSafeRenderedHrefs(overview);
      expect(overview).not.toMatch(/href="[^"]*%2e/i);
      expect(overview).not.toMatch(/href="[^"]*\.\./);

      const screen = renderToStaticMarkup(
        createElement(ActivityScreen, {
          lesson,
          activity,
          navigation,
        }),
      );
      assertSafeRenderedHrefs(screen);
      expect(screen).toContain("← Back");
      expect(screen).not.toMatch(/href="[^"]*:\/\//);
      expect(screen).not.toMatch(/href="\/\//);
    }

    // Direct hostile context (bypass codec) must still fail closed at BackLink.
    const hostile = {
      entryContext: "lesson",
      returnPath: "https://evil.example/raw",
    } as NavigationContext;
    const hostileOverview = renderToStaticMarkup(
      createElement(LessonOverview, {
        lesson,
        activities: lessonActivities,
        navigation: hostile,
      }),
    );
    assertSafeRenderedHrefs(hostileOverview);
    expect(hostileOverview).not.toContain("evil.example");

    const hostileActivity = renderToStaticMarkup(
      createElement(ActivityScreen, {
        lesson,
        activity,
        navigation: hostile,
      }),
    );
    assertSafeRenderedHrefs(hostileActivity);
  });

  it("does not link tampered search canonicalHref values", () => {
    const base = search.documents.find((d) => d.kind === "Lexeme") ?? search.documents[0]!;
    const tamperedHit: LearnerSearchHit = {
      id: base.id,
      kind: base.kind,
      displayLabel: base.displayLabel,
      lessonIds: base.lessonIds,
      sourcePriority: base.sourcePriority,
      hubDestination: base.hubDestination,
      canonicalHref: "//evil.example/phish",
      score: 999,
      match: { field: "label", reason: "exact" },
    };
    const projection: LearnerSearchProjection = {
      schemaVersion: "1.0.0",
      projectionKind: "learner-search",
      documentCount: 1,
      documents: [
        {
          ...base,
          canonicalHref: "//evil.example/phish",
        },
      ],
      documentsById: {
        [base.id]: {
          ...base,
          canonicalHref: "//evil.example/phish",
        },
      },
    };
    // Force a single known hit by stubbing search via a projection that still
    // scores for a query matching displayLabel; assert render never links evil.
    void tamperedHit;
    const html = renderToStaticMarkup(
      createElement(SearchView, {
        projection,
        searchParams: { q: base.displayLabel.slice(0, 12) },
      }),
    );
    expect(html).not.toContain("//evil");
    expect(html).not.toContain("evil.example");
    expect(html).not.toMatch(/href="\/\/[^"]+"/);
    if (html.includes(base.displayLabel)) {
      // The tampered hit must render as an unlinked card, never as a link.
      expect(html).not.toContain("search-result-link");
    }
  });

  it("alias query UI still teaches canonical umlaut spelling", () => {
    const html = renderToStaticMarkup(
      createElement(SearchView, {
        projection: search,
        searchParams: { q: "heissen" },
      }),
    );
    expect(html).toContain("Results (");
    expect(html).toContain("heißen");
    expect(html).not.toMatch(/lang="de">heissen</);
  });
});
