import {
  tryDecodeActivityRouteSegment,
  lessonRouteSegment,
  isAbsoluteNormalizedPathname,
  encodeActivityRouteSegment,
} from "./path-utils";
import { LEARNER_HUB_IDS, type LearnerHubId } from "./hub-types";
import type { LearnerWebProjection } from "./types";

export type ResolvedRoute =
  | { kind: "dashboard"; pathname: string }
  | { kind: "lessons"; pathname: string }
  | {
      kind: "lesson";
      pathname: string;
      lessonRouteSegment: string;
      lessonId: string;
    }
  | {
      kind: "activity";
      pathname: string;
      lessonRouteSegment: string;
      lessonId: string;
      activityId: string;
      canonicalPath: string;
    }
  | {
      kind: "hub";
      pathname: string;
      hubId: LearnerHubId;
    }
  | {
      kind: "hubs-directory";
      pathname: string;
    }
  | {
      kind: "canonical-redirect";
      pathname: string;
      canonicalPath: string;
      status: 308;
    }
  | { kind: "not-found"; pathname: string; reason: string };

const HUB_PATH_BY_ID: Readonly<Record<LearnerHubId, string>> = Object.freeze({
  vocabulary: "/vocabulary",
  verbs: "/verbs",
  grammar: "/grammar",
  phrases: "/phrases",
  listening: "/listening",
  concepts: "/concepts",
});

const HUB_ID_BY_SEGMENT: ReadonlyMap<string, LearnerHubId> = new Map(
  LEARNER_HUB_IDS.map((id) => [id, id]),
);

/**
 * Pure route resolution against a learner projection.
 *
 * Accepts only absolute slash-normalized pathnames (see
 * {@link isAbsoluteNormalizedPathname}). Relative paths, duplicate slashes,
 * `.`/`..`, and a trailing slash are rejected as not-found — trailing-slash
 * redirects are handled only at the Next proxy request boundary.
 *
 * Activity success requires the complete encoded activity ID segment
 * (`activity%3A…`) matching `ownership.canonicalPath`. Safe noncanonical
 * aliases (raw colon, lowercase hex, etc.) that decode once to a
 * learner-published activity owned by the path lesson return
 * `canonical-redirect`. Wrong-lesson, unknown, review-only, malformed, and
 * extra-segment routes remain not-found. Never falls back to dashboard.
 *
 * Hub list routes resolve to `hub` / `hubs-directory`. Hub detail paths are
 * not implemented in this slice and remain not-found.
 */
export function resolveLearnerRoute(
  pathname: string,
  projection: LearnerWebProjection,
): ResolvedRoute {
  if (!isAbsoluteNormalizedPathname(pathname)) {
    return {
      kind: "not-found",
      pathname,
      reason: "non-normalized-or-relative-path",
    };
  }

  if (pathname === "/") {
    return { kind: "dashboard", pathname };
  }
  if (pathname === "/lessons") {
    return { kind: "lessons", pathname };
  }
  if (pathname === "/hubs") {
    return { kind: "hubs-directory", pathname };
  }

  const hubId = HUB_ID_BY_SEGMENT.get(pathname.slice(1));
  if (hubId && HUB_PATH_BY_ID[hubId] === pathname) {
    return { kind: "hub", pathname, hubId };
  }

  const parts = pathname.split("/").filter(Boolean);

  if (parts.length >= 1) {
    const root = parts[0]!;
    if (HUB_ID_BY_SEGMENT.has(root) || root === "hubs") {
      return {
        kind: "not-found",
        pathname,
        reason:
          parts.length === 1 && root === "hubs"
            ? "extra-or-malformed-segments"
            : "hub-detail-unimplemented",
      };
    }
  }

  if (parts[0] !== "lessons") {
    return { kind: "not-found", pathname, reason: "unknown-root" };
  }

  if (parts.length === 2) {
    const segment = parts[1]!;
    const lesson = projection.lessons.find((item) => item.routeSegment === segment);
    if (!lesson) {
      return { kind: "not-found", pathname, reason: "unknown-lesson" };
    }
    return {
      kind: "lesson",
      pathname,
      lessonRouteSegment: lesson.routeSegment,
      lessonId: lesson.id,
    };
  }

  if (parts.length === 4 && parts[2] === "activity") {
    const segment = parts[1]!;
    const activitySegment = parts[3]!;
    const lesson = projection.lessons.find((item) => item.routeSegment === segment);
    if (!lesson) {
      return { kind: "not-found", pathname, reason: "unknown-lesson" };
    }
    const activityId = tryDecodeActivityRouteSegment(activitySegment);
    if (activityId == null) {
      return {
        kind: "not-found",
        pathname,
        reason: "malformed-activity-segment",
      };
    }
    const ownership = projection.ownershipByActivityId[activityId];
    if (!ownership) {
      return { kind: "not-found", pathname, reason: "unknown-activity" };
    }
    if (ownership.lessonRouteSegment !== lesson.routeSegment) {
      return {
        kind: "not-found",
        pathname,
        reason: "activity-wrong-lesson",
      };
    }

    const expectedSegment = encodeActivityRouteSegment(activityId);
    if (activitySegment !== expectedSegment || pathname !== ownership.canonicalPath) {
      // Safe alias of a known learner-published owned activity → one redirect.
      // Do not redirect unknown / review-only / wrong-lesson IDs into content.
      return {
        kind: "canonical-redirect",
        pathname,
        canonicalPath: ownership.canonicalPath,
        status: 308,
      };
    }

    return {
      kind: "activity",
      pathname,
      lessonRouteSegment: lesson.routeSegment,
      lessonId: lesson.id,
      activityId,
      canonicalPath: ownership.canonicalPath,
    };
  }

  return { kind: "not-found", pathname, reason: "extra-or-malformed-segments" };
}

