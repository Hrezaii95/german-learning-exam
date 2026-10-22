// @vitest-environment jsdom
/**
 * Server-rendered behavioral UI tests for P3A.
 * Excluded from the root `tsc` project (no jsx there); covered by `typecheck:web`
 * for components and by `vitest` / `test:web` for this file.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Icon } from "../../apps/web/components/media/Icon";
import { projectPublishedLearnerWeb } from "../../apps/web/lib/content/project.js";
import type { LearnerWebProjection } from "../../apps/web/lib/content/types.js";

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

describe("P3A behavioral UI (server-rendered from generated projection)", () => {
  let projection: LearnerWebProjection;
  // Components are .tsx; load via dynamic import under vitest (esbuild jsx).
  let AppShell: (props: {
    current: "home" | "dashboard" | "book" | "lessons" | "vocabulary" | "hubs" | "concepts" | "review" | "all-vocabulary" | "subjects" | null;
    children?: ReactNode;
  }) => ReactNode;
  let DashboardView: (props: {
    projection: LearnerWebProjection;
  }) => ReactNode;
  let LessonOverview: (props: {
    lesson: LearnerWebProjection["lessons"][number];
    activities: LearnerWebProjection["activities"];
  }) => ReactNode;

  beforeAll(async () => {
    projection = projectPublishedLearnerWeb(publishedDir);
    const shellMod = await import(
      "../../apps/web/components/shell/AppShell.tsx"
    );
    const lessonMod = await import(
      "../../apps/web/components/lessons/LessonViews.tsx"
    );
    const activityMod = await import(
      "../../apps/web/components/lessons/ActivityAndBrowser.tsx"
    );
    AppShell = shellMod.AppShell as typeof AppShell;
    DashboardView = lessonMod.DashboardView as typeof DashboardView;
    LessonOverview = activityMod.LessonOverview as typeof LessonOverview;
  });

  it("renders one main and a working skip-link target", () => {
    const html = renderToStaticMarkup(
      createElement(
        AppShell,
        { current: "home" },
        createElement(DashboardView, { projection }),
      ),
    );
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('id="main-content"');
    expect(html.match(/<main\b/g)?.length).toBe(1);
  });

  it("sets aria-current for Dashboard and Lessons", () => {
    const dash = renderToStaticMarkup(
      createElement(AppShell, { current: "home" }, createElement("div")),
    );
    const lessons = renderToStaticMarkup(
      createElement(AppShell, { current: "lessons" }, createElement("div")),
    );
    expect(dash).toContain("Dashboard");
    expect(lessons).toContain("Lessons");
    const book = renderToStaticMarkup(createElement(AppShell, { current: "book" }, createElement("div", null, "book")));
    for (const [html, href] of [[dash, "/"], [lessons, "/lessons"], [book, "/book"]] as const) {
      const document = new DOMParser().parseFromString(html, "text/html");
      for (const nav of document.querySelectorAll("nav")) {
        const destination = nav.querySelector(`a[href='${href}']`);
        if (destination) expect(destination.getAttribute("aria-current")).toBe("page");
        expect(nav.querySelectorAll('a[aria-current="page"]').length).toBeLessThanOrEqual(1);
      }
    }
    expect(dash).toContain('href="/"');
    expect(lessons).toContain('href="/lessons"');
  });

  it("makes All vocabulary and Subjects reachable in the rail and mobile Menu", () => {
    for (const [current, href, label] of [
      ["all-vocabulary", "/cheat-sheets/vocabulary", "All vocabulary"],
      ["subjects", "/cheat-sheets#subjects", "Subjects"],
    ] as const) {
      const html = renderToStaticMarkup(createElement(AppShell, { current }, createElement("div")));
      const document = new DOMParser().parseFromString(html, "text/html");
      for (const selector of [".shell-rail nav", ".mobile-menu nav"]) {
        const link = document.querySelector(`${selector} a[href='${href}']`);
        expect(link?.textContent).toContain(label);
        expect(link?.getAttribute("aria-current")).toBe("page");
      }
    }
  });

  it("uses the same destination labels and order on tablet and mobile tabs", () => {
    const html = renderToStaticMarkup(createElement(AppShell, { current: "book" }, createElement("div")));
    const document = new DOMParser().parseFromString(html, "text/html");
    const links = (selector: string) => Array.from(document.querySelectorAll(`${selector} a`), link => ({
      href: link.getAttribute("href"), label: link.textContent,
    }));
    expect(links(".shell-topnav nav")).toEqual(links(".mobile-navigation"));
    expect(links(".mobile-navigation")).toHaveLength(4);
  });

  it("keeps retired hub states current on their sole canonical rail and menu destinations",()=>{
    for(const [current,href] of [["vocabulary","/cheat-sheets/vocabulary"],["concepts","/grammar"],["hubs","/cheat-sheets"],["review","/saved"]] as const){
      const html=renderToStaticMarkup(createElement(AppShell,{current},createElement("div")));
      const document=new DOMParser().parseFromString(html,"text/html");
      for(const selector of [".shell-rail nav",".mobile-menu nav"]){
        const nav=document.querySelector(selector)!;
        expect(nav.querySelector(`a[href='${href}']`)?.getAttribute("aria-current")).toBe("page");
        expect(nav.querySelectorAll('a[aria-current="page"]')).toHaveLength(1);
      }
      for(const href of ["/vocabulary","/concepts","/hubs","/review"]){
        expect(document.querySelector(`.shell-rail nav a[href='${href}']`)).toBeNull();
        expect(document.querySelector(`.mobile-menu nav a[href='${href}']`)).toBeNull();
      }
    }
  });

  it("sets no aria-current on not-found shell state", () => {
    const html = renderToStaticMarkup(
      createElement(
        AppShell,
        { current: null },
        createElement("div", null, "missing"),
      ),
    );
    expect(html).not.toContain('aria-current="page"');
    expect(html).not.toContain("aria-current=");
  });

  it("uses prompt labels on Lesson 2 overview links, not activity: IDs", () => {
    const lesson2 = projection.lessons.find((lesson) => lesson.id === "lesson:02");
    expect(lesson2).toBeDefined();
    const lessonActivities = projection.activities.filter(
      (activity) => activity.lessonId === "lesson:02",
    );
    const html = renderToStaticMarkup(
      createElement(LessonOverview, {
        lesson: lesson2!,
        activities: lessonActivities,
      }),
    );

    for (const activity of lessonActivities) {
      const escapedPrompt = activity.promptPlainText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      expect(html).toContain(escapedPrompt);
      expect(html).not.toContain(`>${activity.id}<`);
    }
    expect(html).not.toMatch(/>activity:[^<]+</);
    expect(html).not.toContain("Teacher collection review");
    expect(html).not.toContain("review-stability");
  });

  it("links dashboard hub shortcuts to canonical hub routes", () => {
    const html = renderToStaticMarkup(
      createElement(
        AppShell,
        { current: "home" },
        createElement(DashboardView, { projection }),
      ),
    );
    expect(html).toContain('href="/cheat-sheets/vocabulary"');
    expect(html).toContain('href="/verbs"');
    expect(html).toContain('href="/grammar#connected-learning-paths"');
    expect(html).toContain('href="/saved"');
    expect(html).toContain('href="/settings"');
  });

  it("renders regular lernen motif without bridge, irregular star, or gender decoration", () => {
    const html = renderToStaticMarkup(
      createElement(AppShell, { current: "home" }, createElement("div")),
    );
    expect(html).toContain('data-motif="lernen-regular"');
    expect(html).toContain("lern");
    expect(html).toContain("en");
    expect(html).toContain("REG");
    expect(html).not.toContain("morph-strip__bridge");
    expect(html).not.toContain("morph-strip__star");
    expect(html).not.toContain("★");
    expect(html).not.toContain("--gender-m");
  });
});

describe("shared action icons", () => {
  beforeEach(() => { document.body.innerHTML = ""; });
  afterEach(cleanup);

  it("keeps control names meaningful without announcing decorative symbols", () => {
    const { container } = render(createElement("button", { type: "button" }, "Next page ", createElement(Icon, { name: "arrow" })));
    expect(screen.getByRole("button", { name: "Next page" })).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("svg")?.getAttribute("focusable")).toBe("false");
  });

  it("exposes a label when an informational icon stands alone", () => {
    render(createElement(Icon, { name: "check", label: "Page studied" }));
    expect(screen.getByRole("img", { name: "Page studied" })).toBeTruthy();
  });
});
