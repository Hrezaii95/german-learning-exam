/**
 * P6 — offline-first policy.
 *
 * The failure this suite exists to catch is a service worker that looks
 * installed and does nothing useful, or worse, keeps serving a build that no
 * longer exists. So the assertions are behavioural wherever they can be: the
 * committed `public/sw.js` is stamped with a real config and then executed in
 * a sandbox with fake caches, and its install/activate/fetch handlers are
 * driven directly.
 *
 * Kept free of the DOM on purpose — `platform/tsconfig.json` typechecks
 * `tests/web/**\/*.ts` with `lib: ["ES2022"]`.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it } from "vitest";

import {
  OFFLINE_BACKGROUND_COLOR,
  OFFLINE_COPY,
  OFFLINE_CACHE_PREFIX,
  OFFLINE_THEME_COLOR,
  SKIP_WAITING_MESSAGE,
  UNSTAMPED_VERSION,
  buildServiceWorkerConfig,
  buildWebAppManifest,
  cacheFirstPrefixes,
  classifyOfflineRequest,
  htmlRouteUrl,
  isShellHtmlRoute,
  normalizeBasePath,
  offlineCacheNames,
  runtimeCacheName,
  serializeWebAppManifest,
  shellCacheName,
  stampServiceWorker,
  staleOfflineCacheNames,
  type OfflineServiceWorkerConfig,
} from "../../apps/web/lib/offline/policy.js";
import {
  registerOfflineWorker,
  supportsServiceWorker,
  type OfflineWorker,
  type OfflineWorkerContainer,
  type OfflineWorkerRegistration,
} from "../../apps/web/lib/offline/register.js";
import {
  deriveOfflineVersion,
  precacheGroupFor,
} from "../../apps/web/scripts/offline-export.js";
import { renderAppIcons } from "../../apps/web/scripts/generate-app-icons.js";
import { learnerLanguageFindings } from "../../../tools/learner-language-rules.mjs";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "apps", "web");
const SW_SOURCE = readFileSync(join(webRoot, "public", "sw.js"), "utf8");
const PAGES_BASE = "/german-learning-exam";

/* ===========================================================================
 * Versioning and cache keys
 * ======================================================================== */

describe("cache versioning", () => {
  it("puts the build version inside both cache names", () => {
    expect(shellCacheName("abc123")).toBe("german-learning-os-shell-vabc123");
    expect(runtimeCacheName("abc123")).toBe("german-learning-os-runtime-vabc123");
  });

  it("changes every cache key when the version changes", () => {
    const before = offlineCacheNames("aaaa1111");
    const after = offlineCacheNames("bbbb2222");
    expect(before).not.toEqual(after);
    for (const name of after) expect(before).not.toContain(name);
  });

  it("marks every earlier build's caches stale and leaves other apps alone", () => {
    const existing = [
      shellCacheName("old"),
      runtimeCacheName("old"),
      shellCacheName("new"),
      runtimeCacheName("new"),
      "some-other-app-v1",
      "workbox-precache",
    ];
    expect(staleOfflineCacheNames(existing, "new")).toEqual([
      shellCacheName("old"),
      runtimeCacheName("old"),
    ]);
  });

  it("derives the version from content, not from build time", () => {
    const entries = [
      { url: "/a", sha256: "1111" },
      { url: "/b", sha256: "2222" },
    ];
    const reordered = [...entries].reverse();
    expect(deriveOfflineVersion(entries)).toBe(deriveOfflineVersion(reordered));
    expect(deriveOfflineVersion(entries)).not.toBe(
      deriveOfflineVersion([{ url: "/a", sha256: "1111" }, { url: "/b", sha256: "9999" }]),
    );
    // A file that only moved is still a change: the URL is hashed too.
    expect(deriveOfflineVersion(entries)).not.toBe(
      deriveOfflineVersion([{ url: "/a", sha256: "1111" }, { url: "/c", sha256: "2222" }]),
    );
    expect(deriveOfflineVersion(entries)).not.toBe(UNSTAMPED_VERSION);
  });
});

/* ===========================================================================
 * Stamping
 * ======================================================================== */

function testConfig(
  overrides: Partial<{ version: string; basePath: string; precache: string[] }> = {},
): OfflineServiceWorkerConfig {
  return buildServiceWorkerConfig({
    version: overrides.version ?? "testversion01",
    basePath: overrides.basePath ?? PAGES_BASE,
    precache: overrides.precache ?? [
      `${PAGES_BASE}/`,
      `${PAGES_BASE}/lessons/`,
      `${PAGES_BASE}/_next/static/chunks/main-abc.js`,
    ],
  });
}

