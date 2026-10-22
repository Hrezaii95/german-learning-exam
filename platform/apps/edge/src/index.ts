import { API_CONTENT_SECURITY_POLICY, withSecurityHeaders } from "./security.js";

/** Structural binding types keep this module portable to local route tests. */
export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  BUILD_SHA?: string;
}

function json(
  request: Request,
  value: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return withSecurityHeaders(
    new Response(request.method === "HEAD" ? null : JSON.stringify(value), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        ...extraHeaders,
      },
    }),
    API_CONTENT_SECURITY_POLICY,
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      if (pathname === "/api/health") {
        if (request.method !== "GET" && request.method !== "HEAD") {
          return json(request, { error: "method_not_allowed" }, 405, { Allow: "GET, HEAD" });
        }
        return json(request, {
          ok: true,
          service: "german-web",
          version: env.BUILD_SHA ?? "development",
        });
      }
      // An unknown API URL must never fall back to a static HTML page.
      return json(request, { error: "not_found" }, 404);
    }

    try {
      // ASSETS preserves its own redirects, HEAD handling and honest 404.html.
      return withSecurityHeaders(await env.ASSETS.fetch(request));
    } catch {
      return json(request, { error: "service_unavailable" }, 503);
    }
  },
};
