/** Verify the root export and real local Workers Static Assets routing. No credentials. */
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { developerPathFragment } from "../../web/scripts/export-path-leaks.mjs";
import { deriveOfflineVersion, precacheGroupFor } from "../../web/scripts/offline-export.js";
import { htmlRouteUrl, type OfflineServiceWorkerConfig } from "../../web/lib/offline/policy.js";
import { API_CONTENT_SECURITY_POLICY, SECURITY_HEADERS } from "../src/security.js";

const edgeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(edgeRoot, "../web/out");
const repoRoot = resolve(edgeRoot, "../../..");
const require = createRequire(import.meta.url);
const forbidden = [
  "SourceAssertion", "sourceAssertion", "assertionValue", "assertionValues",
  "redistributionBasis", "originalPath", "privatePath", "absolutePath", "audioUrl", "mp3Path",
  "BEGIN RSA PRIVATE", "BEGIN OPENSSH PRIVATE", "sk-proj-", "sk-ant-", "ghp_", "github_pat_",
  ".cursor/hooks", "resources/original", "candidate-media", "review-plurals", "ReviewPlural",
];
const origin = "http://root-export.invalid";
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [relative(outDir, full).split(sep).join("/")];
  }).sort();
}

function fileForUrl(input: string): string {
  const url = new URL(input, origin);
  assert.equal(url.origin, origin, "Expected a same-origin export URL");
  const pathname = decodeURIComponent(url.pathname);
  assert(!pathname.includes("/german-learning-exam"), `Pages prefix in root URL: ${pathname}`);
  const candidate = resolve(outDir, `.${pathname}`);
  assert(candidate.startsWith(`${outDir}${sep}`) || candidate === outDir, "Export path escapes out/");
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  const index = join(candidate, "index.html");
  if (existsSync(index)) return index;
  const html = `${candidate}.html`;
  assert(existsSync(html), `Missing local export reference: ${pathname}`);
  return html;
}

function approvedRecordings(): Map<string, string> {
  const result = new Map<string, string>();
  const manifests: Array<[string, RegExp | null]> = [
    ["published-tts-exact-v1.json", null],
    ["word-cards-public-audio-v1.json", /^audio\/word-cards-v1\/(?:word|tts)-[a-f0-9]{16}\.mp3$/],
    ["interactive-book-public-audio-v1.json", /^book\/(?:(?:audio|speech)\/[a-z0-9-]+|transcript-speech\/[a-f0-9]{20})\.mp3$/],
    ["collection-sheet-public-audio-v1.json", /^audio\/collection-sheet\/[a-f0-9]{20}\.mp3$/],
    ["home-sheet-public-audio-v1.json", /^audio\/home-sheet\/[a-f0-9]{20}\.mp3$/],
    ["country-sheet-public-audio-v1.json", /^audio\/country-sheet\/[a-f0-9]{20}\.mp3$/],
  ];
  type Recording = { publicRelativePath: string; sha256: string };
  function add(assets: Recording[], pattern: RegExp | null): void {
    for (const asset of assets) {
      assert(!pattern || pattern.test(asset.publicRelativePath), "Invalid approved recording path");
      const previous = result.get(asset.publicRelativePath);
      assert(!previous || previous === asset.sha256, "Conflicting approved recording checksums");
      result.set(asset.publicRelativePath, asset.sha256);
    }
  }
  const manifestRoot = join(repoRoot, "media/manifests");
  const publisher = JSON.parse(readFileSync(join(manifestRoot, "workbook-audio-rights-projections.json"), "utf8"));
  add(publisher.projections.publicDeployable.assets, null);
  for (const [name, pattern] of manifests) add(JSON.parse(readFileSync(join(manifestRoot, name), "utf8")).assets, pattern);
  return result;
}

