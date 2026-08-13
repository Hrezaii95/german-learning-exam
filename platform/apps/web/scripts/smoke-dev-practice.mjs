/**
 * Bounded default-dev smoke for practice routes.
 *
 * Starts the same resolver stack as package.json `dev` (`next dev --webpack`)
 * on a controlled port after `npm run project`, asserts HTTP + content for:
 *   - /practice
 *   - one enabled game (/practice/article-choice)
 *   - audio unavailable (/practice/audio-match)
 * then terminates only this smoke's process tree (no zombies).
 *
 * Does not replace production smoke:web-routes.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");
const require = createRequire(import.meta.url);

const PORT = process.env.SMOKE_DEV_PORT
  ? Number(process.env.SMOKE_DEV_PORT)
  : 4321;
const BASE = `http://127.0.0.1:${PORT}`;
const READY_TIMEOUT_MS = Number(process.env.SMOKE_DEV_READY_MS ?? 180_000);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function publicTypedIdSlug(id) {
  return `id-${[...id]
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("")}`;
}

async function fetchText(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: "follow" });
  const text = await res.text();
  return { status: res.status, text, url: res.url };
}

async function waitForServer(timeoutMs = READY_TIMEOUT_MS) {
  const start = Date.now();
  let lastErr = "";
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/`, { redirect: "manual" });
      if (res.status > 0) return;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
    }
    await delay(500);
  }
  throw new Error(
    `Dev server did not become ready on ${BASE} within ${timeoutMs}ms${
      lastErr ? ` (${lastErr})` : ""
    }`,
  );
}

function terminateTree(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    try {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } catch {
      try {
        child.kill();
      } catch {
        // already gone
      }
    }
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {
      // already gone
    }
  }
}

async function projectContent() {
  const tsxCli = require.resolve("tsx/cli");
  await new Promise((resolve, reject) => {
    const proj = spawn(
      process.execPath,
      [tsxCli, join(here, "project-content.ts")],
      {
        cwd: webRoot,
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
      },
    );
    let err = "";
    proj.stderr.on("data", (c) => {
      err += c.toString();
    });
    proj.on("error", reject);
    proj.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`project-content failed (${code}): ${err.slice(-1500)}`),
        );
    });
  });
}

async function runChecks() {
  const results = [];

  {
    const { status, text, url } = await fetchText("/practice");
    assert(status === 200, `/practice expected 200, got ${status}`);
    assert(new URL(url).pathname === "/practice", `/practice redirected away`);
    assert(
      text.includes("Seven game modes") || text.includes("Practice"),
      "/practice missing practice selector content",
    );
    assert(text.includes("/practice/flashcards"), "/practice missing flashcards link");
    assert(text.includes("audio-match"), "/practice missing audio-match entry");
    results.push("OK dev /practice 200 + selector content");
  }

  {
    const path = "/practice/article-choice";
    const { status, text, url } = await fetchText(path);
    assert(status === 200, `${path} expected 200, got ${status}`);
    assert(new URL(url).pathname === path, `${path} redirected away`);
    assert(text.includes("Article choice"), `${path} missing game heading`);
    assert(text.includes("Submit"), `${path} missing Submit control`);
    assert(!text.includes("Architekten"), `${path} leaked unpublished plural`);
    results.push(`OK dev ${path} 200 + enabled game content`);
  }

  {
    const path = "/practice/audio-match";
    const { status, text, url } = await fetchText(path);
    assert(status === 200, `${path} expected 200, got ${status}`);
    assert(new URL(url).pathname === path, `${path} redirected away`);
    assert(
      text.includes("listening-approved") || text.includes("unavailable"),
      `${path} missing unavailable honesty copy`,
    );
    assert(
      text.includes('data-availability="unavailable"') ||
        text.includes("data-feedback=\"unavailable\""),
      `${path} missing unavailable markers`,
    );
    assert(!text.includes(".mp3"), `${path} leaked media path`);
    results.push(`OK dev ${path} 200 + unavailable content`);
  }

  {
    const path = `/conversation/${publicTypedIdSlug("qa:profession-casual-main")}`;
    const { status, text, url } = await fetchText(path);
    assert(status === 200, `${path} expected 200, got ${status}`);
    assert(
      new URL(url).pathname === path ||
        new URL(url).pathname.includes("conversation"),
      `${path} redirected away unexpectedly`,
    );
    assert(
      text.includes("Five-level") || text.includes("Conversation"),
      `${path} missing conversation ladder content`,
    );
    assert(text.includes("Was bist du von Beruf?"), `${path} missing published question`);
    assert(
      !text.includes("correct pronunciation") &&
        !text.includes("pronunciationScore"),
      `${path} must not claim scored pronunciation`,
    );
    results.push(`OK dev ${path} 200 + conversation content`);
  }

  return results;
}

await projectContent();

const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(
  process.execPath,
  [nextBin, "dev", "--webpack", "-p", String(PORT), "-H", "127.0.0.1"],
  {
    cwd: webRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: String(PORT) },
    // Detached process group on POSIX so we can kill the whole tree by -pid.
    detached: process.platform !== "win32",
  },
);

let stderr = "";
let stdout = "";
child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});
child.stdout.on("data", (chunk) => {
  stdout += chunk.toString();
});

let exitCode = 1;
try {
  await waitForServer();
  const lines = await runChecks();
  for (const line of lines) console.log(line);
  console.log(`smoke:dev PASS (${lines.length} checks)`);
  exitCode = 0;
} catch (err) {
  console.error("smoke:dev FAIL");
  console.error(err instanceof Error ? err.message : err);
  const tail = `${stdout}\n${stderr}`.slice(-3000);
  if (tail.trim()) console.error(tail);
  exitCode = 1;
} finally {
  terminateTree(child);
  await delay(800);
  if (child.exitCode == null && !child.killed) {
    try {
      child.kill("SIGKILL");
    } catch {
      // ignore
    }
  }
}

process.exit(exitCode);
