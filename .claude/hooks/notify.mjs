#!/usr/bin/env node
// Notification + Stop hook: posts "needs your input" and "turn finished" messages
// to the project's Telegram topic. Never blocks Claude: always exits 0.

import { readFileSync } from "node:fs";
import { context, loadPolicy, readStdinJson, relayCall, relayConfig, topicFor, truncate } from "./lib/common.mjs";

function lastAssistantText(input) {
  if (input.last_assistant_message) return String(input.last_assistant_message);
  if (!input.transcript_path) return "";
  try {
    const lines = readFileSync(input.transcript_path, "utf8").trim().split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const e = JSON.parse(lines[i]);
      const msg = e.message || {};
      if (e.type !== "assistant" && msg.role !== "assistant") continue;
      const content = Array.isArray(msg.content) ? msg.content : [{ type: "text", text: msg.content }];
      const text = content.filter((c) => c?.type === "text" && c.text).map((c) => c.text).join("\n").trim();
      if (text) return text;
    }
  } catch {
    /* ignore */
  }
  return "";
}

try {
  const cfg = relayConfig();
  if (!cfg) process.exit(0);
  const input = readStdinJson();
  const event = input.hook_event_name;
  if (event === "Stop" && process.env.APPROVAL_NOTIFY_STOP === "0") process.exit(0);
  if (event === "Stop" && input.stop_hook_active) process.exit(0);

  const ctx = context(input);
  const policy = loadPolicy();
  let text;
  let silent = false;
  if (event === "Notification") {
    text = `🔔 ${input.message || "Claude needs your input."}`;
  } else if (event === "Stop") {
    const summary = truncate(lastAssistantText(input), 600);
    text = `✅ Turn finished${summary ? `\n\n${summary}` : ""}`;
    silent = true;
  } else {
    process.exit(0);
  }

  await relayCall(
    cfg,
    "POST",
    "/notify",
    { topic: topicFor(ctx, policy), project: ctx.project, agent: ctx.agent, session: ctx.session, link: ctx.link, text, silent },
    8000,
  );
} catch {
  /* notifications are best effort */
}
process.exit(0);
