/**
 * Offline-first policy — the one place the caching contract is written down.
 *
 * Three very different runtimes read this module, which is why it exists at
 * all:
 *  - `public/sw.js` never imports it (a service worker has no module graph
 *    here); instead `scripts/offline-export.ts` stamps the values produced by
 *    `buildServiceWorkerConfig` into the exported worker, so the worker and
 *    this file cannot drift;
 *  - `components/offline/OfflineRuntime.tsx` imports the paths and the copy;
 *  - `tools/audit-offline-export.mjs` re-derives the same values to check the
 *    real `out/` tree after a build.
 *
 * Deliberately free of DOM and Node APIs. `platform/tsconfig.json` typechecks
 * `apps/web/lib/**\/*.ts` with `lib: ["ES2022"]` (no DOM), and the browser
 * bundle imports it too, so anything platform-specific belongs in the caller.
 *
 * ---------------------------------------------------------------------------
 * THE CACHING CONTRACT
 * ---------------------------------------------------------------------------
 *
 * Two caches, both carrying the build version in their name:
 *
 *   german-learning-os-shell-v<version>     precached at install
 *   german-learning-os-runtime-v<version>   filled as the learner browses
 *
 * `<version>` is a content hash over every precached file, computed by the
 * export step. Change any shell byte and the name changes; change nothing and
 * a rebuild reuses the same caches. On `activate` the worker deletes every
 * cache starting with `german-learning-os-` that is not one of the current
 * two, so a cache can never outlive the deploy that created it. That is the
 * whole point: a stale offline copy is worse than no offline copy, because the
 * learner cannot tell they are looking at last week's app.
 *
 * The cost of versioning the runtime cache as well is that a deploy drops the
 * images and audio a learner had already collected; they are re-saved the next
 * time each one is opened. That is the right trade here, because media lives
 * at stable, unhashed paths (`/audio/…`, `/illustrations/…`) — a runtime cache
 * that survived a deploy would keep serving a replaced recording forever.
 *
 * WHAT IS PRECACHED (shell, install time)
 *  - the navigation HTML: the dashboard, every hub index, search, practice,
 *    review, settings, references, conversation, the two lesson pages and the
 *    404 page — see `isShellHtmlRoute`;
 *  - every `_next/static` script and stylesheet those pages reference;
 *  - the self-hosted InterVariable font;
 *  - the app icons and the web app manifest.
 *
 * WHAT IS CACHED ON USE (runtime, versioned, no eviction policy of its own)
 *  - every other HTML route — the 23 activity pages, the 153 word/verb/
 *    grammar/phrase detail pages, the collection pages;
 *  - illustrations and infographics;
 *  - workbook and pronunciation audio.
 *
 * The split is not a shortcut, it is the architecture requirement:
 * docs/12-technical-architecture.md asks to "precache shell … within
 * reasonable size", to "lazy-cache teacher profession media by collection" and
 * to "cache source listening tracks when the activity is opened", and its
 * performance budget says the initial dashboard must not download all teacher
 * audio and images. Precaching everything would mean ~30 MB on first paint.
 *
 * STRATEGIES
 *  - HTML  → network-first, cache fallback. A deployed update is picked up on
 *            the first online navigation instead of waiting for the worker.
 *  - hashed `_next/static` → cache-first. The filename is the version.
 *  - fonts + icons → cache-first. Stable paths, replaced only by a new deploy,
 *            and the version-scoped cache name already handles that.
 *  - images + audio → cache-first, populated on first successful fetch.
 *  - anything else → network-first.
 */

/** Every cache this app owns starts with this. Cleanup keys off it. */
export const OFFLINE_CACHE_PREFIX = "german-learning-os-";

/** Precached app shell for one build. */
export function shellCacheName(version: string): string {
  return `${OFFLINE_CACHE_PREFIX}shell-v${version}`;
}

/** Pages, images and audio saved as the learner opens them. */
export function runtimeCacheName(version: string): string {
  return `${OFFLINE_CACHE_PREFIX}runtime-v${version}`;
}

/** The complete set of cache names a given build is allowed to keep. */
export function offlineCacheNames(version: string): readonly string[] {
  return [shellCacheName(version), runtimeCacheName(version)];
}

/**
 * Which of the caches already on the device must go.
 *
 * Only this app's caches are touched: a key that does not carry the prefix
 * belongs to something else on the same origin and is left alone.
 */
