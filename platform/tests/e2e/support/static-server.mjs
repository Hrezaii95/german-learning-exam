/**
 * Static file server for the GitHub Pages export, used by the Playwright suite.
 *
 * This deliberately mirrors the serving approach already proven by
 * `apps/web/scripts/smoke-pages.mjs` (`resolveOutPath` / `contentType` /
 * `startStaticServer`): same base-path strip, same traversal guard, same
 * directory→index.html resolution, same 404.html fallback. Tests must exercise
 * the bytes GitHub Pages will actually serve, so the resolution rules have to be
 * the same rules.
 *
 * Two deliberate additions over the smoke server, both required by journeys the
 * smoke script does not run:
 *   - a fuller content-type table (mp3/avif/webp/jpg) — the smoke script never
 *     plays media, this suite does;
 *   - HTTP Range support — Chromium requests audio with `Range:` and a server
 *     that cannot answer it makes playback assertions flaky rather than true.
 *
 * The upstream helpers are not exported from smoke-pages.mjs, and that file is
 * outside this task's write ownership, so the logic is restated here rather than
 * imported. See the E2E evidence note for the follow-up to de-duplicate.
 */
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { basename, dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const OUT_DIR = join(here, "..", "..", "..", "apps", "web", "out");
export const PAGES_BASE = "/german-learning-exam";

const CONTENT_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".mjs", "application/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".avif", "image/avif"],
  [".ico", "image/x-icon"],
  [".woff2", "font/woff2"],
  [".mp3", "audio/mpeg"],
  [".map", "application/json; charset=utf-8"],
]);

function contentType(filePath) {
  return CONTENT_TYPES.get(extname(filePath).toLowerCase()) ??
    "application/octet-stream";
}

/**
 * Map a router-payload URL onto the shape a Windows export wrote it in.
 *
 * PLATFORM DIFFERENCE — read this before re-diagnosing a 404 on a `.txt`
 * payload. Next 16.3 names each route's React payload by joining the route
 * segments with dots, and that flat name is what the router requests on every
 * platform. A Linux export (what `.github/workflows/deploy-pages.yml` ships)
 * writes that literal filename, so GitHub Pages serves it:
 *
 *   verified 2026-08-15 against the live deployment
 *     /lessons/__next.lessons.__PAGE__.txt   → 200
 *     /lessons/__next.lessons/__PAGE__.txt   → 404
 *
 * A Windows export writes the identical payload as a directory tree instead:
 * the first dot stays inside the directory name and every later dot becomes a
 * separator.
 *
 *   __next.lessons.__PAGE__.txt
 *     → __next.lessons/__PAGE__.txt
 *   __next.collections.professions.$d$sourceRow.__PAGE__.txt
 *     → __next.collections/professions/$d$sourceRow/__PAGE__.txt
 *
 * The deployed artifact is the correct one and the flat URL is what the router
 * should ask for, so this is a local export/serving shape difference, not a
 * product defect. The server therefore answers the production URL from
 * whichever layout this machine produced. It is only ever consulted after the
 * literal path missed, so on Linux/CI the flat file wins and this never runs —
 * both platforms serve one URL space, which is the point.
 *
 * Returns an absolute candidate path, or null when the request is not a payload.
 */
function nestedPayloadCandidate(candidate) {
  const base = basename(candidate);
  if (!base.startsWith("__next.") || !base.endsWith(".txt")) return null;
  const parts = base.slice("__next.".length, -".txt".length).split(".");
  // One part ("__next._full.txt") is already flat on both platforms.
  if (parts.length < 2 || parts.some((part) => part === "")) return null;
  const [head, ...rest] = parts;
  const leaf = rest.pop();
  return join(dirname(candidate), `__next.${head}`, ...rest, `${leaf}.txt`);
}

