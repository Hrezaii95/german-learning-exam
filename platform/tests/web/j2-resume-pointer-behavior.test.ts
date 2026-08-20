/**
 * @vitest-environment jsdom
 *
 * The resume-pointer contract: "Continue" means where the learner left off.
 *
 * The pointer moves on deliberate acts only — starting an activity, or
 * finishing one. Opening or re-opening an activity page is not such an act.
 * `ActivityScreenWithNav` used to write the pointer on every mount, so a reload
 * rewound "Continue" onto the activity just completed and no stored pointer
 * survived a reload. E2E journey 2 catches that across a real browser reload;
 * these cases catch it in milliseconds, at the mount that causes it.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { projectPublishedLearnerWeb } from "../../apps/web/lib/content/project.js";
import type {
  LearnerActivity,
  LearnerLesson,
  LearnerWebProjection,
} from "../../apps/web/lib/content/types.js";
import { orderedLessonActivities } from "../../apps/web/lib/learner-state/activity-progress.js";

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

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");

/** The persisted envelope key — the same one the browser suite reads. */
const LEARNER_STATE_KEY = "german-learning:learner-state:v1";

function storedResumeActivityId(): string | null {
  const raw = window.localStorage.getItem(LEARNER_STATE_KEY);
  if (raw === null) return null;
  const parsed = JSON.parse(raw) as { resume: { activityId: string } | null };
  return parsed.resume?.activityId ?? null;
}

describe("J2 resume pointer", () => {
  let projection: LearnerWebProjection;
  let lesson: LearnerLesson;
  let activities: readonly LearnerActivity[];
  let ActivityScreenWithNav: (props: {
    lesson: LearnerLesson;
    activity: LearnerActivity;
    activities: readonly LearnerActivity[];
  }) => ReactNode;
  let LearnerStateProvider: (props: { children?: ReactNode }) => ReactNode;
  let createLearnerStateController: typeof import("../../apps/web/lib/learner-state/index.js").createLearnerStateController;

  beforeAll(async () => {
    projection = projectPublishedLearnerWeb(publishedDir);
    lesson = projection.lessons[0]!;
    activities = orderedLessonActivities(
      lesson,
      projection.activities.filter((item) => item.lessonId === lesson.id),
    );
    const navMod = await import(
      "../../apps/web/components/lessons/LessonNavViews.tsx"
    );
    const providerMod = await import(
      "../../apps/web/components/learner-state/LearnerStateProvider.tsx"
    );
    const stateMod = await import("../../apps/web/lib/learner-state/index.js");
    ActivityScreenWithNav =
      navMod.ActivityScreenWithNav as typeof ActivityScreenWithNav;
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

  /** Mount an activity page and wait until local state has finished loading. */
  async function openActivity(activity: LearnerActivity): Promise<void> {
    render(
      createElement(
        LearnerStateProvider,
        null,
        createElement(ActivityScreenWithNav, { lesson, activity, activities }),
      ),
    );
    await waitFor(() => {
      expect(screen.queryByText(/Loading saved progress/i)).toBeNull();
    });
    // The mount write this suite guards against is a promise chain, not a
    // timer: a bounded settle after the ready signal is enough for it to land,
    // so "unchanged" here means unchanged, not merely not-yet-written.
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }

  it("seeds the pointer when the learner has none, so a direct URL still offers Continue", async () => {
    const visited = activities[2]!;
    const controller = createLearnerStateController({ store: window.localStorage });
    await controller.initialize();
    expect(storedResumeActivityId()).toBeNull();

    await openActivity(visited);

    expect(storedResumeActivityId()).toBe(visited.id);
  });

  it("keeps the stored pointer when the finished activity is re-opened", async () => {
    // Exactly the state a learner is in after finishing an activity: progress
    // recorded, pointer already moved on to the next one.
    const finished = activities[0]!;
    const next = activities[1]!;
    const controller = createLearnerStateController({ store: window.localStorage });
    await controller.initialize();
    const target = {
      lessonId: lesson.id,
      stageId: finished.stageId,
      activityId: finished.id,
    };
    await controller.startActivity(target);
    await controller.completeActivity(target, {
      lessonId: lesson.id,
      stageId: next.stageId,
      activityId: next.id,
      position: 1,
    });
    expect(storedResumeActivityId()).toBe(next.id);

    await openActivity(finished);

    expect(
      storedResumeActivityId(),
      "re-opening completed work must not drag Continue backwards onto it",
    ).toBe(next.id);
  });

  it("keeps a pointer that names a different activity than the page being opened", async () => {
    const left = activities[3]!;
    const browsed = activities[1]!;
    const controller = createLearnerStateController({ store: window.localStorage });
    await controller.initialize();
    await controller.setResume({
      lessonId: lesson.id,
      stageId: left.stageId,
      activityId: left.id,
      position: 0,
    });

    await openActivity(browsed);

    expect(
      storedResumeActivityId(),
      "browsing a page is not leaving off there — the stored pointer wins",
    ).toBe(left.id);
  });

  it("does not resurrect a pointer the learner cleared by finishing the last activity", async () => {
    // Completing the final activity of a lesson stores `resume: null` on
    // purpose. Nothing is stored, but the page on screen is behind the learner,
    // so it must not become the seed either.
    const last = activities[activities.length - 1]!;
    const controller = createLearnerStateController({ store: window.localStorage });
    await controller.initialize();
    const target = {
      lessonId: lesson.id,
      stageId: last.stageId,
      activityId: last.id,
    };
    await controller.startActivity(target);
    await controller.completeActivity(target, null);
    expect(storedResumeActivityId()).toBeNull();

    await openActivity(last);

    expect(storedResumeActivityId()).toBeNull();
  });
});