export function staleOfflineCacheNames(
  existing: readonly string[],
  version: string,
): readonly string[] {
  const keep = new Set(offlineCacheNames(version));
  return existing.filter(
    (name) => name.startsWith(OFFLINE_CACHE_PREFIX) && !keep.has(name),
  );
}

/** Served from `public/`, so it sits at the deploy root and scopes the whole app. */
export const SERVICE_WORKER_PATH = "/sw.js";

/** Served from `public/`; rewritten with the deploy base path by the export step. */
export const WEB_APP_MANIFEST_PATH = "/manifest.webmanifest";

/** Message a page posts to ask a waiting worker to take over. */
export const SKIP_WAITING_MESSAGE = "german-learning-os:activate-update";

/* ---------------------------------------------------------------------------
 * Build-time configuration injected into the worker
 * ------------------------------------------------------------------------ */

/** Marks the start of the region `stampServiceWorker` replaces. */
export const SW_CONFIG_START = "/* @gl-offline-config:start */";
/** Marks the end of the region `stampServiceWorker` replaces. */
export const SW_CONFIG_END = "/* @gl-offline-config:end */";

/**
 * Value the committed `public/sw.js` carries before the export stamps it.
 * A worker that still reports this version is running unstamped: it caches
 * nothing at install and the release gate rejects it.
 */
export const UNSTAMPED_VERSION = "unstamped";

export type OfflineCacheTier = "shell" | "runtime";

export type CacheFirstPrefix = Readonly<{
  prefix: string;
  cache: OfflineCacheTier;
}>;

export type OfflineServiceWorkerConfig = Readonly<{
  version: string;
  /** Deploy base path, `""` locally and `/german-learning-exam` on Pages. */
  basePath: string;
  /** Everything under this prefix is ours; other paths are never intercepted. */
  scope: string;
  shellCache: string;
  runtimeCache: string;
  cachePrefix: string;
  /** Absolute, base-path-correct URLs fetched during `install`. */
  precache: readonly string[];
  cacheFirst: readonly CacheFirstPrefix[];
  /** Where the generated offline page sends a learner who wants to start over. */
  homeUrl: string;
  copy: typeof OFFLINE_COPY;
}>;

/**
 * Asset families served at stable paths, matched longest-prefix-first by the
 * worker. Hashed build output and the font are shell-tier because they are
 * precached; media is runtime-tier because it is saved on first use.
 */
export function cacheFirstPrefixes(basePath: string): readonly CacheFirstPrefix[] {
  const base = normalizeBasePath(basePath);
  return [
    { prefix: `${base}/_next/static/`, cache: "shell" },
    { prefix: `${base}/fonts/`, cache: "shell" },
    { prefix: `${base}/icons/`, cache: "shell" },
    { prefix: `${base}/illustrations/`, cache: "runtime" },
    { prefix: `${base}/infographics/`, cache: "runtime" },
    { prefix: `${base}/audio/`, cache: "runtime" },
  ];
}

/**
 * A base path is either empty or `/segment` with no trailing slash, so that
 * `${base}/thing` is correct in both shapes. Anything else is a deploy bug and
 * must fail loudly rather than produce URLs that 404 only in production.
 */
export function normalizeBasePath(basePath: string): string {
  if (basePath === "") return "";
  if (!basePath.startsWith("/") || basePath.endsWith("/")) {
    throw new Error(
      `Offline base path must be "" or start with "/" without a trailing slash; got ${JSON.stringify(basePath)}`,
    );
  }
  return basePath;
}

export function buildServiceWorkerConfig(input: {
  version: string;
  basePath: string;
  precache: readonly string[];
}): OfflineServiceWorkerConfig {
  const base = normalizeBasePath(input.basePath);
  return {
    version: input.version,
    basePath: base,
    scope: `${base}/`,
    shellCache: shellCacheName(input.version),
    runtimeCache: runtimeCacheName(input.version),
    cachePrefix: OFFLINE_CACHE_PREFIX,
    precache: [...input.precache],
    cacheFirst: cacheFirstPrefixes(base),
    homeUrl: `${base}/`,
    copy: OFFLINE_COPY,
  };
}

/**
 * Replace the marked configuration block in the worker source.
 *
 * Fails closed: a worker whose markers moved would otherwise ship with the
 * unstamped placeholder and silently cache nothing.
 */
