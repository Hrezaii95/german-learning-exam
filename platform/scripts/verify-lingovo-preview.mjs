/**
 * Check an existing Lingovo static export or an explicitly supplied preview.
 * Builds nothing. Run from platform/: npm run verify:lingovo-preview
 *
 * LINGOVO_PREVIEW_URL          Optional HTTP(S) app root, including a base path.
 * CHROMIUM_EXECUTABLE_PATH    Optional Chromium binary; otherwise Playwright's.
 * LINGOVO_PREVIEW_ARTIFACTS    Optional directory for report.json and screenshots.
 * HTTPS_PROXY / HTTP_PROXY   Optional existing proxy; loopback always bypasses it.
 * NODE_EXTRA_CA_CERTS or SSL_CERT_FILE: with a proxy, pin that explicit CA's
 * public key for this QA browser only. No global TLS-verification bypass.
 */
import { createHash, X509Certificate } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const platformRoot = fileURLToPath(new URL("../", import.meta.url));
const exportRoot = path.join(platformRoot, "apps/web/out");
const startedAt = new Date().toISOString();
const artifacts = path.resolve(process.env.LINGOVO_PREVIEW_ARTIFACTS || path.join(
  platformRoot, "test-results/lingovo-preview", `${startedAt.replace(/[:.]/g, "-")}-${process.pid}`,
));
const locales = ["hy", "ru", "en", "de"];
const widths = [320, 390, 768, 1440];
const languageSelector = ".language-selector select";
const timeout = 15_000;
const mediaTimeout = 30_000;
const publicAudioOrigin = "https://german-learning-audio.pages.dev";
const originalC1AudioPath = "/c1/media/2b456f4ad36c00b68b7e9a2e8d4c5091d908d65458ed13587bc84357f0eca02e.mp3";
const contentTypes = new Map(Object.entries({
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".wasm": "application/wasm",
}));

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