describe("service worker stamping", () => {
  it("ships unstamped and inert so an unfinished build cannot pretend to work", () => {
    expect(SW_SOURCE).toContain(`version: "${UNSTAMPED_VERSION}"`);
    expect(SW_SOURCE).toContain("precache: [],");
  });

  it("replaces the marked block with the policy's cache names", () => {
    const config = testConfig();
    const stamped = stampServiceWorker(SW_SOURCE, config);
    expect(stamped).toContain(shellCacheName("testversion01"));
    expect(stamped).toContain(runtimeCacheName("testversion01"));
    expect(stamped).not.toContain(`version: "${UNSTAMPED_VERSION}"`);
    expect(stamped).toContain(OFFLINE_COPY.pageHeading);
  });

  it("refuses to stamp a worker whose markers were removed", () => {
    expect(() => stampServiceWorker("const CONFIG = {};", testConfig())).toThrow(
      /missing the/i,
    );
  });
});

/* ===========================================================================
 * The worker, executed
 * ======================================================================== */

type FakeRequest = {
  method: string;
  url: string;
  mode?: string;
  destination?: string;
  headers: { get(name: string): string | null };
};

function fakeRequest(url: string, overrides: Partial<FakeRequest> = {}): FakeRequest {
  return {
    method: "GET",
    url,
    mode: "no-cors",
    destination: "empty",
    headers: { get: () => null },
    ...overrides,
  };
}

class FakeCache {
  readonly store = new Map<string, unknown>();
  readonly added: string[] = [];

  async addAll(urls: string[]): Promise<void> {
    for (const url of urls) {
      this.added.push(url);
      this.store.set(url, new Response("cached", { status: 200 }));
    }
  }

  async add(url: string): Promise<void> {
    await this.addAll([url]);
  }

  async put(request: FakeRequest | string, response: unknown): Promise<void> {
    this.store.set(typeof request === "string" ? request : request.url, response);
  }

  async match(
    request: FakeRequest | string,
    options?: { ignoreSearch?: boolean },
  ): Promise<unknown> {
    const url = typeof request === "string" ? request : request.url;
    const direct = this.store.get(url);
    if (direct) return direct;
    if (!options?.ignoreSearch) return undefined;
    const withoutQuery = url.split("?")[0];
    return withoutQuery ? this.store.get(withoutQuery) : undefined;
  }
}

class FakeCacheStorage {
  readonly caches = new Map<string, FakeCache>();

  async open(name: string): Promise<FakeCache> {
    const existing = this.caches.get(name);
    if (existing) return existing;
    const created = new FakeCache();
    this.caches.set(name, created);
    return created;
  }

  async keys(): Promise<string[]> {
    return [...this.caches.keys()];
  }

  async delete(name: string): Promise<boolean> {
    return this.caches.delete(name);
  }
}

type WorkerHarness = {
  config: OfflineServiceWorkerConfig;
  caches: FakeCacheStorage;
  fetchCalls: string[];
  skipWaitingCalls: number;
  claimCalls: number;
  dispatch: (type: string, event: Record<string, unknown>) => Promise<unknown[]>;
  respond: (request: FakeRequest) => Promise<Response | undefined>;
};

/**
 * Evaluate the real worker source in a sandbox and hand back the levers a test
 * needs. Executing the shipped file — rather than a re-implementation of it —
 * is the point: this is what the learner's browser runs.
 */
