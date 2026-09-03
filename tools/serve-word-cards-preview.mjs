import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { dirname, resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../platform/apps/web/out");
const base = "/german-learning-exam";
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".mp3": "audio/mpeg", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif" };
createServer((req, res) => {
  let path;
  try { path = decodeURIComponent(new URL(req.url ?? "/", "http://127.0.0.1").pathname); } catch { res.writeHead(400).end(); return; }
  if (path !== base && !path.startsWith(`${base}/`)) { res.writeHead(404).end(); return; }
  let file = resolve(root, `.${path.slice(base.length) || "/"}`);
  if (file !== root && !file.startsWith(`${root}${sep}`)) { res.writeHead(404).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, "index.html");
  if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
  createReadStream(file).on("error", () => res.destroy()).pipe(res);
}).listen(8781, "127.0.0.1", () => console.log(`Preview: http://127.0.0.1:8781${base}/vocabulary/`));
