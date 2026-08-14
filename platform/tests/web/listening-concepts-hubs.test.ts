import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { loadAndValidatePublication, openAuthorIndexes, buildContentIndexes } from "@german-learning/content";
import {
  filterConceptTopics,
  filterListeningGroups,
  projectConceptsHubExperience,
  projectListeningHubExperience,
} from "../../apps/web/lib/content/hub-experiences.js";
import { projectPublishedLearnerHubs } from "../../apps/web/lib/content/hub-project.js";
import type { LearnerHubProjection } from "../../apps/web/lib/content/hub-types.js";

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
  }) {
    return createElement("a", { href, ...rest }, children);
  },
}));

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");
const webRoot = join(platformRoot, "apps", "web");

describe("Listening and Concepts learner hub projections", () => {
  const publication = loadAndValidatePublication({ publishedDir });
  if (!publication.ok || !publication.bundle) throw new Error("publication must validate");
  const indexes = buildContentIndexes(publication.bundle);
  const author = openAuthorIndexes(indexes);
  const listening = projectListeningHubExperience(indexes);
  const concepts = projectConceptsHubExperience(indexes);

  it("projects exactly 15 unique approved tracks in six lesson/exercise groups", () => {
    expect(listening.itemCount).toBe(15);
    expect(listening.groups).toHaveLength(6);
    const tracks = listening.groups.flatMap((group) => group.tracks);
    expect(tracks).toHaveLength(15);
    expect(new Set(tracks.map((track) => track.trackId)).size).toBe(15);
    expect(tracks.map((track) => track.trackId)).toEqual(
      Array.from({ length: 15 }, (_, index) => `1_${String(index + 1).padStart(2, "0")}`),
    );
    expect(listening.groups.map((group) => group.exercise)).toEqual([
      "AB 3",
      "AB 9a",
      "AB 9b",
      "AB 6a",
      "AB 6b",
      "AB 12",
    ]);
    for (const group of listening.groups) {
      expect(indexes.byId.get(group.activity.activityId)?.publicationStatus).toBe("published");
      expect(group.activity.path).toMatch(/^\/lessons\/(01|02)\/activity\/id-[0-9a-f]+$/);
      expect(group.tracks.every((track) => track.lessonId === group.lessonId)).toBe(true);
    }
  });

  it("projects six source-backed topics and excludes every non-published source", () => {
    expect(concepts.itemCount).toBe(6);
    expect(concepts.topics).toHaveLength(6);
    expect(new Set(concepts.topics.map((topic) => topic.id)).size).toBe(6);
    for (const topic of concepts.topics) {
      expect(topic.publicationStatus).toBe("published");
      expect(topic.sourceEntityIds.length).toBeGreaterThan(0);
      expect(topic.activities.length).toBeGreaterThan(0);
      for (const id of topic.sourceEntityIds) {
        expect(indexes.byId.get(id)?.publicationStatus).toBe("published");
        expect(author.publicationStatusById.get(id)).toBe("published");
      }
      for (const activity of topic.activities) {
        expect(indexes.byId.get(activity.activityId)?.publicationStatus).toBe("published");
      }
    }
    const serialized = JSON.stringify({ listening, concepts });
    expect(serialized).not.toContain("collection:teacher-professions");
    expect(serialized).not.toContain("activity:lesson-02-teacher-professions-deck");
    expect(serialized).not.toContain("listen:workbook-1-01-ab-momente-a11-1-3");
    expect(serialized).not.toMatch(/"(?:lines|speaker|spokenText|transcript)"\s*:/i);
    expect(serialized).not.toMatch(/\.mp3\b/i);
  });

  it("supports search and lesson filtering for both derived experiences", () => {
    const lesson1Listening = filterListeningGroups(listening, {
      q: "",
      lesson: "01",
      category: null,
    });
    expect(lesson1Listening.flatMap((group) => group.tracks)).toHaveLength(6);
    expect(lesson1Listening.every((group) => group.lessonId === "lesson:01")).toBe(true);
    expect(filterListeningGroups(listening, { q: "AB 12", lesson: "all", category: null })).toHaveLength(1);
    expect(filterConceptTopics(concepts, { q: "professions", lesson: "02", category: null }).map((topic) => topic.id)).toEqual([
      "concept:professions-person-forms",
    ]);
    expect(filterConceptTopics(concepts, { q: "no-such-topic", lesson: "all", category: null })).toHaveLength(0);
  });

  it("writes learner-safe experiences into the deterministic hub artifact", () => {
    const artifact = JSON.parse(
      readFileSync(join(webRoot, "generated", "learner-hubs.json"), "utf8"),
    ) as LearnerHubProjection;
    expect(artifact.hubsById.listening.experience?.kind).toBe("listening");
    expect(artifact.hubsById.listening.experience?.itemCount).toBe(15);
    expect(artifact.hubsById.concepts.experience?.kind).toBe("concepts");
    expect(artifact.hubsById.concepts.experience?.itemCount).toBe(6);
    const text = JSON.stringify(artifact);
    expect(text).not.toMatch(/\.mp3\b/i);
    expect(text).not.toContain("resources/original");
  });
});

describe("Listening and Concepts learner hub UI", () => {
  let hubs: LearnerHubProjection;
  let HubListView: (props: {
    hub: LearnerHubProjection["hubs"][number];
    searchParams: Record<string, string | string[] | undefined>;
  }) => ReactNode;

  beforeAll(async () => {
    hubs = projectPublishedLearnerHubs(publishedDir);
    const hubMod = await import("../../apps/web/components/hubs/HubViews.js");
    HubListView = hubMod.HubListView;
  });

  it("renders all approved audio controls and canonical owning activity links", () => {
    const html = renderToStaticMarkup(
      createElement(HubListView, { hub: hubs.hubsById.listening, searchParams: {} }),
    );
    expect((html.match(/<audio\b/g) ?? []).length).toBe(15);
    expect((html.match(/source-workbook-approved-v1/g) ?? []).length).toBe(15);
    expect(html).toContain("AB 3");
    expect(html).toContain("AB 12");
    expect(html).toContain("15 items");
    expect(html).toMatch(/href="\/lessons\/01\/activity\/id-[0-9a-f]+"/);
    expect(html).toMatch(/href="\/lessons\/02\/activity\/id-[0-9a-f]+"/);
    expect(html).not.toContain("Nothing here yet");
    expect(html).not.toMatch(/<figcaption[^>]*>.*transcript/i);
  });

  it("renders six rich concept cards with lesson, activity, and related-hub actions", () => {
    const html = renderToStaticMarkup(
      createElement(HubListView, { hub: hubs.hubsById.concepts, searchParams: {} }),
    );
    expect((html.match(/class="hub-card panel"/g) ?? []).length).toBe(6);
    expect(html).toContain("Greetings, farewells &amp; wellbeing");
    expect(html).toContain("Professions, person forms &amp; present tense");
    expect(html).toContain("6 items");
    expect(html).toContain('href="/grammar?');
    expect(html).toContain('href="/phrases?');
    expect(html).toContain('href="/listening?');
    expect(html).toMatch(/href="\/lessons\/02\/activity\/id-[0-9a-f]+"/);
    expect(html).not.toContain("Nothing here yet");
  });
});