function loadWorker(
  options: {
    config?: OfflineServiceWorkerConfig;
    networkFails?: boolean;
    responseFor?: (url: string) => Response;
  } = {},
): WorkerHarness {
  const config = options.config ?? testConfig();
  const listeners = new Map<string, ((event: Record<string, unknown>) => void)[]>();
  const cacheStorage = new FakeCacheStorage();
  const fetchCalls: string[] = [];
  const harness = { skipWaitingCalls: 0, claimCalls: 0 };

  const selfStub = {
    addEventListener: (type: string, handler: (event: Record<string, unknown>) => void) => {
      const list = listeners.get(type) ?? [];
      list.push(handler);
      listeners.set(type, list);
    },
    location: { origin: "https://learner.example" },
    clients: {
      claim: async () => {
        harness.claimCalls += 1;
      },
    },
    skipWaiting: async () => {
      harness.skipWaitingCalls += 1;
    },
  };

  const context = createContext({
    self: selfStub,
    caches: cacheStorage,
    console: { warn: () => {}, error: () => {}, log: () => {} },
    Response,
    Headers,
    URL,
    fetch: async (request: FakeRequest) => {
      fetchCalls.push(request.url);
      if (options.networkFails) throw new Error("offline");
      return options.responseFor?.(request.url) ?? new Response("network", { status: 200 });
    },
  });

  runInContext(stampServiceWorker(SW_SOURCE, config), context);

  const dispatch = async (type: string, event: Record<string, unknown>) => {
    const waited: unknown[] = [];
    const enriched = {
      ...event,
      waitUntil: (promise: unknown) => waited.push(promise),
    };
    for (const handler of listeners.get(type) ?? []) handler(enriched);
    return Promise.all(waited);
  };

  const respond = async (request: FakeRequest) => {
    let captured: Promise<Response> | undefined;
    for (const handler of listeners.get("fetch") ?? []) {
      handler({
        request,
        respondWith: (promise: Promise<Response>) => {
          captured = promise;
        },
      });
    }
    return captured ? await captured : undefined;
  };

  return {
    config,
    caches: cacheStorage,
    fetchCalls,
    get skipWaitingCalls() {
      return harness.skipWaitingCalls;
    },
    get claimCalls() {
      return harness.claimCalls;
    },
    dispatch,
    respond,
  };
}

describe("service worker install", () => {
  it("precaches exactly the stamped shell list", async () => {
    const worker = loadWorker();
    await worker.dispatch("install", {});
    const shell = worker.caches.caches.get(worker.config.shellCache);
    expect(shell?.added).toEqual([...worker.config.precache]);
  });

  it("caches nothing when the worker was never stamped", async () => {
    const worker = loadWorker({
      config: buildServiceWorkerConfig({
        version: UNSTAMPED_VERSION,
        basePath: "",
        precache: [],
      }),
    });
    await worker.dispatch("install", {});
    expect(worker.caches.caches.size).toBe(0);
  });
});

describe("service worker activate", () => {
  it("deletes every cache that is not this build's, and only ours", async () => {
    const worker = loadWorker();
    await worker.caches.open(shellCacheName("previous"));
    await worker.caches.open(runtimeCacheName("previous"));
    await worker.caches.open(shellCacheName("evenolder"));
    await worker.caches.open(worker.config.shellCache);
    await worker.caches.open(worker.config.runtimeCache);
    await worker.caches.open("another-project-on-this-origin");

    await worker.dispatch("activate", {});

    expect([...worker.caches.caches.keys()].sort()).toEqual(
      [
        "another-project-on-this-origin",
        worker.config.runtimeCache,
        worker.config.shellCache,
      ].sort(),
    );
  });

  it("claims open pages so the first visit gains offline support without a reload", async () => {
    const worker = loadWorker();
    await worker.dispatch("activate", {});
    expect(worker.claimCalls).toBe(1);
  });

  it("leaves no cache from a previous version behind", async () => {
    const worker = loadWorker();
    await worker.caches.open(shellCacheName("previous"));
    await worker.dispatch("activate", {});
    const survivors = [...worker.caches.caches.keys()].filter((name) =>
      name.startsWith(OFFLINE_CACHE_PREFIX),
    );
    expect(staleOfflineCacheNames(survivors, worker.config.version)).toEqual([]);
  });
});

describe("service worker update handshake", () => {
  it("only activates a waiting worker when the page asks for it", async () => {
    const worker = loadWorker();
    await worker.dispatch("message", { data: "something-else" });
    expect(worker.skipWaitingCalls).toBe(0);

    await worker.dispatch("message", { data: SKIP_WAITING_MESSAGE });
    expect(worker.skipWaitingCalls).toBe(1);
  });
});

