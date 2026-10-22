import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActivityScreen, LessonOverview } from "../../apps/web/components/lessons/ActivityAndBrowser.js";
import { loadLearnerProjection } from "../../apps/web/lib/content/access.js";
import { createLearnerStateController } from "../../apps/web/lib/learner-state/controller.js";
import {
  activityDisplayStatus,
  completedActivityCount,
  orderedLessonActivities,
} from "../../apps/web/lib/learner-state/activity-progress.js";

import {
  buildSearchNavigationContext,
  parseNavigationContextParam,
  resolveBackHref,
} from "../../apps/web/lib/content/navigation-context.js";

class MemoryStore {
  value: string | null = null;
  writes = 0;
  getItem() { return this.value; }
  setItem(_key: string, value: string) { this.value = value; this.writes += 1; }
  removeItem() { this.value = null; }
}

describe("J1 activity runtime", () => {
  it("persists start/completion idempotently, advances resume, and adds no mastery evidence", async () => {
    const projection = loadLearnerProjection();
    const lesson = projection.lessons[0]!;
    const activities = orderedLessonActivities(
      lesson,
      projection.activities.filter((item) => item.lessonId === lesson.id),
    );
    const first = activities[0]!;
    const second = activities[1]!;
    const store = new MemoryStore();
    const controller = createLearnerStateController({ store, now: () => new Date("2026-08-13T10:00:00.000Z") });
    await controller.initialize();

    await controller.setResume({ lessonId: lesson.id, stageId: first.stageId, activityId: first.id, position: 0 });
    expect(activityDisplayStatus(first.id, controller.getSnapshot().hydration!.state.activityProgress)).toBe("Not started");
    expect(controller.getSnapshot().hydration!.state.events).toHaveLength(0);

    await controller.startActivity({ lessonId: lesson.id, stageId: first.stageId, activityId: first.id });
    await controller.completeActivity(
      { lessonId: lesson.id, stageId: first.stageId, activityId: first.id },
      { lessonId: lesson.id, stageId: second.stageId, activityId: second.id, position: 1 },
    );
    const writesAfterCompletion = store.writes;
    await controller.completeActivity(
      { lessonId: lesson.id, stageId: first.stageId, activityId: first.id },
      { lessonId: lesson.id, stageId: second.stageId, activityId: second.id, position: 1 },
    );
    expect(store.writes).toBe(writesAfterCompletion);
    expect(controller.getSnapshot().hydration!.state.events).toHaveLength(0);
    expect(controller.getSnapshot().hydration!.masteryByConcept.size).toBe(0);
    expect(controller.getSnapshot().hydration!.state.resume?.activityId).toBe(second.id);

    const reloaded = createLearnerStateController({ store });
    await reloaded.initialize();
    expect(activityDisplayStatus(first.id, reloaded.getSnapshot().hydration!.state.activityProgress)).toBe("Completed");
  });

  it("derives learner-only denominators and renders native journey semantics", () => {
    const projection = loadLearnerProjection();
    const lessonTwo = projection.lessons.find((item) => item.routeSegment === "02")!;
    const activities = orderedLessonActivities(
      lessonTwo,
      projection.activities.filter((item) => item.lessonId === lessonTwo.id),
    );
    expect(activities).toHaveLength(11);
    expect(activities.some((item) => item.id.includes("teacher"))).toBe(false);
    const first = activities[0]!;
    const progress = [{
      lessonId: lessonTwo.id,
      stageId: first.stageId,
      activityId: first.id,
      progressState: "completed" as const,
      startedAt: "2026-08-13T10:00:00.000Z",
      completedAt: "2026-08-13T10:01:00.000Z",
    }];
    expect(completedActivityCount(activities, progress)).toBe(1);

    const html = renderToStaticMarkup(createElement(ActivityScreen, {
      lesson: lessonTwo,
      activity: first,
      activities,
      status: "In progress",
      progressState: "ready",
      onComplete: () => undefined,
    }));
    expect(html).toContain("Activity 1 of 11");
    expect(html).toContain("Status: In progress");
    expect(html).toContain("<button");
    expect(html).toContain("Complete activity");
    expect(html).toContain(activities[1]!.canonicalPath);

    const overview = renderToStaticMarkup(createElement(LessonOverview, {
      lesson: lessonTwo,
      activities,
      progress,
      progressState: "ready",
      recommendLessonOne: true,
    }));
    expect(overview).toContain("1 of 11 completed");
    expect(overview).toContain("Lesson 2 progress");
    expect(overview).not.toContain("Lesson 02");
    expect(overview).toContain("remains available");
  });

  it("replaces individual-game promises with Play and course practice carrying the lesson context", () => {
    const projection = loadLearnerProjection();
    const lesson = projection.lessons.find(item => item.routeSegment === "02")!;
    const activity = projection.activities.find(item => item.id === "activity:lesson-02-core-professions")!;
    const html = renderToStaticMarkup(createElement(ActivityScreen, { lesson, activity }));
    const anchor = html.match(/<a\b[^>]*>Open course practice<\/a>/)?.[0];
    expect(anchor).toBeDefined();
    const rawHref = /href="([^"]*)"/.exec(anchor!)?.[1];
    if (rawHref === undefined) throw new Error("Course practice link has no href");
    const href = rawHref.replaceAll("&amp;", "&");
    const url = new URL(href, "https://test.local");
    expect(url.pathname).toBe("/practice");
    const context = parseNavigationContextParam(url.searchParams.get("nav"));
    expect(context).toEqual({ entryContext: "lesson", returnPath: "/lessons/02", resultId: activity.id });
    expect(resolveBackHref(context, "lesson")).toBe("/lessons/02");
    expect(html).toContain('href="/play"');
    expect(html).toContain(">Open Play</a>");
    expect(html).not.toContain("Open practice games");
    expect(html).not.toMatch(/href="\/practice\//);
  });

  it("preserves an existing bounded search return when opening course practice from an activity", () => {
    const projection = loadLearnerProjection();
    const lesson = projection.lessons.find(item => item.routeSegment === "02")!;
    const activity = projection.activities.find(item => item.id === "activity:lesson-02-core-professions")!;
    const navigation = buildSearchNavigationContext("Architekt", activity.id);
    const html = renderToStaticMarkup(createElement(ActivityScreen, { lesson, activity, navigation }));
    const anchor = html.match(/<a\b[^>]*>Open course practice<\/a>/)![0];
    const rawHref = /href="([^"]*)"/.exec(anchor)?.[1];
    if (rawHref === undefined) throw new Error("Course practice link has no href");
    const href = rawHref.replaceAll("&amp;", "&");
    const context = parseNavigationContextParam(new URL(href, "https://test.local").searchParams.get("nav"));
    expect(context).toEqual(navigation);
    expect(resolveBackHref(context)).toBe(resolveBackHref(navigation));
  });

});
