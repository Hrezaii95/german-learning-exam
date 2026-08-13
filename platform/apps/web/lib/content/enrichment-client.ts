import artifact from "@/generated/enrichment/learner-content-enrichment.json";
import type { EnrichedActivity, LearnerEnrichmentProjection } from "./enrichment-types";

// The deterministic artifact is generated and fail-closed validated by
// enrichment-access.ts before build. This module deliberately has no Node
// imports so learner components can consume the public projection client-side.
const projection = artifact as unknown as LearnerEnrichmentProjection;

export function getEnrichedActivity(activityId: string): EnrichedActivity | null {
  return projection.activitiesById[activityId] ?? null;
}
