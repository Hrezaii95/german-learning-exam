/**
 * Attribution gate.
 *
 * ADR-016: the owner's grant of full Momente A1.1 / A1.2 content rights is
 * CONDITIONAL on crediting the book and audio as sources. An obligation that
 * nobody checks is an obligation that silently lapses, so it is enforced here
 * as a computed predicate rather than left to reviewer memory.
 *
 * Requires, in the exported site:
 *   1. a references page exists at /references/
 *   2. it names each required work (coursebook, workbook, glossary, audio)
 *   3. it is reachable from global navigation on ordinary learner pages
 *
 * Reads visible text only (script/style stripped), so a credit buried in a JSON
 * payload does not count as a credit a learner can see.
 *
 * Run after `npm run build:pages`. Exits non-zero when the obligation is unmet.
 */
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exportRoot = path.join(repoRoot, "platform", "apps", "web", "out");
const referencesPage = path.join(exportRoot, "references", "index.html");
const reportPath = path.join(repoRoot, "research", "release-evidence", "attribution-audit.json");

/** Each work the owner's grant requires to be credited by name. */
const REQUIRED_WORKS = [
  { code: "MOMENTE_TITLE", label: "Momente series name", pattern: /\bMomente\b/ },
  { code: "LEVEL_A1_1", label: "A1.1 level", pattern: /A1\.?1\b/ },
  { code: "COURSEBOOK", label: "coursebook / Kursbuch", pattern: /\b(Kursbuch|coursebook)\b/i },
  { code: "WORKBOOK", label: "workbook / Arbeitsbuch", pattern: /\b(Arbeitsbuch|workbook)\b/i },
  { code: "GLOSSARY", label: "glossary", pattern: /\bglossar(y|ies)?\b/i },
  { code: "AUDIO", label: "audio recordings", pattern: /\baudio\b/i },
  { code: "PUBLISHER", label: "publisher (Hueber)", pattern: /\bHueber\b/i },
];

/** Learner pages that must expose the route, sampled across the site. */
const NAV_SAMPLE = ["index.html", "vocabulary/index.html", "listening/index.html", "practice/index.html"];

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

const failures = [];

let pageText = null;
try {
  pageText = visibleText(await readFile(referencesPage, "utf8"));
} catch {
  failures.push({
    code: "ATTRIBUTION_PAGE_MISSING",
    detail: "platform/apps/web/out/references/index.html was not exported",
  });
}

if (pageText !== null) {
  for (const work of REQUIRED_WORKS) {
    if (!work.pattern.test(pageText)) {
      failures.push({ code: `ATTRIBUTION_MISSING_${work.code}`, detail: `references page does not credit: ${work.label}` });
    }
  }
}

for (const relative of NAV_SAMPLE) {
  const absolute = path.join(exportRoot, ...relative.split("/"));
  let html;
  try {
    html = await readFile(absolute, "utf8");
  } catch {
    // A sampled page that does not exist is not an attribution failure; the
    // route smoke gate owns route existence.
    continue;
  }
  if (!/href="[^"]*\/references\/?"/.test(html)) {
    failures.push({ code: "ATTRIBUTION_NOT_LINKED", detail: `${relative} has no link to /references/` });
  }
}

const report = {
  schemaVersion: 1,
  basis: "ADR-016 — owner-asserted full Momente A1.1/A1.2 rights, conditional on visible attribution",
  gate: failures.length === 0 ? "pass" : "fail",
  requiredWorks: REQUIRED_WORKS.map((work) => work.code),
  navSample: NAV_SAMPLE,
  failureCount: failures.length,
  failures,
};

await mkdir(path.dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ reportPath: path.relative(repoRoot, reportPath), gate: report.gate, failureCount: failures.length }, null, 2));

if (failures.length) {
  for (const failure of failures) console.error(`[attribution] ${failure.code}: ${failure.detail}`);
  process.exit(1);
}
