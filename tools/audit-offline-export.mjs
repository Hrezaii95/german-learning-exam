/**
 * Offline-export gate.
 *
 * Everything here is a computed predicate against the real `out/` tree, not a
 * judgement about the code. The failure this exists to prevent is a service
 * worker that ships looking correct and does nothing — an unstamped build, a
 * precache list naming files that are not there, or `start_url`/`scope`
 * missing the Pages base path so an installed app opens on a 404.
 *
 * Checks
 *  1. `out/sw.js` exists and carries a stamped config block.
 *  2. The version is not the unstamped placeholder, and the two cache names
 *     are derived from it.
 *  3. Every precache URL resolves to a file that exists in `out/`.
 *  4. The precache covers the shell: HTML routes, every `_next/static` script
 *     and stylesheet, the font, all four icons, and the manifest.
 *  5. Every precache URL, plus `scope`, `start_url`, `id` and every icon `src`
 *     in the manifest, begins with the deploy base path.
 *  6. The service worker's learner-facing copy passes the learner-language
 *     rules — the same rules the exported HTML is held to.
 *  7. The registration actually ships: `sw.js` is referenced from the built
 *     client bundle.
 *
 * Run after `npm run build:pages`. Exits non-zero on any failure.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { learnerLanguageFindings } from "./learner-language-rules.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(repoRoot, "platform", "apps", "web", "out");
const reportPath = path.join(
  repoRoot,
  "research",
  "release-evidence",
  "offline-export-audit.json",
);

const BASE_PATH = "/german-learning-exam";
const CONFIG_START = "/* @gl-offline-config:start */";
const CONFIG_END = "/* @gl-offline-config:end */";
const UNSTAMPED_VERSION = "unstamped";
const REQUIRED_ICONS = [
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "apple-touch-icon-180.png",
];

const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
  return Boolean(condition);
}

/** Absolute deploy URL → the file the static host would serve for it. */
function urlToFile(url) {
  if (!url.startsWith(`${BASE_PATH}/`)) return null;
  const rest = url.slice(BASE_PATH.length + 1);
  const candidate = path.join(outDir, rest);
  if (rest === "" || rest.endsWith("/")) return path.join(candidate, "index.html");
  return candidate;
}

function walk(dir, root = dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, root, out);
    else out.push(path.relative(root, full).split(path.sep).join("/"));
  }
  return out;
}

/* --- 1. the worker exists and is stamped --------------------------------- */

const swFile = path.join(outDir, "sw.js");
if (!existsSync(swFile)) {
  console.error(`[offline] missing out/sw.js — run npm run build:pages first`);
  process.exit(1);
}

const swSource = readFileSync(swFile, "utf8");
const start = swSource.indexOf(CONFIG_START);
const end = swSource.indexOf(CONFIG_END);
if (start < 0 || end < 0 || end < start) {
  console.error("[offline] out/sw.js has no stamped configuration block");
  process.exit(1);
}

const block = swSource.slice(start + CONFIG_START.length, end).trim();
const json = block.replace(/^const\s+CONFIG\s*=\s*/, "").replace(/;$/, "");
let config;
try {
  config = JSON.parse(json);
} catch (error) {
  console.error("[offline] stamped configuration is not valid JSON", error);
  process.exit(1);
}

/* --- 2. version and cache names ------------------------------------------ */

check(
  typeof config.version === "string" && config.version !== UNSTAMPED_VERSION,
  `service worker version is still the unstamped placeholder (${config.version})`,
);
check(
  config.basePath === BASE_PATH,
  `service worker basePath is ${JSON.stringify(config.basePath)}, expected ${BASE_PATH}`,
);
check(
  config.scope === `${BASE_PATH}/`,
  `service worker scope is ${JSON.stringify(config.scope)}, expected ${BASE_PATH}/`,
);
check(
  config.shellCache === `german-learning-os-shell-v${config.version}`,
  `shell cache name does not carry the version: ${config.shellCache}`,
);
check(
  config.runtimeCache === `german-learning-os-runtime-v${config.version}`,
  `runtime cache name does not carry the version: ${config.runtimeCache}`,
);
check(
  config.shellCache.startsWith(config.cachePrefix) &&
    config.runtimeCache.startsWith(config.cachePrefix),
  "cache names must share the cleanup prefix or activate cannot evict them",
);

/* --- 3 + 5. every precache URL exists and is base-path correct ------------ */

const precache = Array.isArray(config.precache) ? config.precache : [];
check(precache.length > 0, "precache list is empty");

let precacheBytes = 0;
const missing = [];
const unbased = [];
for (const url of precache) {
  if (!url.startsWith(`${BASE_PATH}/`)) {
    unbased.push(url);
    continue;
  }
  const file = urlToFile(url);
  if (!file || !existsSync(file)) {
    missing.push(url);
    continue;
  }
  precacheBytes += statSync(file).size;
}
check(missing.length === 0, `precache names ${missing.length} file(s) that do not exist: ${missing.slice(0, 5).join(", ")}`);
check(unbased.length === 0, `precache has ${unbased.length} URL(s) without the base path: ${unbased.slice(0, 5).join(", ")}`);

/* --- 4. the precache actually covers the shell ---------------------------- */