describe("service worker fetch strategies", () => {
  const navigation = () =>
    fakeRequest(`https://learner.example${PAGES_BASE}/lessons/`, {
      mode: "navigate",
      destination: "document",
    });

  it("serves HTML from the network first and saves it for later", async () => {
    const worker = loadWorker();
    const response = await worker.respond(navigation());
    expect(response?.status).toBe(200);
    expect(worker.fetchCalls).toHaveLength(1);
    const runtime = worker.caches.caches.get(worker.config.runtimeCache);
    expect(runtime?.store.has(`https://learner.example${PAGES_BASE}/lessons/`)).toBe(true);
  });

  it("falls back to the saved page when the network is gone", async () => {
    const worker = loadWorker({ networkFails: true });
    const cache = await worker.caches.open(worker.config.runtimeCache);
    await cache.put(navigation(), new Response("saved lesson", { status: 200 }));

    const response = await worker.respond(navigation());
    expect(await response?.text()).toBe("saved lesson");
  });

  it("answers an unsaved page with an honest offline page, never a stand-in", async () => {
    const worker = loadWorker({ networkFails: true });
    const response = await worker.respond(navigation());
    expect(response?.status).toBe(503);
    const body = (await response?.text()) ?? "";
    expect(body).toContain(OFFLINE_COPY.pageHeading);
    expect(body).toContain(OFFLINE_COPY.pageBody);
    expect(body).toContain(`href="${PAGES_BASE}/"`);
  });

  it("serves hashed build assets from the cache without touching the network", async () => {
    const worker = loadWorker();
    const url = `https://learner.example${PAGES_BASE}/_next/static/chunks/main-abc.js`;
    const shell = await worker.caches.open(worker.config.shellCache);
    await shell.put(fakeRequest(url), new Response("chunk", { status: 200 }));

    const response = await worker.respond(fakeRequest(url, { destination: "script" }));
    expect(await response?.text()).toBe("chunk");
    expect(worker.fetchCalls).toEqual([]);
  });

  it("saves audio on first play so the next one works offline", async () => {
    const url = `https://learner.example${PAGES_BASE}/audio/source-workbook-approved-v1/1_01.mp3`;
    const worker = loadWorker({
      responseFor: () => new Response("mp3-bytes", { status: 200 }),
    });
    await worker.respond(fakeRequest(url, { destination: "audio" }));
    const runtime = worker.caches.caches.get(worker.config.runtimeCache);
    expect(runtime?.store.has(url)).toBe(true);
  });

  it("reports a sound that was never saved instead of returning silence", async () => {
    const worker = loadWorker({ networkFails: true });
    const response = await worker.respond(
      fakeRequest(`https://learner.example${PAGES_BASE}/audio/tts-de-de-v1/x.mp3`, {
        destination: "audio",
      }),
    );
    expect(response?.status).toBe(504);
  });

  it("never intercepts another app sharing the same origin", async () => {
    const worker = loadWorker();
    const response = await worker.respond(
      fakeRequest("https://learner.example/some-other-project/index.html", {
        mode: "navigate",
        destination: "document",
      }),
    );
    expect(response).toBeUndefined();
  });

  it("never intercepts a cross-origin request", async () => {
    const worker = loadWorker();
    const response = await worker.respond(
      fakeRequest(`https://elsewhere.example${PAGES_BASE}/`, { mode: "navigate" }),
    );
    expect(response).toBeUndefined();
  });
});

/* ===========================================================================
 * Base path correctness
 * ======================================================================== */

describe("base path correctness", () => {
  it("scopes the worker and every precache URL under the deploy path", () => {
    const config = testConfig();
    expect(config.scope).toBe(`${PAGES_BASE}/`);
    expect(config.homeUrl).toBe(`${PAGES_BASE}/`);
    for (const url of config.precache) expect(url.startsWith(`${PAGES_BASE}/`)).toBe(true);
    for (const rule of config.cacheFirst) {
      expect(rule.prefix.startsWith(`${PAGES_BASE}/`)).toBe(true);
    }
  });

  it("works unprefixed for a local build", () => {
    const config = buildServiceWorkerConfig({ version: "v", basePath: "", precache: ["/"] });
    expect(config.scope).toBe("/");
    expect(cacheFirstPrefixes("")).toContainEqual({
      prefix: "/_next/static/",
      cache: "shell",
    });
  });

  it("rejects a malformed base path rather than emitting URLs that 404 in production", () => {
    expect(() => normalizeBasePath("german-learning-exam")).toThrow();
    expect(() => normalizeBasePath("/german-learning-exam/")).toThrow();
    expect(normalizeBasePath("")).toBe("");
  });

  it("maps exported files onto the URLs a browser actually requests", () => {
    expect(htmlRouteUrl("index.html", PAGES_BASE)).toBe(`${PAGES_BASE}/`);
    expect(htmlRouteUrl("vocabulary/index.html", PAGES_BASE)).toBe(
      `${PAGES_BASE}/vocabulary/`,
    );
    expect(htmlRouteUrl("lessons/lesson-1/index.html", PAGES_BASE)).toBe(
      `${PAGES_BASE}/lessons/lesson-1/`,
    );
    expect(htmlRouteUrl("404.html", PAGES_BASE)).toBe(`${PAGES_BASE}/404.html`);
  });
});

