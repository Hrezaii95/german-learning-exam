#!/usr/bin/env node
// PreToolUse hook: holds risky tool calls until the owner taps Approve on Telegram.
//
// Fails closed: any error, missing configuration, timeout or "Deny" blocks the call.
// Exit code 2 is used for crashes so Claude Code blocks the tool even if this
// script cannot print a decision.

import {
  context,
  loadPolicy,
  readStdinJson,
  relayCall,
  relayConfig,
  sleep,
  topicFor,
} from "./lib/common.mjs";
import { classify } from "./lib/classify.mjs";

const crash = (err) => {
  process.stderr.write(`approval-gate: blocked because the gate failed: ${err?.message || err}\n`);
  process.exit(2);
};
process.on("uncaughtException", crash);
process.on("unhandledRejection", crash);

function decide(permissionDecision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision,
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

const input = readStdinJson();
const policy = loadPolicy();
const verdict = classify(input.tool_name, input.tool_input, policy);

if (verdict.action === "pass") process.exit(0);
if (verdict.action === "allow") decide("allow", `approval-gate: ${verdict.reason}`);
if (verdict.action === "deny") decide("deny", `approval-gate: ${verdict.reason}`);

// verdict.action === "approve"
const ctx = context(input);
const cfg = relayConfig();
const timeoutSec = Number(process.env.APPROVAL_TIMEOUT_SECONDS || policy.approval.timeoutSeconds || 600);
const fallback = process.env.APPROVAL_FALLBACK || policy.approval.fallbackWhenRelayMissing || "deny";

if (!cfg) {
  const why =
    "Telegram approvals are not configured (APPROVAL_RELAY_URL / APPROVAL_RELAY_SECRET missing). See SETUP.md.";
  if (fallback === "ask") decide("ask", `approval-gate: ${verdict.reason} ${why} Asking in the Claude app instead.`);
  decide("deny", `approval-gate: blocked. ${verdict.reason} ${why} Do not retry through another tool; tell the user.`);
}

let id;
try {
  ({ id } = await relayCall(cfg, "POST", "/request", {
    kind: verdict.kind,
    title: verdict.title,
    lines: verdict.lines,
    preview: verdict.preview,
    tool: input.tool_name,
    topic: topicFor(ctx, policy),
    project: ctx.project,
    agent: ctx.agent,
    session: ctx.session,
    link: ctx.link,
    timeoutSeconds: timeoutSec,
  }));
} catch (err) {
  const hint =
    err.code === "chat_not_bound"
      ? "The bot is not linked to a Telegram group yet: send /bind in the group."
      : `Could not reach the approval relay (${err.message}).`;
  decide("deny", `approval-gate: blocked. ${verdict.reason} ${hint} Do not retry through another tool; tell the user.`);
}

const deadline = Date.now() + timeoutSec * 1000;
let status = "pending";
let failures = 0;
while (Date.now() < deadline) {
  await sleep(Number(process.env.APPROVAL_POLL_MS || 2500));
  try {
    ({ status } = await relayCall(cfg, "GET", `/decision?id=${encodeURIComponent(id)}`));
    failures = 0;
  } catch (err) {
    if (++failures >= 5) {
      decide("deny", `approval-gate: blocked. Lost contact with the approval relay (${err.message}).`);
    }
    continue;
  }
  if (status !== "pending") break;
}

if (status === "approved") decide("allow", "approval-gate: the owner approved this on Telegram.");
if (status === "denied")
  decide("deny", "approval-gate: the owner DENIED this on Telegram. Do not retry it or do it another way; ask the user what to do instead.");

try {
  await relayCall(cfg, "POST", "/expire", { id });
} catch {
  /* best effort */
}
decide(
  "deny",
  `approval-gate: no answer on Telegram within ${Math.round(timeoutSec / 60)} min, so it was blocked. Tell the user it is waiting for their approval; do not retry another way.`,
);