export function stampServiceWorker(
  source: string,
  config: OfflineServiceWorkerConfig,
): string {
  const start = source.indexOf(SW_CONFIG_START);
  const end = source.indexOf(SW_CONFIG_END);
  if (start < 0 || end < 0 || end < start) {
    throw new Error(
      `Service worker source is missing the ${SW_CONFIG_START} … ${SW_CONFIG_END} block`,
    );
  }
  const block = [
    SW_CONFIG_START,
    `const CONFIG = ${JSON.stringify(config, null, 2)};`,
    SW_CONFIG_END,
  ].join("\n");
  return source.slice(0, start) + block + source.slice(end + SW_CONFIG_END.length);
}

/* ---------------------------------------------------------------------------
 * Which exported pages belong to the precached shell
 * ------------------------------------------------------------------------ */

/**
 * Top-level routes that exist but are not part of the learner's app.
 *
 * They are exported (they are real pages) and they are cached on use like any
 * other route, but they never join the install-time shell.
 */
const NON_LEARNER_TOP_LEVEL_ROUTES: readonly string[] = Object.freeze([
  "review-audio",
]);

/**
 * True for the navigation surfaces a learner can reach from anywhere, plus the
 * two lesson pages and the 404 page.
 *
 * Measured against the current export: 20 of 205 pages, 1.68 MB of 10.70 MB.
 * The 185 pages left out are activity, detail and collection pages — long,
 * numerous, and only meaningful once a learner has chosen one, at which point
 * the runtime tier saves it.
 *
 * `relPath` is POSIX-relative to the export root, e.g. `vocabulary/index.html`.
 */
export function isShellHtmlRoute(relPath: string): boolean {
  const parts = relPath.split("/");
  if (parts.length === 1) {
    return parts[0] === "index.html" || parts[0] === "404.html";
  }
  if (parts[parts.length - 1] !== "index.html") return false;
  const segments = parts.slice(0, -1);
  // A single segment is a top-level route: /vocabulary/, /search/, /settings/…
  if (segments.length === 1) {
    // …except the ones that are not learner navigation at all. The
    // pronunciation listening check is a reviewer's instrument reachable only
    // by typing its address; it is also the single largest page in the export
    // (110 audio players). Precaching it would put a tool no learner opens
    // into every learner's install, and make the shell version churn on work
    // that has nothing to do with the course.
    return !NON_LEARNER_TOP_LEVEL_ROUTES.includes(segments[0] as string);
  }
  // The two lesson pages sit one level deeper and are the app's front door
  // into the course itself.
  return segments.length === 2 && segments[0] === "lessons";
}

/** Exported file path → the URL a browser actually requests for it. */
export function htmlRouteUrl(relPath: string, basePath: string): string {
  const base = normalizeBasePath(basePath);
  if (relPath === "index.html") return `${base}/`;
  if (!relPath.endsWith("/index.html")) return `${base}/${relPath}`;
  return `${base}/${relPath.slice(0, -"index.html".length)}`;
}

/* ---------------------------------------------------------------------------
 * Request classification (the worker mirrors this with the injected config)
 * ------------------------------------------------------------------------ */

export type OfflineStrategy = "network-first" | "cache-first" | "passthrough";

export type OfflineRouting = Readonly<{
  strategy: OfflineStrategy;
  cache: OfflineCacheTier | null;
}>;

/**
 * Decide how one same-origin GET is served. Kept pure so the release tests can
 * assert the table directly instead of booting a worker.
 */
export function classifyOfflineRequest(
  request: { pathname: string; isNavigation: boolean },
  config: Pick<OfflineServiceWorkerConfig, "scope" | "cacheFirst">,
): OfflineRouting {
  if (!request.pathname.startsWith(config.scope)) {
    return { strategy: "passthrough", cache: null };
  }
  if (request.isNavigation) {
    return { strategy: "network-first", cache: "runtime" };
  }
  const match = config.cacheFirst.find((entry) =>
    request.pathname.startsWith(entry.prefix),
  );
  if (match) return { strategy: "cache-first", cache: match.cache };
  return { strategy: "network-first", cache: "runtime" };
}

/* ---------------------------------------------------------------------------
 * Learner-facing copy
 * ------------------------------------------------------------------------ */

