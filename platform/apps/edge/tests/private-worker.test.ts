import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { protectPrivateResponses } from "../scripts/private-worker.js";

test("Cloudflare worker bypasses every API fetch and refuses private cache entries", () => {
  const source = readFileSync(new URL("../../web/public/sw.js", import.meta.url), "utf8");
  const handlers = new Map<string, Array<(event: unknown) => unknown>>();
  const context = { URL, Response, console, self: { location: { origin: "https://example.test" },
    addEventListener: (name: string, fn: (event: unknown) => unknown) => handlers.set(name, [...(handlers.get(name) ?? []), fn]) } };
  const patched = protectPrivateResponses(source);
  runInNewContext(patched, context);
  for (const path of ["/api", "/api/auth/me", "/api/sync/pull?store=learner.events"]) {
    for (const fn of handlers.get("fetch") ?? []) fn({ request: new Request(`https://example.test${path}`),
      respondWith: () => { throw new Error("Private API must not be intercepted"); } });
  }
  for (const policy of ["no-store", "private", "max-age=0, private", "private=\"name\""]) {
    assert.equal(runInNewContext(`isStorable(new Response("private", {headers: {"cache-control": ${JSON.stringify(policy)}}}))`, context), false);
  }
  assert.equal(runInNewContext('isStorable(new Response("public"))', context), true);
  assert.throws(() => protectPrivateResponses("changed source"), /recheck private/);
});

test("activation purges previously cached API/private data and preserves public/offline assets and unrelated caches", async () => {
  const source = readFileSync(new URL("../../web/public/sw.js", import.meta.url), "utf8");
  const handlers = new Map<string, Array<(event: unknown) => unknown>>();
  const origin = "https://example.test";
  class FixtureCache {
    readonly entries = new Map<string, Response>();
    async keys() { return [...this.entries.keys()].map(url => new Request(url)); }
    async match(request: Request) { return this.entries.get(request.url); }
    async delete(request: Request) { return this.entries.delete(request.url); }
    add(path: string, policy?: string) {
      this.entries.set(new URL(path, origin).href, new Response("synthetic cached response", { headers: policy ? { "Cache-Control": policy } : {} }));
      return this;
    }
    has(path: string) { return this.entries.has(new URL(path, origin).href); }
  }
  const runtime = new FixtureCache().add("/api/auth/me").add("/api").add("/apiary").add("/private-page/", "private")
    .add("/uncached-resource", "no-store").add("/qualified-private", 'private="name"').add("/lessons/01/", "max-age=3600");
  const shell = new FixtureCache().add("/");
  const unrelated = new FixtureCache().add("/api/auth/me", "private");
  const named = new Map<string, FixtureCache>([
    ["german-learning-os-runtime-vunstamped", runtime],
    ["german-learning-os-shell-vunstamped", shell],
    ["another-app-cache", unrelated],
  ]);
  let claimed = 0;
  const context = { URL, Request, Response, console,
    caches: { keys: async () => [...named.keys()], open: async (name: string) => { let cache = named.get(name); if (!cache) { cache = new FixtureCache(); named.set(name, cache); } return cache; }, delete: async (name: string) => named.delete(name) },
    self: { location: { origin }, clients: { claim: async () => { claimed++; } },
      addEventListener: (name: string, fn: (event: unknown) => unknown) => handlers.set(name, [...(handlers.get(name) ?? []), fn]) },
  };
  runInNewContext(protectPrivateResponses(source), context);
  const pending: Promise<unknown>[] = [];
  for (const activate of handlers.get("activate") ?? []) activate({ waitUntil: (promise: Promise<unknown>) => pending.push(promise) });
  await Promise.all(pending);
  for (const path of ["/api/auth/me", "/api", "/private-page/", "/uncached-resource", "/qualified-private"]) assert.equal(runtime.has(path), false, path);
  assert.equal(runtime.has("/apiary"), true);
  assert.equal(runtime.has("/lessons/01/"), true);
  assert.equal(shell.has("/"), true);
  assert.equal(unrelated.has("/api/auth/me"), true);
  assert.equal(claimed, 1);
});
