import { LEARNER_HUB_IDS, type LearnerHubId } from "./hub-types";
import {
  encodeActivityRouteSegment,
  encodeEntityRouteSegment,
  isAbsoluteNormalizedPathname,
  tryDecodeActivityRouteSegment,
  tryDecodeEntityRouteSegment,
} from "./path-utils";
import {
  detailHubForId,
} from "./detail-types";
import { isPracticeGameId } from "../games/game-ids";
import { sanitizeHubQueryText } from "./hub-query";
import { sanitizeSearchQueryText } from "./search-query";

/**
 * Typed, bounded, serializable learner navigation context (UX-006 / P3C).
 * Carries only safe route / query / filter / result metadata — never assertion
 * values, source paths, secrets, arbitrary JSON, or learner answers.
 */

export type NavigationEntryContext = "lesson" | "hub" | "review" | "search";

export type NavigationContext = {
  entryContext: NavigationEntryContext;
  /** Absolute normalized return pathname (no query). */
  returnPath: string;
  /** Sanitized search query when entryContext is search (or hub filter q). */
  q?: string;
  /** Hub id when entryContext is hub. */
  hubId?: LearnerHubId;
  /** Hub lesson filter. */
  lesson?: "all" | "01" | "02" | "03";
  /** Hub category filter. */
  category?: string;
  /** Optional safe result id that was opened (entity id, not assertion). */
  resultId?: string;
};

export const NAVIGATION_CONTEXT_PARAM = "nav";
export const NAVIGATION_CONTEXT_MAX_LENGTH = 512;
export const NAVIGATION_RESULT_ID_MAX_LENGTH = 120;

const ENTRY_CONTEXTS = new Set<NavigationEntryContext>([
  "lesson",
  "hub",
  "review",
  "search",
]);

const HUB_ID_SET = new Set<string>(LEARNER_HUB_IDS);

export type NavigationFallbackKind = "hub" | "lesson" | "search";

const FALLBACK_PATH: Record<NavigationFallbackKind, string> = {
  hub: "/hubs",
  lesson: "/lessons",
  search: "/search",
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string") return entry;
    }
    return undefined;
  }
  if (typeof value === "string") return value;
  return undefined;
}

function isLearnerHubId(value: string): value is LearnerHubId {
  return HUB_ID_SET.has(value);
}

/**
 * Reject external, protocol-relative, backslash, traversal, malformed /
 * double-encoded, excessive, or unknown return paths.
 */
export function isSafeNavigationPath(pathname: string): boolean {
  if (typeof pathname !== "string") return false;
  if (pathname.length === 0 || pathname.length > 256) return false;
  if (pathname.includes("\\")) return false;
  if (pathname.includes("://")) return false;
  if (pathname.startsWith("//")) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(pathname)) return false;
  if (/%2e/i.test(pathname) || /%2f/i.test(pathname) || /%5c/i.test(pathname)) {
    // Encoded dots/slashes/backslashes in path segments are not accepted.
    return false;
  }
  if (!isAbsoluteNormalizedPathname(pathname)) return false;

  if (pathname === "/" || pathname === "/lessons" || pathname === "/hubs") {
    return true;
  }
  if (pathname === "/search") return true;
  if (pathname === "/practice") return true;
  if (pathname === "/conversation") return true;
  if (pathname === "/review" || pathname === "/review/session/today") return true;
  if (pathname === "/settings") return true;
  // Source-bounded word-family pages, including number and spelling cards.
  const wordCard = /^\/vocabulary\/(w(\d{3})|number-(\d{1,3})|letter-(\d{1,2}))$/.exec(pathname);
  if (wordCard) {
    if (wordCard[2]) return Number(wordCard[2]) >= 1 && Number(wordCard[2]) <= 543;
    if (wordCard[3]) return Number(wordCard[3]) <= 100 && String(Number(wordCard[3])) === wordCard[3];
    return Number(wordCard[4]) >= 1 && Number(wordCard[4]) <= 30 && String(Number(wordCard[4])) === wordCard[4];
  }

  const practiceMatch = pathname.match(/^\/practice\/([^/]+)$/);
  if (practiceMatch) {
    const segment = practiceMatch[1]!;
    // Exact seven game IDs only (kebab-case; encoding is identity).
    return isPracticeGameId(segment);
  }

  const conversationMatch = pathname.match(/^\/conversation\/([^/]+)$/);
  if (conversationMatch) {
    const segment = conversationMatch[1]!;
    const decoded = tryDecodeEntityRouteSegment(segment);
    if (decoded == null) return false;
    if (encodeEntityRouteSegment(decoded) !== segment) return false;
    // Only the published conversation Q&A representative.
    return decoded === "qa:profession-casual-main";
  }

  const hubMatch = pathname.match(/^\/(vocabulary|verbs|grammar|phrases|listening|concepts)$/);
  if (hubMatch) return true;

  const lessonMatch = pathname.match(/^\/lessons\/(01|02)$/);
  if (lessonMatch) return true;

  const activityMatch = pathname.match(
    /^\/lessons\/(01|02)\/activity\/([^/]+)$/,
  );
  if (activityMatch) {
    const segment = activityMatch[2]!;
    const decoded = tryDecodeActivityRouteSegment(segment);
    if (decoded == null) return false;
    if (!decoded.startsWith("activity:")) return false;
    if (decoded.length > NAVIGATION_RESULT_ID_MAX_LENGTH) return false;
    // Round-trip: encoded form must be the canonical encode of the decoded id.
    if (encodeActivityRouteSegment(decoded) !== segment) return false;
    return true;
  }

  // Implemented representative detail routes only (encoded entity segment).
  const detailMatch = pathname.match(
    /^\/(vocabulary|verbs|grammar|phrases)\/([^/]+)$/,
  );
  if (detailMatch) {
    const hub = detailMatch[1]!;
    const segment = detailMatch[2]!;
    const decoded = tryDecodeEntityRouteSegment(segment);
    if (decoded == null) return false;
    if (encodeEntityRouteSegment(decoded) !== segment) return false;
    if (detailHubForId(decoded) !== hub) return false;
    return true;
  }

  return false;
}

