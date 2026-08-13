/**
 * Production HTTP smoke for canonical activity routes.
 * Expects a built app (`npm run build`) and starts `next start` locally.
 *
 * Proves:
 * - canonical encoded activity path → 200
 * - raw-colon known alias → one 308 to canonical (or documents unsafe 404)
 * - wrong-lesson / unknown / review-only / future hub → 404
 * - no dashboard fallback on those failures
 * - prerender manifest contains 2 lesson + 23 activity SSG paths
 */
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");
const require = createRequire(import.meta.url);
const projection = require("../generated/learner-projection.json");
const details = require("../generated/learner-details.json");

const PORT = process.env.SMOKE_PORT ? Number(process.env.SMOKE_PORT) : 4310;
const BASE = `http://127.0.0.1:${PORT}`;

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

  // 5) Canonical hubs → 200; unimplemented / wrong / unknown details → 404;
  //    implemented representative details → 200; raw-colon → redirect
  {
    for (const path of [
      "/vocabulary",
      "/verbs",
      "/grammar",
      "/phrases",
      "/listening",
      "/concepts",
      "/hubs",
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
      "/vocabulary/lex:ingenieur",
      "/vocabulary/lex%3Aarchitektin",
      "/verbs/lex%3Aarchitekt",
      "/vocabulary/verb%3Asein",
      "/phrases/qa%3Aprofession-formal-main",
      "/dashboard",
    ]) {
      const { status, url } = await fetchStatus(path, { redirect: "follow" });
      assert(status === 404, `${path} expected 404, got ${status}`);
      assert(new URL(url).pathname !== "/", `${path} must not fall back to /`);
      results.push(`OK detail/future 404 ${path}`);
    }
  }

  // 5b) Learner-state surfaces added in P4C are first-class routes.
  for (const path of ["/review", "/review/session/today", "/settings"]) {
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

  return results;
}

const child = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "start", "-p", String(PORT), "-H", "127.0.0.1"],
  {
    cwd: webRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: String(PORT) },
  },
);

let stderr = "";
child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});
child.stdout.on("data", () => {});

let exitCode = 1;
try {
  await waitForServer();
  const lines = await runSmoke();
  for (const line of lines) console.log(line);
  console.log(`smoke:web-routes PASS (${lines.length} checks)`);
  exitCode = 0;
} catch (err) {
  console.error("smoke:web-routes FAIL");
  console.error(err instanceof Error ? err.message : err);
  if (stderr) console.error(stderr.slice(-2000));
  exitCode = 1;
} finally {
  child.kill("SIGTERM");
  await delay(500);
  if (!child.killed) child.kill("SIGKILL");
}

process.exit(exitCode);
