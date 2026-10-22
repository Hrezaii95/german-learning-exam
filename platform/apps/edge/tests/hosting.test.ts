import assert from "node:assert/strict";
import { test } from "node:test";
import worker, { type Env } from "../src/app.js";
import {
  API_CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
  withSecurityHeaders,
} from "../src/security.js";

function apiEnv(): Env {
  return {
    BUILD_SHA: "test-build",
    ASSETS: { fetch: async () => { throw new Error("API request reached assets"); } },
  };
}

test("health is JSON, uncached and served without consulting static assets", async () => {
  const response = await worker.fetch(new Request("https://german.learnilabs.com/api/health?probe=1"), apiEnv());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: "german-web", version: "test-build" });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("content-type") ?? "", /^application\/json/);
  assert.equal(response.headers.get("content-security-policy"), API_CONTENT_SECURITY_POLICY);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("health HEAD is bodyless and writes have an explicit method rejection", async () => {
  const head = await worker.fetch(new Request("https://german.learnilabs.com/api/health", { method: "HEAD" }), apiEnv());
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    const response = await worker.fetch(new Request("https://german.learnilabs.com/api/health", { method }), apiEnv());
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.get("allow"), "GET, HEAD");
    assert.deepEqual(await response.json(), { error: "method_not_allowed" });
  }
});

test("API boundary returns an honest JSON 404, including bare /api", async () => {
  for (const pathname of ["/api", "/api/", "/api/unknown", "/api/health/", "/api/health/extra"]) {
    const response = await worker.fetch(new Request(`https://german.learnilabs.com${pathname}`), apiEnv());
    assert.equal(response.status, 404, pathname);
    assert.deepEqual(await response.json(), { error: "not_found" });
  }
});

test("static delegation preserves redirects, body, headers and exact request", async () => {
  const request = new Request("https://german.learnilabs.com/apiary?study=1");
  let received: Request | undefined;
  const response = await worker.fetch(request, {
    ASSETS: { fetch: async (input) => {
      received = input;
      return new Response("redirect body", { status: 307, headers: { Location: "/apiary/", ETag: '"asset"' } });
    } },
  });
  assert.equal(received, request);
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "/apiary/");
  assert.equal(response.headers.get("etag"), '"asset"');
  assert.equal(await response.text(), "redirect body");
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) assert.equal(response.headers.get(name), value);
});

test("static not-found and HEAD responses retain their semantics", async () => {
  for (const method of ["GET", "HEAD"]) {
    const response = await worker.fetch(new Request("https://german.learnilabs.com/missing/", { method }), {
      ASSETS: { fetch: async () => new Response(method === "HEAD" ? null : "Page not found", { status: 404 }) },
    });
    assert.equal(response.status, 404);
    assert.equal(await response.text(), method === "HEAD" ? "" : "Page not found");
    assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000");
  }
});

test("security overlay preserves a stricter asset CSP and immutable responses", () => {
  const original = Response.redirect("https://german.learnilabs.com/", 308);
  const secured = withSecurityHeaders(original);
  assert.equal(secured.status, 308);
  assert.equal(secured.headers.get("location"), original.headers.get("location"));
  const policy = "default-src 'none'";
  const strict = withSecurityHeaders(new Response(null, { headers: { "Content-Security-Policy": policy } }));
  assert.equal(strict.headers.get("content-security-policy"), policy);
});

test("asset failures return a generic uncached failure without exception details", async () => {
  const response = await worker.fetch(new Request("https://german.learnilabs.com/"), {
    ASSETS: { fetch: async () => { throw new Error("sensitive provider exception"); } },
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "service_unavailable" });
  assert.equal(response.headers.get("cache-control"), "no-store");
});
