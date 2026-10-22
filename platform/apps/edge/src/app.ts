import { API_CONTENT_SECURITY_POLICY, withSecurityHeaders } from "./security.js";
import { assertWrite, errorResponse } from "./http.js";
import { getSession, sessionCookie, sessionToken } from "./auth/session.js";
import { handleAuth } from "./routes/auth.js";
import { handleSync } from "./routes/sync.js";
import { handleClasses } from "./routes/classes.js";
import { handleDashboards } from "./routes/dashboards.js";
import { handleAdmin } from "./routes/admin.js";
import type { PlatformEnv } from "./types.js";
export type Env = PlatformEnv;

function json(request: Request, value: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return withSecurityHeaders(new Response(request.method === "HEAD" ? null : JSON.stringify(value), {
    status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders },
  }), API_CONTENT_SECURITY_POLICY);
}

export default {
  async fetch(request: Request, env: PlatformEnv): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      if (pathname === "/api/health") {
        if (request.method !== "GET" && request.method !== "HEAD") return json(request, { error: "method_not_allowed" }, 405, { Allow: "GET, HEAD" });
        const cors: Record<string, string> = request.method === "GET" && request.headers.get("Origin") === "https://hrezaii95.github.io"
          ? { "Access-Control-Allow-Origin": "https://hrezaii95.github.io", Vary: "Origin" } : {};
        return json(request, { ok: true, service: "german-web", version: env.BUILD_SHA ?? "development" }, 200, cors);
      }
      try {
        if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) assertWrite(request);
        const result = await handleAuth(request, env) ?? await handleSync(request, env)
          ?? await handleClasses(request, env) ?? await handleDashboards(request, env) ?? await handleAdmin(request, env);
        if (!result) return json(request, { error: "not_found" }, 404);
        const response = withSecurityHeaders(result, API_CONTENT_SECURITY_POLICY);
        response.headers.set("Cache-Control", "no-store, private");
        response.headers.set("Vary", "Cookie");
        const token = sessionToken(request);
        if (token && response.ok && !response.headers.has("Set-Cookie") && await getSession(request, env)) {
          response.headers.set("Set-Cookie", sessionCookie(token));
        }
        return response;
      } catch (error) { return errorResponse(error); }
    }
    try { return withSecurityHeaders(await env.ASSETS.fetch(request)); }
    catch { return json(request, { error: "service_unavailable" }, 503); }
  },
};