function inspectExport(files: string[]): { routes: string[]; assets: Set<string>; brokenReferences: string[] } {
  assert(files.length <= 100_000, `Cloudflare asset count exceeds 100,000: ${files.length}`);
  if (files.length > 20_000) console.log(`[smoke:cloudflare] ${files.length} assets require Workers Paid`);
  const approved = approvedRecordings();
  const foundAudio = new Set<string>();
  const routes: string[] = [];
  const assets = new Set<string>(["/sw.js", "/manifest.webmanifest"]);
  const brokenReferences: string[] = [];
  let hasRegistration = false;
  for (const rel of files) {
    const file = join(outDir, rel);
    assert(statSync(file).size <= 25 * 1024 * 1024, `Cloudflare asset exceeds 25 MiB: ${rel}`);
    assert(!/[:]|%3a/i.test(rel), `Unsafe output filename: ${rel}`);
    assert(!["resources/original", ".cursor/", "samples/"].some((part) => rel.includes(part)), `Private output path: ${rel}`);
    const extension = extname(rel).toLowerCase();
    if (extension === ".mp3") {
      assert.equal(digest(readFileSync(file)), approved.get(rel), `Unapproved or changed recording: ${rel}`);
      foundAudio.add(rel);
    }
    if (![".html", ".js", ".css", ".json", ".txt", ".map", ".webmanifest"].includes(extension)) continue;
    const text = readFileSync(file, "utf8");
    for (const fragment of forbidden) assert(!text.includes(fragment), `Forbidden ${fragment} in ${rel}`);
    assert(!developerPathFragment(text), `Developer path in ${rel}`);
    if (rel.startsWith("_next/") && extension === ".js" && text.includes("/sw.js")) hasRegistration = true;
    if (extension !== ".html") continue;
    const route = htmlRouteUrl(rel, "");
    assert(text.includes("/_next/"), `Missing root hydration assets in ${rel}`);
    if (rel !== "404.html" && !/^_not-found(?:\/|\.html$)/.test(rel)) routes.push(route);
    for (const match of text.matchAll(/\b(?:src|href)\s*=\s*["']([^"']*)["']/g)) {
      const ref = match[1]!.replaceAll("&amp;", "&");
      if (!ref || ref.startsWith("#") || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(ref)) continue;
      const url = new URL(ref, `${origin}${route}`);
      if (url.origin !== origin) continue;
      try {
        const resolvedFile = fileForUrl(url.href);
        if (!resolvedFile.endsWith(".html")) assets.add(url.pathname);
      } catch (error) {
        // Gather all defects, then exercise the real Worker before failing the
        // gate. This reports inherited navigation defects without hiding the
        // platform's own routing/security results or exempting broken links.
        brokenReferences.push(`${rel}: ${url.pathname} (${(error as Error).message})`);
      }
    }
  }
  assert.equal(foundAudio.size, approved.size, "Approved audio set differs from export");
  assert(hasRegistration, "Service-worker registration is absent from client bundles");
  assert(routes.includes("/") && routes.includes("/lessons/"), "Core root routes missing");
  return { routes, assets, brokenReferences };
}

function inspectOffline(files: string[]): void {
  const worker = readFileSync(join(outDir, "sw.js"), "utf8");
  const match = worker.match(/\/\* @gl-offline-config:start \*\/\s*const CONFIG = ([\s\S]*?);\s*\/\* @gl-offline-config:end \*\//);
  assert(match, "Service worker is not stamped");
  const config = JSON.parse(match[1]!) as OfflineServiceWorkerConfig;
  assert.equal(config.basePath, "");
  assert.equal(config.scope, "/");
  assert.equal(config.homeUrl, "/");
  assert(config.version && config.version !== "unstamped", "Service worker is unstamped");
  assert.equal(config.shellCache, `german-learning-os-shell-v${config.version}`);
  assert.equal(config.runtimeCache, `german-learning-os-runtime-v${config.version}`);
  assert.equal(config.cachePrefix, "german-learning-os-");
  assert(Array.isArray(config.precache) && config.precache.length > 0, "Precache is empty");
  const urls = new Set(config.precache);
  assert.equal(urls.size, config.precache.length, "Precache contains duplicate URLs");
  const hashed = config.precache.map((url) => {
    assert(url.startsWith("/") && !url.startsWith("//"), "Precache URL must be root-relative");
    return { url, sha256: digest(readFileSync(fileForUrl(url))) };
  });
  assert.equal(config.version, deriveOfflineVersion(hashed), "Offline version does not match exported bytes");
  for (const rel of files) if (precacheGroupFor(rel)) {
    const url = rel.endsWith(".html") ? htmlRouteUrl(rel, "") : `/${rel}`;
    assert(urls.has(url), `Precache missing shell asset: ${rel}`);
  }
  const manifest = JSON.parse(readFileSync(join(outDir, "manifest.webmanifest"), "utf8"));
  for (const key of ["id", "scope", "start_url"]) assert.equal(manifest[key], "/", `Manifest ${key}`);
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 4, "Manifest icons missing");
  for (const icon of manifest.icons) fileForUrl(icon.src);
  console.log(`[smoke:cloudflare] Offline scope /; ${urls.size} verified precache URLs`);
}

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolvePort, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolvePort); });
  const address = server.address();
  assert(address && typeof address !== "string");
  await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
  return address.port;
}

function assertHeaders(response: Response, pathname: string): void {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    assert.equal(response.headers.get(name), name === "Content-Security-Policy" && pathname.startsWith("/api") ? API_CONTENT_SECURITY_POLICY : value, `${pathname}: ${name}`);
  }
}

