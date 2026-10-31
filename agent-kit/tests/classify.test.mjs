import { test } from "node:test";
import assert from "node:assert/strict";
import { addressMatches, classify } from "../../.claude/hooks/lib/classify.mjs";

const policy = (over = {}) => ({
  email: { self: ["me@gmail.com", "me2@gmail.com"], support: ["support@name.am", "@cloudflare.com", "@*.google.com"] },
  driveShare: { allowSelf: true },
  money: {},
  ...over,
});

test("address matching: exact, domain, subdomain wildcard, display names", () => {
  assert.ok(addressMatches("Support <SUPPORT@name.am>", "support@name.am"));
  assert.ok(addressMatches("x@cloudflare.com", "@cloudflare.com"));
  assert.ok(!addressMatches("x@evil-cloudflare.com", "@cloudflare.com"));
  assert.ok(!addressMatches("x@a.cloudflare.com", "@cloudflare.com"));
  assert.ok(addressMatches("x@cloud.google.com", "@*.google.com"));
  assert.ok(addressMatches("x@google.com", "@*.google.com"));
  assert.ok(!addressMatches("x@notgoogle.com", "@*.google.com"));
  assert.ok(!addressMatches("support@attacker.com", "support@name.am"));
});

test("email to allowlisted support/self passes without asking", () => {
  const v = classify("mcp__Gmail__send_message", { to: ["support@name.am"], cc: ["me@gmail.com"], subject: "DNS" }, policy());
  assert.equal(v.action, "allow");
});

test("email to an outside person needs approval and names them", () => {
  const v = classify("mcp__Gmail__send_message", { to: ["support@name.am", "boss@company.com"], subject: "Hi", body: "hello" }, policy());
  assert.equal(v.action, "approve");
  assert.equal(v.kind, "email");
  assert.ok(v.lines.some((l) => l.includes("Not on allowlist: boss@company.com")));
  assert.equal(v.preview, "hello");
});

test("support@ on another domain is not trusted", () => {
  const v = classify("mcp__Gmail__send_message", { to: ["support@attacker.com"] }, policy());
  assert.equal(v.action, "approve");
});

test("sending a draft or replying without explicit recipients always asks", () => {
  assert.equal(classify("mcp__Gmail__send_message", { draftId: "r1" }, policy()).action, "approve");
  assert.equal(classify("mcp__Gmail__reply", { messageId: "m1", body: "ok" }, policy()).action, "approve");
  assert.equal(
    classify("mcp__Gmail__reply", { messageId: "m1", to: ["support@name.am"], replyAll: true }, policy()).action,
    "approve",
  );
  assert.equal(classify("mcp__Gmail__reply", { messageId: "m1", to: ["support@name.am"] }, policy()).action, "allow");
});

test("forward to outside needs approval; other connector prefixes are covered too", () => {
  assert.equal(classify("mcp__Gmail__forward", { messageId: "m", to: ["friend@x.com"] }, policy()).action, "approve");
  assert.equal(classify("mcp__claude_ai_Gmail__send_message", { to: ["friend@x.com"] }, policy()).action, "approve");
});

test("drafts, reads and labels are not gated", () => {
  for (const t of ["create_draft", "search_threads", "get_thread", "label_message", "list_drafts"]) {
    assert.equal(classify(`mcp__Gmail__${t}`, { to: ["x@y.com"] }, policy()).action, "pass", t);
  }
});

test("empty allowlist: every outside email asks", () => {
  const v = classify("mcp__Gmail__send_message", { to: ["support@name.am"] }, { email: { self: [], support: [] } });
  assert.equal(v.action, "approve");
});

test("Drive sharing: own account passes, anyone else asks", () => {
  assert.equal(classify("mcp__Google_Drive__share_file", { fileId: "f", role: "reader", emailAddress: "me2@gmail.com" }, policy()).action, "allow");
  assert.equal(classify("mcp__Google_Drive__share_file", { fileId: "f", role: "writer", emailAddress: "x@y.com" }, policy()).action, "approve");
  assert.equal(classify("mcp__Google_Drive__share_file", { fileId: "f", role: "reader", chatSpaceId: "spaces/1" }, policy()).action, "approve");
  assert.equal(classify("mcp__Google_Drive__search_files", {}, policy()).action, "pass");
});

