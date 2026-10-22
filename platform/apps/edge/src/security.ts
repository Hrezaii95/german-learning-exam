/**
 * Shared by the Worker and the static-export `_headers` writer. Matching static
 * assets bypass the Worker, so they must carry the same headers at the edge.
 *
 * The current static Next export embeds hydration scripts and inline styles.
 * L3-1 therefore permits inline content while forbidding remote scripts. A
 * nonce-based policy needs a future rendering change; do not add unsafe-eval.
 */
export const STATIC_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

export const API_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

export const SECURITY_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  "Content-Security-Policy": STATIC_CONTENT_SECURITY_POLICY,
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
});

/** Clone headers rather than mutating an immutable fetch()/ASSETS response. */
export function withSecurityHeaders(
  response: Response,
  policy?: string,
): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    // Preserve a route-specific CSP supplied by the static assets service.
    if (name === "Content-Security-Policy" && headers.has(name) && !policy) continue;
    headers.set(name, name === "Content-Security-Policy" && policy ? policy : value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
