/**
 * Learner-visible lesson labels are unpadded everywhere.
 *
 * Lesson identity stays padded in ids (`lesson:01`), route segments
 * (`/lessons/01`) and filter values (`lesson=01`); only the human-readable
 * label is normalized. This pins both halves: the shared formatter's output,
 * and the absence of any padded label in the surfaces that render one.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  lessonLabel,
  lessonNumberText,
} from "../../apps/web/lib/content/lesson-label.js";
import {
  hubFilterSummary,
  lessonFilterLabel,
  parseHubSearchParams,
} from "../../apps/web/lib/content/hub-query.js";
import { lessonMembershipLabel } from "../../apps/web/lib/content/search-query.js";
import { projectPublishedLearnerHubs } from "../../apps/web/lib/content/hub-project.js";
import { projectPublishedLearnerDetails } from "../../apps/web/lib/content/detail-project.js";
import { loadLearnerProjection } from "../../apps/web/lib/content/access.js";
import { orderedLessonActivities } from "../../apps/web/lib/learner-state/activity-progress.js";
import type { LearnerHubProjection } from "../../apps/web/lib/content/hub-types.js";
import type { LearnerDetailProjection } from "../../apps/web/lib/content/detail-types.js";

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

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");

/** A padded label a learner could read; ids and hrefs are lowercase and unaffected. */
const PADDED_LABEL = /Lesson 0\d/;

describe("learner-visible lesson labels", () => {
  it("formats every lesson reference to the unpadded label", () => {
    expect(lessonLabel("lesson:01")).toBe("Lesson 1");
    expect(lessonLabel("lesson-02")).toBe("Lesson 2");
    expect(lessonLabel("01")).toBe("Lesson 1");
    expect(lessonLabel("2")).toBe("Lesson 2");
    expect(lessonLabel(1)).toBe("Lesson 1");
    expect(lessonLabel(12)).toBe("Lesson 12");
    expect(lessonNumberText("lesson:02")).toBe("2");
    // Unexpected shapes degrade to their own text, never to "Lesson NaN".
    expect(lessonLabel("lesson:intro")).toBe("Lesson intro");
  });

  it("keeps hub, search, and detail lesson wording unpadded", () => {
    expect(lessonFilterLabel("01")).toBe("Lesson 1");
    expect(lessonFilterLabel("all")).toBe("All lessons");
    expect(
      hubFilterSummary(parseHubSearchParams({ lesson: "02" }, [])),
    ).toContain("Lesson 2");
    expect(lessonMembershipLabel(["lesson:01", "lesson:02"])).toBe(
      "Lesson 1, Lesson 2",
    );
    expect(lessonMembershipLabel([])).toBe("No lesson link");
  });

  it("renders no padded lesson label on lesson, hub, or detail surfaces", async () => {
    const hubs: LearnerHubProjection = projectPublishedLearnerHubs(publishedDir);
    const details: LearnerDetailProjection =
      projectPublishedLearnerDetails(publishedDir);
    const projection = loadLearnerProjection();

    const hubMod = await import("../../apps/web/components/hubs/HubViews.tsx");
    const detailMod = await import(
      "../../apps/web/components/details/DetailViews.tsx"
    );
    const lessonMod = await import(
      "../../apps/web/components/lessons/ActivityAndBrowser.tsx"
    );

    const rendered: string[] = [];

    for (const lessonFilter of ["01", "02"] as const) {
      rendered.push(
        renderToStaticMarkup(
          createElement(hubMod.HubListView, {
            hub: hubs.hubsById.listening,
            searchParams: { lesson: lessonFilter },
          }),
        ),
      );
      rendered.push(
        renderToStaticMarkup(
          createElement(hubMod.HubListView, {
            hub: hubs.hubsById.vocabulary,
            searchParams: { q: "definitely-no-such-item", lesson: lessonFilter },
          }),
        ),
      );
    }

    rendered.push(
      renderToStaticMarkup(
        createElement(detailMod.DetailView, {
          detail: details.representativesById["lex:architekt"]!,
        }),
      ),
    );

    for (const lesson of projection.lessons) {
      const activities = orderedLessonActivities(
        lesson,
        projection.activities.filter((item) => item.lessonId === lesson.id),
      );
      rendered.push(
        renderToStaticMarkup(
          createElement(lessonMod.LessonOverview, {
            lesson,
            activities,
            progress: [],
            progressState: "ready",
            recommendLessonOne: lesson.routeSegment === "02",
          }),
        ),
      );
    }

    expect(rendered).not.toHaveLength(0);
    for (const html of rendered) {
      expect(html).toMatch(/Lesson \d/);
      expect(html).not.toMatch(PADDED_LABEL);
    }
  });
});
