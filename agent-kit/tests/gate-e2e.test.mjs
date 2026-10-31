// End-to-end: runs the real approval-gate.mjs hook as Claude Code would (JSON on stdin)
// against the real relay worker served on localhost, with a fake Telegram behind it.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import worker, { _resetForTests } from "../relay/worker.js";
import { GROUP, OWNER, SECRET, fakeTelegram, makeEnv } from "./helpers.mjs";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
let server, base, env, tgm, project;

before(async () => {
  _resetForTests();
  env = makeEnv();
  tgm = fakeTelegram();
  tgm.install();
  server = createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const r = await worker.fetch(
      new Request(base + req.url, { method: req.method, headers: req.headers, body: req.method === "GET" ? undefined : body }),
      env,
    );
    res.writeHead(r.status, { "content-type": "application/json" });
    res.end(await r.text());
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;

  // a throwaway project dir with the kit and a test allowlist
  project = mkdtempSync(join(tmpdir(), "kit-"));
  mkdirSync(join(project, ".claude"));
  cpSync(join(repo, ".claude", "hooks"), join(project, ".claude", "hooks"), { recursive: true });
  writeFileSync(
    join(project, ".claude", "approval-policy.json"),
    JSON.stringify({ email: { self: [], support: ["support@name.am"] }, approval: { timeoutSeconds: 30 } }),
  );
});

after(() => {
  tgm.restore();
  server.close();
});

function runGate(payload, extraEnv = {}) {
  return new Promise((resolve) => {
    const childEnv = {
      PATH: process.env.PATH,
      CLAUDE_PROJECT_DIR: project,
      APPROVAL_RELAY_URL: base,
      APPROVAL_RELAY_SECRET: SECRET,
      APPROVAL_POLL_MS: "100",
      ...extraEnv,
    };
    for (const [k, v] of Object.entries(childEnv)) if (v === undefined) delete childEnv[k];
    const p = spawn(process.execPath, [join(project, ".claude", "hooks", "approval-gate.mjs")], { env: childEnv });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => {
      let decision = null;
      try {
        decision = JSON.parse(out).hookSpecificOutput;
      } catch {
        /* no JSON */
      }
      resolve({ code, decision, err });
    });
    p.stdin.end(JSON.stringify({ session_id: "sess-1234-5678", hook_event_name: "PreToolUse", ...payload }));
  });
}

const outsideEmail = { tool_name: "mcp__Gmail__send_message", tool_input: { to: ["boss@company.com"], subject: "Q3", body: "numbers" } };

async function waitForPending() {
  for (let i = 0; i < 100; i++) {
    const row = await env.DB.prepare("SELECT id FROM approvals WHERE status = 'pending' ORDER BY created_at DESC").first();
    if (row) return row.id;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("no pending request appeared");
}

const tap = async (data) =>
  worker.fetch(
    new Request(base + "/telegram", {
      method: "POST",
      headers: {
        "x-telegram-bot-api-secret-token": [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("telegram-webhook:" + SECRET)))]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
      },
      body: JSON.stringify({ callback_query: { id: "x", data, from: { id: OWNER }, message: { chat: { id: GROUP } } } }),
    }),
    env,
  );

test("unrelated tools pass straight through (no output, exit 0)", async () => {
  const r = await runGate({ tool_name: "Bash", tool_input: { command: "npm test" } });
  assert.equal(r.code, 0);
  assert.equal(r.decision, null);
});

test("allowlisted support email is allowed without Telegram", async () => {
  const r = await runGate({ tool_name: "mcp__Gmail__send_message", tool_input: { to: ["support@name.am"] } });
  assert.equal(r.decision.permissionDecision, "allow");
});

test("not bound yet -> blocked with a /bind hint", async () => {
  const r = await runGate(outsideEmail);
  assert.equal(r.decision.permissionDecision, "deny");
  assert.match(r.decision.permissionDecisionReason, /\/bind/);
});

test("no relay configured -> blocked (fail closed)", async () => {
  const r = await runGate(outsideEmail, { APPROVAL_RELAY_URL: undefined });
  assert.equal(r.decision.permissionDecision, "deny");
  assert.match(r.decision.permissionDecisionReason, /not configured/);
});

test("relay unreachable -> blocked", async () => {
  const r = await runGate(outsideEmail, { APPROVAL_RELAY_URL: "http://127.0.0.1:9" });
  assert.equal(r.decision.permissionDecision, "deny");
});

test("wrong secret -> blocked", async () => {
  const r = await runGate(outsideEmail, { APPROVAL_RELAY_SECRET: "x".repeat(40) });
  assert.equal(r.decision.permissionDecision, "deny");
});

test("owner taps Approve -> allowed", async () => {
  await worker.fetch(
    new Request(base + "/telegram", {
      method: "POST",
      headers: {
        "x-telegram-bot-api-secret-token": [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("telegram-webhook:" + SECRET)))]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
      },
      body: JSON.stringify({ message: { text: "/bind", from: { id: OWNER }, chat: { id: GROUP, type: "supergroup", is_forum: true } } }),
    }),
    env,
  );
  const pending = runGate(outsideEmail);
  const id = await waitForPending();
  const msg = tgm.last("sendMessage").body.text;
  assert.match(msg, /boss@company\.com/);
  assert.match(msg, /Q3/);
  assert.match(msg, /\[Claude · sess-123\]/);
  await tap(`a:${id}`);
  const r = await pending;
  assert.equal(r.decision.permissionDecision, "allow");
});

test("owner taps Deny -> blocked and told not to retry", async () => {
  const pending = runGate(outsideEmail);
  const id = await waitForPending();
  await tap(`d:${id}`);
  const r = await pending;
  assert.equal(r.decision.permissionDecision, "deny");
  assert.match(r.decision.permissionDecisionReason, /DENIED/);
});

test("no answer before the timeout -> blocked and the Telegram message is marked expired", async () => {
  const r = await runGate(outsideEmail, { APPROVAL_TIMEOUT_SECONDS: "1" });
  assert.equal(r.decision.permissionDecision, "deny");
  assert.match(r.decision.permissionDecisionReason, /no answer/);
  assert.match(tgm.last("editMessageText").body.text, /Expired/);
});

test("garbage on stdin -> exit 2 (Claude Code blocks the tool)", async () => {
  const r = await new Promise((resolve) => {
    const p = spawn(process.execPath, [join(project, ".claude", "hooks", "approval-gate.mjs")], {
      env: { PATH: process.env.PATH, CLAUDE_PROJECT_DIR: project },
    });
    p.on("close", (code) => resolve(code));
    p.stdin.end("{not json");
  });
  assert.equal(r, 2);
});
