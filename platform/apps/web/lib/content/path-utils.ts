/** Pure URL helpers — safe for the Next client/server graph (no content package). */

export function lessonRouteSegment(lessonNumber: number): string {
  return String(lessonNumber).padStart(2, "0");
}

export function encodeActivityRouteSegment(activityId: string): string {
  return encodeURIComponent(activityId);
}

/**
 * Decode a route activity segment. Returns null on malformed percent-encoding
 * so callers can fail closed instead of treating the raw segment as decoded.
 */
export function tryDecodeActivityRouteSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/**
 * Decode a route activity segment, or throw on malformed percent-encoding.
 * Prefer {@link tryDecodeActivityRouteSegment} at route boundaries.
 */
export function decodeActivityRouteSegment(segment: string): string {
  const decoded = tryDecodeActivityRouteSegment(segment);
  if (decoded == null) {
    throw new Error("MALFORMED_ACTIVITY_ROUTE_SEGMENT");
  }
  return decoded;
}

export function activityCanonicalPath(
  lessonNumber: number,
  activityId: string,
): string {
  return `/lessons/${lessonRouteSegment(lessonNumber)}/activity/${encodeActivityRouteSegment(activityId)}`;
}

/**
 * Absolute + slash-normalized pathnames only.
 * - Must start with `/`
 * - Reject relative segments (`.`, `..`) and empty segments (`//`)
 * - Reject a single trailing slash (except `/` itself) — trailing slashes
 *   are redirect concerns for the request proxy, not accepted here
 */
export function isAbsoluteNormalizedPathname(pathname: string): boolean {
  if (typeof pathname !== "string" || pathname.length === 0) return false;
  if (!pathname.startsWith("/")) return false;
  if (pathname === "/") return true;
  if (pathname.endsWith("/")) return false;
  if (pathname.includes("//")) return false;
  const parts = pathname.split("/").slice(1);
  for (const part of parts) {
    if (part === "" || part === "." || part === "..") return false;
  }
  return true;
}

/**
 * Extract the raw pathname from an absolute request URL without applying
 * WHATWG percent-decoding (so `activity%3A…` stays encoded).
 */
export function extractRawPathname(requestUrl: string): string {
  const withoutHash = requestUrl.split("#", 1)[0] ?? requestUrl;
  const schemeIdx = withoutHash.indexOf("://");
  const pathStart =
    schemeIdx === -1 ? withoutHash.indexOf("/") : withoutHash.indexOf("/", schemeIdx + 3);
  if (pathStart === -1) return "/";
  const pathAndQuery = withoutHash.slice(pathStart);
  const queryIdx = pathAndQuery.indexOf("?");
  const path = queryIdx === -1 ? pathAndQuery : pathAndQuery.slice(0, queryIdx);
  return path.length === 0 ? "/" : path;
}

/** Preserve `?query` from an absolute request URL; fragments never reach the server. */
export function extractRawSearch(requestUrl: string): string {
  const withoutHash = requestUrl.split("#", 1)[0] ?? requestUrl;
  const queryIdx = withoutHash.indexOf("?");
  if (queryIdx === -1) return "";
  return withoutHash.slice(queryIdx);
}
