import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repoRoot, "resources", "original");
const manifestPath = path.join(repoRoot, "content", "source-index", "source-manifest.json");
const lockPath = path.join(repoRoot, "content", "source-index", "source-lock.json");
const manifestText = await readFile(manifestPath, "utf8");
const manifest = JSON.parse(manifestText);
const lock = JSON.parse(await readFile(lockPath, "utf8"));
const failures = [];

function fail(code, detail) {
  failures.push({ code, detail });
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function slash(relativePath) {
  return relativePath.split(path.sep).join("/");
}

if (manifest.schemaVersion !== 1) fail("SOURCE_SCHEMA_VERSION", String(manifest.schemaVersion));
if (manifest.sourceRoot !== "resources/original") fail("SOURCE_ROOT", String(manifest.sourceRoot));
if (manifest.immutable !== true) fail("SOURCE_IMMUTABLE_FLAG", String(manifest.immutable));
if (!Array.isArray(manifest.files)) fail("SOURCE_FILES_TYPE", typeof manifest.files);
const manifestHash = createHash("sha256").update(manifestText).digest("hex");
if (lock.schemaVersion !== 1) fail("SOURCE_LOCK_VERSION", String(lock.schemaVersion));
if (lock.approvedManifestSha256 !== manifestHash) fail("SOURCE_LOCK_MISMATCH", manifestHash);

const records = Array.isArray(manifest.files) ? manifest.files : [];
const expectedSnapshotId = `sha256:${createHash("sha256").update(JSON.stringify(records)).digest("hex")}`;
if (manifest.snapshotId !== expectedSnapshotId) fail("SOURCE_SNAPSHOT_ID", String(manifest.snapshotId));
const ids = new Set();
const paths = new Set();
let totalBytes = 0;
let previousPath = "";

for (const record of records) {
  if (ids.has(record.id)) fail("SOURCE_DUPLICATE_ID", record.id);
  ids.add(record.id);
  if (paths.has(record.path)) fail("SOURCE_DUPLICATE_PATH", record.path);
  paths.add(record.path);
  if (path.isAbsolute(record.path) || record.path.includes("\\") || record.path.split("/").includes("..")) {
    fail("SOURCE_UNSAFE_PATH", record.path);
    continue;
  }
  if (previousPath && previousPath.localeCompare(record.path, "en") > 0) {
    fail("SOURCE_ORDER", `${previousPath} before ${record.path}`);
  }
  previousPath = record.path;
  const absolute = path.resolve(sourceRoot, ...record.path.split("/"));
  if (!absolute.startsWith(`${sourceRoot}${path.sep}`)) {
    fail("SOURCE_PATH_ESCAPE", record.path);
    continue;
  }
  try {
    const [bytes, info] = await Promise.all([readFile(absolute), stat(absolute)]);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== record.sha256) fail("SOURCE_HASH_MISMATCH", record.path);
    if (info.size !== record.bytes) fail("SOURCE_SIZE_MISMATCH", record.path);
    totalBytes += info.size;
  } catch (error) {
    fail("SOURCE_MISSING", `${record.path}: ${error.code ?? error.message}`);
  }
  if (record.category === "publisher-audio" && record.publication !== "private-rights-gated") {
    fail("SOURCE_AUDIO_RIGHTS_GATE", record.path);
  }
}

if (manifest.summary?.fileCount !== records.length) fail("SOURCE_COUNT", String(manifest.summary?.fileCount));
if (manifest.summary?.totalBytes !== totalBytes) fail("SOURCE_TOTAL_BYTES", String(manifest.summary?.totalBytes));
if (manifest.summary?.unhashedFiles !== 0) fail("SOURCE_UNHASHED", String(manifest.summary?.unhashedFiles));

const diskPaths = (await walk(sourceRoot)).map((absolute) => slash(path.relative(sourceRoot, absolute)));
for (const diskPath of diskPaths) {
  if (!paths.has(diskPath)) fail("SOURCE_UNMANIFESTED_FILE", diskPath);
}
for (const recordPath of paths) {
  if (!diskPaths.includes(recordPath)) fail("SOURCE_STALE_RECORD", recordPath);
}
if (lock.fileCount !== records.length) fail("SOURCE_LOCK_COUNT", String(records.length));
if (lock.totalBytes !== totalBytes) fail("SOURCE_LOCK_BYTES", String(totalBytes));

if (failures.length) {
  console.error(JSON.stringify({ valid: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ valid: true, fileCount: records.length, totalBytes }, null, 2));
}