describe("web app manifest", () => {
  it("carries the deploy base path everywhere a URL appears", () => {
    const manifest = buildWebAppManifest(PAGES_BASE);
    expect(manifest.start_url).toBe(`${PAGES_BASE}/`);
    expect(manifest.scope).toBe(`${PAGES_BASE}/`);
    expect(manifest.id).toBe(`${PAGES_BASE}/`);
    const icons = manifest.icons as { src: string }[];
    expect(icons.length).toBeGreaterThan(0);
    for (const icon of icons) expect(icon.src.startsWith(`${PAGES_BASE}/icons/`)).toBe(true);
  });

  it("uses the shipped design tokens for the app window chrome", () => {
    const manifest = buildWebAppManifest("");
    expect(manifest.theme_color).toBe(OFFLINE_THEME_COLOR);
    expect(manifest.background_color).toBe(OFFLINE_BACKGROUND_COLOR);
    expect(OFFLINE_THEME_COLOR).toBe("#1b1633");
    expect(OFFLINE_BACKGROUND_COLOR).toBe("#f3efe8");
    expect(manifest.display).toBe("standalone");
  });

  it("declares a maskable icon so Android does not crop the mark", () => {
    const icons = buildWebAppManifest("").icons as { purpose: string }[];
    expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  });

  it("keeps the committed manifest identical to the generator", () => {
    const committed = readFileSync(join(webRoot, "public", "manifest.webmanifest"), "utf8");
    expect(committed).toBe(serializeWebAppManifest(""));
  });
});

/* ===========================================================================
 * Precache selection
 * ======================================================================== */

describe("precache selection", () => {
  it("takes the navigation shell and the lesson pages", () => {
    for (const route of [
      "index.html",
      "404.html",
      "vocabulary/index.html",
      "search/index.html",
      "references/index.html",
      "lessons/index.html",
      "lessons/lesson-1/index.html",
    ]) {
      expect(isShellHtmlRoute(route)).toBe(true);
    }
  });

  it("leaves the long tail of content pages to be saved on use", () => {
    for (const route of [
      "vocabulary/der-arzt/index.html",
      "collections/professions/01/index.html",
      "lessons/lesson-1/activity/id-1/index.html",
      "practice/flashcards/index.html",
      "index.txt",
    ]) {
      expect(isShellHtmlRoute(route)).toBe(false);
    }
  });

  it("classifies exported files into the tier that pays for them", () => {
    expect(precacheGroupFor("index.html")).toBe("html");
    expect(precacheGroupFor("vocabulary/der-arzt/index.html")).toBeNull();
    expect(precacheGroupFor("_next/static/chunks/main-abc.js")).toBe("script");
    expect(precacheGroupFor("_next/static/css/app-abc.css")).toBe("style");
    expect(precacheGroupFor("fonts/InterVariable.woff2")).toBe("font");
    expect(precacheGroupFor("icons/icon-192.png")).toBe("icon");
    expect(precacheGroupFor("manifest.webmanifest")).toBe("manifest");
    // The heavy tiers are deliberately absent from install-time precache.
    expect(precacheGroupFor("audio/tts-de-de-v1/clip.mp3")).toBeNull();
    expect(precacheGroupFor("illustrations/professions/arzt-square-240.avif")).toBeNull();
    expect(precacheGroupFor("vocabulary/index.txt")).toBeNull();
  });
});

