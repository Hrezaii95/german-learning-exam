/**
 * Temporary Lane 1 compatibility verification until Lane 3 updates the shared
 * canonical-route gate. The original smoke:web-routes gate remains unchanged;
 * its retired-index expectation is a separately reported integration blocker.
 *
 * Uses literal production HTTP status, Location and Response.url values.
 * Requires an existing production build; never builds or serves a Pages export.
 * By default starts next start from the candidate apps/web directory. Set
 * SMOKE_WEB_ROOT to select a candidate, SMOKE_PORT to select a local port, or
 * SMOKE_BASE_URL to use an already running production server (origin only).
 * Static profession stubs are checked as HTTP 200 HTML; their fragment/script
 * execution remains the separate Pages/browser compatibility check.
 */
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(process.env.SMOKE_WEB_ROOT ?? join(here, "..", "..", "..", "apps", "web"));
const require = createRequire(join(webRoot, "package.json"));
const projection = JSON.parse(readFileSync(join(webRoot, "generated", "learner-projection.json"), "utf8"));
const details = JSON.parse(readFileSync(join(webRoot, "generated", "learner-details.json"), "utf8"));

const PORT = process.env.SMOKE_PORT ? Number(process.env.SMOKE_PORT) : 4310;
const externalServer = process.env.SMOKE_BASE_URL;
const origin = new URL(externalServer ?? `http://127.0.0.1:${PORT}`);
if (!["http:", "https:"].includes(origin.protocol) || origin.pathname !== "/" || origin.search || origin.hash) {
  throw new Error("SMOKE_BASE_URL must be an HTTP(S) production-server origin.");
}
const BASE = origin.origin;