/** Resolve a request pathname to a file inside out/, or a miss. */
export function resolveOutPath(urlPathname, outDir = OUT_DIR) {
  const pathname = urlPathname.split("?")[0];
  if (!pathname.startsWith(PAGES_BASE)) return { kind: "miss" };

  let rest = pathname.slice(PAGES_BASE.length) || "/";
  if (!rest.startsWith("/")) rest = `/${rest}`;
  let decoded;
  try {
    decoded = decodeURIComponent(rest);
  } catch {
    return { kind: "miss" };
  }

  const candidate = normalize(join(outDir, decoded.replace(/^\//, "")));
  const rootNorm = normalize(outDir + sep);
  if (!candidate.startsWith(rootNorm) && candidate !== normalize(outDir)) {
    return { kind: "miss" };
  }

  if (existsSync(candidate)) {
    const st = statSync(candidate);
    if (st.isFile()) return { kind: "file", file: candidate };
    if (st.isDirectory()) {
      const index = join(candidate, "index.html");
      if (existsSync(index)) return { kind: "file", file: index };
    }
  }
  if (!extname(candidate)) {
    const index = join(candidate, "index.html");
    if (existsSync(index)) return { kind: "file", file: index };
    const html = `${candidate}.html`;
    if (existsSync(html)) return { kind: "file", file: html };
  }
  const nested = nestedPayloadCandidate(candidate);
  if (nested !== null && nested.startsWith(rootNorm) && existsSync(nested)) {
    if (statSync(nested).isFile()) return { kind: "file", file: nested };
  }
  return { kind: "miss" };
}

function sendRange(req, res, file, size, type) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
  if (!match) return false;
  const [, rawStart, rawEnd] = match;
  let start = rawStart === "" ? undefined : Number(rawStart);
  let end = rawEnd === "" ? undefined : Number(rawEnd);
  if (start === undefined && end === undefined) return false;
  if (start === undefined) {
    // suffix range: last N bytes
    start = Math.max(0, size - (end ?? 0));
    end = size - 1;
  }
  if (end === undefined || end >= size) end = size - 1;
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
    res.writeHead(416, { "Content-Range": `bytes */${size}` });
    res.end();
    return true;
  }
  res.writeHead(206, {
    "Content-Type": type,
    "Content-Length": String(end - start + 1),
    "Content-Range": `bytes ${start}-${end}/${size}`,
    "Accept-Ranges": "bytes",
  });
  createReadStream(file, { start, end }).pipe(res);
  return true;
}

/**
 * Start the server. Resolves with { server, port, origin, baseUrl }.
 * Pass port 0 to let the OS choose (used when a fixed port is already taken).
 */
export function startStaticServer({ port = 4331, outDir = OUT_DIR } = {}) {
  const notFoundFile = join(outDir, "404.html");
  const notFoundBody = existsSync(notFoundFile)
    ? readFileSync(notFoundFile)
    : Buffer.from("<!doctype html><title>Not found</title>Not found");

  const server = createServer((req, res) => {
    const host = req.headers.host ?? "127.0.0.1";
    const url = new URL(req.url ?? "/", `http://${host}`);
    const resolved = resolveOutPath(url.pathname, outDir);

    if (resolved.kind !== "file") {
      res.writeHead(404, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": String(notFoundBody.byteLength),
      });
      res.end(req.method === "HEAD" ? undefined : notFoundBody);
      return;
    }

    const type = contentType(resolved.file);
    const size = statSync(resolved.file).size;

    if (req.method === "HEAD") {
      res.writeHead(200, {
        "Content-Type": type,
        "Content-Length": String(size),
        "Accept-Ranges": "bytes",
      });
      res.end();
      return;
    }

    if (req.headers.range && sendRange(req, res, resolved.file, size, type)) {
      return;
    }

    res.writeHead(200, {
      "Content-Type": type,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      // The export is immutable per run; no caching keeps runs independent.
      "Cache-Control": "no-store",
    });
    createReadStream(resolved.file).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const actual = server.address().port;
      resolve({
        server,
        port: actual,
        origin: `http://127.0.0.1:${actual}`,
        baseUrl: `http://127.0.0.1:${actual}${PAGES_BASE}`,
      });
    });
  });
}
