/**
 * German Learning OS — offline-first service worker.
 *
 * Read `apps/web/lib/offline/policy.ts` first: it holds the caching contract
 * (what is cached, in which tier, how it is invalidated) and produces the
 * `CONFIG` block below. This file only executes that contract.
 *
 * This source ships to `public/` unchanged. `scripts/offline-export.ts` copies
 * the exported worker and replaces the marked block with the real build
 * version, base path and precache list. Until that happens `CONFIG.version` is
 * "unstamped": the worker then precaches nothing, still serves the app, and
 * `tools/audit-offline-export.mjs` fails the release rather than letting a
 * do-nothing worker reach a learner.
 *
 * Nothing here is allowed to break the app. Every handler falls through to the
 * network, and a page that the worker cannot serve is answered with an honest
 * "not saved on your device" page instead of a cached stand-in.
 */

/* @gl-offline-config:start */
const CONFIG = {
  version: "unstamped",
  basePath: "",
  scope: "/",
  shellCache: "german-learning-os-shell-vunstamped",
  runtimeCache: "german-learning-os-runtime-vunstamped",
  cachePrefix: "german-learning-os-",
  precache: [],
  cacheFirst: [],
  homeUrl: "/",
  copy: {
    pageTitle: "You are offline",
    pageHeading: "This page is not saved on your device",
    pageBody:
      "Open it once while you are connected and it works offline from then on.",
    pageHomeLink: "Go to your dashboard",
  },
};
/* @gl-offline-config:end */

/* ---------------------------------------------------------------------------
 * install — build the shell cache
 * ------------------------------------------------------------------------ */

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell());
});

/**
 * `addAll` is atomic, which is what we want: a shell that is missing one of its
 * own scripts is not a shell. If it does fail we retry entry by entry rather
 * than abandoning the install, because partial offline support still beats
 * none, and the release gate is what guarantees the list was complete at build
 * time.
 */
async function precacheShell() {
  if (CONFIG.precache.length === 0) return;
  const cache = await caches.open(CONFIG.shellCache);
  try {
    await cache.addAll(CONFIG.precache);
    return;
  } catch (error) {
    console.warn("[offline] precache failed as a set, retrying entry by entry", error);
  }
  await Promise.allSettled(
    CONFIG.precache.map((entry) => cache.add(entry)),
  );
}

/* ---------------------------------------------------------------------------
 * activate — drop every cache from an older build
 * ------------------------------------------------------------------------ */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await deleteStaleCaches();
      // Take over pages that loaded before this worker existed, so the first
      // visit gets offline support without a reload. Claiming does not reload
      // or re-render anything the learner is looking at.
      await self.clients.claim();
    })(),
  );
});

/**
 * Deletes every cache this app owns whose name is not one of the current
 * build's two. Caches belonging to anything else on the origin are untouched.
 */
async function deleteStaleCaches() {
  const keep = new Set([CONFIG.shellCache, CONFIG.runtimeCache]);
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith(CONFIG.cachePrefix) && !keep.has(name))
      .map((name) => caches.delete(name)),
  );
}

/* ---------------------------------------------------------------------------
 * message — the learner asked for the waiting update
 * ------------------------------------------------------------------------ */

self.addEventListener("message", (event) => {
  // Only ever activated from the page's own "Reload now" button. A waiting
  // worker never takes over on its own, because swapping the app out from
  // under someone mid-activity is exactly the failure this avoids.
  if (event.data === "german-learning-os:activate-update") {
    void self.skipWaiting();
  }
});

/* ---------------------------------------------------------------------------
 * fetch
 * ------------------------------------------------------------------------ */

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(CONFIG.scope)) return;

  if (isNavigation(request)) {
    event.respondWith(handleNavigation(request));
    return;
  }

  const rule = matchCacheFirst(url.pathname);
  if (rule) {
    event.respondWith(handleCacheFirst(request, cacheNameFor(rule.cache)));
    return;
  }

  event.respondWith(handleNetworkFirst(request, CONFIG.runtimeCache));
});

function isNavigation(request) {
  return request.mode === "navigate" || request.destination === "document";
}

/** Longest prefix wins, so `/audio/…` cannot be shadowed by a shorter rule. */
function matchCacheFirst(pathname) {
  let best = null;
  for (const rule of CONFIG.cacheFirst) {
    if (!pathname.startsWith(rule.prefix)) continue;
    if (!best || rule.prefix.length > best.prefix.length) best = rule;
  }
  return best;
}

function cacheNameFor(tier) {
  return tier === "shell" ? CONFIG.shellCache : CONFIG.runtimeCache;
}

/**
 * HTML: network-first so a deploy is picked up on the next online navigation,
 * cache second so a known page still opens on a plane, and an honest offline
 * page last. Never a different page's HTML — a stand-in that looks like the
 * app is how a learner ends up trusting stale content.
 */
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (isStorable(response)) {
      await putInCache(CONFIG.runtimeCache, request, response.clone());
    }
    return response;
  } catch {
    // A static export answers `/search/?q=sein` with the same file as
    // `/search/`, so the query string must not decide a cache miss.
    const cached = await matchOwnCaches(request, { ignoreSearch: true });
    if (cached) return cached;
    return offlinePageResponse();
  }
}

/**
 * Look only in this app's own caches.
 *
 * `caches.match()` searches every cache on the origin, and on
 * `*.github.io` the origin is shared with every other project the same
 * account publishes. Naming the two caches keeps a neighbour's entry from
 * ever answering one of our requests.
 */