function sanitizeResultId(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;
  const cleaned = sanitizeSearchQueryText(raw).trim();
  if (cleaned.length === 0) return undefined;
  if (cleaned.length > NAVIGATION_RESULT_ID_MAX_LENGTH) return undefined;
  if (!/^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9:_-]*$/i.test(cleaned)) return undefined;
  return cleaned;
}

function defaultReturnPath(entry: NavigationEntryContext): string {
  switch (entry) {
    case "search":
      return "/search";
    case "hub":
      return "/hubs";
    case "lesson":
      return "/lessons";
    case "review":
      // Review routes are not implemented; fail closed to hubs directory.
      return "/hubs";
    default: {
      const _exhaustive: never = entry;
      return _exhaustive;
    }
  }
}

function normalizeContext(raw: unknown): NavigationContext | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;

  const entryRaw = obj.entryContext;
  if (typeof entryRaw !== "string" || !ENTRY_CONTEXTS.has(entryRaw as NavigationEntryContext)) {
    return null;
  }
  const entryContext = entryRaw as NavigationEntryContext;

  let returnPath =
    typeof obj.returnPath === "string" ? obj.returnPath : defaultReturnPath(entryContext);
  if (!isSafeNavigationPath(returnPath)) {
    returnPath = defaultReturnPath(entryContext);
  }

  // Review entry returns to the live review setup.
  if (entryContext === "review") {
    return Object.freeze({
      entryContext,
      returnPath: "/review",
    });
  }

  const ctx: NavigationContext = {
    entryContext,
    returnPath,
  };

  if (typeof obj.q === "string") {
    const q = sanitizeSearchQueryText(obj.q).trim();
    if (q.length > 0) ctx.q = q;
  }

  if (entryContext === "hub") {
    if (typeof obj.hubId === "string" && isLearnerHubId(obj.hubId)) {
      ctx.hubId = obj.hubId;
      if (ctx.returnPath === "/hubs" || !isSafeNavigationPath(ctx.returnPath)) {
        ctx.returnPath = `/${obj.hubId}`;
      }
    }
    if (obj.lesson === "01" || obj.lesson === "02" || obj.lesson === "03" || obj.lesson === "all") {
      ctx.lesson = obj.lesson;
    }
    if (typeof obj.category === "string") {
      const category = sanitizeHubQueryText(obj.category).trim();
      if (category.length > 0 && category !== "all") ctx.category = category;
    }
  }

  if (entryContext === "search") {
    ctx.returnPath = "/search";
  }

  const resultId = sanitizeResultId(
    typeof obj.resultId === "string" ? obj.resultId : undefined,
  );
  if (resultId) ctx.resultId = resultId;

  return Object.freeze(ctx);
}