describe("request routing table", () => {
  const config = testConfig();

  it("sends pages to the network first so a deploy is picked up", () => {
    expect(
      classifyOfflineRequest({ pathname: `${PAGES_BASE}/lessons/`, isNavigation: true }, config),
    ).toEqual({ strategy: "network-first", cache: "runtime" });
  });

  it("serves immutable build output and the font from the cache first", () => {
    for (const pathname of [
      `${PAGES_BASE}/_next/static/chunks/main.js`,
      `${PAGES_BASE}/fonts/InterVariable.woff2`,
      `${PAGES_BASE}/icons/icon-192.png`,
    ]) {
      expect(classifyOfflineRequest({ pathname, isNavigation: false }, config)).toEqual({
        strategy: "cache-first",
        cache: "shell",
      });
    }
  });

  it("serves media from the cache first, filled as the learner opens it", () => {
    for (const pathname of [
      `${PAGES_BASE}/audio/tts-de-de-v1/clip.mp3`,
      `${PAGES_BASE}/illustrations/professions/arzt-wide-512.avif`,
      `${PAGES_BASE}/infographics/greetings.svg`,
    ]) {
      expect(classifyOfflineRequest({ pathname, isNavigation: false }, config)).toEqual({
        strategy: "cache-first",
        cache: "runtime",
      });
    }
  });

  it("leaves anything outside the deploy path alone", () => {
    expect(
      classifyOfflineRequest({ pathname: "/other-project/", isNavigation: true }, config),
    ).toEqual({ strategy: "passthrough", cache: null });
  });

  it("sends the router's data requests to the network first", () => {
    expect(
      classifyOfflineRequest(
        { pathname: `${PAGES_BASE}/vocabulary/__next._tree.txt`, isNavigation: false },
        config,
      ),
    ).toEqual({ strategy: "network-first", cache: "runtime" });
  });
});

/* ===========================================================================
 * Registration is guarded and failure-safe
 * ======================================================================== */

/** A worker whose `state` a test can move, unlike the readonly real one. */
type FakeWorker = {
  state: string;
  readonly listeners: (() => void)[];
  readonly posted: unknown[];
  addEventListener(type: "statechange", listener: () => void): void;
  postMessage(message: unknown): void;
};

function fakeWorker(state: string): FakeWorker {
  const listeners: (() => void)[] = [];
  const posted: unknown[] = [];
  return {
    state,
    listeners,
    posted,
    addEventListener: (_type: "statechange", listener: () => void) => {
      listeners.push(listener);
    },
    postMessage: (message: unknown) => {
      posted.push(message);
    },
  };
}

function fakeRegistration(
  parts: { installing?: OfflineWorker | null; waiting?: OfflineWorker | null } = {},
): OfflineWorkerRegistration & { fire: () => void } {
  const updateFound: (() => void)[] = [];
  return {
    installing: parts.installing ?? null,
    waiting: parts.waiting ?? null,
    addEventListener: (_type: "updatefound", listener: () => void) => {
      updateFound.push(listener);
    },
    fire: () => {
      for (const listener of updateFound) listener();
    },
  };
}

