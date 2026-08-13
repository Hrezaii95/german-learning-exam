/** Pure URL helpers — safe for the Next client/server graph (no content package). */

/**
 * Public URL-safe slug contract for typed entity IDs (`prefix:rest`).
 *
 * GitHub Pages percent-decodes `%3A` → `:` before filesystem lookup, so
 * `encodeURIComponent`-based path segments (`lex%3A…`, `activity%3A…`) are
 * incompatible with static export even when a local static server serves the
 * literally named `%3A` directories. Canonical public segments replace the
 * typed ID with an `id-` prefixed lowercase ASCII-hex encoding (no `:` and no
 * `%3A` in the filesystem name). Hex is deliberately boring but bijective,
 * portable on Windows, and immune to separator collisions in future IDs.
 *
 * Internal typed IDs remain colon-form everywhere outside public route segments.
 *
 * Legacy aliases (raw colon, percent-encoded colon) may redirect once in
 * server mode; they are never the canonical Pages/export path.
 */

/** Publication typed IDs: exactly one type separator colon. */
const TYPED_ENTITY_ID_RE =
  /^([a-z][a-z0-9-]*)\:([a-z0-9][a-z0-9_-]*)$/i;

/** Canonical public slug: `id-` plus an even number of lowercase hex digits. */
const PUBLIC_TYPED_ID_SLUG_RE = /^id-([0-9a-f]{2})+$/;

export function isTypedEntityId(value: string): boolean {
  return typeof value === "string" && TYPED_ENTITY_ID_RE.test(value);
}

/**
 * Encode a typed entity ID to a Pages-safe public route segment.
 * Deterministic and reversible for IDs matching {@link isTypedEntityId}.
 */
export function encodePublicTypedIdSlug(typedId: string): string {
  if (!isTypedEntityId(typedId)) {
    throw new Error("INVALID_TYPED_ENTITY_ID_FOR_PUBLIC_SLUG");
  }
  let encoded = "id-";
  for (let index = 0; index < typedId.length; index += 1) {
    encoded += typedId.charCodeAt(index).toString(16).padStart(2, "0");
  }
  return encoded;
}

/**
 * Decode a canonical public slug only. Rejects `:`, `%`, traversal-ish forms,
 * and non-round-trip segments. Does not accept legacy aliases.
 */
export function tryDecodePublicTypedIdSlug(segment: string): string | null {
  if (typeof segment !== "string" || segment.length === 0) return null;
  if (segment.includes("/") || segment.includes("%") || segment.includes(":")) {
    return null;
  }
  if (!PUBLIC_TYPED_ID_SLUG_RE.test(segment)) return null;
  const hex = segment.slice(3);
  let typedId = "";
  for (let index = 0; index < hex.length; index += 2) {
    typedId += String.fromCharCode(Number.parseInt(hex.slice(index, index + 2), 16));
  }
  if (!isTypedEntityId(typedId)) return null;
  if (encodePublicTypedIdSlug(typedId) !== segment) return null;
  return typedId;
}

/**
 * True when a path segment is safe for GitHub Pages static directory names
 * (no literal colon and no percent-encoded colon).
 */
export function isPagesSafePublicPathSegment(segment: string): boolean {
  if (typeof segment !== "string" || segment.length === 0) return false;
  if (segment.includes(":") || /%3a/i.test(segment)) return false;
  return tryDecodePublicTypedIdSlug(segment) != null;
}

/** Legacy percent-encoded typed-id segment (`lex%3Aarchitekt`) — alias only. */
export function legacyPercentEncodedTypedIdSegment(typedId: string): string {
  return encodeURIComponent(typedId);
}

function tryDecodeLegacyPercentEncodedTypedId(
  segment: string,
): string | null {
  if (!segment.includes("%")) return null;
  try {
    const decoded = decodeURIComponent(segment);
    if (!isTypedEntityId(decoded)) return null;
    const expected = encodeURIComponent(decoded);
    // Accept canonical hex case and lowercase hex (`%3a`).
    if (
      segment !== expected &&
      segment.toLowerCase() !== expected.toLowerCase()
    ) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Decode a public typed-id route segment.
 * Accepts: canonical `--` slug, legacy percent-encoded colon, legacy raw colon.
 * Returns null on malformed / double-encoded / non-typed forms (fail closed).
 */
export function tryDecodeTypedIdRouteSegment(segment: string): string | null {
  if (typeof segment !== "string" || segment.length === 0) return null;
  if (segment.includes("/")) return null;

  const publicDecoded = tryDecodePublicTypedIdSlug(segment);
  if (publicDecoded != null) return publicDecoded;

  if (isTypedEntityId(segment)) return segment;

  return tryDecodeLegacyPercentEncodedTypedId(segment);
}

export function lessonRouteSegment(lessonNumber: number): string {
  return String(lessonNumber).padStart(2, "0");
}

export function encodeActivityRouteSegment(activityId: string): string {
  return encodePublicTypedIdSlug(activityId);
}

/** Same public-slug contract for hub detail / conversation entity segments. */
export function encodeEntityRouteSegment(entityId: string): string {
  return encodePublicTypedIdSlug(entityId);
}

/**
 * Decode a hub-detail entity segment. Returns null on malformed input.
 */
export function tryDecodeEntityRouteSegment(segment: string): string | null {
  return tryDecodeTypedIdRouteSegment(segment);
}

/**
 * Decode a route activity segment. Returns null on malformed input so callers
 * can fail closed instead of treating the raw segment as decoded.
 */
export function tryDecodeActivityRouteSegment(segment: string): string | null {
  return tryDecodeTypedIdRouteSegment(segment);
}

/**
 * Decode a route activity segment, or throw on malformed input.
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
 * WHATWG percent-decoding (so legacy `activity%3A…` aliases stay encoded).
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
