// Decides what the approval gate does with one tool call.
// Pure function: no I/O, so it is fully unit-tested (agent-kit/tests).
//
// Returns one of:
//   { action: "pass" }                         -> not our business; normal permissions apply
//   { action: "allow", reason }                -> e.g. email only to allowlisted support/self addresses
//   { action: "deny", reason }                 -> wrong path (use the native connector instead)
//   { action: "approve", kind, title, lines, preview, reason } -> ask the owner on Telegram

import { truncate } from "./common.mjs";

const PROTECTED_PATH = /(^|[\/\\])\.claude[\/\\](settings(\.local)?\.json|approval-policy\.json|hooks([\/\\]|$))/;
// Looser match for shell commands (relative paths, `cd .claude && ...`).
const BASH_PROTECTED = /\.claude[\/\\](settings(\.local)?\.json|approval-policy\.json|hooks)\b|approval-policy\.json|approval-gate\.mjs|\bcd\s+["']?[^\s;&|]*\.claude\b/;

const BASH_EMAIL = [
  /\b(sendmail|mailx|msmtp|ssmtp|swaks|mutt)\b/,
  /\bsmtplib\b|\bnodemailer\b|\bsmtp(s)?:\/\//i,
  /\bsmtp\.[a-z0-9.-]+\b/i,
  /gmail\.googleapis\.com/i,
];

const BASH_WRITE_HINTS =
  />|\btee\b|\bsed\b[^|;&]*\s-i|\bperl\b[^|;&]*\s-[a-z]*i|\b(mv|cp|rm|chmod|chown|ln|truncate|install|rsync|dd|touch|mkdir)\b|\bgit\s+(checkout|restore|reset|apply|stash|rm|mv|clean)\b|\b(python3?|node|ruby|perl|bash|sh)\b\s+-(c|e)\b/;

// Built-in payment detection. approval-policy.json can only ADD patterns (money.extra*).
export const DEFAULT_MONEY = {
  "bashPatterns": [
    "\\bgcloud\\b[^\\n]*\\bbilling\\b",
    "\\bgcloud\\b[^\\n]*\\bdomains\\s+registrations\\s+(register|renew|transfer)",
    "\\bstripe\\b\\s+(charges|payment_intents|subscriptions|invoices|checkout)",
    "api\\.stripe\\.com",
    "api(-m)?\\.(sandbox\\.)?paypal\\.com",
    "api\\.cloudflare\\.com[^\\s]*/registrar",
    "\\bbilling\\b[^\\n]*\\b(enable|link|create|update|set)\\b"
  ],
  "toolNamePatterns": [
    "pay(ment)?s?",
    "billing",
    "checkout",
    "stripe",
    "paypal",
    "purchase",
    "invoice",
    "subscription"
  ],
  "browserToolPatterns": [
    "browser",
    "chrome",
    "computer",
    "playwright",
    "puppeteer"
  ],
  "browserInputPatterns": [
    "checkout",
    "payment",
    "billing",
    "card[\\s_-]?number",
    "\\bcvv\\b|\\bcvc\\b",
    "pay\\s*now",
    "place\\s*order",
    "buy\\s*now",
    "confirm\\s*(order|purchase|payment)",
    "\\bpurchase\\b",
    "\\bsubscribe\\b",
    "add\\s*to\\s*cart"
  ],
  "cloudflareInputPatterns": [
    "registrar",
    "billing",
    "subscriptions?",
    "purchase",
    "domains?[^\\n]{0,40}(register|renew|transfer)"
  ]
};

export function splitToolName(name = "") {
  const m = name.match(/^mcp__(.+?)__(.+)$/);
  return m ? { server: m[1], tool: m[2], isMcp: true } : { server: "", tool: name, isMcp: false };
}

const tokens = (s) => String(s).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

function anyTokenMatches(patterns = [], name) {
  const toks = tokens(name);
  return patterns.some((p) => {
    const re = new RegExp(`^(?:${p})$`, "i");
    return toks.some((t) => re.test(t));
  });
}

const anyRegex = (patterns = [], text, flags = "i") =>
  patterns.some((p) => new RegExp(p, flags).test(text));

export function normalizeAddress(raw) {
  const s = String(raw ?? "").trim();
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim().toLowerCase();
}

export function addressMatches(addr, entry) {
  addr = normalizeAddress(addr);
  entry = String(entry).trim().toLowerCase();
  if (!addr.includes("@") || !entry) return false;
  const domain = addr.split("@").pop();
  if (entry.startsWith("@*.")) {
    const base = entry.slice(3);
    return domain === base || domain.endsWith("." + base);
  }
  if (entry.startsWith("@")) return domain === entry.slice(1);
  return addr === entry;
}

const inList = (addr, list = []) => list.some((e) => addressMatches(addr, e));

function listOf(v) {
  if (!v) return [];
  return (Array.isArray(v) ? v : String(v).split(/[,;]/)).map((x) => String(x).trim()).filter(Boolean);
}

function stripHtml(html) {
  return String(html ?? "")
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>|<\/p>|<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function emailDetails(tool, input) {
  const to = listOf(input.to ?? input.recipients ?? input.recipient);
  const cc = listOf(input.cc);
  const bcc = listOf(input.bcc);
  const all = [...to, ...cc, ...bcc];

  // Cases where the real recipient list is not in the call itself.
  const unknown = [];
  if (input.draftId) unknown.push(`sends existing draft ${input.draftId} (recipients not visible here)`);
  if (/reply/i.test(tool) && (input.replyAll || to.length === 0))
    unknown.push(input.replyAll ? "reply-all to the original thread's recipients" : "reply to the original sender");
  if (all.length === 0 && unknown.length === 0) unknown.push("no recipients listed");

  const attachments = (input.attachments || []).map((a) => a.filename || "(unnamed)");
  const lines = [];
  if (to.length) lines.push(`To: ${to.join(", ")}`);
  if (cc.length) lines.push(`Cc: ${cc.join(", ")}`);
  if (bcc.length) lines.push(`Bcc: ${bcc.join(", ")}`);
  for (const u of unknown) lines.push(`⚠️ ${u}`);
  if (input.subject) lines.push(`Subject: ${input.subject}`);
  if (input.messageId) lines.push(`On message: ${input.messageId}`);
  if (attachments.length) lines.push(`Attachments: ${attachments.join(", ")}`);

  const preview = truncate(
    input.body || input.forwardText || stripHtml(input.htmlBody) || input.text || "",
    700,
  );
  return { all, unknown, lines, preview };
}

export function classify(toolName, toolInput, policy) {
  const input = toolInput || {};
  policy = policy || {};
  policy.email ??= {};
  const { server, tool, isMcp } = splitToolName(toolName);
  const srv = server.toLowerCase();
  const extra = policy.money || {};
  const money = {};
  for (const [k, v] of Object.entries(DEFAULT_MONEY)) {
    const key = "extra" + k[0].toUpperCase() + k.slice(1);
    money[k] = [...v, ...(Array.isArray(extra[key]) ? extra[key] : [])];
  }

  // 1. Duplicate path that bypasses native connectors and their gates.
  if (isMcp && srv === "composio") {
    return {
      action: "deny",
      reason:
        "Composio is disabled in this project. Use the native connector named in CLAUDE.md (Tool routing). If none exists, stop and tell the user.",
    };
  }

  // 2. Changes to the safety kit itself always need the owner.
  if (["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(toolName)) {
    const p = input.file_path || input.notebook_path || "";
    if (PROTECTED_PATH.test(p)) {
      return {
        action: "approve",
        kind: "policy",
        title: "Change to the approval/safety settings",
        lines: [`${toolName}: ${p}`],
        preview: truncate(input.new_string ?? input.content ?? input.new_source ?? "", 700),
        reason: "Edits to .claude settings, hooks or approval policy need the owner's approval.",
      };
    }
    return { action: "pass" };
  }

  if (toolName === "Bash") {
    const cmd = String(input.command || "");
    if (BASH_EMAIL.some((re) => re.test(cmd))) {
      return {
        action: "deny",
        reason:
          "Sending email from the shell is blocked. Use the native Gmail connector (its sends go through the approval gate).",
      };
    }
    const cleaned = cmd.replace(/\d?>\s*\/dev\/null|2>&1/g, "");
    if (BASH_PROTECTED.test(cmd) && BASH_WRITE_HINTS.test(cleaned)) {
      return {
        action: "approve",
        kind: "policy",
        title: "Shell command touching the approval/safety settings",
        lines: [],
        preview: truncate(cmd, 700),
        reason: "Commands that may modify .claude settings, hooks or approval policy need the owner's approval.",
      };
    }
    if (anyRegex(money.bashPatterns, cmd)) {
      return {
        action: "approve",
        kind: "money",
        title: "Billing / payment command",
        lines: [],
        preview: truncate(cmd, 700),
        reason: "Billing and payment actions need the owner's approval.",
      };
    }
    return { action: "pass" };
  }

  if (!isMcp) return { action: "pass" };

  // 3. Email out of any mail connector.
  const isMailServer = /mail|outlook/.test(srv);
  if (isMailServer && /(^|_)(send|reply|forward)/i.test(tool)) {
    const d = emailDetails(tool, input);
    const allowed = [...(policy.email.self || []), ...(policy.email.support || [])];
    if (d.unknown.length === 0 && d.all.length > 0 && d.all.every((a) => inList(a, allowed))) {
      return { action: "allow", reason: "All recipients are on the support/self allowlist." };
    }
    const outside = d.all.filter((a) => !inList(a, allowed));
    return {
      action: "approve",
      kind: "email",
      title: `Email via ${server} (${tool})`,
      lines: outside.length ? [...d.lines, `Not on allowlist: ${outside.join(", ")}`] : d.lines,
      preview: d.preview,
      reason: "Emails to people or organizations outside the support allowlist need the owner's approval.",
    };
  }

  // 4. Sharing Drive files with someone.
  if (/drive/.test(srv) && /share/i.test(tool)) {
    const who = input.emailAddress ? normalizeAddress(input.emailAddress) : "";
    if (who && policy.driveShare?.allowSelf !== false && inList(who, policy.email.self)) {
      return { action: "allow", reason: "Sharing with one of the owner's own accounts." };
    }
    return {
      action: "approve",
      kind: "share",
      title: `Share a Drive file (${tool})`,
      lines: [
        `File: ${input.fileId || "?"}`,
        `With: ${who || input.chatSpaceId || "?"}`,
        `Role: ${input.role || "?"}`,
        ...(input.expirationTime ? [`Expires: ${input.expirationTime}`] : []),
      ],
      preview: "",
      reason: "Sharing files with other people needs the owner's approval.",
    };
  }

  const inputText = JSON.stringify(input);

  // 5. Payment-shaped tools.
  if (anyTokenMatches(money.toolNamePatterns, `${server} ${tool}`)) {
    return {
      action: "approve",
      kind: "money",
      title: `Payment-related tool: ${server} → ${tool}`,
      lines: [],
      preview: truncate(inputText, 700),
      reason: "Billing and payment actions need the owner's approval.",
    };
  }

  // 6. Browser on checkout/payment pages.
  if (anyRegex(money.browserToolPatterns, toolName) && anyRegex(money.browserInputPatterns, inputText)) {
    return {
      action: "approve",
      kind: "money",
      title: `Browser action that looks like a payment (${tool})`,
      lines: [],
      preview: truncate(inputText, 700),
      reason: "Browser actions on checkout/payment pages need the owner's approval.",
    };
  }

  // 7. Cloudflare billing / registrar.
  if (/cloudflare/.test(srv) && anyRegex(money.cloudflareInputPatterns, inputText)) {
    return {
      action: "approve",
      kind: "money",
      title: `Cloudflare billing/registrar action (${tool})`,
      lines: [],
      preview: truncate(inputText, 700),
      reason: "Cloudflare billing and domain purchases need the owner's approval.",
    };
  }

  return { action: "pass" };
}
