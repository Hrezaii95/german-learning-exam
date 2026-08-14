/**
 * Learner-language gate.
 *
 * The chosen UX direction contract makes this a release criterion:
 * "No learner sees publication flags, evidence internals, raw object IDs,
 * game IDs/states, roadmap language or dashed implementation-status banners."
 *
 * Component-level greps miss leaks that live in data (hub/game description
 * tables) and only appear once rendered — on 2026-08-14 the project gates were
 * all green while the deployed hubs still read "Published lexemes from the
 * validated course package". This gate reads the exported HTML instead, so it
 * sees exactly what a learner sees.
 *
 * Scans visible text only: <script> and <style> bodies are stripped first, so
 * serialized field names such as "publicationStatus" in the RSC payload are
 * correctly ignored — they are data, not copy.
 *
 * Run after `npm run build:pages`. Exits non-zero on any leak.
 */
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exportRoot = path.join(repoRoot, "platform", "apps", "web", "out");
const reportPath = path.join(repoRoot, "research", "release-evidence", "learner-language-audit.json");

/** Each rule states the learner-visible wording that must never ship. */
const RULES = [
  { code: "PUBLICATION_JARGON", pattern: /\b(published|publication|unpublished|learner-published)\b/i },
  { code: "VALIDATION_JARGON", pattern: /\bvalidated\b/i },
  { code: "EVIDENCE_INTERNALS", pattern: /\b(typed learner events|evidence internals|emits? typed|mastery is not recorded)\b/i },
  { code: "RAW_OBJECT_ID", pattern: /\b(?:lex|qa|gram|verb|activity|lesson):[a-z0-9-]/i },
  { code: "RAW_GAME_STATE", pattern: /\bgameId\b|\bgame:[a-z-]+\s*:/i },
  { code: "ROADMAP_LANGUAGE", pattern: /\b(next phase|this slice|not available in this slice|coming in a later phase)\b/i },
  { code: "SEARCH_DEBUG_CHIP", pattern: /\bPriority \d+\b|\bMatched \w+ ·/i },
];

async function walkHtml(directory) {
  const out = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) out.push(...await walkHtml(absolute));
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(absolute);
  }
  return out;
}

/** Visible text only — script/style bodies are data, not learner copy. */
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

const files = await walkHtml(exportRoot);
if (files.length === 0) {
  console.error(`[learner-language] no exported HTML under ${path.relative(repoRoot, exportRoot)} — run build:pages first`);
  process.exit(1);
}

const findings = [];
for (const absolute of files) {
  const route = path.relative(exportRoot, absolute).split(path.sep).join("/");
  const text = visibleText(await readFile(absolute, "utf8"));
  for (const line of text.split("\n")) {
    const phrase = line.trim();
    if (!phrase) continue;
    for (const rule of RULES) {
      if (rule.pattern.test(phrase)) {
        findings.push({ code: rule.code, route, phrase: phrase.slice(0, 200) });
      }
    }
  }
}

// One row per distinct wording per rule keeps the report actionable rather than
// listing the same shared component once per route.
const unique = [...new Map(findings.map((f) => [`${f.code}::${f.phrase}`, f])).values()]
  .sort((a, b) => a.code.localeCompare(b.code, "en") || a.phrase.localeCompare(b.phrase, "en"));

const report = {
  schemaVersion: 1,
  gate: unique.length === 0 ? "pass" : "fail",
  scannedFiles: files.length,
  distinctFindings: unique.length,
  totalOccurrences: findings.length,
  rules: RULES.map((rule) => rule.code),
  findings: unique,
};

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  reportPath: path.relative(repoRoot, reportPath),
  scannedFiles: report.scannedFiles,
  distinctFindings: report.distinctFindings,
  gate: report.gate,
}, null, 2));

if (unique.length) {
  for (const finding of unique.slice(0, 25)) {
    console.error(`[learner-language] ${finding.code} ${finding.route}: ${finding.phrase}`);
  }
  process.exit(1);
}