const exported = walk(outDir);
const precacheSet = new Set(precache);

const buildAssets = exported.filter(
  (rel) => rel.startsWith("_next/static/") && (rel.endsWith(".js") || rel.endsWith(".css")),
);
const uncoveredBuildAssets = buildAssets.filter(
  (rel) => !precacheSet.has(`${BASE_PATH}/${rel}`),
);
check(
  uncoveredBuildAssets.length === 0,
  `${uncoveredBuildAssets.length} built script/stylesheet(s) are not precached, so a cached page could not start offline`,
);

const fonts = exported.filter((rel) => rel.startsWith("fonts/"));
check(fonts.length > 0, "no font shipped under out/fonts/");
check(
  fonts.every((rel) => precacheSet.has(`${BASE_PATH}/${rel}`)),
  "the self-hosted font is not precached",
);

for (const icon of REQUIRED_ICONS) {
  check(
    existsSync(path.join(outDir, "icons", icon)),
    `manifest icon out/icons/${icon} is missing`,
  );
  check(
    precacheSet.has(`${BASE_PATH}/icons/${icon}`),
    `manifest icon ${icon} is not precached`,
  );
}

check(
  precacheSet.has(`${BASE_PATH}/`),
  "the dashboard route is not precached, so a cold offline start has nothing to open",
);
check(
  precacheSet.has(`${BASE_PATH}/manifest.webmanifest`),
  "the web app manifest is not precached",
);

const precachedHtmlRoutes = precache.filter((url) => url.endsWith("/")).length;
check(
  precachedHtmlRoutes >= 15,
  `only ${precachedHtmlRoutes} navigation routes precached; the app shell should cover the hubs and both lesson pages`,
);

/* --- 5b. the manifest itself --------------------------------------------- */

const manifestFile = path.join(outDir, "manifest.webmanifest");
let manifest = null;
if (check(existsSync(manifestFile), "missing out/manifest.webmanifest")) {
  manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
  check(manifest.start_url === `${BASE_PATH}/`, `manifest start_url is ${manifest.start_url}`);
  check(manifest.scope === `${BASE_PATH}/`, `manifest scope is ${manifest.scope}`);
  check(manifest.id === `${BASE_PATH}/`, `manifest id is ${manifest.id}`);
  check(manifest.display === "standalone", `manifest display is ${manifest.display}`);
  check(manifest.theme_color === "#1b1633", `manifest theme_color is ${manifest.theme_color}`);
  check(
    manifest.background_color === "#f3efe8",
    `manifest background_color is ${manifest.background_color}`,
  );
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  check(icons.length === REQUIRED_ICONS.length, `manifest declares ${icons.length} icons`);
  for (const icon of icons) {
    check(
      typeof icon.src === "string" && icon.src.startsWith(`${BASE_PATH}/`),
      `manifest icon src misses the base path: ${icon.src}`,
    );
    const file = urlToFile(icon.src ?? "");
    check(Boolean(file) && existsSync(file), `manifest icon file missing: ${icon.src}`);
  }
  check(
    icons.some((icon) => icon.purpose === "maskable"),
    "manifest has no maskable icon, so Android crops the square artwork",
  );
}

/* --- 6. learner-facing copy ---------------------------------------------- */

const copy = config.copy ?? {};
const copyFindings = [];
for (const [key, phrase] of Object.entries(copy)) {
  if (typeof phrase !== "string") continue;
  for (const code of learnerLanguageFindings(phrase)) {
    copyFindings.push({ key, code, phrase });
  }
}
check(
  copyFindings.length === 0,
  `offline copy breaks learner-language rules: ${copyFindings.map((f) => `${f.key}/${f.code}`).join(", ")}`,
);
for (const key of ["offlineTitle", "offlineBody", "updateTitle", "updateAction", "mediaOffline", "pageHeading", "pageBody"]) {
  check(typeof copy[key] === "string" && copy[key].length > 0, `offline copy is missing ${key}`);
}

/* --- 7. registration ships ------------------------------------------------ */

const registersWorker = buildAssets.some((rel) => {
  if (!rel.endsWith(".js")) return false;
  return readFileSync(path.join(outDir, rel), "utf8").includes("sw.js");
});
check(
  registersWorker,
  "no built script references sw.js — the worker would never be registered",
);

/* --- report --------------------------------------------------------------- */

const report = {
  schemaVersion: 1,
  gate: failures.length === 0 ? "pass" : "fail",
  version: config.version,
  basePath: config.basePath,
  shellCache: config.shellCache,
  runtimeCache: config.runtimeCache,
  precacheCount: precache.length,
  precacheBytes,
  precachedNavigationRoutes: precachedHtmlRoutes,
  exportedFiles: exported.length,
  manifestStartUrl: manifest?.start_url ?? null,
  failures,
};

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      reportPath: path.relative(repoRoot, reportPath),
      gate: report.gate,
      version: report.version,
      precacheCount: report.precacheCount,
      precacheBytes: report.precacheBytes,
      precachedNavigationRoutes: report.precachedNavigationRoutes,
    },
    null,
    2,
  ),
);

if (failures.length > 0) {
  for (const failure of failures) console.error(`[offline] ${failure}`);
  process.exit(1);
}