async function matchOwnCaches(request, options) {
  for (const name of [CONFIG.shellCache, CONFIG.runtimeCache]) {
    const cache = await caches.open(name);
    const hit = await cache.match(request, options);
    if (hit) return hit;
  }
  return null;
}

/**
 * Immutable and stable assets: answer from the cache immediately, and only
 * touch the network the first time. Hashed `_next/static` files can never
 * change under a given URL, and the version-scoped cache name covers the rest.
 */
async function handleCacheFirst(request, cacheName) {
  const cached = await matchOwnCaches(request, { ignoreVary: true });
  if (cached) return serveMaybeRanged(request, cached);

  try {
    const response = await fetch(request);
    if (isStorable(response)) {
      await putInCache(cacheName, request, response.clone());
    }
    return response;
  } catch {
    // Genuinely unavailable. Say so with a status the caller can act on
    // rather than handing back an empty 200 that looks like success.
    return unavailableResponse();
  }
}

async function handleNetworkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (isStorable(response)) {
      await putInCache(cacheName, request, response.clone());
    }
    return response;
  } catch {
    const cached = await matchOwnCaches(request, { ignoreVary: true });
    if (cached) return serveMaybeRanged(request, cached);
    return unavailableResponse();
  }
}

/**
 * The honest answer for a sub-resource that is neither reachable nor saved.
 * A failed `<audio>` or `<img>` load fires an `error` event, which the page
 * turns into the learner-facing sentence in `OFFLINE_COPY.mediaOffline`.
 */
function unavailableResponse() {
  return new Response(null, {
    status: 504,
    statusText: "Offline and not saved on this device",
  });
}

/**
 * Only complete, same-origin, successful responses are worth keeping.
 * A 206 is a fragment and would poison the cache for every later request.
 */
function isStorable(response) {
  return Boolean(
    response &&
      response.status === 200 &&
      response.type !== "opaque" &&
      response.type !== "opaqueredirect",
  );
}

async function putInCache(cacheName, request, response) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  } catch (error) {
    // Storage quota, private mode, or a request the Cache API refuses to key.
    // Losing the copy is acceptable; failing the response is not.
    console.warn("[offline] could not store response", request.url, error);
  }
}

/* ---------------------------------------------------------------------------
 * Range requests
 *
 * `<audio>` asks for byte ranges as soon as a learner scrubs, and some
 * browsers refuse a whole-file 200 in reply. The Cache API stores the complete
 * response, so the range is cut from it here and returned as a real 206.
 * ------------------------------------------------------------------------ */

async function serveMaybeRanged(request, cached) {
  const range = request.headers.get("range");
  if (!range) return cached;
  try {
    return await sliceCachedResponse(cached, range);
  } catch {
    return cached;
  }
}

async function sliceCachedResponse(cached, rangeHeader) {
  const parsed = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!parsed) return cached;

  const body = await cached.clone().arrayBuffer();
  const size = body.byteLength;
  const hasStart = parsed[1] !== "";
  const hasEnd = parsed[2] !== "";
  if (!hasStart && !hasEnd) return cached;

  let start = hasStart ? Number(parsed[1]) : size - Number(parsed[2]);
  let end = hasStart ? (hasEnd ? Number(parsed[2]) : size - 1) : size - 1;
  start = Math.max(0, Math.min(start, size));
  end = Math.max(start, Math.min(end, size - 1));

  const headers = new Headers(cached.headers);
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Content-Length", String(end - start + 1));
  headers.set("Accept-Ranges", "bytes");
  return new Response(body.slice(start, end + 1), {
    status: 206,
    statusText: "Partial Content",
    headers,
  });
}

/* ---------------------------------------------------------------------------
 * The offline page
 *
 * Built here rather than precached as a route, because it must be available
 * even when the request that failed is the very first one. The wording lives
 * in `lib/offline/policy.ts` so it is held to the same learner-language rules
 * as every other sentence in the app.
 * ------------------------------------------------------------------------ */

function offlinePageResponse() {
  const copy = CONFIG.copy;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(copy.pageTitle)}</title>
<style>
:root { color-scheme: light; }
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #f3efe8;
  color: #1c1a24;
  font-family: InterVariable, "Segoe UI", "Noto Sans", Arial, sans-serif;
}
main {
  max-width: 34rem;
  background: #ffffff;
  border: 1px solid #e4ddd2;
  border-radius: 18px;
  padding: 32px;
  box-shadow: 0 1px 2px rgba(28, 26, 36, 0.06), 0 8px 24px rgba(28, 26, 36, 0.04);
}
h1 { font-size: 1.5rem; line-height: 1.25; margin: 0 0 12px; }
p { margin: 0 0 24px; color: #5c5868; line-height: 1.6; }
a {
  display: inline-block;
  padding: 10px 18px;
  border-radius: 12px;
  background: #6946e8;
  color: #ffffff;
  font-weight: 600;
  text-decoration: none;
}
a:focus-visible { outline: 3px solid #1b1633; outline-offset: 2px; }
</style>
</head>
<body>
<main>
<h1>${escapeHtml(copy.pageHeading)}</h1>
<p>${escapeHtml(copy.pageBody)}</p>
<a href="${escapeHtml(CONFIG.homeUrl)}">${escapeHtml(copy.pageHomeLink)}</a>
</main>
</body>
</html>
`;
  return new Response(html, {
    status: 503,
    statusText: "Offline",
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