/**
 * Request-boundary decision for Proxy: trailing-slash strip and one-hop
 * canonical activity redirects. Unknown / unsafe paths pass through so the
 * App Router can render a real 404 (never dashboard fallback).
 */
export type LearnerPathDecision =
  | { action: "next" }
  | { action: "redirect"; location: string; status: 308 };

export function decideLearnerPathRequest(
  rawPathname: string,
  search: string,
  projection: LearnerWebProjection,
): LearnerPathDecision {
  const query = search.startsWith("?") || search === "" ? search : `?${search}`;

  // Single trailing slash → strip, then resolve (one redirect hop to final
  // canonical when the stripped path is itself a safe activity alias).
  if (
    rawPathname.length > 1 &&
    rawPathname.endsWith("/") &&
    !rawPathname.includes("//") &&
    rawPathname.startsWith("/")
  ) {
    const stripped = rawPathname.slice(0, -1);
    const afterStrip = resolveLearnerRoute(stripped, projection);
    if (afterStrip.kind === "canonical-redirect") {
      return {
        action: "redirect",
        location: `${afterStrip.canonicalPath}${query}`,
        status: 308,
      };
    }
    if (afterStrip.kind !== "not-found") {
      return {
        action: "redirect",
        location: `${stripped}${query}`,
        status: 308,
      };
    }
    return {
      action: "redirect",
      location: `${stripped}${query}`,
      status: 308,
    };
  }

  const resolved = resolveLearnerRoute(rawPathname, projection);
  if (resolved.kind === "canonical-redirect") {
    return {
      action: "redirect",
      location: `${resolved.canonicalPath}${query}`,
      status: 308,
    };
  }
  return { action: "next" };
}

export function listCanonicalActivityPaths(
  projection: LearnerWebProjection,
): string[] {
  return projection.activities.map((activity) => activity.canonicalPath).sort();
}

export function expectedLessonSegments(
  projection: LearnerWebProjection,
): string[] {
  return projection.lessons.map((lesson) => lesson.routeSegment);
}

export function crossLessonActivityPath(
  projection: LearnerWebProjection,
  activityId: string,
): string | null {
  const ownership = projection.ownershipByActivityId[activityId];
  if (!ownership) return null;
  const wrongLesson = projection.lessons.find(
    (lesson) => lesson.routeSegment !== ownership.lessonRouteSegment,
  );
  if (!wrongLesson) return null;
  return `/lessons/${wrongLesson.routeSegment}/activity/${encodeURIComponent(activityId)}`;
}

/** Raw-colon alias under the owning lesson (noncanonical request form). */
export function rawColonActivityPath(
  projection: LearnerWebProjection,
  activityId: string,
): string | null {
  const ownership = projection.ownershipByActivityId[activityId];
  if (!ownership) return null;
  return `/lessons/${ownership.lessonRouteSegment}/activity/${activityId}`;
}

export function listCanonicalHubPaths(): string[] {
  return [...LEARNER_HUB_IDS.map((id) => `/${id}`), "/hubs"];
}

export { lessonRouteSegment, HUB_PATH_BY_ID };
