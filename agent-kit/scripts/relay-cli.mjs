#!/usr/bin/env node
// Small helper for setting up and testing the approval relay.
// Reads APPROVAL_RELAY_URL / APPROVAL_RELAY_SECRET from the environment; never prints the secret.
//
//   NODE_USE_ENV_PROXY=1 node agent-kit/scripts/relay-cli.mjs status
//   NODE_USE_ENV_PROXY=1 node agent-kit/scripts/relay-cli.mjs setup-webhook
//   NODE_USE_ENV_PROXY=1 node agent-kit/scripts/relay-cli.mjs test-approval   # you tap a button on Telegram
//   NODE_USE_ENV_PROXY=1 node agent-kit/scripts/relay-cli.mjs test-notify

import { relayCall, relayConfig, sleep } from "../../.claude/hooks/lib/common.mjs";

const cfg = relayConfig();
if (!cfg) {
  console.error("APPROVAL_RELAY_URL and APPROVAL_RELAY_SECRET must be set (environment settings).");
  process.exit(1);
}

const cmd = process.argv[2];
const base = { project: "agent-kit-test", topic: "agent-kit-test", agent: "relay-cli", session: "manual" };

try {
  if (cmd === "status") {
    const health = await fetch(cfg.url + "/health", { signal: AbortSignal.timeout(8000) }).then((r) => r.json());
    console.log("health:", health);
    console.log("status:", await relayCall(cfg, "GET", "/status"));
  } else if (cmd === "setup-webhook") {
    console.log(await relayCall(cfg, "POST", "/setup-webhook", {}));
  } else if (cmd === "test-notify") {
    console.log(await relayCall(cfg, "POST", "/notify", { ...base, text: "👋 Test notification from relay-cli" }));
  } else if (cmd === "test-approval") {
    const { id } = await relayCall(cfg, "POST", "/request", {
      ...base,
      kind: "policy",
      title: "TEST — tap Approve or Deny (nothing will happen either way)",
      lines: ["This checks that buttons reach the relay."],
      preview: "",
      timeoutSeconds: 300,
    });
    console.log(`Sent request ${id}. Waiting up to 5 min for your tap…`);
    const deadline = Date.now() + 300_000;
    let status = "pending";
    while (status === "pending" && Date.now() < deadline) {
      await sleep(2500);
      ({ status } = await relayCall(cfg, "GET", `/decision?id=${id}`));
    }
    if (status === "pending") {
      await relayCall(cfg, "POST", "/expire", { id });
      status = "expired";
    }
    console.log("Result:", status);
  } else {
    console.log("Usage: relay-cli.mjs status | setup-webhook | test-approval | test-notify");
    process.exit(1);
  }
} catch (err) {
  console.error(`Failed: ${err.message}${err.status ? ` (HTTP ${err.status})` : ""}`);
  process.exit(1);
}
