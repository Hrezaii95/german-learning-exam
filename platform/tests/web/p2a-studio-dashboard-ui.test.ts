/**
 * Phase 2a structural UI contracts for the Daily Learning Studio dashboard and
 * the hub tool-drawer directory. Server-rendered from the real projections so a
 * count or preview that drifts from published content fails here.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { projectPublishedLearnerWeb } from "../../apps/web/lib/content/project.js";
import { projectPublishedLearnerHubs } from "../../apps/web/lib/content/hub-project.js";
import { hubVisibleItemCount } from "../../apps/web/lib/content/hub-experiences.js";
import type { LearnerWebProjection } from "../../apps/web/lib/content/types.js";
import type { LearnerHubProjection } from "../../apps/web/lib/content/hub-types.js";

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
  }) {
    return createElement("a", { href, ...rest }, children);
  },
}));

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Words a learner must never see on a learner surface. */
const FORBIDDEN_LEARNER_JARGON = [
  "publicationStatus",
  "projectionKind",
  "itemCount",
  "Lexeme",
  "QAPair",
  "PhrasePattern",
  "GrammarConcept",
  "evidence internals",
  "sourcePriority",
] as const;

describe("P2A studio dashboard + hub tool drawers", () => {
  let projection: LearnerWebProjection;
  let hubs: LearnerHubProjection;
  let DashboardView: (props: {
    projection: LearnerWebProjection;
    hubs?: LearnerHubProjection;
  }) => ReactNode;
  let HubDirectoryView: (props: {
    projection: LearnerHubProjection;
  }) => ReactNode;
  let hubToolPreviewItems: (
    hub: LearnerHubProjection["hubs"][number],
  ) => readonly string[];
  let dashboardHtml = "";
  let directoryHtml = "";

  beforeAll(async () => {
    projection = projectPublishedLearnerWeb(publishedDir);
    hubs = projectPublishedLearnerHubs(publishedDir);
    const lessonMod = await import(
      "../../apps/web/components/lessons/LessonViews.tsx"
    );
    const hubMod = await import("../../apps/web/components/hubs/HubViews.tsx");
    DashboardView = lessonMod.DashboardView as typeof DashboardView;
    HubDirectoryView = hubMod.HubDirectoryView as typeof HubDirectoryView;
    hubToolPreviewItems = hubMod.hubToolPreviewItems as typeof hubToolPreviewItems;
    dashboardHtml = renderToStaticMarkup(
      createElement(DashboardView, { projection, hubs }),
    );
    directoryHtml = renderToStaticMarkup(
      createElement(HubDirectoryView, { projection: hubs }),
    );
  });

  it("puts Continue and Today's mission on one studio board, Continue dominant", () => {
    expect((dashboardHtml.match(/class="studio-board"/g) ?? []).length).toBe(1);
    expect(
      (dashboardHtml.match(/studio-card--continue/g) ?? []).length,
    ).toBe(1);
    expect((dashboardHtml.match(/studio-card--mission/g) ?? []).length).toBe(1);
    expect(dashboardHtml).toContain('aria-labelledby="continue-heading"');
    expect(dashboardHtml).toContain('aria-labelledby="mission-heading"');
    expect(dashboardHtml).toContain("Today’s mission");
    // One primary action per card, and Continue keeps a real destination.
    expect(dashboardHtml).toContain(
      `href="${projection.zeroState.continuePath}"`,
    );
    expect(dashboardHtml).toContain("Start learning");
  });

  it("reuses an existing lesson illustration for the Continue card without adding assets", () => {
    // The zero-state lesson maps to an already-published illustration file.
    expect(dashboardHtml).toContain(
      "/illustrations/lesson-01-name-origin-class.png",
    );
    const imgTags = dashboardHtml.match(/<img[^>]*>/g) ?? [];
    expect(imgTags.length).toBeGreaterThan(0);
    for (const tag of imgTags) {
      expect(tag).toMatch(/alt="[^"]+"/);
      expect(tag).toMatch(/width="\d+"/);
      expect(tag).toMatch(/height="\d+"/);
    }
    // Only the approved illustration directory is referenced.
    for (const src of dashboardHtml.match(/src="[^"]+"/g) ?? []) {
      expect(src).toContain("/illustrations/");
    }
  });

  it("replaces the four metric boxes with one evidence strip and no invented numbers", () => {
    expect(dashboardHtml).not.toContain('class="metrics"');
    expect(dashboardHtml).not.toContain("metric__value");
    expect(dashboardHtml).not.toContain("metric__label");
    expect(dashboardHtml).toContain("evidence-strip");
    expect(dashboardHtml).toContain("My progress");
    // Without a learner-state provider there is no real data — say so instead of
    // rendering zeros for XP, streak or mastery.
    expect(dashboardHtml).not.toContain("evidence-item__value");
    expect(dashboardHtml).not.toContain(">XP<");
    expect(dashboardHtml).toContain(
      "Your progress is stored on this device and loads in the browser.",
    );
  });

  it("shows Lessons 1-2 as visual course cards with honest progress state", () => {
    expect((dashboardHtml.match(/class="panel course-card"/g) ?? []).length).toBe(
      projection.lessons.length,
    );
    expect(projection.lessons.length).toBe(2);
    for (const lesson of projection.lessons) {
      expect(dashboardHtml).toContain(lesson.titleDe);
      expect(dashboardHtml).toContain(`href="${lesson.canonicalPath}"`);
      expect(dashboardHtml).toContain(`${lesson.activityCount} activities`);
    }
    expect(dashboardHtml).toContain(
      "/illustrations/lesson-02-professions-ensemble.png",
    );
    // No progress bar is drawn until saved progress is actually available.
    expect(dashboardHtml).not.toContain("<progress");
    expect(dashboardHtml).toContain(
      "Your saved progress loads in this browser.",
    );
  });

  it("renders six tool drawers with real counts, benefits and type-specific previews", () => {
    for (const html of [dashboardHtml, directoryHtml]) {
      expect((html.match(/class="tool-drawer"/g) ?? []).length).toBe(6);
      expect(html).not.toContain("hub-shortcut");
      // Six identical "Open" rows are gone; each link names its destination.
      expect(html).not.toContain('class="dense">Open<');

      for (const hub of hubs.hubs) {
        expect(html).toContain(`aria-label="Open ${escapeHtml(hub.title)}"`);
        expect(html).toContain(`href="${hub.path}"`);
        const count = hubVisibleItemCount(hub);
        expect(count).toBeGreaterThan(0);
        // The count string is derived from the projection, never hard-coded.
        expect(html).toMatch(
          new RegExp(`>${count} (words|verbs|rules|phrases|audio tracks|topics)<`),
        );
        for (const preview of hubToolPreviewItems(hub)) {
          expect(html).toContain(escapeHtml(preview));
        }
      }
    }
    // Live published counts, read from the projection rather than assumed.
    expect(hubVisibleItemCount(hubs.hubsById.verbs)).toBe(10);
    expect(hubs.hubs.length).toBe(6);
  });

  it("keeps hub icons decorative and free of gender or verb-rule semantics", () => {
    for (const html of [dashboardHtml, directoryHtml]) {
      expect(html).toContain('class="tool-drawer__icon" aria-hidden="true"');
      expect((html.match(/<svg/g) ?? []).length).toBe(6);
      expect(html).not.toContain("data-gender");
      expect(html).not.toContain("gender-badge");
      expect(html).not.toContain("--gender-");
      expect(html).not.toContain("visual-cue");
    }
  });

  it("keeps the hub directory search entry and lede while switching to drawers", () => {
    expect(directoryHtml).toContain('aria-label="Open global search"');
    expect(directoryHtml).toContain("Search all content");
    expect(directoryHtml).toContain(
      "Six content hubs cover everything you are learning",
    );
    expect(directoryHtml).toContain('id="hub-directory-heading"');
  });

  it("widens both browse surfaces and stays in learner language", () => {
    expect(dashboardHtml).toContain("browse-shell");
    expect(directoryHtml).toContain("browse-shell");
    for (const html of [dashboardHtml, directoryHtml]) {
      for (const jargon of FORBIDDEN_LEARNER_JARGON) {
        expect(html.includes(jargon)).toBe(false);
      }
      expect(html).not.toMatch(/>activity:[^<]+</);
      expect(html).not.toMatch(/>lesson:[^<]+</);
    }
  });
});
