/**
 * Supplementary Lane 1 export contract for canonical cards and retired aliases.
 * Preserves its content/audio/full-card checks and audits retired profession
 * aliases as real exported compatibility HTML. The original current audit runs
 * separately and must pass. Read-only: emits stdout JSON only.
 * Run with --audio --export. WORD_CARDS_ROOT selects an immutable candidate;
 * otherwise the repository root is resolved from this owned support path.
 */
import { readFileSync, existsSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const root = resolve(process.env.WORD_CARDS_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".."));
const read = path => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const hash = path => createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex");
const catalog = read("platform/apps/web/generated/word-cards.json");
const guide = read("research/lesson-03-study-pack/vocabulary.json");
const supplements = read("platform/content/study-cards/lexical-supplements.json");
const teacher = read("platform/apps/web/generated/learner-extra-professions.json");
const old = read("platform/apps/web/generated/learner-details.json").details.filter(d => d.kind === "Lexeme");
const failures = [];
const check = (test, message) => { if (!test) failures.push(message); };
const paths = new Map();
const wantAudio = process.argv.includes("--audio");
const exported = process.argv.includes("--export");
check(catalog.sourcePdfSha256 === hash("study-guides/lessons-01-03/01-vocabulary.pdf"), "Source PDF changed after projection");
const inventory = read("research/word-cards/pdf-inventory.json");
check(inventory.pdfSha256 === catalog.sourcePdfSha256, "PDF extraction is stale");
check(inventory.missingHeads.length === 0 && inventory.matchedVocabularyHeads === guide.entries.length, "PDF heads do not match guide data");
check(catalog.vocabularyCount === 543 && guide.entries.length === 543, "Expected 543 vocabulary entries");
for (const entry of guide.entries) {
  const owners = catalog.cards.filter(c => c.sourceIds.includes(entry.id));
  check(owners.length === 1, `${entry.id}: expected exactly one family, found ${owners.length}`);
  const card = owners[0]; if (!card) continue;
  const row = card.rows.find(r => r.singular.text === entry.german);
  check(!!row, `${entry.id}: missing singular ${entry.german}`);
  if (!row) continue;
  check(row.meaning === entry.english, `${entry.id}: meaning changed or missing`);
  const plural = supplements[entry.id]?.plural ?? entry.plural;
  if (plural.startsWith("die ")) check(row.plurals.some(p => p.text === plural), `${entry.id}: missing exact plural ${plural}`);
  else check(row.usage === plural, `${entry.id}: lost source usage restriction`);
  check(card.sources.includes(entry.source), `${entry.id}: missing provenance`);
}
for (const n of guide.numbers) {
  const card = catalog.cards.find(c => c.id === `N${String(n.number).padStart(3, "0")}`);
  check(card?.rows[0]?.singular.text === n.german, `Number ${n.number}: spelling missing`);
}
check(catalog.cards.filter(c => c.category === "Alphabet").length === 30, "Expected 30 spelling cards");
for (const row of teacher.rows) {
  const owners = catalog.cards.filter(c => c.teacherRows.includes(row.sourceRow));
  check(owners.length === 1, `Teacher row ${row.sourceRow}: not aggregated once`);
  const card = owners[0]; if (!card) continue;
  for (const form of [...row.masculine, ...row.feminine]) {
    check(card.rows.some(r => r.singular.text === form.singular), `Teacher row ${row.sourceRow}: missing ${form.singular}`);
    check(card.rows.some(r => r.plurals.some(p => p.text === form.plural)), `Teacher row ${row.sourceRow}: missing ${form.plural}`);
  }
  check(card.aliases.includes(row.detailPath), `Teacher row ${row.sourceRow}: lost old link`);
}
const audioManifest = new Map(read("media/manifests/word-cards-public-audio-v1.json").assets.map(a => [`/${a.publicRelativePath}`, a]));
const retiredProfessionPaths = new Set(teacher.rows.map(row => row.detailPath));
const expectedRetired = Array.from({length:48}, (_, index) => `/collections/professions/${String(index+1).padStart(2,"0")}`);
check(retiredProfessionPaths.size === 48 && expectedRetired.every(path => retiredProfessionPaths.has(path)), "Expected exactly 48 retired profession aliases");
let formCount = 0, audioCount = 0, exportedRoutes = 0, fullCardPages = 0, compatibilityStubs = 0;
let exportBasePath = "";
if (exported) {
  const indexHtml = readFileSync(resolve(root,"platform/apps/web/out/index.html"),"utf8");
  const scriptPaths = [...indexHtml.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(match => new URL(match[1],"https://word-cards.invalid").pathname).filter(path => path.includes("/_next/"));
  check(scriptPaths.length > 0, "Cannot establish export base path from actual Next script URLs");
  exportBasePath = scriptPaths[0]?.split("/_next/")[0] ?? "";
  check(scriptPaths.every(path => path.startsWith(`${exportBasePath}/_next/`)), "Export script URLs disagree on base path");
}
function checkProfessionStub(html, path, card) {
  const destination = `${exportBasePath}${card.path}/`;
  const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
  check(canonical === destination, `Wrong stub canonical at ${path}: ${canonical}`);
  check(!html.includes("data-word-card="), `Retired alias still renders a full-card body at ${path}`);
  check(html.includes(`<noscript><meta http-equiv="refresh" content="0;url=${destination}?nav=`), `Stub no-script target missing at ${path}`);
  check(html.includes(`<a href="${destination}?nav=`), `Stub visible fallback target missing at ${path}`);
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]).filter(script => script.trim().startsWith("(()=>{") && script.includes("window.location.replace("));
  check(scripts.length === 1, `Expected one standalone redirect script at ${path}`);
  if (scripts.length !== 1) return;
  const searches = ["?q=Arzt%20oder+Lehrer&source=&lesson=02&q=zweite%20Frage&tags=people%2Cfamily", "?nav=existing%20context&q=Arzt+oder%20Lehrer&source="];
  for (const search of searches) {
    const fragment = "#saved%20word";
    let replacement, replacements = 0;
    try {
      runInNewContext(scripts[0], {URLSearchParams, window:{location:{search,hash:fragment,replace(value){replacement=value;replacements++;}}}}, {timeout:1000});
    } catch (error) {
      check(false, `Stub script failed at ${path}: ${error.message}`);
      continue;
    }
    check(replacements === 1, `Stub must redirect once at ${path}`);
    check(typeof replacement === "string", `Stub redirect target is not a string at ${path}`);
    if (typeof replacement !== "string") continue;
    const target = new URL(replacement,"https://word-cards.invalid");
    check(target.origin === "https://word-cards.invalid" && target.pathname === destination, `Stub script target changed at ${path}: ${replacement}`);
    check(target.hash === fragment, `Stub script lost raw hash at ${path}`);
    const hasNav = new URLSearchParams(search).has("nav");
    check(hasNav ? target.search === search : target.search.startsWith(`${search}&nav=`), `Stub script changed original query bytes at ${path}`);
    if (!hasNav) {
      const suffix = new URLSearchParams(target.search.slice(search.length+1));
      check([...suffix.keys()].length === 1 && suffix.has("nav"), `Stub appended unexpected query fields at ${path}`);
    }
  }
}
for (const card of catalog.cards) {
  check(card.title && card.rows.length && card.examples.length && card.pattern.length && card.tip && card.sources.length && card.prompts.length, `${card.id}: incomplete anatomy`);
  for (const ex of card.examples) check(ex.de.trim() && ex.en.trim(), `${card.id}: incomplete example`);
  for (const row of card.rows) for (const form of [row.singular, ...row.plurals]) {
    formCount++;
    check(card.prompts.some(p => p.answers.includes(form.text)), `${card.id}: form cannot be recalled: ${form.text}`);
    check(!/unconfirmed|not confirmed|TODO|placeholder/i.test(form.text), `${card.id}: placeholder in learning forms`);
    if (form.audio) audioCount++;
    if (wantAudio) check(!!form.audio, `${card.id}: missing audio ${form.text}`);
    if (form.audio) {
      const asset = audioManifest.get(form.audio);
      check(asset?.spokenText === form.text, `${card.id}: audio exact text mismatch`);
      check(existsSync(resolve(root, `platform/apps/web/public${form.audio}`)), `${card.id}: audio file missing`);
    }
  }
  for (const ex of card.examples) {
    if (wantAudio) check(!!ex.audio, `${card.id}: example audio missing`);
    if (ex.audio) check(audioManifest.get(ex.audio)?.spokenText === ex.de, `${card.id}: example audio text mismatch`);
  }
  for (const path of [card.path, ...card.aliases]) {
    check(!paths.has(path), `Duplicate route ${path}`); paths.set(path, card.id);
    if (exported) {
      const file = resolve(root, `platform/apps/web/out${path}/index.html`);
      check(existsSync(file), `Export missing ${path}`);
      if (existsSync(file)) {
        const html = readFileSync(file, "utf8");
        const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ");
        if (retiredProfessionPaths.has(path)) {
          check(card.aliases.includes(path), `Retired alias is not owned by its canonical family at ${path}`);
          checkProfessionStub(html, path, card);
          compatibilityStubs++;
        } else {
        check(html.includes(`data-word-card="${card.id}"`), `Wrong card exported at ${path}`);
        check(html.includes("Notice") && html.includes("Try recall") && html.includes("Use it"), `Card anatomy missing at ${path}`);
        for (const row of card.rows) for (const form of [row.singular, ...row.plurals]) check(visible.includes(form.text), `Form absent from rendered page ${path}: ${form.text}`);
        for (const ex of card.examples) check(visible.includes(ex.de), `Example absent from rendered page ${path}`);
        fullCardPages++;
        }
        exportedRoutes++;
      }
    }
  }
}
for (const detail of old) check(paths.has(detail.canonicalPath), `Old vocabulary link missing: ${detail.canonicalPath}`);
if (exported) {
  check(compatibilityStubs === 48, `Expected 48 checked compatibility stubs, got ${compatibilityStubs}`);
  check(fullCardPages === paths.size - 48, `Expected every nonretired route to retain a full card, got ${fullCardPages}/${paths.size-48}`);
  check(exportedRoutes === paths.size, `Expected every route to exist in the export, got ${exportedRoutes}/${paths.size}`);
}
const report = { helper:"lane1-word-cards-smoke", originalAudit:"separately recorded; never overwritten by this helper", checkedAt: new Date().toISOString(), passed: failures.length === 0, cardCount: catalog.cards.length, vocabularyEntries: guide.entries.length, numbers: guide.numbers.length, spellingCards: 30, teacherRows: teacher.rows.length, uniqueRoutes: paths.size, formCount, formsWithAudio: audioCount, exportedRoutes, fullCardPages, compatibilityStubs, exportBasePath, failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
