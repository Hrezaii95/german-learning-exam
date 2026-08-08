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
    children: ReactNode;
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
    AppShell = shellMod.AppShell;
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

  it("keeps disabled Review/Profile non-focusable and mobile Hubs real", () => {
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
    expect(html).toMatch(/<button[^>]*class="nav-disabled"[^>]*disabled/);
    expect(html).toContain("Review");
    expect(html).toContain("Profile");
    expect(html).toContain("Next phase");
    expect(html).not.toContain('href="/review"');
    expect(html).not.toContain('href="/profile"');
  });

  it("shows empty-hub honesty distinct from no-matches", () => {
    const empty = renderToStaticMarkup(
      createElement(HubListView, {
        hub: hubs.hubsById.grammar,
        searchParams: {},
      }),
    );
    expect(empty).toContain("No published items yet");
    expect(empty).not.toContain("No matches");

    const noMatch = renderToStaticMarkup(
      createElement(HubListView, {
        hub: hubs.hubsById.vocabulary,
        searchParams: { q: "zzzz-no-such-lexeme" },
      }),
    );
    expect(noMatch).toContain("No matches");
    expect(noMatch).not.toContain("No published items yet");
  });

  it("does not link hub cards to unimplemented detail routes", () => {
    const html = renderToStaticMarkup(
      createElement(HubListView, {
        hub: hubs.hubsById.verbs,
        searchParams: {},
      }),
    );
    expect(html).toContain("Detail view next phase");
    expect(html).not.toContain('href="/verbs/verb:');
    expect(html).not.toMatch(/href="\/vocabulary\/lex:/);
  });
});
