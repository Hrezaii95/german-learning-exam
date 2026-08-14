/**
 * Build-intermediate guard.
 *
 * `build:pages` briefly rewrites tracked sources — it isolates `proxy.ts` and
 * replaces `dynamicParams` with an export-only literal — and restores them when
 * it finishes. Anything that commits the worktree inside that window captures a
 * broken snapshot.
 *
 * This has now happened twice: once from the Stop-hook auto-checkpoint
 * (2026-08-14, fixed with an advisory pause marker) and once from a plain
 * `git add -A` racing a build started by a different session. The pause marker
 * cannot prevent the second case, because a human or agent typing `git add` is
 * not reading it. So the invariant is asserted directly against the index here.
 *
 * Run before committing, and from a pre-commit hook. Exits non-zero when the
 * staged tree contains build-intermediate state.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", windowsHide: true });
}

const failures = [];

// 1. The export-only marker must never be present in the index.
//    Searched against the staged CONTENT, not against the diff: a pickaxe
//    (`diff -S`) only reports a change in occurrence count, so once a bad
//    snapshot is already committed it would report every later commit as clean.
//    That false pass was caught by fixture-testing this guard.
try {
  const marked = git(["grep", "--cached", "-l", "pages-export temporary", "--", "platform/apps/web/app"])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (const file of marked) {
    failures.push({ code: "BUILD_INTERMEDIATE_DYNAMIC_PARAMS", file });
  }
} catch {
  // git grep exits 1 when there are no matches — that is the healthy case.
}

// 2. proxy.ts must be present in the index, and its isolated form absent.
try {
  const tracked = git(["ls-files", "--", "platform/apps/web/proxy.ts", "platform/apps/web/proxy.ts.pages-disabled"])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!tracked.includes("platform/apps/web/proxy.ts")) {
    failures.push({ code: "BUILD_INTERMEDIATE_PROXY_REMOVED", file: "platform/apps/web/proxy.ts" });
  }
  for (const file of tracked) {
    if (file.endsWith("proxy.ts.pages-disabled")) {
      failures.push({ code: "BUILD_INTERMEDIATE_PROXY_ISOLATED", file });
    }
  }
} catch {
  // ignore
}

if (failures.length) {
  console.error("[build-intermediate] staged tree contains build-intermediate state:");
  for (const failure of failures) console.error(`  ${failure.code}: ${failure.file}`);
  console.error("Run `cd platform && npm run build:pages` to completion (it restores on exit), then re-stage.");
  process.exit(1);
}

console.log(JSON.stringify({ gate: "pass", checked: ["dynamicParams marker", "proxy.ts isolation"] }));