/**
 * Decode a navigation context from the `nav` query parameter.
 * Malformed, excessive, double-encoded, or hostile payloads fail to null.
 */
export function parseNavigationContextParam(
  raw: string | null | undefined,
): NavigationContext | null {
  if (raw == null || typeof raw !== "string") return null;
  if (raw.length === 0 || raw.length > NAVIGATION_CONTEXT_MAX_LENGTH * 3) {
    // Allow percent-encoding expansion headroom; JSON length checked after decode.
    return null;
  }
  if (raw.includes("\\") || raw.includes("://")) return null;

  let decoded = raw;
  try {
    // At most one decode pass for manually encoded values.
    if (/%[0-9a-f]{2}/i.test(raw)) {
      decoded = decodeURIComponent(raw);
    }
  } catch {
    return null;
  }
  if (decoded.length > NAVIGATION_CONTEXT_MAX_LENGTH) return null;
  if (decoded.includes("\\") || decoded.includes("://")) return null;
  // Reject double-encoded path traversal leftovers inside the JSON text.
  if (/%2e/i.test(decoded) || /%2f/i.test(decoded) || /%5c/i.test(decoded)) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    return null;
  }

  return normalizeContext(parsed);
}

/** Read `nav` from Next searchParams (arrays/duplicates → first scalar only). */
export function parseNavigationSearchParams(
  params: Record<string, string | string[] | undefined>,
): NavigationContext | null {
  return parseNavigationContextParam(firstParam(params[NAVIGATION_CONTEXT_PARAM]));
}

/** Raw JSON payload for the `nav` query param (URLSearchParams encodes once). */
export function serializeNavigationContext(ctx: NavigationContext): string {
  const normalized = normalizeContext(ctx);
  if (!normalized) {
    return JSON.stringify({ entryContext: "hub", returnPath: "/hubs" });
  }
  const payload: Record<string, string> = {
    entryContext: normalized.entryContext,
    returnPath: normalized.returnPath,
  };
  if (normalized.q) payload.q = normalized.q;
  if (normalized.hubId) payload.hubId = normalized.hubId;
  if (normalized.lesson) payload.lesson = normalized.lesson;
  if (normalized.category) payload.category = normalized.category;
  if (normalized.resultId) payload.resultId = normalized.resultId;

  const json = JSON.stringify(payload);
  if (json.length > NAVIGATION_CONTEXT_MAX_LENGTH) {
    return JSON.stringify({
      entryContext: normalized.entryContext,
      returnPath: defaultReturnPath(normalized.entryContext),
    });
  }
  return json;
}

/** Build the canonical Back href (pathname + restored filters/query). */
export function backHrefFromContext(ctx: NavigationContext): string {
  const safe = normalizeContext(ctx) ?? {
    entryContext: "hub" as const,
    returnPath: "/hubs",
  };

  if (safe.entryContext === "search") {
    const q = safe.q?.trim() ?? "";
    return q.length > 0 ? `/search?q=${encodeURIComponent(q)}` : "/search";
  }

  if (safe.entryContext === "hub") {
    // Prefer a safe detail return path when present (e.g. Practise → detail).
    if (
      isSafeNavigationPath(safe.returnPath) &&
      /^\/(vocabulary|verbs|grammar|phrases)\/[^/]+$/.test(safe.returnPath)
    ) {
      return safe.returnPath;
    }
    const path =
      safe.hubId && isSafeNavigationPath(`/${safe.hubId}`)
        ? `/${safe.hubId}`
        : isSafeNavigationPath(safe.returnPath)
          ? safe.returnPath
          : "/hubs";
    const params = new URLSearchParams();
    if (safe.q && safe.q.trim().length > 0) params.set("q", safe.q.trim());
    if (safe.lesson && safe.lesson !== "all") params.set("lesson", safe.lesson);
    if (safe.category) params.set("category", safe.category);
    const qs = params.toString();
    return qs.length > 0 ? `${path}?${qs}` : path;
  }

  if (safe.entryContext === "lesson") {
    return isSafeNavigationPath(safe.returnPath) ? safe.returnPath : "/lessons";
  }

  // review → hubs
  return "/hubs";
}