const TEACHER_DECK = "activity:lesson-02-teacher-professions-deck";
const sample = projection.activities[0];
if (!sample) {
  console.error("No learner activities in projection");
  process.exit(1);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function publicTypedIdSlug(id) {
  return `id-${[...id]
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")}`;
}

// Next normalizes production proxy URLs before user proxy code runs. Compare
// query semantics: every key plus its ordered values, including empty/duplicates.
function queryEntriesByKey(params) {
  return [...new Set(params.keys())].sort().map(key => [key, params.getAll(key)]);
}

async function fetchStatus(path, { redirect = "manual" } = {}) {
  const res = await fetch(`${BASE}${path}`, { redirect });
  const location = res.headers.get("location");
  return { status: res.status, location, url: res.url };
}

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/`, { redirect: "manual" });
      if (res.status > 0) return;
    } catch {
      // retry
    }
    await delay(250);
  }
  throw new Error(`Server did not become ready on ${BASE}`);
}

function assertStaticLessonAndActivityPaths() {
  const manifestPath = join(webRoot, ".next", "prerender-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const routes = manifest.routes ?? {};
  const routeKeys = Object.keys(routes);

  const lessonPaths = projection.lessons.map(
    (lesson) => `/lessons/${lesson.routeSegment}`,
  );
  assert(lessonPaths.length === 2, `expected 2 lessons, got ${lessonPaths.length}`);
  for (const path of lessonPaths) {
    assert(
      routeKeys.includes(path),
      `SSG missing lesson path ${path} in prerender-manifest`,
    );
    assert(
      routes[path]?.compute === "static" || routes[path]?.routeType === "page",
      `lesson path ${path} is not a static prerender entry`,
    );
  }

  const activityPaths = projection.activities.map((a) => a.canonicalPath);
  assert(
    activityPaths.length === 23,
    `expected 23 activities, got ${activityPaths.length}`,
  );
  for (const path of activityPaths) {
    assert(
      routeKeys.includes(path),
      `SSG missing activity path ${path} in prerender-manifest`,
    );
  }

  return {
    lessons: lessonPaths.length,
    activities: activityPaths.length,
  };
}

async function runSmoke() {
  const results = [];

  // 0) Build-time SSG: 2 lesson + 23 activity paths must be prerendered
  {
    const ssg = assertStaticLessonAndActivityPaths();
    results.push(
      `OK SSG prerender lessons=${ssg.lessons} activities=${ssg.activities}`,
    );
  }

  // 1) Canonical encoded → 200
  {
    const path = sample.canonicalPath;
    const { status } = await fetchStatus(path);
    assert(status === 200, `canonical expected 200, got ${status} for ${path}`);
    results.push(`OK canonical 200 ${path}`);
  }

  // 2) Raw-colon known alias → one redirect to canonical
  {
    const raw = `/lessons/${sample.lessonRouteSegment}/activity/${sample.id}`;
    const { status, location } = await fetchStatus(raw);
    assert(
      status === 308 || status === 301,
      `raw-colon expected permanent redirect, got ${status} for ${raw}`,
    );
    assert(location, `raw-colon missing Location for ${raw}`);
    const locPath = new URL(location, BASE).pathname;
    assert(
      locPath === sample.canonicalPath,
      `raw-colon Location ${locPath} !== ${sample.canonicalPath}`,
    );
    // Follow once — must be 200, not another redirect loop
    const followed = await fetchStatus(locPath);
    assert(followed.status === 200, `after redirect expected 200, got ${followed.status}`);
    results.push(`OK raw-colon ${status} → ${locPath} → 200`);
  }

  // 3) Wrong-lesson → 404 (no dashboard)
  {
    const otherLesson = sample.lessonRouteSegment === "01" ? "02" : "01";
    const wrong = `/lessons/${otherLesson}/activity/${publicTypedIdSlug(sample.id)}`;
    const { status, url } = await fetchStatus(wrong, { redirect: "follow" });
    assert(status === 404, `wrong-lesson expected 404, got ${status}`);
    assert(new URL(url).pathname !== "/", `wrong-lesson must not fall back to dashboard`);
    results.push(`OK wrong-lesson 404 ${wrong}`);
  }

  // 4) Unknown + review-only → 404
  {
    const unknown = `/lessons/01/activity/${publicTypedIdSlug("activity:missing-totally")}`;
    const teacher = `/lessons/02/activity/${publicTypedIdSlug(TEACHER_DECK)}`;
    for (const path of [unknown, teacher]) {
      const { status, url } = await fetchStatus(path, { redirect: "follow" });
      assert(status === 404, `${path} expected 404, got ${status}`);
      assert(new URL(url).pathname !== "/", `${path} must not fall back to dashboard`);
      results.push(`OK 404 ${path}`);
    }
  }

  // 5) Current canonical catalogues → 200; wrong / unknown details → 404;
  //    implemented representative details → 200; raw-colon → redirect
  {
    for (const path of [
      "/cheat-sheets/vocabulary",
      "/verbs",
      "/grammar",
      "/phrases",
      "/listening",
      "/cheat-sheets",
      "/cheat-sheets/subjects/people",
    ]) {
      const { status, url } = await fetchStatus(path, { redirect: "follow" });
      assert(status === 200, `${path} expected 200, got ${status}`);
      assert(new URL(url).pathname === path, `${path} must not redirect away`);
      results.push(`OK hub/directory 200 ${path}`);
    }

    const detailPaths = details.representatives.map((rep) => rep.canonicalPath);
    for (const path of detailPaths) {
      const { status, url } = await fetchStatus(path, { redirect: "follow" });
      assert(status === 200, `${path} expected 200, got ${status}`);
      assert(new URL(url).pathname === path, `${path} must not redirect away`);
      results.push(`OK detail 200 ${path}`);
    }

    for (const rep of details.representatives) {
      const legacy = `/${rep.hubSegment}/${encodeURIComponent(rep.id)}`;
      const lowerLegacy = legacy.replace(/%3A/g, "%3a");
      for (const alias of [legacy, lowerLegacy]) {
        const { status, location } = await fetchStatus(alias);
        assert(
          status === 308 || status === 301,
          `legacy detail expected permanent redirect, got ${status} for ${alias}`,
        );
        assert(location, `legacy detail missing Location for ${alias}`);
        const locPath = new URL(location, BASE).pathname;
        assert(
          locPath === rep.canonicalPath,
          `legacy detail Location ${locPath} !== ${rep.canonicalPath}`,
        );
        const followed = await fetchStatus(locPath);
        assert(followed.status === 200, `legacy detail follow expected 200`);
        results.push(`OK detail legacy ${status} ${alias} → ${locPath} → 200`);
      }
    }

    {
      const raw = "/vocabulary/lex:architekt";
      const { status, location } = await fetchStatus(raw);
      assert(
        status === 308 || status === 301,
        `raw-colon detail expected permanent redirect, got ${status}`,
      );
      assert(location, "raw-colon detail missing Location");
      const locPath = new URL(location, BASE).pathname;
      assert(
        locPath === details.representativesById["lex:architekt"].canonicalPath,
        `raw-colon detail Location ${locPath} unexpected`,
      );
      results.push(`OK detail raw-colon ${status} → ${locPath}`);
    }

    for (const path of [
      "/verbs/lex%3Aarchitekt",
      "/vocabulary/verb%3Asein",
      "/dashboard",
    ]) {
      const { status, url } = await fetchStatus(path, { redirect: "follow" });
      assert(status === 404, `${path} expected 404, got ${status}`);
      assert(new URL(url).pathname !== "/", `${path} must not fall back to /`);
      results.push(`OK detail/future 404 ${path}`);
    }
  }

  // 5b) Learner-state surfaces added in P4C are first-class routes.
  for (const path of ["/review", "/review/session/today", "/settings", "/saved"]) {
    const { status, url } = await fetchStatus(path, { redirect: "follow" });
    assert(status === 200, `${path} expected 200, got ${status}`);
    assert(new URL(url).pathname === path, `${path} must not redirect away`);
    results.push(`OK learner-state 200 ${path}`);
  }

  // 6) Global search → 200; unknown /search/* → 404
  {
    const { status, url } = await fetchStatus("/search", { redirect: "follow" });
    assert(status === 200, `/search expected 200, got ${status}`);
    assert(new URL(url).pathname === "/search", `/search must not redirect away`);
    results.push(`OK search 200 /search`);

    const extra = await fetchStatus("/search/extra", { redirect: "follow" });
    assert(extra.status === 404, `/search/extra expected 404, got ${extra.status}`);
    assert(new URL(extra.url).pathname !== "/", `/search/extra must not fall back to /`);
    results.push(`OK search 404 /search/extra`);
  }

  // 7) Practice selector + exact seven game routes → 200; unknown/malformed/extra → 404
  {
    const { status, url } = await fetchStatus("/practice", { redirect: "follow" });
    assert(status === 200, `/practice expected 200, got ${status}`);
    assert(new URL(url).pathname === "/practice", `/practice must not redirect away`);
    results.push(`OK practice 200 /practice`);

    for (const gameId of [
      "flashcards",
      "picture-word-match",
      "article-choice",
      "audio-match",
      "word-order",
      "verb-builder",
      "morphology-puzzle",
    ]) {
      const path = `/practice/${gameId}`;
      const res = await fetchStatus(path, { redirect: "follow" });
      assert(res.status === 200, `${path} expected 200, got ${res.status}`);
      assert(new URL(res.url).pathname === path, `${path} must not redirect away`);
      results.push(`OK practice game 200 ${path}`);
    }

    for (const path of [
      "/practice/unknown-game",
      "/practice/flashcards/extra",
      "/practice/%3Cscript%3E",
    ]) {
      const res = await fetchStatus(path, { redirect: "follow" });
      assert(res.status === 404, `${path} expected 404, got ${res.status}`);
      assert(new URL(res.url).pathname !== "/", `${path} must not fall back to /`);
      results.push(`OK practice 404 ${path}`);
    }
  }

  // 8) Conversation selector + exact encoded Q&A route → 200;
  //    raw-colon → redirect; unknown/wrong-kind/malformed/extra → 404
  {
    const { status, url } = await fetchStatus("/conversation", {
      redirect: "follow",
    });
    assert(status === 200, `/conversation expected 200, got ${status}`);
    assert(
      new URL(url).pathname === "/conversation",
      `/conversation must not redirect away`,
    );
    results.push(`OK conversation 200 /conversation`);

    const canonical = `/conversation/${publicTypedIdSlug("qa:profession-casual-main")}`;
    {
      const res = await fetchStatus(canonical, { redirect: "follow" });
      assert(res.status === 200, `${canonical} expected 200, got ${res.status}`);
      assert(
        new URL(res.url).pathname === canonical,
        `${canonical} must not redirect away`,
      );
      results.push(`OK conversation 200 ${canonical}`);
    }

    {
      const raw = "/conversation/qa:profession-casual-main";
      const { status: st, location } = await fetchStatus(raw);
      assert(
        st === 308 || st === 301,
        `raw-colon conversation expected permanent redirect, got ${st}`,
      );
      assert(location, "raw-colon conversation missing Location");
      const locPath = new URL(location, BASE).pathname;
      assert(
        locPath === canonical,
        `raw-colon conversation Location ${locPath} unexpected`,
      );
      results.push(`OK conversation raw-colon ${st} → ${locPath}`);
    }

    for (const path of [
      "/conversation/qa%3Aprofession-formal-main",
      "/conversation/lex%3Aarchitekt",
      "/conversation/unknown",
      "/conversation/qa%3Aprofession-casual-main/extra",
      "/conversation/%3Cscript%3E",
    ]) {
      const res = await fetchStatus(path, { redirect: "follow" });
      assert(res.status === 404, `${path} expected 404, got ${res.status}`);
      assert(new URL(res.url).pathname !== "/", `${path} must not fall back to /`);
      results.push(`OK conversation 404 ${path}`);
    }
  }

  // 9) Retired indexes are real one-hop proxy redirects, not logical aliases.
  const search = "?q=Arzt%20oder+Lehrer&source=&lesson=02&q=zweite%20Frage&tags=people%2Cfamily";
  for (const [alias, destination] of [
    ["/vocabulary", "/cheat-sheets/vocabulary"],
    ["/hubs", "/cheat-sheets"],
    ["/concepts", "/grammar"],
  ]) {
    const response = await fetchStatus(`${alias}${search}`);
    assert(response.status === 308, `${alias} expected actual proxy 308, got ${response.status}`);
    assert(response.location, `${alias} missing actual proxy Location`);
    assert(response.url === `${BASE}${alias}${search}`, `${alias} HTTP response URL changed unexpectedly: ${response.url}`);
    const location = new URL(response.location, BASE);
    assert(location.origin === origin.origin, `${alias} proxy escaped the production origin: ${response.location}`);
    assert(location.pathname === destination, `${alias} redirects to ${location.pathname} instead of ${destination}`);
    assert(
      JSON.stringify(queryEntriesByKey(location.searchParams)) === JSON.stringify(queryEntriesByKey(new URLSearchParams(search))),
      `${alias} proxy changed query keys, values, multiplicity or per-key value order`,
    );
    assert(!location.hash, `${alias} proxy Location unexpectedly contains a hash`);
    if (location.search !== search) {
      results.push(`OK framework query normalization ${alias}: requested=${search} Location=${location.search}; all keys and ordered values retained`);
    }
    const followed = await fetchStatus(`${location.pathname}${location.search}`);
    assert(followed.status === 200 && !followed.location, `${alias} must reach canonical 200 in exactly one redirect`);
    assert(followed.url === location.href, `${alias} did not reach its actual Location: ${followed.url}`);
    results.push(`OK actual HTTP ${response.status} ${response.url} Location=${response.location} → ${followed.status} ${followed.url}`);
  }

  // 10) The matcher excludes professions: all 49 compatibility pages are
  // direct HTTP 200 stubs. Inspect their real HTML without claiming that fetch
  // executed a client redirect or sent a fragment to the server.
  const wordCards = JSON.parse(readFileSync(join(webRoot, "generated", "word-cards.json"), "utf8"));
  const professionAliases = wordCards.cards.flatMap(card =>
    card.aliases.filter(alias => /^\/collections\/professions\/\d{2}$/.test(alias)).map(alias => [alias, card.path]),
  );
  assert(professionAliases.length === 48, `expected 48 profession row aliases, got ${professionAliases.length}`);
  assert(new Set(professionAliases.map(([path]) => path)).size === 48, "profession aliases must not repeat or omit a row");
  for (const [path, destination] of [["/collections/professions", "/cheat-sheets/subjects/people"], ...professionAliases]) {
    const response = await fetch(`${BASE}${path}${search}`, { redirect: "manual" });
    const location = response.headers.get("location");
    assert(response.status === 200 && !location, `${path} expected an actual HTTP 200 compatibility stub, got ${response.status} Location=${location}`);
    assert(response.url === `${BASE}${path}${search}`, `${path} stub must remain at its requested HTTP URL: ${response.url}`);
    const html = await response.text();
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    const expectedCanonical = `${destination}/${path === "/collections/professions" ? "?source=teacher-extra" : ""}`;
    assert(canonical === expectedCanonical, `${path} canonical HTML target ${canonical} !== ${expectedCanonical}`);
    assert(html.includes("window.location.search") && html.includes("window.location.hash") && html.includes("window.location.replace("), `${path} missing synchronous query/hash-preserving script`);
    assert(html.includes('<noscript><meta http-equiv="refresh"') && html.includes(`<a href="${destination}/`), `${path} missing no-script refresh or visible fallback`);
    results.push(`OK actual HTTP ${response.status} ${response.url}; static compatibility HTML canonical=${canonical}`);
  }

  return results;
}

const child = externalServer ? null : spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "start", "-p", String(PORT), "-H", "127.0.0.1"],
  {
    cwd: webRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: String(PORT) },
  },
);

let stderr = "";
child?.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});
child?.stdout.on("data", () => {});
child?.on("error", error => { stderr += `\n${error.message}`; });

let exitCode = 1;
try {
  await waitForServer();
  assert(!child || child.exitCode === null, `candidate next start exited before the checks: ${stderr}`);
  const lines = await runSmoke();
  assert(!child || child.exitCode === null, `candidate next start exited during the checks: ${stderr}`);
  for (const line of lines) console.log(line);
  console.log(`lane1-canonical-routes-smoke PASS (${lines.length} checks; actual production HTTP)`);
  exitCode = 0;
} catch (err) {
  console.error("lane1-canonical-routes-smoke FAIL");
  console.error(err instanceof Error ? err.message : err);
  if (stderr) console.error(stderr.slice(-2000));
  exitCode = 1;
} finally {
  if (child) {
    child.kill("SIGTERM");
    await delay(500);
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  }
}

process.exit(exitCode);
