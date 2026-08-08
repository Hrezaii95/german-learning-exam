import type { PublicationStatus } from "../types/common.js";
import type { IndexAudience } from "./types.js";

/** Statuses visible to learner-facing helpers (default). */
export const LEARNER_PUBLICATION_STATUSES: readonly PublicationStatus[] = [
  "published",
];

/** Statuses visible with explicit audience:"review" (never blocked). */
export const REVIEW_PUBLICATION_STATUSES: readonly PublicationStatus[] = [
  "published",
  "review",
  "draft",
];

/**
 * Resolve learner vs review visibility.
 * Explicit `audience:"learner"` must never be widened by legacy `includeReview:true`
 * — contradictory options throw a stable error.
 */
export function resolveIndexAudience(
  audience: IndexAudience | undefined,
  includeReview?: boolean,
): IndexAudience {
  if (audience === "learner" && includeReview === true) {
    throw new Error(
      'INDEX_AUDIENCE_CONFLICT: audience "learner" contradicts includeReview:true',
    );
  }
  if (audience === "review") return "review";
  if (includeReview === true) return "review";
  return "learner";
}

export function publicationStatusesForAudience(
  audience: IndexAudience,
): readonly PublicationStatus[] {
  return audience === "review"
    ? REVIEW_PUBLICATION_STATUSES
    : LEARNER_PUBLICATION_STATUSES;
}

export function isVisiblePublicationStatus(
  status: PublicationStatus | null | undefined,
  audience: IndexAudience,
): boolean {
  if (status == null) return false;
  if (status === "blocked") return false;
  return publicationStatusesForAudience(audience).includes(status);
}
