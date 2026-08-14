/**
 * @vitest-environment jsdom
 *
 * Phase 2a behavioral coverage for the studio dashboard. These tests cross the
 * provider/storage boundary so the board only shows mastery, mission and lesson
 * progress that this device actually holds.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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
    "aria-label"?: string;
  }) {
    return createElement("a", { href, ...rest }, children);
  },
}));

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");

describe("P2A studio dashboard behavior", () => {
  let projection: LearnerWebProjection;
  let LearnerDashboard: (props: {
    projection: LearnerWebProjection;
  }) => ReactNode;
  let LearnerStateProvider: (props: { children?: ReactNode }) => ReactNode;
  let createLearnerStateController: typeof import("../../apps/web/lib/learner-state/index.js").createLearnerStateController;

  beforeAll(async () => {
    projection = projectPublishedLearnerWeb(publishedDir);
    const dashboardMod = await import(
      "../../apps/web/components/learner-state/LearnerDashboard.tsx"
    );
    const providerMod = await import(
      "../../apps/web/components/learner-state/LearnerStateProvider.tsx"
    );
    const stateMod = await import("../../apps/web/lib/learner-state/index.js");
    LearnerDashboard = dashboardMod.LearnerDashboard as typeof LearnerDashboard;
    LearnerStateProvider =
      providerMod.LearnerStateProvider as typeof LearnerStateProvider;
    createLearnerStateController = stateMod.createLearnerStateController;
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function renderDashboard() {
    return render(
      createElement(
        LearnerStateProvider,
        null,
        createElement(LearnerDashboard, { projection }),
      ),
    );
  }

  it("shows the due/new mix and a single primary mission action once cards exist", async () => {
    const controller = createLearnerStateController({ store: window.localStorage });
    await controller.initialize();
    await controller.addReviewCardsForConcept("lex:architekt");
    await controller.addReviewCardsForConcept("verb:sein");

    renderDashboard();

    const mission = await screen.findByRole("region", {
      name: "Today’s mission",
    });
    await waitFor(() => {
      expect(mission.textContent).toMatch(/\d+ new/);
    });
    expect(mission.textContent).toMatch(/\d+ due/);
    expect(mission.textContent).toMatch(/in today’s set/);
    const start = screen.getByRole("link", { name: "Start today’s mission" });
    expect(start.getAttribute("href")).toBe("/review");
  });

  it("keeps an honest empty mission instead of a fabricated one", async () => {
    const controller = createLearnerStateController({ store: window.localStorage });
    await controller.initialize();

    renderDashboard();

    const mission = await screen.findByRole("region", {
      name: "Today’s mission",
    });
    await waitFor(() => {
      expect(mission.textContent).toContain("You have no review cards yet");
    });
    expect(screen.queryByRole("link", { name: "Start today’s mission" })).toBeNull();
    expect(mission.textContent).not.toMatch(/\d+ due/);
  });

  it("reports evidence-strip facts from stored state, never invented values", async () => {
    const controller = createLearnerStateController({ store: window.localStorage });
    await controller.initialize();

    renderDashboard();

    const strip = await screen.findByRole("region", { name: "My progress" });
    await waitFor(() => {
      expect(strip.textContent).toContain("XP");
    });
    expect(strip.textContent).toContain("Meaningful attempts");
    expect(strip.textContent).toContain("Strong or mastered");
    expect(strip.textContent).toContain("Current streak");
    // A fresh device has nothing practised yet: no denominator, no mark.
    expect(strip.textContent).toContain("0 of 0");
    expect(strip.querySelector(".evidence-item__mark")).toBeNull();
    // The four separate metric boxes are gone.
    expect(document.querySelector(".metrics")).toBeNull();
  });

  it("shows real lesson progress on the course cards after storage hydrates", async () => {
    const controller = createLearnerStateController({ store: window.localStorage });
    await controller.initialize();

    renderDashboard();

    const lessonOne = projection.lessons[0]!;
    const bar = await screen.findByLabelText(
      `Lesson ${lessonOne.routeSegment} progress`,
    );
    expect(bar.getAttribute("max")).toBe(String(lessonOne.activityCount));
    expect(bar.getAttribute("value")).toBe("0");
    expect(
      screen.getAllByText(new RegExp(`0 of ${lessonOne.activityCount} done`)),
    ).toHaveLength(1);
  });

  it("routes Continue to the resumed activity rather than the course start", async () => {
    const resumeTarget = projection.activities.find(
      (activity) => activity.lessonId === "lesson:02",
    );
    expect(resumeTarget).toBeDefined();
    const controller = createLearnerStateController({ store: window.localStorage });
    await controller.initialize();
    await controller.setResume({
      activityId: resumeTarget!.id,
      lessonId: resumeTarget!.lessonId,
      stageId: resumeTarget!.stageId,
      position: 0,
    });

    renderDashboard();

    const continueLink = await screen.findByRole("link", {
      name: "Continue learning",
    });
    expect(continueLink.getAttribute("href")).toBe(resumeTarget!.canonicalPath);
    expect(screen.getByText(resumeTarget!.promptPlainText)).toBeTruthy();
  });
});
