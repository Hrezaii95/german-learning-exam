/**
 * @vitest-environment jsdom
 *
 * The A1 dashboard offers the next study action first. The separate hub directory
 * retains its complete resource navigation and learner-safe published counts.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { projectPublishedLearnerWeb } from "../../apps/web/lib/content/project.js";
import { projectPublishedLearnerHubs } from "../../apps/web/lib/content/hub-project.js";
import { hubVisibleItemCount } from "../../apps/web/lib/content/hub-experiences.js";
import { courseChapters } from "../../apps/web/lib/study/lesson-four.js";
import type { LearnerWebProjection } from "../../apps/web/lib/content/types.js";
import type { LearnerHubProjection } from "../../apps/web/lib/content/hub-types.js";

vi.mock("next/link", () => ({
  default: function MockLink({ href, children, ...rest }: { href: string; children?: ReactNode }) {
    return createElement("a", { href, ...rest }, children);
  },
}));

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");
const FORBIDDEN_LEARNER_JARGON = [
  "publicationStatus", "projectionKind", "itemCount", "Lexeme", "QAPair",
  "PhrasePattern", "GrammarConcept", "evidence internals", "sourcePriority",
] as const;

function parseMarkup(html: string): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML = html;
  return container;
}

describe("P2A task-first A1 dashboard and separate hub directory", () => {
  let projection: LearnerWebProjection;
  let hubs: LearnerHubProjection;
  let dashboard: HTMLDivElement;
  let directory: HTMLDivElement;
  let hubToolPreviewItems: (hub: LearnerHubProjection["hubs"][number]) => readonly string[];

  beforeAll(async () => {
    projection = projectPublishedLearnerWeb(publishedDir);
    hubs = projectPublishedLearnerHubs(publishedDir);
    const { DashboardView } = await import("../../apps/web/components/lessons/LessonViews.tsx");
    const hubMod = await import("../../apps/web/components/hubs/HubViews.tsx");
    hubToolPreviewItems = hubMod.hubToolPreviewItems;
    dashboard = parseMarkup(renderToStaticMarkup(createElement(DashboardView, { projection, hubs })));
    directory = parseMarkup(renderToStaticMarkup(createElement(hubMod.HubDirectoryView, { projection: hubs })));
  });

  it("puts a real first activity and mistake review ahead of optional browsing", () => {
    const firstActivityId = projection.lessons[0]!.stages.flatMap(stage => stage.activityIds)[0];
    const firstActivity = projection.activities.find(activity => activity.id === firstActivityId)!;
    const continueCard = dashboard.querySelector('[aria-labelledby="continue-heading"]')!;
    const reviewCard = dashboard.querySelector('[aria-labelledby="mission-heading"]')!;
    const continueLink = continueCard.querySelector("a")!;
    const reviewLink = reviewCard.querySelector("a")!;
    expect(continueLink.textContent).toBe("Start learning");
    expect(continueLink.getAttribute("href")).toBe(firstActivity.canonicalPath);
    expect(continueCard.textContent).toContain(projection.lessons[0]!.titleDe);
    expect(reviewCard.querySelector("h2")?.textContent).toBe("Review mistakes");
    expect(reviewLink.textContent).toBe("Review mistakes");
    expect(reviewLink.getAttribute("href")).toBe("/review");
    const courseList = dashboard.querySelector(".course-dashboard")!;
    expect(continueCard.compareDocumentPosition(courseList) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(reviewCard.compareDocumentPosition(courseList) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps the initial dashboard free of decorative media and duplicate resource grids", () => {
    expect(dashboard.querySelector("img, .studio-media, .course-cards, .tool-drawers")).toBeNull();
    expect(dashboard.querySelectorAll('[aria-labelledby="continue-heading"]')).toHaveLength(1);
    expect(dashboard.querySelectorAll('a[href="/review"]')).toHaveLength(1);
  });

  it("does not invent saved progress before browser state is available", () => {
    const progress = dashboard.querySelector(".dashboard-progress")!;
    expect(progress.tagName).toBe("DETAILS");
    expect(progress.hasAttribute("open")).toBe(false);
    expect(progress.querySelector("summary")?.textContent).toBe("A1 practice progress");
    expect(progress.querySelector(".evidence-item__value, progress")).toBeNull();
    expect(progress.textContent).toContain("Your progress is stored on this device and loads in the browser.");
    expect(progress.textContent).toContain("Completion records work finished. Checked answers and self-review are counted separately.");
    expect(progress.textContent).toContain("These practice records do not establish a language level.");
  });

  it("offers every available A1 lesson once in a collapsed text course list", () => {
    const list = dashboard.querySelector(".course-dashboard")!;
    expect(list.tagName).toBe("DETAILS");
    expect(list.hasAttribute("open")).toBe(false);
    expect(list.querySelector("summary")?.textContent).toBe("Browse A1 lessons");
    expect(list.querySelectorAll("[data-dashboard-lesson]")).toHaveLength(courseChapters.length);
    for (const chapter of courseChapters) {
      const row = list.querySelector(`[data-dashboard-lesson="${chapter.number}"]`)!;
      const lessonLink = row.querySelector("h3 a")!;
      expect(lessonLink.textContent).toBe(chapter.title);
      expect(lessonLink.getAttribute("href")).toBe(`/lessons/${String(chapter.number).padStart(2, "0")}`);
      expect(row.querySelector(`a[href="/book?page=coursebook-${chapter.kb}"]`)).not.toBeNull();
      expect(row.textContent).toContain("Loading book progress…");
    }
    expect(list.querySelector("img, .course-map, progress")).toBeNull();
  });

  it("preserves all hub-directory links, real counts and type-specific previews", () => {
    expect(directory.querySelectorAll(".tool-drawer")).toHaveLength(hubs.hubs.length);
    expect(directory.querySelector(".hub-shortcut")).toBeNull();
    for (const hub of hubs.hubs) {
      const link = [...directory.querySelectorAll("a")].find(item => item.getAttribute("href") === hub.path)!;
      expect(link).toBeDefined();
      expect(link.getAttribute("aria-label")).toBe(`Open ${hub.title}`);
      const drawer = link.closest(".tool-drawer")!;
      const count = hubVisibleItemCount(hub);
      expect(count).toBeGreaterThan(0);
      expect(drawer.textContent).toMatch(new RegExp(`${count} (words|verbs|rules|phrases|audio tracks|topics)`));
      for (const preview of hubToolPreviewItems(hub)) expect(drawer.textContent).toContain(preview);
    }
    expect(hubVisibleItemCount(hubs.hubsById.verbs)).toBe(10);
    expect(hubs.hubs).toHaveLength(6);
  });

  it("keeps hub-directory icons decorative and free of instructional colour semantics", () => {
    const icons = directory.querySelectorAll(".tool-drawer__icon");
    expect(icons).toHaveLength(hubs.hubs.length);
    for (const icon of icons) expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(directory.querySelectorAll("svg")).toHaveLength(hubs.hubs.length);
    expect(directory.querySelector("[data-gender], .gender-badge, .visual-cue")).toBeNull();
    expect(directory.innerHTML).not.toContain("--gender-");
  });

  it("keeps an accessible search entry and introduction in the hub directory", () => {
    const search = [...directory.querySelectorAll("a")].find(link => link.textContent?.includes("Search all content"))!;
    expect(search).toBeDefined();
    expect(search.hasAttribute("aria-label")).toBe(false);
    expect(directory.textContent).toContain("Six content hubs cover everything you are learning");
    expect(directory.querySelector("#hub-directory-heading")).not.toBeNull();
  });

  it("keeps both surfaces in learner language without leaking content IDs", () => {
    for (const surface of [dashboard, directory]) {
      for (const jargon of FORBIDDEN_LEARNER_JARGON) expect(surface.textContent).not.toContain(jargon);
      expect(surface.textContent).not.toMatch(/\bactivity:/);
      expect(surface.textContent).not.toMatch(/\blesson:/);
    }
  });
});
