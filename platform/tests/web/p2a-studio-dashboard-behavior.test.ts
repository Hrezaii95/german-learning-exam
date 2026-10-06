/**
 * @vitest-environment jsdom
 *
 * The A1 dashboard reads actual persisted resume points, practice events and
 * mistake targets. Completion, checked answers and self-review stay separate.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { parseLearnerEvent, type LearnerEvent } from "@german-learning/learning";
import { projectPublishedLearnerWeb } from "../../apps/web/lib/content/project.js";
import type { LearnerWebProjection } from "../../apps/web/lib/content/types.js";
import { StudyProvider } from "../../apps/web/components/study/StudyProvider";
import { StudyScopeProvider } from "../../apps/web/components/study/StudyScope";
import { CourseDashboard } from "../../apps/web/components/study/CourseDashboard";
import { emptyStudy, STUDY_KEY } from "../../apps/web/lib/study/storage";
import { courseChapters } from "../../apps/web/lib/study/lesson-four";
import { defaultStudyScope, STUDY_SCOPE_KEY } from "../../apps/web/lib/study/scope";

vi.mock("next/link", () => ({
  default: function MockLink({ href, children, ...rest }: { href: string; children?: ReactNode }) {
    return createElement("a", { href, ...rest }, children);
  },
}));

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");
const ACTIVITY = "activity:lesson-01-greetings-by-context";

function eventBase(index: number) {
  return {
    schemaVersion: "1.0.0", eventId: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    sessionId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    timestamp: new Date(Date.UTC(2026, 9, 5, 10, 0, index)).toISOString(),
    conceptId: "lex:guten-morgen", activityId: ACTIVITY, sourceActivityMode: "see",
  };
}

function attempt(index: number, patch: Record<string, unknown> = {}): LearnerEvent {
  return parseLearnerEvent({
    ...eventBase(index), kind: "objectiveAttempt", measuredDimensions: ["recognition"],
    taskFamily: "multipleChoice", graderOutcome: "incorrect", latencyMs: 2000, hintsUsed: 0, ...patch,
  });
}

function metric(container: HTMLElement, label: string): string | null | undefined {
  return [...container.querySelectorAll(".evidence-item")]
    .find(item => item.querySelector(".evidence-item__label")?.textContent === label)
    ?.querySelector(".evidence-item__value")?.textContent;
}

describe("P2A task-first A1 dashboard behavior", () => {
  let projection: LearnerWebProjection;
  let LearnerDashboard: (props: { projection: LearnerWebProjection }) => ReactNode;
  let LearnerStateProvider: (props: { children?: ReactNode }) => ReactNode;
  let createLearnerStateController: typeof import("../../apps/web/lib/learner-state/index.js").createLearnerStateController;

  beforeAll(async () => {
    projection = projectPublishedLearnerWeb(publishedDir);
    const dashboardMod = await import("../../apps/web/components/learner-state/LearnerDashboard.tsx");
    const providerMod = await import("../../apps/web/components/learner-state/LearnerStateProvider.tsx");
    const stateMod = await import("../../apps/web/lib/learner-state/index.js");
    LearnerDashboard = dashboardMod.LearnerDashboard;
    LearnerStateProvider = providerMod.LearnerStateProvider as typeof LearnerStateProvider;
    createLearnerStateController = stateMod.createLearnerStateController;
    // StudyProvider also mounts dictionary UI; jsdom does not implement these browser APIs.
    Object.defineProperty(HTMLElement.prototype, "hidePopover", { configurable: true, value() {} });
    Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() {} });
  });

  beforeEach(() => { window.localStorage.clear(); window.sessionStorage.clear(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  function renderDashboard({ withBook = false, withScope = false } = {}) {
    let children: ReactNode = createElement(LearnerStateProvider, null,
      createElement("div", null, createElement(LearnerDashboard, { projection }), withBook ? createElement(CourseDashboard) : null),
    );
    if (withBook) children = createElement(StudyProvider, { dictionary: [], children });
    if (withScope) children = createElement(StudyScopeProvider, { children });
    return render(children);
  }

  it("preserves scheduled due/new questions with one working review action", async () => {
    const controller = createLearnerStateController({ store: window.localStorage });
    await controller.initialize();
    await controller.addReviewCardsForConcept("lex:architekt");
    await controller.addReviewCardsForConcept("verb:sein");
    const cards = controller.getSnapshot().hydration!.state.reviewCards;
    expect(cards.length).toBeGreaterThan(0);
    const dueCount = cards.filter(card => Date.parse(card.due) <= Date.now()).length;
    const newCount = cards.filter(card => card.state === "new").length;
    renderDashboard();
    const review = await screen.findByRole("region", { name: "Review mistakes" });
    await waitFor(() => expect(review.textContent).toContain(`New questions: ${newCount}`));
    expect(review.textContent).toContain(`Due questions: ${dueCount}`);
    const links = within(review).getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]!.getAttribute("href")).toBe("/review");
  });

  it("offers a real first activity and honest review state on a fresh visit", async () => {
    const { container } = renderDashboard();
    await screen.findByText("No lesson mistakes to revisit in this selection.");
    expect(screen.getByRole("link", { name: "Start learning" }).getAttribute("href")).toBe(projection.zeroState.continuePath);
    expect(screen.getByRole("link", { name: "Review mistakes" }).getAttribute("href")).toBe("/review");
    expect(screen.queryByText("Due questions")).toBeNull();
    expect(metric(container, "Activities completed")).toBe(`0 / ${projection.activities.length}`);
    expect(metric(container, "Answers correct without hints")).toBe("0");
    expect(metric(container, "Self-checks completed")).toBe("0");
    expect(metric(container, "Mistakes to revisit")).toBe("0");
  });

  it("shows a saved mistake after reload even when no scheduled review cards exist", async () => {
    const controller = createLearnerStateController({ store: window.localStorage });
    await controller.initialize();
    const snapshot = await controller.appendEvent(attempt(1));
    expect(snapshot.status).toBe("ready");
    expect(snapshot.hydration!.state.reviewCards).toHaveLength(0);
    const { container } = renderDashboard();
    const review = await screen.findByRole("region", { name: "Review mistakes" });
    await waitFor(() => expect(review.textContent).toContain("Mistakes to revisit: 1"));
    expect(review.textContent).toContain("Try the original question again, then check your answer.");
    expect(within(review).getByRole("link", { name: "Review mistakes" }).getAttribute("href")).toBe("/review");
    expect(screen.queryByText("No lesson mistakes to revisit in this selection.")).toBeNull();
    expect(metric(container, "Mistakes to revisit")).toBe("1");
  });

  it("shows completed work without claiming a correct answer or self-check", async () => {
    const target = projection.activities.find(activity => activity.id === ACTIVITY)!;
    const controller = createLearnerStateController({ store: window.localStorage });
    await controller.initialize();
    const snapshot = await controller.completeActivity({ activityId: target.id, lessonId: target.lessonId, stageId: target.stageId }, null);
    expect(snapshot.status).toBe("ready");
    const { container } = renderDashboard();
    await waitFor(() => expect(metric(container, "Activities completed")).toBe(`1 / ${projection.activities.length}`));
    expect(metric(container, "Answers correct without hints")).toBe("0");
    expect(metric(container, "Self-checks completed")).toBe("0");
    const details = container.querySelector<HTMLDetailsElement>(".dashboard-progress")!;
    expect(details.open).toBe(false);
    fireEvent.click(within(details).getByText("A1 practice progress"));
    expect(details.open).toBe(true);
    expect(screen.getByRole("region", { name: "My progress" }).textContent).toContain("These practice records do not establish a language level.");
  });

  it("counts unhinted checked answers separately from assisted answers and self-ratings", async () => {
    const controller = createLearnerStateController({ store: window.localStorage });
    await controller.initialize();
    await controller.appendEvent(attempt(1));
    await controller.appendEvent(attempt(2, { graderOutcome: "correct", hintsUsed: 1 }));
    await controller.appendEvent(attempt(3, { graderOutcome: "correct" }));
    const snapshot = await controller.appendEvent(parseLearnerEvent({
      ...eventBase(4), kind: "selfRatedAttempt", measuredDimensions: ["recall"],
      taskFamily: "flashcard", rating: "good", latencyMs: 1800, hintsUsed: 0,
    }));
    expect(snapshot.status).toBe("ready");
    expect(snapshot.hydration!.state.events).toHaveLength(4);
    const { container } = renderDashboard();
    await waitFor(() => expect(metric(container, "Answers correct without hints")).toBe("1"));
    expect(metric(container, "Self-checks completed")).toBe("1");
    expect(metric(container, "Activities completed")).toBe(`0 / ${projection.activities.length}`);
    expect(metric(container, "Mistakes to revisit")).toBe("0");
  });

  it("routes Continue to the saved activity and shows its actual prompt", async () => {
    const resumeTarget = projection.activities.find(activity => activity.lessonId === "lesson:02")!;
    const controller = createLearnerStateController({ store: window.localStorage });
    await controller.initialize();
    await controller.setResume({ activityId: resumeTarget.id, lessonId: resumeTarget.lessonId, stageId: resumeTarget.stageId, position: 0 });
    renderDashboard();
    const link = await screen.findByRole("link", { name: "Continue learning" });
    expect(link.getAttribute("href")).toBe(resumeTarget.canonicalPath);
    expect(screen.getByText(resumeTarget.promptPlainText)).toBeTruthy();
  });

  it("keeps the saved later-lesson tab and book reading in the optional course list", async () => {
    const chapter = courseChapters.find(item => item.number === 12)!;
    window.localStorage.setItem(STUDY_KEY, JSON.stringify({
      ...emptyStudy(), lastLesson: chapter.number,
      completedPages: [`coursebook-${chapter.kb}`, `workbook-${chapter.ab}`],
      lessonSessions: { [chapter.number]: { tab: "Practice", position: 1, answers: [], quizKey: "" } },
    }));
    const { container } = renderDashboard({ withBook: true });
    const link = await screen.findByRole("link", { name: "Continue learning" });
    expect(link.getAttribute("href")).toBe("/lessons/12#practice");
    const courseList = container.querySelector<HTMLDetailsElement>(".course-dashboard")!;
    expect(courseList.open).toBe(false);
    fireEvent.click(within(courseList).getByText("Browse A1 lessons"));
    expect(courseList.open).toBe(true);
    const row = courseList.querySelector('[data-dashboard-lesson="12"]') as HTMLElement;
    expect(row.textContent).toContain("Pages marked studied: 2 / 8");
    expect(within(row).getByRole("link", { name: chapter.title }).getAttribute("href")).toBe("/lessons/12");
    expect(courseList.querySelectorAll("[data-dashboard-lesson]")).toHaveLength(courseChapters.length);
    expect(metric(container, "Activities completed")).toBe(`0 / ${projection.activities.length}`);
  });

  it("limits completion and mistake counts to the saved lesson selection", async () => {
    const controller = createLearnerStateController({ store: window.localStorage });
    await controller.initialize();
    await controller.appendEvent(attempt(1));
    const lessonTwo = projection.activities.find(activity => activity.lessonId === "lesson:02")!;
    await controller.completeActivity({ activityId: lessonTwo.id, lessonId: lessonTwo.lessonId, stageId: lessonTwo.stageId }, null);
    window.localStorage.setItem(STUDY_SCOPE_KEY, JSON.stringify({ ...defaultStudyScope(), mode: "one", lessons: [2] }));
    const { container } = renderDashboard({ withScope: true });
    const selectedTotal = projection.activities.filter(activity => activity.lessonId === "lesson:02").length;
    await waitFor(() => expect(metric(container, "Activities completed")).toBe(`1 / ${selectedTotal}`));
    expect(metric(container, "Mistakes to revisit")).toBe("0");
    expect(screen.getByText("No lesson mistakes to revisit in this selection.")).toBeTruthy();
  });
});