describe("registration", () => {
  it("does nothing on a browser without service worker support", () => {
    expect(supportsServiceWorker(undefined)).toBe(false);
    expect(supportsServiceWorker(null)).toBe(false);
    expect(supportsServiceWorker({})).toBe(false);
    expect(supportsServiceWorker({ serviceWorker: {} })).toBe(true);
  });

  it("survives a refused registration without throwing", async () => {
    const reasons: unknown[] = [];
    const container: OfflineWorkerContainer = {
      controller: null,
      register: () => Promise.reject(new Error("blocked by browser settings")),
    };

    const result = await registerOfflineWorker(container, {
      scriptUrl: `${PAGES_BASE}/sw.js`,
      scope: `${PAGES_BASE}/`,
      onUpdateReady: () => {
        throw new Error("must not be called");
      },
      onUnavailable: (reason) => reasons.push(reason),
    });

    expect(result).toBeNull();
    expect(reasons).toHaveLength(1);
  });

  it("registers at the base-path-correct script URL and scope", async () => {
    const calls: { scriptUrl: string; scope: string; updateViaCache: string }[] = [];
    const container: OfflineWorkerContainer = {
      controller: null,
      register: (scriptUrl, options) => {
        calls.push({ scriptUrl, ...options });
        return Promise.resolve(fakeRegistration());
      },
    };

    await registerOfflineWorker(container, {
      scriptUrl: `${PAGES_BASE}/sw.js`,
      scope: `${PAGES_BASE}/`,
      onUpdateReady: () => {},
    });

    expect(calls).toEqual([
      {
        scriptUrl: `${PAGES_BASE}/sw.js`,
        scope: `${PAGES_BASE}/`,
        updateViaCache: "none",
      },
    ]);
  });

  it("offers a worker that was already waiting from an earlier visit", async () => {
    const waiting = fakeWorker("installed");
    const offered: OfflineWorker[] = [];
    await registerOfflineWorker(
      {
        controller: {},
        register: () => Promise.resolve(fakeRegistration({ waiting })),
      },
      {
        scriptUrl: "/sw.js",
        scope: "/",
        onUpdateReady: (worker) => offered.push(worker),
      },
    );
    expect(offered).toEqual([waiting]);
  });

  it("stays silent during the very first install", async () => {
    const installing = fakeWorker("installing");
    const registration = fakeRegistration({ installing });
    const offered: OfflineWorker[] = [];

    await registerOfflineWorker(
      // `controller` is null: nothing is running this page yet.
      { controller: null, register: () => Promise.resolve(registration) },
      { scriptUrl: "/sw.js", scope: "/", onUpdateReady: (worker) => offered.push(worker) },
    );

    registration.fire();
    installing.state = "installed";
    for (const listener of installing.listeners) listener();

    expect(offered).toEqual([]);
  });

  it("offers the update once a newer worker finishes installing over a running one", async () => {
    const installing = fakeWorker("installing");
    const registration = fakeRegistration({ installing });
    const offered: OfflineWorker[] = [];

    await registerOfflineWorker(
      { controller: {}, register: () => Promise.resolve(registration) },
      { scriptUrl: "/sw.js", scope: "/", onUpdateReady: (worker) => offered.push(worker) },
    );

    registration.fire();
    expect(offered).toEqual([]);

    installing.state = "installed";
    for (const listener of installing.listeners) listener();
    expect(offered).toEqual([installing]);
  });

  it("drops a late update once the page has moved on", async () => {
    const waiting = fakeWorker("installed");
    let cancelled = false;
    const offered: OfflineWorker[] = [];

    const promise = registerOfflineWorker(
      { controller: {}, register: () => Promise.resolve(fakeRegistration({ waiting })) },
      {
        scriptUrl: "/sw.js",
        scope: "/",
        isCancelled: () => cancelled,
        onUpdateReady: (worker) => offered.push(worker),
      },
    );
    cancelled = true;
    await promise;

    expect(offered).toEqual([]);
  });
});

/* ===========================================================================
 * Learner language
 * ======================================================================== */

describe("offline copy", () => {
  it("passes the same learner-language rules as every exported page", () => {
    const findings: string[] = [];
    for (const [key, phrase] of Object.entries(OFFLINE_COPY)) {
      for (const code of learnerLanguageFindings(phrase)) findings.push(`${key}: ${code}`);
    }
    expect(findings).toEqual([]);
  });

  it("says what the learner can do, not what the app failed to do", () => {
    expect(OFFLINE_COPY.mediaOffline).toMatch(/connect to the internet/i);
    expect(OFFLINE_COPY.pageBody).toMatch(/while you are connected/i);
    // An update must read as the learner's choice, not as an interruption.
    expect(OFFLINE_COPY.updateAction).toMatch(/reload/i);
    expect(OFFLINE_COPY.updateDismiss.length).toBeGreaterThan(0);
  });

  it("never claims something offline is available when it is not", () => {
    for (const phrase of Object.values(OFFLINE_COPY)) {
      expect(phrase).not.toMatch(/\b(everything|all content) (is|stays) available\b/i);
    }
  });
});

/* ===========================================================================
 * Icons
 * ======================================================================== */

describe("app icons", () => {
  it("regenerates byte-identically to the committed files", () => {
    for (const [file, bytes] of renderAppIcons()) {
      const committed = readFileSync(join(webRoot, "public", "icons", file));
      expect(
        Buffer.compare(committed, bytes),
        `public/icons/${file} is stale — run npm run icons:app`,
      ).toBe(0);
    }
  });

  it("writes real PNGs at the sizes the manifest declares", () => {
    const icons = buildWebAppManifest("").icons as { src: string; sizes: string }[];
    for (const icon of icons) {
      const file = icon.src.split("/").at(-1) ?? "";
      const bytes = readFileSync(join(webRoot, "public", "icons", file));
      expect(bytes.subarray(0, 8)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
      // IHDR width/height sit at byte 16 and 20 of every PNG.
      const declared = Number(icon.sizes.split("x")[0]);
      expect(bytes.readUInt32BE(16)).toBe(declared);
      expect(bytes.readUInt32BE(20)).toBe(declared);
    }
  });
});