async function startStaticServer() {
  let root;
  try {
    root = await realpath(exportRoot);
    const index = await realpath(path.join(root, "index.html"));
    if (!isWithin(root, index) || !(await stat(index)).isFile()) throw new Error("Missing index.html");
  } catch {
    throw new Error(`No static export at ${exportRoot}. Run npm run build:cloudflare first; this checker never builds.`);
  }

  const server = createServer(async (request, response) => {
    const send = (status, message) => {
      response.writeHead(status, {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Length": Buffer.byteLength(message),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(request.method === "HEAD" ? undefined : message);
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.setHeader("Allow", "GET, HEAD");
      send(405, "Method not allowed");
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url || "/", "http://127.0.0.1").pathname);
      if (pathname.includes("\0") || pathname.includes("\\")) throw new Error("Invalid path");
    } catch {
      send(400, "Bad request");
      return;
    }
    let file = path.resolve(root, `.${pathname}`);
    if (!isWithin(root, file)) {
      send(403, "Forbidden");
      return;
    }
    try {
      let info;
      try {
        info = await stat(file);
      } catch (error) {
        // Also support exports without trailingSlash, without an SPA fallback.
        if (error.code !== "ENOENT" || path.extname(file)) throw error;
        file += ".html";
        info = await stat(file);
      }
      if (info.isDirectory()) file = path.join(file, "index.html");
      file = await realpath(file);
      // Resolving symlinks prevents an exported link from exposing sibling files.
      if (!isWithin(root, file)) {
        send(403, "Forbidden");
        return;
      }
      info = await stat(file);
      if (!info.isFile()) {
        send(404, "Not found");
        return;
      }
      response.writeHead(200, {
        "Content-Type": contentTypes.get(path.extname(file).toLowerCase()) || "application/octet-stream",
        "Content-Length": info.size,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      if (request.method === "HEAD") response.end();
      else await pipeline(createReadStream(file), response);
    } catch (error) {
      if (response.headersSent) response.destroy();
      else send(["ENOENT", "ENOTDIR"].includes(error.code) ? 404 : 500, "Unable to serve file");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  return { server, url: new URL(`http://127.0.0.1:${port}/`) };
}

function previewUrl(value) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("LINGOVO_PREVIEW_URL must be an HTTP(S) app root without credentials, query, or fragment.");
  }
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/`;
  return url;
}

async function runtimeNetworkOptions() {
  const configured = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
  if (!configured) return { args: [], evidence: { configuredProxy: false, pinnedProxyCAKeys: [] } };
  const url = new URL(configured);
  requireCondition(["http:", "https:", "socks5:"].includes(url.protocol), "The configured browser proxy must use HTTP, HTTPS, or SOCKS5.");
  const bypass = [...new Set(["127.0.0.1", "localhost", "[::1]", ...(process.env.NO_PROXY || process.env.no_proxy || "").split(",")].map(host => host.trim()).filter(Boolean))].join(",");
  const proxy = {
    server: `${url.protocol}//${url.host}`,
    bypass,
    ...(url.username ? { username: decodeURIComponent(url.username), password: decodeURIComponent(url.password) } : {}),
  };
  const pins = [];
  const caFile = process.env.NODE_EXTRA_CA_CERTS || process.env.SSL_CERT_FILE;
  if (caFile) {
    const pem = await readFile(caFile, "utf8").catch(error => {
      if (error.code === "ENOENT") return "";
      throw error;
    });
    const certificates = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) || [];
    requireCondition(!pem || certificates.length > 0, "The explicitly configured proxy CA file has no PEM certificates.");
    for (const certificate of certificates) {
      const spki = new X509Certificate(certificate).publicKey.export({ type: "spki", format: "der" });
      pins.push(createHash("sha256").update(spki).digest("base64"));
    }
  }
  // Chromium does not import Node's extra CA automatically. Limit the exception
  // to these explicitly configured public keys, and only for this proxy run.
  return {
    proxy,
    args: pins.length ? [`--ignore-certificate-errors-spki-list=${pins.join(",")}`] : [],
    evidence: { configuredProxy: true, pinnedProxyCAKeys: pins },
  };
}

const rows = [];
let browser;
let server;
let currentPage;
let baseUrl;
let failure;
let networkEvidence = { configuredProxy: false, pinnedProxyCAKeys: [] };

function requireCondition(pass, message) {
  if (!pass) throw new Error(message);
}

async function check(name, details, run) {
  try {
    const result = await run();
    rows.push({ name, pass: true, ...details, ...result });
  } catch (error) {
    rows.push({ name, pass: false, ...details, error: String(error) });
    throw error;
  }
}

const routeUrl = (route) => new URL(route.replace(/^\//, ""), baseUrl).href;

async function waitForLocale(page, locale, waitTimeout = timeout) {
  await page.waitForFunction(({ selector, locale }) => {
    const controls = document.querySelectorAll(selector);
    return controls.length === 1 && controls[0]?.value === locale && document.documentElement.lang === locale;
  }, { selector: languageSelector, locale }, { timeout: waitTimeout });
}

async function selectLocale(page, locale) {
  await page.locator(languageSelector).selectOption(locale);
  await waitForLocale(page, locale);
}

async function settleLayout(page) {
  await page.locator("main h1").first().waitFor({ state: "visible" });
  await page.waitForFunction(() => document.fonts.status === "loaded", undefined, { timeout });
  // Locale title effects use requestAnimationFrame; allow the committed layout
  // and fonts to settle before reading width or polling the title.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function snapshot(page) {
  return page.evaluate((selector) => ({
    lang: document.documentElement.lang,
    selected: document.querySelector(selector)?.value ?? null,
    controls: document.querySelectorAll(selector).length,
    heading: document.querySelector("main h1")?.textContent?.trim().replace(/\s+/g, " ") ?? "",
    title: document.title,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
  }), languageSelector);
}

async function newPage(viewport) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  page.setDefaultNavigationTimeout(30_000);
  currentPage = page;
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  return { context, page, errors };
}

async function checkMutedPlayback(page, route, selector, verifySource) {
  // One shared deadline covers navigation, hydration, metadata and playback.
  const deadline = Date.now() + mediaTimeout;
  const remaining = () => {
    const milliseconds = deadline - Date.now();
    requireCondition(milliseconds > 0, `Audio check exceeded ${mediaTimeout} ms: ${route}`);
    return milliseconds;
  };
  const response = await page.goto(routeUrl(route), { waitUntil: "domcontentloaded", timeout: remaining() });
  requireCondition(response?.status() === 200, `Expected audio route HTTP 200, received ${response?.status() ?? "no navigation response"}`);
  await waitForLocale(page, "en", remaining());
  const audio = page.locator(selector);
  await expect(audio).toHaveCount(1, { timeout: remaining() });
  const source = await audio.evaluate(element => element.src, undefined, { timeout: remaining() });
  verifySource(new URL(source));

  const metadata = await audio.evaluate((element, budget) => new Promise((resolve, reject) => {
    let playRequested = false;
    let finished = false;
    let initialTime = 0;
    const state = () => ({
      src: element.currentSrc || element.src,
      duration: element.duration,
      readyState: element.readyState,
      initialTime,
      currentTime: element.currentTime,
      muted: element.muted,
      volume: element.volume,
      paused: element.paused,
      error: element.error ? { code: element.error.code, message: element.error.message } : null,
    });
    const finish = error => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      element.removeEventListener("loadedmetadata", startWhenReady);
      element.removeEventListener("canplay", startWhenReady);
      element.removeEventListener("timeupdate", observeProgress);
      element.removeEventListener("ended", observeProgress);
      element.removeEventListener("error", mediaError);
      element.pause();
      const result = state();
      if (error) reject(new Error(`${error}: ${JSON.stringify(result)}`));
      else resolve(result);
    };
    const observeProgress = () => {
      if (playRequested && element.currentTime > initialTime + 0.05) finish();
    };
    const startWhenReady = () => {
      if (finished || playRequested || element.readyState < HTMLMediaElement.HAVE_FUTURE_DATA || !Number.isFinite(element.duration) || element.duration <= 0) return;
      playRequested = true;
      initialTime = element.currentTime;
      element.play().catch(error => finish(`Playback rejected: ${error}`));
    };
    const mediaError = () => finish("Media failed to load");
    const timer = setTimeout(() => finish("Metadata or playback timed out"), budget);
    element.pause();
    element.muted = true;
    element.volume = 0;
    element.preload = "auto";
    element.addEventListener("loadedmetadata", startWhenReady);
    element.addEventListener("canplay", startWhenReady);
    element.addEventListener("timeupdate", observeProgress);
    element.addEventListener("ended", observeProgress);
    element.addEventListener("error", mediaError);
    element.load();
    startWhenReady();
  }), remaining(), { timeout: remaining() });

  verifySource(new URL(metadata.src));
  requireCondition(Number.isFinite(metadata.duration) && metadata.duration > 0 && metadata.readyState >= 3 && metadata.currentTime > metadata.initialTime + 0.05 && metadata.muted && metadata.volume === 0 && metadata.paused && metadata.error === null, JSON.stringify(metadata));
  return metadata;
}

try {
  await mkdir(artifacts, { recursive: true });
  const projection = JSON.parse(await readFile(path.join(platformRoot, "apps/web/generated/learner-projection.json"), "utf8"));
  const greeting = projection.activities?.find(activity => activity.id === "activity:lesson-01-greetings-by-context");
  requireCondition(greeting?.canonicalPath?.startsWith("/lessons/01/activity/"), "The learner projection is missing the greetings activity's canonical route.");
  const routes = ["/", "/learn", "/dashboard", "/lessons/01", greeting.canonicalPath, "/lessons/12", "/review", "/saved", "/prepare/c1", "/prepare/c1/course", "/prepare/c1/today"];

  if (process.env.LINGOVO_PREVIEW_URL) baseUrl = previewUrl(process.env.LINGOVO_PREVIEW_URL);
  else ({ server, url: baseUrl } = await startStaticServer());
  console.log(`[lingovo-preview] Checking ${baseUrl.href}`);
  const network = await runtimeNetworkOptions();
  networkEvidence = network.evidence;
  browser = await chromium.launch({
    headless: true,
    // The media assertions also mute each element before loading/playing.
    args: ["--mute-audio", ...network.args],
    ...(network.proxy ? { proxy: network.proxy } : {}),
    ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}),
  });

  for (const locale of locales) {
    const { context, page, errors } = await newPage({ width: 390, height: 844 });
    await page.goto(routeUrl("/"), { waitUntil: "networkidle" });
    await selectLocale(page, locale);
    for (const route of routes) {
      await check("Production route + locale", { locale, route }, async () => {
        const response = await page.goto(routeUrl(route), { waitUntil: "networkidle" });
        requireCondition(response?.status() === 200, `Expected HTTP 200, received ${response?.status() ?? "no navigation response"}`);
        await waitForLocale(page, locale);
        await settleLayout(page);
        const data = await snapshot(page);
        requireCondition(data.heading && data.lang === locale && data.selected === locale && data.controls === 1 && !data.overflow, JSON.stringify(data));
        return { status: response.status(), ...data };
      });
      await check("Localized title follows visible heading", { locale, route }, async () => {
        await page.waitForFunction(() => {
          const heading = document.querySelector("main h1")?.textContent?.trim().replace(/\s+/g, " ");
          return Boolean(heading && document.title.includes(heading));
        }, undefined, { timeout });
        const { heading, title } = await snapshot(page);
        return { heading, title };
      });
      if (locale === "en" && ["/", "/dashboard", "/prepare/c1"].includes(route)) {
        const label = route === "/" ? "entry" : route.slice(1).replaceAll("/", "-");
        await page.screenshot({ path: path.join(artifacts, `mobile-${label}.png`), fullPage: true });
      }
    }
    if (locale === "de") {
      await check("German meaning choices use definitions", { locale }, async () => {
        await page.goto(routeUrl(greeting.canonicalPath), { waitUntil: "networkidle" });
        await waitForLocale(page, locale);
        const cue = await page.locator(".activity-question h3").innerText();
        await page.locator(".activity-choice").first().waitFor({ state: "visible" });
        const choices = await page.locator(".activity-choice").allTextContents();
        requireCondition(choices.some(choice => choice.includes("Abschied")) && !choices.some(choice => choice.trim() === "Auf Wiedersehen"), JSON.stringify({ cue, choices }));
        await page.screenshot({ path: path.join(artifacts, "german-practice.png"), fullPage: true });
        return { cue, choices };
      });
    }
    if (locale === "en") {
      await check("A1 greeting audio loads and plays muted", { locale, route: greeting.canonicalPath }, async () => {
        const metadata = await checkMutedPlayback(page, greeting.canonicalPath, '.activity-audio audio[aria-label="Listen to the German phrase"]', source => {
          requireCondition(source.origin === publicAudioOrigin && source.pathname.endsWith(".mp3"), `A1 pronunciation must use the production audio origin: ${source.href}`);
        });
        return { expectedOrigin: publicAudioOrigin, ...metadata };
      });
      const studio = "/prepare/c1/studio?section=testdaf.mock-exam-1.audio.transcript.002";
      await check("C1 original audio loads and plays muted", { locale, route: studio }, async () => {
        const metadata = await checkMutedPlayback(page, studio, 'audio[aria-label="Source audio"]', source => {
          requireCondition(source.pathname.endsWith(originalC1AudioPath), `Unexpected original C1 recording: ${source.href}`);
        });
        requireCondition(Math.abs(metadata.duration - 165.6306) < 0.5, `Expected the approximately 165.6-second original recording: ${JSON.stringify(metadata)}`);
        return { expectedPath: originalC1AudioPath, expectedDuration: 165.6306, ...metadata };
      });
    }
    await check("C1 skip link moves keyboard focus", { locale }, async () => {
      await page.goto(routeUrl("/prepare/c1"), { waitUntil: "networkidle" });
      await waitForLocale(page, locale);
      await settleLayout(page);
      const skip = page.locator(".lingovo-skip-link");
      await skip.focus();
      await skip.press("Enter");
      await expect(page.locator("#main")).toBeFocused({ timeout });
    });
    await check("No uncaught browser errors", { locale }, async () => {
      requireCondition(errors.length === 0, JSON.stringify(errors));
      return { errors };
    });
    await context.close();
    console.log(`[lingovo-preview] ${locale}: 11 routes, titles, and C1 focus passed`);
  }

  const { context, page, errors } = await newPage({ width: 1440, height: 1000 });
  await page.goto(routeUrl("/"), { waitUntil: "networkidle" });
  await selectLocale(page, "en");
  await settleLayout(page);
  await page.screenshot({ path: path.join(artifacts, "desktop-entry.png"), fullPage: true });
  for (const locale of locales) for (const width of widths) {
    await check("Production responsive lesson", { locale, width }, async () => {
      await page.setViewportSize({ width, height: 844 });
      const response = await page.goto(routeUrl("/lessons/01"), { waitUntil: "networkidle" });
      requireCondition(response?.status() === 200, `Expected lesson HTTP 200, received ${response?.status() ?? "no navigation response"}`);
      await selectLocale(page, locale);
      await settleLayout(page);
      const data = await snapshot(page);
      requireCondition(!data.overflow && errors.length === 0, JSON.stringify({ ...data, errors }));
      return { ...data, errors: [...errors] };
    });
  }
  await context.close();
} catch (error) {
  failure = String(error);
  process.exitCode = 1;
  console.error(`[lingovo-preview] FAIL: ${failure}`);
  if (currentPage && !currentPage.isClosed()) {
    await currentPage.screenshot({ path: path.join(artifacts, "failure.png"), fullPage: true, timeout: 5_000 }).catch(() => {});
  }
} finally {
  await browser?.close().catch(error => {
    failure ||= `Browser cleanup failed: ${error}`;
    process.exitCode = 1;
  });
  if (server) await new Promise(resolve => server.close(resolve));
  const report = {
    passed: !failure,
    startedAt,
    finishedAt: new Date().toISOString(),
    target: baseUrl?.href ?? null,
    mode: process.env.LINGOVO_PREVIEW_URL ? "preview" : "static-export",
    network: networkEvidence,
    artifacts,
    expected: { routeLocaleChecks: 44, titleChecks: 44, germanSemanticChecks: 1, c1FocusChecks: 4, browserErrorChecks: 4, viewportChecks: 16, mediaChecks: 2 },
    checks: rows.length,
    ...(failure ? { error: failure } : {}),
    rows,
  };
  await mkdir(artifacts, { recursive: true });
  await writeFile(path.join(artifacts, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[lingovo-preview] ${failure ? "FAIL" : "PASS"}: ${rows.filter(row => row.pass).length}/${rows.length} checks. Report: ${path.join(artifacts, "report.json")}`);
}