test("Composio is denied", () => {
  assert.equal(classify("mcp__composio__COMPOSIO_MULTI_EXECUTE_TOOL", {}, policy()).action, "deny");
});

test("shell email is denied (use the Gmail connector)", () => {
  for (const c of [
    "echo hi | sendmail bob@x.com",
    "python3 -c 'import smtplib'",
    "curl -X POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    "curl smtps://smtp.gmail.com:465",
  ]) {
    assert.equal(classify("Bash", { command: c }, policy()).action, "deny", c);
  }
  assert.equal(classify("Bash", { command: "npm test" }, policy()).action, "pass");
});

test("billing commands need approval", () => {
  for (const c of [
    "gcloud billing projects link my-proj --billing-account=0X0X",
    "gcloud beta billing accounts list",
    "gcloud domains registrations register example.com",
    "curl https://api.stripe.com/v1/charges",
  ]) {
    assert.equal(classify("Bash", { command: c }, policy()).action, "approve", c);
  }
  assert.equal(classify("Bash", { command: "gcloud run deploy web --source ." }, policy()).action, "pass");
});

test("payment-shaped MCP tools need approval; similar words do not trip it", () => {
  assert.equal(classify("mcp__Stripe__create_payment_intent", {}, policy()).action, "approve");
  assert.equal(classify("mcp__shop__checkout_cart", {}, policy()).action, "approve");
  assert.equal(classify("mcp__PDF_Viewer__display_pdf", {}, policy()).action, "pass");
  assert.equal(classify("mcp__Supabase__list_projects", {}, policy()).action, "pass");
});

test("browser on checkout pages needs approval", () => {
  assert.equal(
    classify("mcp__plugin_browser-use_browser-use__browser_exec", { code: "click('Place order')" }, policy()).action,
    "approve",
  );
  assert.equal(
    classify("mcp__plugin_browser-use_browser-use__browser_exec", { code: "new_tab('https://docs.python.org')" }, policy()).action,
    "pass",
  );
});

test("Cloudflare registrar/billing needs approval, normal Cloudflare work passes", () => {
  assert.equal(classify("mcp__cloudflare-api__execute", { code: "accounts/1/registrar/domains/x.com" }, policy()).action, "approve");
  assert.equal(classify("mcp__cloudflare-api__execute", { code: "workers/scripts/relay" }, policy()).action, "pass");
});

test("policy extras can add patterns but not remove built-ins", () => {
  const p = policy({ money: { extraBashPatterns: ["\\bmybank\\b"], bashPatterns: [] } });
  assert.equal(classify("Bash", { command: "mybank transfer 10" }, p).action, "approve");
  assert.equal(classify("Bash", { command: "gcloud billing accounts list" }, p).action, "approve");
});

test("changing the safety kit needs approval; reading it does not", () => {
  assert.equal(classify("Edit", { file_path: "/repo/.claude/approval-policy.json" }, policy()).action, "approve");
  assert.equal(classify("Write", { file_path: "/repo/.claude/hooks/approval-gate.mjs" }, policy()).action, "approve");
  assert.equal(classify("Edit", { file_path: "/repo/.claude/settings.json" }, policy()).action, "approve");
  assert.equal(classify("Edit", { file_path: "/repo/web/app.js" }, policy()).action, "pass");
  assert.equal(classify("Bash", { command: "sed -i 's/x/y/' .claude/approval-policy.json" }, policy()).action, "approve");
  assert.equal(classify("Bash", { command: "echo '{}' > .claude/settings.json" }, policy()).action, "approve");
  assert.equal(classify("Bash", { command: "cat .claude/approval-policy.json 2>/dev/null" }, policy()).action, "pass");
  assert.equal(classify("Bash", { command: "rm -rf .claude/hooks" }, policy()).action, "approve");
});

test("a broken/missing policy still gates (empty allowlist, built-in money checks)", () => {
  const p = { _loadError: "boom" };
  assert.equal(classify("mcp__Gmail__send_message", { to: ["support@name.am"] }, p).action, "approve");
  assert.equal(classify("Bash", { command: "gcloud billing accounts list" }, p).action, "approve");
});
