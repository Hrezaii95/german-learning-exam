/**
 * Server-rendered behavioral UI tests for P3B hubs.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { projectPublishedLearnerHubs } from "../../apps/web/lib/content/hub-project.js";
import type { LearnerHubProjection } from "../../apps/web/lib/content/hub-types.js";
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
  }) {
    return createElement("a", { href, ...rest }, children);
  },
}));

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");

describe("P3B hub UI shell contracts", () => {
  let hubs: LearnerHubProjection;
  let AppShell: (props: {
    current: ShellNavCurrent;
    children?: ReactNode;
  }) => ReactNode;
  let HubListView: (props: {
    hub: LearnerHubProjection["hubs"][number];
    searchParams: Record<string, string | string[] | undefined>;
  }) => ReactNode;
  let HubDirectoryView: (props: {
    projection: LearnerHubProjection;
  }) => ReactNode;

  beforeAll(async () => {
    hubs = projectPublishedLearnerHubs(publishedDir);
    const shellMod = await import(
      "../../apps/web/components/shell/AppShell.tsx"
    );
    const hubMod = await import("../../apps/web/components/hubs/HubViews.tsx");
    AppShell = shellMod.AppShell as typeof AppShell;
    HubListView = hubMod.HubListView;
    HubDirectoryView = hubMod.HubDirectoryView;
  });

  it("renders one main and accurate aria-current for hub routes", () => {
    const vocabulary = renderToStaticMarkup(
      createElement(
        AppShell,
        { current: "vocabulary" },
        createElement(HubListView, {
          hub: hubs.hubsById.vocabulary,
          searchParams: {},
        }),
      ),
    );
    expect(vocabulary.match(/<main\b/g)?.length).toBe(1);
    expect(vocabulary).toContain('href="#main-content"');
    // Rail + topnav highlight Vocabulary; bottomnav highlights Hubs.
    expect((vocabulary.match(/aria-current="page"/g) ?? []).length).toBe(3);
    expect(vocabulary).toContain('href="/vocabulary"');
    expect(vocabulary).toContain('href="/hubs"');

    const directory = renderToStaticMarkup(
      createElement(
        AppShell,
        { current: "hubs" },
        createElement(HubDirectoryView, { projection: hubs }),
      ),
    );
    expect(directory).toContain('href="/concepts"');
    expect(directory).toContain("Hubs");

    const concepts = renderToStaticMarkup(
      createElement(
        AppShell,
        { current: "concepts" },
        createElement(HubListView, {
          hub: hubs.hubsById.concepts,
          searchParams: {},
        }),
      ),
    );
    // Concepts is not in desktop primary nav; only mobile Hubs is current.
    expect((concepts.match(/aria-current="page"/g) ?? []).length).toBe(1);
    expect(concepts).toContain('href="/hubs"');
  });

  it("keeps Review and Settings as real navigable destinations alongside mobile Hubs", () => {
    const html = renderToStaticMarkup(
      createElement(
        AppShell,
        { current: "listening" },
        createElement(HubListView, {
          hub: hubs.hubsById.listening,
          searchParams: {},
        }),
      ),
    );
    expect(html).toContain('href="/hubs"');
    expect(html).toContain("Review");
    expect(html).toContain("Settings");
    expect(html).toContain('href="/review"');
    expect(html).toContain('href="/settings"');
    expect(html).not.toContain('href="/profile"');
  });

  it("shows populated derived hubs distinct from no-matches", () => {
    const listening = renderToStaticMarkup(
      createElement(HubListView, {
        hub: hubs.hubsById.listening,
        searchParams: {},
      }),
    );
    expect(listening).toContain("15 items");
    expect(listening).toContain("Workbook exercises");
    expect(listening).not.toContain("Nothing here yet");
    expect(listening).not.toContain("No matches");

    const noMatch = renderToStaticMarkup(
      createElement(HubListView, {
        hub: hubs.hubsById.vocabulary,
        searchParams: { q: "zzzz-no-such-lexeme" },
      }),
    );
    expect(noMatch).toContain("No matches");
    expect(noMatch).not.toContain("Nothing here yet");
  });

  it("exposes search and lesson filters on derived hubs without fabricating matches", () => {
    const derivedHubIds = ["listening", "concepts"] as const;
    for (const hubId of derivedHubIds) {
      const hub = hubs.hubsById[hubId];
      // Derived hubs render their experience, not their record list. Listening
      // now also carries 15 released records (ADR-015/016); concepts still
      // carries none, and both must render identically from the experience.
      expect(hub.experience?.itemCount).toBeGreaterThan(0);

      const baseline = renderToStaticMarkup(
        createElement(HubListView, {
          hub,
          searchParams: {},
        }),
      );
      expect(baseline).toContain("Filter items");
      expect(baseline).toMatch(/<form[^>]*method="get"/);
      expect(baseline).toContain(`action="/${hubId}"`);
      expect(baseline).toContain('name="q"');
      expect(baseline).toContain('name="lesson"');
      expect(baseline).toContain("Lesson 1");
      expect(baseline).toContain("Lesson 2");
      expect(baseline).toContain("Apply filters");
      expect(baseline).toContain("Clear filters");
      expect(baseline).toContain("No active filters");
      expect(baseline).not.toContain("Nothing here yet");
      expect(baseline).not.toContain("No matches");
      expect(baseline).not.toContain('name="category"');
      expect(baseline).not.toContain("after filters");
      expect(baseline).not.toMatch(
        /<(?:button|input|select)[^>]*(?:learned|due|mastery|streak)/i,
      );
      expect(baseline).not.toMatch(
        /<(?:button|input)[^>]*>[^<]*(?:Mark learned|Due count|Mastery)/i,
      );

      const filteredEmpty = renderToStaticMarkup(
        createElement(HubListView, {
          hub,
          searchParams: { q: "definitely-no-such-item", lesson: "01" },
        }),
      );
      expect(filteredEmpty).not.toContain("Nothing here yet");
      expect(filteredEmpty).toContain("No matches");
      expect(filteredEmpty).toContain("Active filters:");
      expect(filteredEmpty).toContain("Search: definitely-no-such-item");
      expect(filteredEmpty).toContain("Lesson 1");
      expect(filteredEmpty).not.toContain("Lesson 01");
      expect(filteredEmpty).toContain("after filters");
      expect(filteredEmpty).toContain('name="q"');
      expect(filteredEmpty).toContain('name="lesson"');
      expect(filteredEmpty).not.toContain('name="category"');
    }

    const populated = renderToStaticMarkup(
      createElement(HubListView, {
        hub: hubs.hubsById.vocabulary,
        searchParams: {},
      }),
    );
    expect(populated).toContain('name="category"');
    expect(populated).toContain("Filter items");
  });

  it("links hub cards to canonical implemented detail routes", () => {
    const html = renderToStaticMarkup(
      createElement(HubListView, {
        hub: hubs.hubsById.verbs,
        searchParams: {},
      }),
    );
    expect(html).toContain('href="/verbs/id-');
    expect(html).not.toContain('href="/verbs/verb:');
    expect(html).not.toMatch(/href="\/vocabulary\/lex:/);
  });

  it("keeps zero aria-current on 404 shell and treats /hubs as mobile directory", () => {
    const notFound = renderToStaticMarkup(
      createElement(
        AppShell,
        { current: null },
        createElement("div", null, "Page not found"),
      ),
    );
    expect(notFound).not.toContain('aria-current="page"');
    expect(notFound).not.toContain("aria-current=");
    expect(notFound.match(/<main\b/g)?.length).toBe(1);
    expect(notFound).toContain('href="#main-content"');

    const directory = renderToStaticMarkup(
      createElement(
        AppShell,
        { current: "hubs" },
        createElement(HubDirectoryView, { projection: hubs }),
      ),
    );
    expect(directory).toContain('href="/vocabulary"');
    expect(directory).toContain('href="/verbs"');
    expect(directory).toContain('href="/grammar"');
    expect(directory).toContain('href="/phrases"');
    expect(directory).toContain('href="/listening"');
    expect(directory).toContain('href="/concepts"');
    expect(directory).toContain("Six content hubs cover everything you are learning");
    // Mobile bottom Hubs is current; desktop primary has no dedicated Hubs item.
    expect((directory.match(/aria-current="page"/g) ?? []).length).toBe(1);
  });

  it("renders populated hub results from real components without reflecting unsafe query markup", () => {
    const html = renderToStaticMarkup(
      createElement(
        AppShell,
        { current: "vocabulary" },
        createElement(HubListView, {
          hub: hubs.hubsById.vocabulary,
          searchParams: {
            q: ['Arzt', '<script>x</script>'],
            lesson: "02",
            category: "not-a-category",
          },
        }),
      ),
    );
    expect(html).toContain("items");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("not-a-category");
    expect(html).toMatch(/lang="de"/);
    expect(hubs.hubsById.vocabulary.itemCount).toBeGreaterThan(0);
  });
});