export function fallbackNavigationContext(
  kind: NavigationFallbackKind = "hub",
): NavigationContext {
  return Object.freeze({
    entryContext: kind === "search" ? "search" : kind === "lesson" ? "lesson" : "hub",
    returnPath: FALLBACK_PATH[kind],
  });
}

export function buildSearchNavigationContext(
  q: string,
  resultId?: string,
): NavigationContext {
  const cleaned = sanitizeSearchQueryText(q).trim();
  const ctx: NavigationContext = {
    entryContext: "search",
    returnPath: "/search",
  };
  if (cleaned.length > 0) ctx.q = cleaned;
  const rid = sanitizeResultId(resultId);
  if (rid) ctx.resultId = rid;
  return Object.freeze(ctx);
}

export function buildHubNavigationContext(input: {
  hubId: LearnerHubId;
  q?: string;
  lesson?: "all" | "01" | "02" | "03";
  category?: string;
  resultId?: string;
}): NavigationContext {
  const ctx: NavigationContext = {
    entryContext: "hub",
    returnPath: `/${input.hubId}`,
    hubId: input.hubId,
  };
  const q = input.q != null ? sanitizeSearchQueryText(input.q).trim() : "";
  if (q.length > 0) ctx.q = q;
  if (input.lesson === "01" || input.lesson === "02" || input.lesson === "03") ctx.lesson = input.lesson;
  if (input.category) {
    const category = sanitizeHubQueryText(input.category).trim();
    if (category.length > 0 && category !== "all") ctx.category = category;
  }
  const rid = sanitizeResultId(input.resultId);
  if (rid) ctx.resultId = rid;
  return Object.freeze(ctx);
}

/**
 * Navigation context for leaving a representative detail into `/practice`.
 * Back returns to the exact detail canonical path while preserving hub metadata.
 */
export function buildDetailPracticeNavigationContext(input: {
  hubId: LearnerHubId;
  detailPath: string;
  resultId: string;
}): NavigationContext | null {
  if (!isSafeNavigationPath(input.detailPath)) return null;
  if (!/^\/(vocabulary|verbs|grammar|phrases)\/[^/]+$/.test(input.detailPath)) {
    return null;
  }
  const ctx: NavigationContext = {
    entryContext: "hub",
    returnPath: input.detailPath,
    hubId: input.hubId,
  };
  const rid = sanitizeResultId(input.resultId);
  if (rid) ctx.resultId = rid;
  return Object.freeze(ctx);
}

export function buildLessonNavigationContext(
  lessonRouteSegment: "01" | "02",
  resultId?: string,
): NavigationContext {
  const ctx: NavigationContext = {
    entryContext: "lesson",
    returnPath: `/lessons/${lessonRouteSegment}`,
  };
  const rid = sanitizeResultId(resultId);
  if (rid) ctx.resultId = rid;
  return Object.freeze(ctx);
}

/**
 * Append (or replace) the nav context on an internal href.
 * Never rewrites external targets — returns the original href if unsafe.
 */
export function appendNavigationContext(
  href: string,
  ctx: NavigationContext,
): string {
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\")) {
    return href;
  }
  const qIndex = href.indexOf("?");
  const pathname = qIndex === -1 ? href : href.slice(0, qIndex);
  const existing = qIndex === -1 ? "" : href.slice(qIndex + 1);
  if (!isAbsoluteNormalizedPathname(pathname)) return href;

  const params = new URLSearchParams(existing);
  params.set(NAVIGATION_CONTEXT_PARAM, serializeNavigationContext(ctx));
  return `${pathname}?${params.toString()}`;
}

/**
 * Prefer inbound context when present; otherwise use the page's own context.
 * Ensures deep links preserve search/hub entry instead of overwriting with lesson.
 */
export function resolveOutboundNavigationContext(
  inbound: NavigationContext | null,
  current: NavigationContext,
): NavigationContext {
  return inbound ?? current;
}

/** Safe Back target when context is missing or hostile. */
export function resolveBackHref(
  ctx: NavigationContext | null,
  fallback: NavigationFallbackKind = "hub",
): string {
  if (!ctx) return FALLBACK_PATH[fallback];
  const href = backHrefFromContext(ctx);
  const pathOnly = href.split("?")[0] ?? href;
  if (!isSafeNavigationPath(pathOnly)) return FALLBACK_PATH[fallback];
  return href;
}
