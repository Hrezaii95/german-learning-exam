import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT } from "./learner-publication-policy";
import { LEARNER_HUB_IDS, type LearnerHubId, type LearnerHubProjection } from "./hub-types";
import type { LearnerWebProjection } from "./types";

const here = dirname(fileURLToPath(import.meta.url));
export const GENERATED_PROJECTION_PATH = join(
  here,
  "..",
  "..",
  "generated",
  "learner-projection.json",
);
export const GENERATED_HUB_PROJECTION_PATH = join(
  here,
  "..",
  "..",
  "generated",
  "learner-hubs.json",
);

let cached: LearnerWebProjection | null = null;
let cachedHubs: LearnerHubProjection | null = null;

function assertHubProjection(parsed: LearnerHubProjection): void {
  if (
    parsed.projectionKind !== "learner-hubs" ||
    parsed.schemaVersion !== "1.0.0" ||
    parsed.hubCount !== 6 ||
    !Array.isArray(parsed.hubs) ||
    parsed.hubs.length !== 6
  ) {
    throw new Error("Learner hub projection artifact is invalid or incomplete");
  }

  const seen = new Set<string>();
  for (const hubId of LEARNER_HUB_IDS) {
    const hub = parsed.hubsById?.[hubId] ?? parsed.hubs.find((h) => h.id === hubId);
    if (!hub) {
      throw new Error(`Learner hub projection missing hub ${hubId}`);
    }
    if (hub.path !== `/${hubId}`) {
      throw new Error(`Learner hub ${hubId} has unexpected path ${hub.path}`);
    }
    if (hub.itemCount !== hub.items.length) {
      throw new Error(`Learner hub ${hubId} itemCount mismatch`);
    }
    for (const item of hub.items) {
      if (item.publicationStatus !== "published") {
        throw new Error(`Hub item ${item.id} is not published`);
      }
      if (seen.has(item.id)) {
        throw new Error(`Duplicate hub item id ${item.id}`);
      }
      seen.add(item.id);
      if (item.hubDestination.hub !== hubId) {
        throw new Error(`Hub item ${item.id} destination hub mismatch`);
      }
    }
  }
}

/** Load the build-time learner-safe projection artifact. */
export function loadLearnerProjection(): LearnerWebProjection {
  if (cached) return cached;
  const raw = readFileSync(GENERATED_PROJECTION_PATH, "utf8");
  const parsed = JSON.parse(raw) as LearnerWebProjection;
  if (
    parsed.projectionKind !== "learner-web" ||
    parsed.lessonCount !== 2 ||
    parsed.activityCount !== EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT
  ) {
    throw new Error("Learner projection artifact is invalid or incomplete");
  }
  cached = parsed;
  return parsed;
}

/** Load the build-time learner-safe hub list artifact. */
export function loadLearnerHubProjection(): LearnerHubProjection {
  if (cachedHubs) return cachedHubs;
  const raw = readFileSync(GENERATED_HUB_PROJECTION_PATH, "utf8");
  const parsed = JSON.parse(raw) as LearnerHubProjection;
  assertHubProjection(parsed);
  cachedHubs = parsed;
  return parsed;
}

export function getHubById(hubId: LearnerHubId) {
  return loadLearnerHubProjection().hubsById[hubId];
}

export function getLessonBySegment(segment: string) {
  return loadLearnerProjection().lessons.find(
    (lesson) => lesson.routeSegment === segment,
  );
}

export function getActivityById(activityId: string) {
  return loadLearnerProjection().activities.find(
    (activity) => activity.id === activityId,
  );
}

export function getOwnership(activityId: string) {
  return loadLearnerProjection().ownershipByActivityId[activityId];
}
