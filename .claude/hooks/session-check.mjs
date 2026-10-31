#!/usr/bin/env node
// SessionStart hook: prints what is ready and what is missing. Its output is
// added to Claude's context, so the agent knows up front which paths work.
// Never blocks the session: always exits 0.

import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPolicy, relayCall, relayConfig } from "./lib/common.mjs";

process.on("uncaughtException", (err) => {
  console.log(`Agent kit status: session check failed (${err.message}). Gated actions stay blocked until fixed.`);
  process.exit(0);
});

const out = [];
const missing = [];
const ok = (s) => out.push(`  ✅ ${s}`);
const bad = (s, fix) => {
  out.push(`  ❌ ${s}`);
  if (fix) missing.push(fix);
};

// 1. Approval gate + Telegram relay
const policy = loadPolicy();
if (policy._loadError) bad(`approval-policy.json unreadable (${policy._loadError}); using empty allowlist`, "Fix .claude/approval-policy.json");
const allow = (policy.email?.self?.length || 0) + (policy.email?.support?.length || 0);
ok(`Approval gate active. Email allowlist: ${allow} entr${allow === 1 ? "y" : "ies"}${allow ? "" : " (every outside email asks)"}`);

const cfg = relayConfig();
if (!cfg) {
  bad("Telegram approvals not configured: gated actions will be BLOCKED", "Set APPROVAL_RELAY_URL and APPROVAL_RELAY_SECRET in the environment settings (SETUP.md Phase 2)");
} else {
  try {
    const s = await relayCall(cfg, "GET", "/status", undefined, 6000);
    if (s.chatBound) ok(`Telegram relay reachable, group linked${s.forum ? " (topics on)" : " (topics OFF: messages won't be split by project)"}`);
    else bad("Telegram relay reachable but no group linked: gated actions will be BLOCKED", "Send /bind in your Telegram group");
    if (s.webhook === false) bad("Telegram webhook not registered: button taps won't arrive", "Run: node agent-kit/scripts/relay-cli.mjs setup-webhook");
  } catch (err) {
    bad(`Telegram relay unreachable (${err.status === 401 ? "secret mismatch" : err.message})`, "Check APPROVAL_RELAY_URL/SECRET and that the relay domain is under Allowed domains");
  }
}

// 2. gcloud
function sh(cmd, args, timeout = 8000) {
  return execFileSync(cmd, args, { encoding: "utf8", timeout, stdio: ["ignore", "pipe", "ignore"] }).trim();
}
try {
  let account = "";
  try {
    account = sh("gcloud", ["auth", "list", "--filter=status:ACTIVE", "--format=value(account)"]);
  } catch {
    /* none */
  }
  const key = process.env.GCLOUD_SA_KEY;
  if (!account && key) {
    const json = key.trim().startsWith("{") ? key : Buffer.from(key, "base64").toString("utf8");
    const dir = mkdtempSync(join(tmpdir(), "gsa-"));
    const file = join(dir, "key.json");
    try {
      writeFileSync(file, json, { mode: 0o600 });
      chmodSync(file, 0o600);
      sh("gcloud", ["auth", "activate-service-account", `--key-file=${file}`, "--quiet"], 20000);
      const project = JSON.parse(json).project_id;
      if (project) sh("gcloud", ["config", "set", "project", project, "--quiet"]);
      account = sh("gcloud", ["auth", "list", "--filter=status:ACTIVE", "--format=value(account)"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  if (account) ok(`gcloud signed in as ${account}`);
  else if (process.env.CLOUDSDK_AUTH_ACCESS_TOKEN) ok("gcloud uses an access token provided by the environment");
  else bad("gcloud not signed in", "Save a service-account key as GCLOUD_SA_KEY in the environment settings (SETUP.md)");
} catch (err) {
  bad(`gcloud check failed (${err.message.split("\n")[0]})`);
}

// 3. GitHub
if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) ok("GitHub access provided by the environment");

console.log(
  [
    "Agent kit status (from .claude/hooks/session-check.mjs):",
    ...out,
    "  ℹ️  Connectors (Gmail, Google Drive, Cloudflare, GitHub) can't be checked from a hook. Follow the Tool routing table in CLAUDE.md; if a needed connector is missing, stop and tell the user to connect it at https://claude.ai/customize/connectors.",
    ...(missing.length ? ["Still to do:", ...missing.map((m) => `  - ${m}`)] : []),
  ].join("\n"),
);
process.exit(0);