async function smokeHttp(routes: string[], assets: Set<string>): Promise<void> {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const stateDir = mkdtempSync(join(tmpdir(), "gl-cloudflare-smoke-"));
  let output = "";
  let child: ChildProcess | undefined;
  let closed = false;
  let stopping: Promise<void> | undefined;
  async function stop(): Promise<void> {
    if (stopping) return stopping;
    stopping = (async () => {
      if (child?.pid) {
        const pid = child.pid;
        const kill = (signal: NodeJS.Signals) => {
          try { if (process.platform !== "win32") process.kill(-pid, signal); else child!.kill(signal); } catch { /* Already exited. */ }
        };
        const alive = () => {
          if (process.platform === "win32") return !closed;
          try { process.kill(-pid, 0); return true; } catch { return false; }
        };
        // Kill the whole group even if Wrangler itself exited before workerd.
        kill("SIGTERM");
        for (let attempt = 0; attempt < 30 && alive(); attempt++) await delay(100);
        if (alive()) { kill("SIGKILL"); for (let attempt = 0; attempt < 20 && alive(); attempt++) await delay(100); }
      }
      rmSync(stateDir, { recursive: true, force: true });
    })();
    return stopping;
  }
  const onSignal = () => { void stop().finally(() => process.exit(130)); };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  try {
    const cli = join(dirname(require.resolve("wrangler/package.json")), "bin/wrangler.js");
    child = spawn(process.execPath, [cli, "dev", "--local", "--ip", "127.0.0.1", "--port", String(port), "--inspector-port", "0", "--persist-to", stateDir], {
      cwd: edgeRoot, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CLOUDFLARE_API_TOKEN: "", CLOUDFLARE_ACCOUNT_ID: "", WRANGLER_SEND_METRICS: "false", CI: "true" },
    });
    child.on("close", () => { closed = true; });
    child.on("error", (error) => { output += error.message; closed = true; });
    for (const stream of [child.stdout, child.stderr]) stream?.on("data", (chunk: Buffer) => { output = (output + chunk.toString()).slice(-12_000); });
    let ready = false;
    for (let attempt = 0; attempt < 120 && !closed; attempt++) {
      try { const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1000) }); ready = response.status === 200; await response.body?.cancel(); } catch { /* Local worker is starting. */ }
      if (ready) break;
      await delay(250);
    }
    assert(ready, `Local Wrangler did not start:\n${output}`);
    async function request(pathname: string, expected: number): Promise<Response> {
      const response = await fetch(`${base}${pathname}`, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
      assert.equal(response.status, expected, `${pathname}: HTTP status`);
      assertHeaders(response, pathname);
      return response;
    }
    // A bounded pool checks every page without overwhelming local workerd.
    const pending = [...routes];
    await Promise.all(Array.from({ length: 8 }, async () => {
      let route: string | undefined;
      while ((route = pending.pop()) !== undefined) {
        const response = await request(route, 200);
        assert.match(response.headers.get("content-type") ?? "", /text\/html/);
        assert((await response.text()).includes("/_next/"), `${route}: hydration assets missing over HTTP`);
      }
    }));
    for (const asset of assets) {
      const response = await request(asset, 200);
      if (asset === "/sw.js") {
        assert.match(response.headers.get("cache-control") ?? "", /(?:^|[,\s])no-cache(?:$|[,\s])/);
        assert.equal(response.headers.get("service-worker-allowed"), "/");
      }
      await response.body?.cancel();
    }
    const health = await request("/api/health", 200);
    assert.match(health.headers.get("content-type") ?? "", /application\/json/);
    assert.equal(health.headers.get("cache-control"), "no-store");
    const body = await health.json() as { ok?: boolean; service?: string };
    assert.equal(body.ok, true); assert.equal(body.service, "german-web");
    for (const pathname of ["/api", "/api/no-such-route"]) {
      const response = await request(pathname, 404);
      assert.match(response.headers.get("content-type") ?? "", /application\/json/);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.deepEqual(await response.json(), { error: "not_found" });
    }
    const missing = await request("/no-such-alpha-route/", 404);
    assert.match(await missing.text(), /not found/i);
    console.log(`[smoke:cloudflare] Local Wrangler PASS: ${routes.length} pages, ${assets.size} assets, API and honest 404s`);
  } finally {
    await stop();
    process.off("SIGINT", onSignal); process.off("SIGTERM", onSignal);
  }
}

assert(existsSync(outDir), "Missing root export; run npm run build:cloudflare first");
const files = walk(outDir);
const { routes, assets, brokenReferences } = inspectExport(files);
inspectOffline(files);
await smokeHttp(routes, assets);
assert.equal(brokenReferences.length, 0, `Broken local references:\n${brokenReferences.join("\n")}`);
console.log(`[smoke:cloudflare] ALL CHECKS PASS (${files.length} files scanned)`);
