/**
 * Production HTTP smoke for canonical activity routes.
 * Expects a built app (`npm run build`) and starts `next start` locally.
 *
 * Proves:
 * - canonical encoded activity path → 200
 * - raw-colon known alias → one 308 to canonical (or documents unsafe 404)
 * - wrong-lesson / unknown / review-only / future hub → 404
 * - no dashboard fallback on those failures
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");
const require = createRequire(import.meta.url);
const projection = require("../generated/learner-projection.json");

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

async function runSmoke() {
  const results = [];

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
    const wrong = `/lessons/${otherLesson}/activity/${encodeURIComponent(sample.id)}`;
    const { status, url } = await fetchStatus(wrong, { redirect: "follow" });
    assert(status === 404, `wrong-lesson expected 404, got ${status}`);
    assert(new URL(url).pathname !== "/", `wrong-lesson must not fall back to dashboard`);
    results.push(`OK wrong-lesson 404 ${wrong}`);
  }

  // 4) Unknown + review-only → 404
  {
    const unknown = `/lessons/01/activity/${encodeURIComponent("activity:missing-totally")}`;
    const teacher = `/lessons/02/activity/${encodeURIComponent(TEACHER_DECK)}`;
    for (const path of [unknown, teacher]) {
      const { status, url } = await fetchStatus(path, { redirect: "follow" });
      assert(status === 404, `${path} expected 404, got ${status}`);
      assert(new URL(url).pathname !== "/", `${path} must not fall back to dashboard`);
      results.push(`OK 404 ${path}`);
    }
  }

  // 5) Canonical hubs → 200; unimplemented detail + future Review → 404
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
    for (const path of [
      "/vocabulary/lex:ingenieur",
      "/review",
      "/dashboard",
    ]) {
      const { status, url } = await fetchStatus(path, { redirect: "follow" });
      assert(status === 404, `${path} expected 404, got ${status}`);
      assert(new URL(url).pathname !== "/", `${path} must not fall back to /`);
      results.push(`OK detail/future 404 ${path}`);
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
