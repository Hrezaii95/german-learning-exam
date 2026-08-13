import {
  tryDecodeActivityRouteSegment,
  tryDecodeEntityRouteSegment,
  lessonRouteSegment,
  isAbsoluteNormalizedPathname,
  encodeActivityRouteSegment,
  encodeEntityRouteSegment,
} from "./path-utils";
import { LEARNER_HUB_IDS, type LearnerHubId } from "./hub-types";
import {
  DETAIL_HUB_BY_ID,
  DETAIL_KIND_BY_ID,
  DETAIL_REPRESENTATIVE_IDS,
  detailCanonicalPath,
  isDetailRepresentativeId,
  type DetailHubSegment,
  type DetailRepresentativeId,
  type LearnerDetailProjection,
} from "./detail-types";
import {
  PRACTICE_ROOT_PATH,
  practiceCanonicalPath,
  tryDecodePracticeGameSegment,
} from "../games/practice-paths";
import { PRACTICE_GAME_IDS, type PracticeGameId } from "../games/game-ids";
import {
  CONVERSATION_ROOT_PATH,
  conversationCanonicalPath,
  tryDecodeConversationEntitySegment,
  type ConversationEntityId,
} from "../conversation/conversation-paths";
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
      kind: "search";
      pathname: string;
    }
  | {
      kind: "detail";
      pathname: string;
      hubSegment: DetailHubSegment;
      entityId: DetailRepresentativeId;
      canonicalPath: string;
    }
  | {
      kind: "practice";
      pathname: string;
      gameId: PracticeGameId | null;
      canonicalPath: string;
    }
  | {
      kind: "conversation";
      pathname: string;
      entityId: ConversationEntityId | null;
      canonicalPath: string;
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

const DETAIL_HUB_SEGMENTS = new Set<string>(["vocabulary", "verbs", "phrases"]);

function expectedKindForHub(hub: DetailHubSegment): string {
  switch (hub) {
    case "vocabulary":
      return "Lexeme";
    case "verbs":
      return "Verb";
    case "phrases":
      return "QAPair";
    default: {
      const _exhaustive: never = hub;
      return _exhaustive;
    }
  }
}

function resolveDetailRoute(
  pathname: string,
  hubSegment: string,
  entitySegment: string,
  details: LearnerDetailProjection | null,
): ResolvedRoute {
  if (!DETAIL_HUB_SEGMENTS.has(hubSegment)) {
    return {
      kind: "not-found",
      pathname,
      reason: "hub-detail-unimplemented",
    };
  }
  const hub = hubSegment as DetailHubSegment;
  const entityId = tryDecodeEntityRouteSegment(entitySegment);
  if (entityId == null) {
    return {
      kind: "not-found",
      pathname,
      reason: "malformed-detail-segment",
    };
  }

  // Double-encoding / non-round-trip forms fail closed. The former percent-
  // encoded canonical form and raw-colon form remain one-hop legacy aliases.
  const expectedEncoded = encodeEntityRouteSegment(entityId);
  const isCanonicalSegment = entitySegment === expectedEncoded;
  const isRawColonAlias =
    entitySegment === entityId && entityId.includes(":") && !entitySegment.includes("%");
  const isLegacyEncodedAlias =
    entitySegment.toLowerCase() === encodeURIComponent(entityId).toLowerCase();

  if (!isCanonicalSegment && !isRawColonAlias && !isLegacyEncodedAlias) {
    return {
      kind: "not-found",
      pathname,
      reason: "malformed-detail-segment",
    };
  }

  if (!isDetailRepresentativeId(entityId)) {
    return {
      kind: "not-found",
      pathname,
      reason: "unknown-or-unapproved-detail",
    };
  }

  if (DETAIL_HUB_BY_ID[entityId] !== hub) {
    return {
      kind: "not-found",
      pathname,
      reason: "detail-wrong-kind",
    };
  }

  if (DETAIL_KIND_BY_ID[entityId] !== expectedKindForHub(hub)) {
    return {
      kind: "not-found",
      pathname,
      reason: "detail-wrong-kind",
    };
  }

  if (details) {
    const record = details.representativesById[entityId];
    if (!record || record.publicationStatus !== "published") {
      return {
        kind: "not-found",
        pathname,
        reason: "unknown-or-unapproved-detail",
      };
    }
  }

  const canonicalPath = detailCanonicalPath(hub, entityId);
  if (!isCanonicalSegment || pathname !== canonicalPath) {
    return {
      kind: "canonical-redirect",
      pathname,
      canonicalPath,
      status: 308,
    };
  }

  return {
    kind: "detail",
    pathname,
    hubSegment: hub,
    entityId,
    canonicalPath,
  };
}

/**
 * Pure route resolution against a learner projection (+ optional details).
 *
 * Accepts only absolute slash-normalized pathnames (see
 * {@link isAbsoluteNormalizedPathname}). Relative paths, duplicate slashes,
 * `.`/`..`, and a trailing slash are rejected as not-found — trailing-slash
 * redirects are handled only at the Next proxy request boundary.
 *
 * Activity success requires the complete Pages-safe activity ID segment
 * matching `ownership.canonicalPath`. Safe noncanonical
 * aliases (raw colon, lowercase hex, etc.) that decode once to a
 * learner-published activity owned by the path lesson return
 * `canonical-redirect`. Wrong-lesson, unknown, review-only, malformed, and
 * extra-segment routes remain not-found. Never falls back to dashboard.
 *
 * Hub list routes resolve to `hub` / `hubs-directory`. Implemented
 * representative detail routes resolve to `detail`; other hub details 404.
 */
export function resolveLearnerRoute(
  pathname: string,
  projection: LearnerWebProjection,
  details: LearnerDetailProjection | null = null,
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
  if (pathname === "/search") {
    return { kind: "search", pathname };
  }
  if (pathname === PRACTICE_ROOT_PATH) {
    return {
      kind: "practice",
      pathname,
      gameId: null,
      canonicalPath: PRACTICE_ROOT_PATH,
    };
  }
  if (pathname === CONVERSATION_ROOT_PATH) {
    return {
      kind: "conversation",
      pathname,
      entityId: null,
      canonicalPath: CONVERSATION_ROOT_PATH,
    };
  }

  const hubId = HUB_ID_BY_SEGMENT.get(pathname.slice(1));
  if (hubId && HUB_PATH_BY_ID[hubId] === pathname) {
    return { kind: "hub", pathname, hubId };
  }

  const parts = pathname.split("/").filter(Boolean);

  if (parts.length >= 1) {
    const root = parts[0]!;
    if (root === "search") {
      return {
        kind: "not-found",
        pathname,
        reason: "search-extra-segment",
      };
    }
    if (root === "practice") {
      if (parts.length === 1) {
        return {
          kind: "practice",
          pathname,
          gameId: null,
          canonicalPath: PRACTICE_ROOT_PATH,
        };
      }
      if (parts.length === 2) {
        const gameId = tryDecodePracticeGameSegment(parts[1]!);
        if (gameId == null) {
          return {
            kind: "not-found",
            pathname,
            reason: "unknown-or-malformed-practice-game",
          };
        }
        const canonicalPath = practiceCanonicalPath(gameId);
        if (pathname !== canonicalPath) {
          return {
            kind: "canonical-redirect",
            pathname,
            canonicalPath,
            status: 308,
          };
        }
        return {
          kind: "practice",
          pathname,
          gameId,
          canonicalPath,
        };
      }
      return {
        kind: "not-found",
        pathname,
        reason: "practice-extra-segment",
      };
    }
    if (root === "conversation") {
      if (parts.length === 1) {
        return {
          kind: "conversation",
          pathname,
          entityId: null,
          canonicalPath: CONVERSATION_ROOT_PATH,
        };
      }
      if (parts.length === 2) {
        const entityId = tryDecodeConversationEntitySegment(parts[1]!);
        if (entityId == null) {
          return {
            kind: "not-found",
            pathname,
            reason: "unknown-or-malformed-conversation-entity",
          };
        }
        const canonicalPath = conversationCanonicalPath(entityId);
        if (pathname !== canonicalPath) {
          return {
            kind: "canonical-redirect",
            pathname,
            canonicalPath,
            status: 308,
          };
        }
        return {
          kind: "conversation",
          pathname,
          entityId,
          canonicalPath,
        };
      }
      return {
        kind: "not-found",
        pathname,
        reason: "conversation-extra-segment",
      };
    }
  }

  // Hub detail: /{vocabulary|verbs|phrases|…}/:entity
  if (parts.length === 2 && HUB_ID_BY_SEGMENT.has(parts[0]!)) {
    const hubSegment = parts[0]!;
    const entitySegment = parts[1]!;
    if (
      hubSegment === "grammar" ||
      hubSegment === "listening" ||
      hubSegment === "concepts"
    ) {
      return {
        kind: "not-found",
        pathname,
        reason: "hub-detail-unimplemented",
      };
    }
    return resolveDetailRoute(pathname, hubSegment, entitySegment, details);
  }

  if (parts.length > 2 && HUB_ID_BY_SEGMENT.has(parts[0]!)) {
    return {
      kind: "not-found",
      pathname,
      reason: "extra-or-malformed-segments",
    };
  }

  if (parts.length >= 1 && parts[0] === "hubs") {
    return {
      kind: "not-found",
      pathname,
      reason: "extra-or-malformed-segments",
    };
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
 * canonical activity/detail redirects. Unknown / unsafe paths pass through so the
 * App Router can render a real 404 (never dashboard fallback).
 */
export type LearnerPathDecision =
  | { action: "next" }
  | { action: "redirect"; location: string; status: 308 };

export function decideLearnerPathRequest(
  rawPathname: string,
  search: string,
  projection: LearnerWebProjection,
  details: LearnerDetailProjection | null = null,
): LearnerPathDecision {
  const query = search.startsWith("?") || search === "" ? search : `?${search}`;

  if (
    rawPathname.length > 1 &&
    rawPathname.endsWith("/") &&
    !rawPathname.includes("//") &&
    rawPathname.startsWith("/")
  ) {
    const stripped = rawPathname.slice(0, -1);
    const afterStrip = resolveLearnerRoute(stripped, projection, details);
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

  const resolved = resolveLearnerRoute(rawPathname, projection, details);
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
  return `/lessons/${wrongLesson.routeSegment}/activity/${encodeActivityRouteSegment(activityId)}`;
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

export function listCanonicalSearchPaths(): string[] {
  return ["/search"];
}

export function listCanonicalPracticeRoutePaths(): string[] {
  return [
    PRACTICE_ROOT_PATH,
    ...PRACTICE_GAME_IDS.map((id) => practiceCanonicalPath(id)),
  ];
}

export function listCanonicalConversationRoutePaths(): string[] {
  return [CONVERSATION_ROOT_PATH, conversationCanonicalPath()];
}

export function listCanonicalDetailPaths(
  details?: LearnerDetailProjection | null,
): string[] {
  if (details) {
    return details.representatives.map((r) => r.canonicalPath).sort();
  }
  return DETAIL_REPRESENTATIVE_IDS.map((id) =>
    detailCanonicalPath(DETAIL_HUB_BY_ID[id], id),
  ).sort();
}

export function rawColonDetailPath(entityId: DetailRepresentativeId): string {
  const hub = DETAIL_HUB_BY_ID[entityId];
  return `/${hub}/${entityId}`;
}

export { lessonRouteSegment, HUB_PATH_BY_ID };
