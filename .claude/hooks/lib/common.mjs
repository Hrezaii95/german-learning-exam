// Shared helpers for the agent-kit hooks. No dependencies: Node >= 18.
// Network calls need NODE_USE_ENV_PROXY=1 inside Claude Code cloud containers
// (set in .claude/settings.json), because Node's fetch ignores HTTPS_PROXY otherwise.

import { readFileSync } from "node:fs";
import { basename, join } from "node:path";

export const projectDir = () =>
  process.env.CLAUDE_PROJECT_DIR || process.cwd();

export function readStdinJson() {
  let raw = "";
  try {
    raw = readFileSync(0, "utf8");
  } catch {
    return {};
  }
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

export function loadPolicy() {
  // A missing or broken policy file must not switch the gates off: fall back
  // to an empty allowlist (everything asks) plus the built-in payment checks.
  const file = join(projectDir(), ".claude", "approval-policy.json");
  let policy;
  try {
    policy = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    policy = { _loadError: err.message };
  }
  policy.email ??= {};
  policy.email.self ??= [];
  policy.email.support ??= [];
  policy.driveShare ??= { allowSelf: true };
  policy.approval ??= {};
  policy.money ??= {};
  return policy;
}

/** Who/where is asking — shown in every Telegram message. */
export function context(input = {}) {
  const project =
    process.env.APPROVAL_PROJECT || basename(projectDir()) || "unknown-project";
  const agent = process.env.APPROVAL_AGENT_NAME || "Claude";
  const sessionId = input.session_id || process.env.CLAUDE_CODE_SESSION_ID || "";
  const session = sessionId ? sessionId.slice(0, 8) : "local";
  let link = "";
  const sdk = process.env.CLAUDE_CODE_REMOTE_SDK_URL || "";
  const m = sdk.match(/cse_([A-Za-z0-9]+)/);
  if (m) link = `https://claude.ai/code/session_${m[1]}`;
  return { project, agent, session, link };
}

export function topicFor(ctx, policy) {
  const mode = process.env.APPROVAL_TOPIC_MODE || policy?.approval?.topicMode || "project";
  return mode === "project+agent" ? `${ctx.project} · ${ctx.agent}` : ctx.project;
}

export function relayConfig() {
  const url = (process.env.APPROVAL_RELAY_URL || "").replace(/\/+$/, "");
  const secret = process.env.APPROVAL_RELAY_SECRET || "";
  return url && secret ? { url, secret } : null;
}

export async function relayCall(cfg, method, path, body, timeoutMs = 15000) {
  const res = await fetch(cfg.url + path, {
    method,
    headers: {
      authorization: `Bearer ${cfg.secret}`,
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const err = new Error(data.error || `relay HTTP ${res.status}`);
    err.status = res.status;
    err.code = data.error;
    throw err;
  }
  return data;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function truncate(s, n) {
  s = String(s ?? "");
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