/**
 * Everything the offline layer ever says out loud.
 *
 * Held here, and not inside the worker or the component, so one test can hold
 * all of it against `tools/learner-language-rules.mjs` — the same rule set the
 * release gate runs over the exported HTML. The offline notices are rendered
 * from browser state and so never appear in the exported HTML the gate reads,
 * which would otherwise make them the one unaudited surface in the app.
 *
 * The rule the wording follows: never claim something is available when it is
 * not, and always say what the learner can do about it.
 */
export const OFFLINE_COPY = {
  /** Persistent chip while the device reports no connection. */
  offlineBadge: "Offline",
  offlineTitle: "You are offline",
  offlineBody:
    "Pages and audio you have already opened stay available. Anything you have not opened yet needs a connection.",

  /** Shown once a newer version of the app has finished downloading. */
  updateTitle: "A new version is ready",
  updateBody:
    "It starts the next time you reload. Finish what you are doing first — reloading now will not lose your saved progress.",
  updateAction: "Reload now",
  updateDismiss: "Later",

  /**
   * Announced when a sound fails to load while offline. The failure is real
   * and the message says so, rather than leaving a silent, dead play button.
   */
  mediaOffline:
    "That sound is not saved on this device yet. Connect to the internet once to play it, and it stays available afterwards.",

  /** Served by the worker for a page that was never opened online. */
  pageTitle: "You are offline",
  pageHeading: "This page is not saved on your device",
  pageBody:
    "Open it once while you are connected and it works offline from then on.",
  pageHomeLink: "Go to your dashboard",
} as const;

/* ---------------------------------------------------------------------------
 * Web app manifest
 * ------------------------------------------------------------------------ */

/** From `app/globals.css`: the navigation surface colour. */
export const OFFLINE_THEME_COLOR = "#1b1633";
/** From `app/globals.css`: `--canvas`, the page background. */
export const OFFLINE_BACKGROUND_COLOR = "#f3efe8";

export type WebAppManifestIcon = Readonly<{
  src: string;
  sizes: string;
  type: string;
  purpose: string;
}>;

/**
 * Icon files generated by `scripts/generate-app-icons.ts`.
 * `any` and `maskable` are separate images on purpose: a maskable icon is
 * cropped to a circle on Android, so it needs its own safe-zone padding.
 */
export const APP_ICON_FILES = [
  { file: "icon-192.png", sizes: "192x192", purpose: "any" },
  { file: "icon-512.png", sizes: "512x512", purpose: "any" },
  { file: "icon-maskable-512.png", sizes: "512x512", purpose: "maskable" },
  { file: "apple-touch-icon-180.png", sizes: "180x180", purpose: "any" },
] as const;

/** The 180px icon is what iOS uses for a home-screen shortcut. */
export const APPLE_TOUCH_ICON_PATH = "/icons/apple-touch-icon-180.png";

export function appIconUrls(basePath: string): readonly string[] {
  const base = normalizeBasePath(basePath);
  return APP_ICON_FILES.map((icon) => `${base}/icons/${icon.file}`);
}

/**
 * The installable-app description.
 *
 * `start_url` and `scope` must carry the deploy base path or an installed app
 * opens at the wrong origin path and every subsequent request 404s — the same
 * failure the self-hosted font hit before `withPagesBaseAssetPath` existed.
 */
export function buildWebAppManifest(basePath: string): Record<string, unknown> {
  const base = normalizeBasePath(basePath);
  return {
    name: "German Learning OS",
    short_name: "German OS",
    description:
      "Learn the German of Lessons 1 and 2 — words, verbs, grammar, everyday phrases, listening and short practice rounds, with your progress kept on your own device.",
    id: `${base}/`,
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    orientation: "any",
    lang: "en",
    dir: "ltr",
    categories: ["education"],
    background_color: OFFLINE_BACKGROUND_COLOR,
    theme_color: OFFLINE_THEME_COLOR,
    icons: APP_ICON_FILES.map(
      (icon): WebAppManifestIcon => ({
        src: `${base}/icons/${icon.file}`,
        sizes: icon.sizes,
        type: "image/png",
        purpose: icon.purpose,
      }),
    ),
  };
}

/** Byte-for-byte serialization, so a committed manifest can be diff-checked. */
export function serializeWebAppManifest(basePath: string): string {
  return `${JSON.stringify(buildWebAppManifest(basePath), null, 2)}\n`;
}
