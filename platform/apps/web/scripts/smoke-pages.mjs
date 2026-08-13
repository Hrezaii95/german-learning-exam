/**
 * Deterministic static-export verification for GitHub Pages out/.
 *
 * - Exact expected route/file manifest (lessons, activities, hubs, search,
 *   details, games, conversation)
 * - Asset refs include /german-learning-exam base path; no bare /_next breaks
 * - Serve out/ under /german-learning-exam/ and HTTP-smoke routes/assets/404
 * - Recursive scan for secrets, developer paths, review plurals, private/media,
 *   .mp3, source/assertion metadata
 *
 * Expects `npm run build:pages` already produced `out/`.
 */
import {
  createReadStream,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");
const outDir = join(webRoot, "out");
const require = createRequire(import.meta.url);

const PAGES_BASE = "/german-learning-exam";
const PORT = process.env.SMOKE_PAGES_PORT
  ? Number(process.env.SMOKE_PAGES_PORT)
  : 4330;
const BASE = `http://127.0.0.1:${PORT}`;

const projection = require("../generated/learner-projection.json");
const details = require("../generated/learner-details.json");

const HUB_PATHS = [
  "/vocabulary",
  "/verbs",
  "/grammar",
  "/phrases",
  "/listening",
  "/concepts",
  "/hubs",
];

const PRACTICE_GAMES = [
  "flashcards",
  "picture-word-match",
  "article-choice",
  "audio-match",
  "word-order",
  "verb-builder",
  "morphology-puzzle",
];

const FORBIDDEN_SUBSTRINGS = [
  "SourceAssertion",
  "sourceAssertion",
  "assertionValue",
  "assertionValues",
  "redistributionBasis",
  "originalPath",
  "privatePath",
  "absolutePath",
  "audioUrl",
  "mp3Path",
  "api_key",
  "apiKey",
  "BEGIN RSA PRIVATE",
  "BEGIN OPENSSH PRIVATE",
  "sk-proj-",
  "sk-ant-",
  "ghp_",
  "github_pat_",
  ".cursor/hooks",
  "resources/original",
  "candidate-media",
  "review-plurals",
  "ReviewPlural",
];

const FORBIDDEN_PATH_FRAGMENTS = [
  `${sep}Users${sep}`,
  `${sep}home${sep}`,
  "E:\\\\claude-cursor",
  "E:/claude-cursor",
  "/Users/",
  "C:\\\\Users\\\\",
];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Require base-prefixed hydration assets; reject bare root /_next. */
export function assertBasePrefixedNextAssets(html, label, pagesBase = PAGES_BASE) {
  assert(
    html.includes(`${pagesBase}/_next/`),
    `${label} missing base-prefixed _next hydration assets`,
  );
  assert(
    !html.includes('src="/_next/') &&
      !html.includes('href="/_next/') &&
      !html.includes("\"/_next/"),
    `${label} must not use bare root /_next`,
  );
}

function appPathToOutFile(appPath) {
  // trailingSlash export → …/index.html
  const trimmed =
    appPath === "/" ? "" : appPath.replace(/^\//, "").replace(/\/$/, "");
  return trimmed ? join(outDir, trimmed, "index.html") : join(outDir, "index.html");
}

function listExpectedAppPaths() {
  const paths = new Set([
    "/",
    "/lessons",
    "/search",
    "/practice",
    "/conversation",
    ...HUB_PATHS,
  ]);

  assert(projection.lessons?.length === 2, "expected 2 lessons");
  for (const lesson of projection.lessons) {
    paths.add(`/lessons/${lesson.routeSegment}`);
  }

  assert(projection.activities?.length === 23, "expected 23 activities");
  for (const activity of projection.activities) {
    paths.add(activity.canonicalPath);
  }

  assert(
    details.representatives?.length === 3,
    `expected 3 detail representatives, got ${details.representatives?.length}`,
  );
  for (const rep of details.representatives) {
    paths.add(rep.canonicalPath);
  }

  for (const gameId of PRACTICE_GAMES) {
    paths.add(`/practice/${gameId}`);
  }

  const conversationEntity = encodeURIComponent("qa:profession-casual-main");
  paths.add(`/conversation/${conversationEntity}`);

  return [...paths].sort();
}

function verifyManifest() {
  assert(existsSync(join(outDir, ".nojekyll")), "missing out/.nojekyll");
  assert(existsSync(join(outDir, "404.html")), "missing out/404.html");

  const expected = listExpectedAppPaths();
  const missing = [];
  for (const appPath of expected) {
    const file = appPathToOutFile(appPath);
    if (!existsSync(file)) missing.push(`${appPath} → ${relative(webRoot, file)}`);
  }
  assert(
    missing.length === 0,
    `missing static files (${missing.length}):\n${missing.slice(0, 20).join("\n")}`,
  );

  // Spot-check counts
  const lessons = projection.lessons.length;
  const activities = projection.activities.length;
  const detailCount = details.representatives.length;
  console.log(
    `[smoke:pages] Manifest OK: ${expected.length} routes (lessons=${lessons}, activities=${activities}, details=${detailCount}, games=${PRACTICE_GAMES.length})`,
  );
  return expected;
}

function walkFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

function verifyAssetRefsAndSecrets(expectedPaths) {
  const sampleHtml = expectedPaths.slice(0, 12).map(appPathToOutFile);
  sampleHtml.push(join(outDir, "404.html"));
  // Always include a game + search + hub
  sampleHtml.push(appPathToOutFile("/search"));
  sampleHtml.push(appPathToOutFile("/vocabulary"));
  sampleHtml.push(appPathToOutFile("/practice/article-choice"));

  for (const file of sampleHtml) {
    if (!existsSync(file)) continue;
    const html = readFileSync(file, "utf8");
    assert(
      html.includes(`${PAGES_BASE}/_next/`) || html.includes(`"${PAGES_BASE}/`),
      `expected base path asset/nav refs in ${relative(webRoot, file)}`,
    );
    assert(
      !html.includes('src="/_next/') && !html.includes("href=\"/_next/"),
      `bare /_next URL in ${relative(webRoot, file)}`,
    );
  }

  const allFiles = walkFiles(outDir);
  for (const file of allFiles) {
    const rel = relative(webRoot, file).replace(/\\/g, "/");
    assert(!rel.includes("resources/original"), `forbidden path in out: ${rel}`);
    assert(!rel.includes(".cursor/"), `forbidden .cursor path in out: ${rel}`);
    assert(!rel.includes("samples/"), `forbidden samples path in out: ${rel}`);
    assert(!/\.mp3$/i.test(rel), `mp3 artifact in out: ${rel}`);

    const ext = extname(file).toLowerCase();
    if (![".html", ".js", ".css", ".json", ".txt", ".map"].includes(ext)) {
      continue;
    }
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const frag of FORBIDDEN_SUBSTRINGS) {
      assert(
        !text.includes(frag),
        `forbidden substring "${frag}" in ${rel}`,
      );
    }
    for (const frag of FORBIDDEN_PATH_FRAGMENTS) {
      assert(!text.includes(frag), `developer path fragment in ${rel}`);
    }
  }
  console.log(`[smoke:pages] Scanned ${allFiles.length} out files for leaks`);
}

function contentType(filePath) {
  switch (extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".ico":
      return "image/x-icon";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
}

function resolveOutPath(urlPathname) {
  let pathname = urlPathname.split("?")[0];
  if (!pathname.startsWith(PAGES_BASE)) {
    return { kind: "miss" };
  }
  let rest = pathname.slice(PAGES_BASE.length) || "/";
  if (!rest.startsWith("/")) rest = `/${rest}`;

  // Prevent traversal
  const candidate = normalize(join(outDir, rest.replace(/^\//, "")));
  const rootNorm = normalize(outDir + sep);
  if (!candidate.startsWith(rootNorm) && candidate !== normalize(outDir)) {
    return { kind: "miss" };
  }

  if (existsSync(candidate) && statSync(candidate).isFile()) {
    return { kind: "file", file: candidate };
  }
  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    const index = join(candidate, "index.html");
    if (existsSync(index)) return { kind: "file", file: index };
  }
  // try as …/index.html when path has no trailing file
  if (!extname(candidate)) {
    const index = join(candidate, "index.html");
    if (existsSync(index)) return { kind: "file", file: index };
    const html = `${candidate}.html`;
    if (existsSync(html)) return { kind: "file", file: html };
  }
  return { kind: "miss" };
}

function startStaticServer() {
  const server = createServer((req, res) => {
    const host = req.headers.host ?? `127.0.0.1:${PORT}`;
    const url = new URL(req.url ?? "/", `http://${host}`);
    const resolved = resolveOutPath(url.pathname);
    if (resolved.kind === "file") {
      res.writeHead(200, { "Content-Type": contentType(resolved.file) });
      createReadStream(resolved.file).pipe(res);
      return;
    }
    const notFound = join(outDir, "404.html");
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    createReadStream(notFound).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

async function fetchStatus(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  const text = await res.text();
  return { status: res.status, text, url: res.url };
}

async function httpSmoke(expectedPaths) {
  const server = await startStaticServer();
  try {
    await delay(100);

    const encodedActivity = projection.activities.find((a) =>
      String(a.canonicalPath).includes("%3A"),
    );
    assert(encodedActivity, "expected an encoded activity canonicalPath");

    const must200 = [
      `${PAGES_BASE}/`,
      `${PAGES_BASE}/lessons/`,
      `${PAGES_BASE}/lessons/${projection.lessons[0].routeSegment}/`,
      `${PAGES_BASE}${projection.activities[0].canonicalPath}/`,
      `${PAGES_BASE}${encodedActivity.canonicalPath}/`,
      `${PAGES_BASE}/concepts/`,
      `${PAGES_BASE}/vocabulary/`,
      `${PAGES_BASE}/search/`,
      `${PAGES_BASE}/search/?q=sein`,
      `${PAGES_BASE}/vocabulary/?q=sein&lesson=01`,
      `${PAGES_BASE}/practice/`,
      `${PAGES_BASE}/practice/article-choice/`,
      `${PAGES_BASE}/conversation/`,
      `${PAGES_BASE}/conversation/${encodeURIComponent("qa:profession-casual-main")}/`,
      `${PAGES_BASE}${details.representatives[0].canonicalPath}/`,
    ];

    for (const path of must200) {
      const { status, text } = await fetchStatus(path);
      assert(status === 200, `${path} expected 200 got ${status}`);
      assert(text.length > 100, `${path} empty body`);
      assertBasePrefixedNextAssets(text, path);
    }

    // Asset from index
    const index = await fetchStatus(`${PAGES_BASE}/`);
    const assetMatch = index.text.match(
      new RegExp(`${PAGES_BASE}/_next/static/[^"']+\\.(?:js|css)`),
    );
    assert(assetMatch, "no base-pathed _next static asset in index");
    const asset = await fetchStatus(assetMatch[0]);
    assert(asset.status === 200, `asset ${assetMatch[0]} expected 200`);

    // 404
    const missing = await fetchStatus(`${PAGES_BASE}/no-such-alpha-route/`);
    assert(missing.status === 404, `404 path expected 404 got ${missing.status}`);
    assert(
      /not found|Page not found/i.test(missing.text),
      "404 body not honest",
    );
    assert(
      !/Ich heiße Miriam|dashboard fallback/i.test(missing.text) ||
        /Back to dashboard/i.test(missing.text),
      "404 must stay honest (link home ok)",
    );

    // Game hydration markers
    const game = await fetchStatus(`${PAGES_BASE}/practice/article-choice/`);
    assert(game.status === 200, "game page 200");
    assert(
      /article-choice|data-game|Practice|Article/i.test(game.text),
      "game page missing interactive markers",
    );
    assertBasePrefixedNextAssets(game.text, "game page");

    // Unknown must not expose activity bodies from other routes
    assert(
      !missing.text.includes(projection.activities[0].promptPlainText ?? "___none___"),
      "404 leaked activity prompt",
    );

    console.log(
      `[smoke:pages] HTTP OK on ${must200.length} routes + asset + 404 + game markers`,
    );
    // Touch expected path count for report honesty
    assert(expectedPaths.length >= 40, "expected path list too small");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function main() {
  assert(existsSync(outDir), `out/ missing — run npm run build:pages first`);
  const expected = verifyManifest();
  verifyAssetRefsAndSecrets(expected);
  await httpSmoke(expected);
  console.log("[smoke:pages] ALL CHECKS PASS");
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return normalize(fileURLToPath(import.meta.url)) === normalize(entry);
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  main().catch((err) => {
    console.error("[smoke:pages] FAILED", err);
    process.exit(1);
  });
}
