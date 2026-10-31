// Telegram approval relay — Cloudflare Worker (ES module, no dependencies).
//
// Bindings (set in the Cloudflare dashboard or by the deploy step):
//   DB                  D1 database (schema is created automatically)
//   TELEGRAM_BOT_TOKEN  secret  — from @BotFather
//   RELAY_SECRET        secret  — same long random string as APPROVAL_RELAY_SECRET in Claude's environment
//   TELEGRAM_OWNER_ID   var     — your numeric Telegram user id (DM the bot /whoami to get it)
//
// Endpoints (all JSON):
//   GET  /health                      public, {ok:true}
//   GET  /status          (auth)      chat linked? topics on? webhook registered?
//   POST /setup-webhook   (auth)      registers this worker's /telegram URL with Telegram
//   POST /request         (auth)      create an approval request -> {id}
//   GET  /decision?id=    (auth)      -> {status: pending|approved|denied|expired}
//   POST /expire          (auth)      {id} -> mark expired (the hook gave up waiting)
//   POST /notify          (auth)      post an informational message to a topic
//   POST /telegram        Telegram    webhook: button taps, /bind, /unbind, /whoami, /pending

const VERSION = "1.0.0";

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(
      "CREATE TABLE IF NOT EXISTS approvals (id TEXT PRIMARY KEY, status TEXT NOT NULL, text TEXT NOT NULL, chat_id TEXT, message_id INTEGER, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, decided_at INTEGER)",
    ),
    db.prepare("CREATE TABLE IF NOT EXISTS topics (name TEXT PRIMARY KEY, thread_id INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)"),
  ]);
  schemaReady = true;
}

export function _resetForTests() {
  schemaReady = false;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const cut = (s, n) => {
  s = String(s ?? "");
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
};

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function safeEqual(a, b) {
  const [x, y] = await Promise.all([sha256Hex(String(a)), sha256Hex(String(b))]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

const webhookSecret = (env) => sha256Hex("telegram-webhook:" + env.RELAY_SECRET);

async function tg(env, method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }));
  return data;
}

async function getSetting(db, key) {
  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first();
  return row ? row.value : null;
}
async function setSetting(db, key, value) {
  await db
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(key, String(value))
    .run();
}

async function boundChat(db) {
  const chatId = await getSetting(db, "chat_id");
  if (!chatId) return null;
  return { chatId, forum: (await getSetting(db, "forum")) === "1" };
}

async function topicThread(env, chat, name, fresh = false) {
  if (!chat.forum) return undefined;
  name = cut(name || "general", 120);
  if (!fresh) {
    const row = await env.DB.prepare("SELECT thread_id FROM topics WHERE name = ?").bind(name).first();
    if (row) return row.thread_id;
  }
  const r = await tg(env, "createForumTopic", { chat_id: chat.chatId, name });
  if (!r.ok) return undefined; // fall back to the main chat
  const id = r.result.message_thread_id;
  await env.DB.prepare(
    "INSERT INTO topics (name, thread_id) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET thread_id = excluded.thread_id",
  )
    .bind(name, id)
    .run();
  return id;
}

async function sendToTopic(env, chat, topic, payload) {
  let thread = await topicThread(env, chat, topic);
  let r = await tg(env, "sendMessage", { chat_id: chat.chatId, message_thread_id: thread, ...payload });
  if (!r.ok && thread && /thread|topic/i.test(r.description || "")) {
    thread = await topicThread(env, chat, topic, true); // topic was deleted: recreate once
    r = await tg(env, "sendMessage", { chat_id: chat.chatId, message_thread_id: thread, ...payload });
  }
  return r;
}

const KIND_LABEL = { email: "📧 Email", share: "📁 File sharing", money: "💳 Money", policy: "🛡️ Safety settings" };

function footer(b) {
  const parts = [`[${esc(b.agent || "Agent")} · ${esc(b.session || "?")}]`, esc(b.project || "")].filter(Boolean);
  const link = /^https:\/\//.test(b.link || "") ? ` · <a href="${esc(b.link)}">open session</a>` : "";
  return `<i>${parts.join(" · ")}</i>${link}`;
}

function approvalText(b, minutes) {
  const lines = (Array.isArray(b.lines) ? b.lines : []).slice(0, 15).map((l) => esc(cut(l, 300)));
  const preview = b.preview ? `\n<blockquote>${esc(cut(b.preview, 1200))}</blockquote>` : "";
  return [
    `🔐 <b>Approval needed</b> — ${KIND_LABEL[b.kind] || esc(b.kind || "Action")}`,
    `<b>${esc(cut(b.title, 200))}</b>`,
    ...lines,
  ].join("\n") + preview + `\n\n${footer(b)}\n⏳ Auto-denied in ${minutes} min if you don't answer.`;
}

async function authed(request, env) {
  const h = request.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  return token && (await safeEqual(token, env.RELAY_SECRET));
}

async function markDecided(env, row, status, note) {
  const res = await env.DB.prepare(
    "UPDATE approvals SET status = ?, decided_at = ? WHERE id = ? AND status = 'pending'",
  )
    .bind(status, Date.now(), row.id)
    .run();
  const changed = (res.meta?.changes ?? res.changes ?? 0) > 0;
  if (changed && row.message_id) {
    await tg(env, "editMessageText", {
      chat_id: row.chat_id,
      message_id: row.message_id,
      text: `${row.text}\n\n${note}`,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  }
  return changed;
}

async function getApproval(env, id) {
  const row = await env.DB.prepare("SELECT * FROM approvals WHERE id = ?").bind(id).first();
  if (row && row.status === "pending" && Date.now() > row.expires_at) {
    await markDecided(env, row, "expired", "⌛ <b>Expired — denied automatically</b>");
    row.status = "expired";
  }
  return row;
}

// ---------- Telegram webhook ----------

async function handleTelegram(request, env) {
  const got = request.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!(await safeEqual(got, await webhookSecret(env)))) return json({ error: "forbidden" }, 403);
  const update = await request.json().catch(() => ({}));
  const owner = String(env.TELEGRAM_OWNER_ID || "");

  if (update.callback_query) {
    const cq = update.callback_query;
    const answer = (text) => tg(env, "answerCallbackQuery", { callback_query_id: cq.id, text });
    if (!owner || String(cq.from?.id) !== owner) {
      await answer("Not authorized.");
      return json({ ok: true });
    }
    const m = String(cq.data || "").match(/^(a|d):([0-9a-f-]{36})$/);
    if (!m) {
      await answer("Unknown button.");
      return json({ ok: true });
    }
    const row = await getApproval(env, m[2]);
    if (!row || String(row.chat_id) !== String(cq.message?.chat?.id)) {
      await answer("Request not found.");
      return json({ ok: true });
    }
    if (row.status !== "pending") {
      await answer(`Already ${row.status}.`);
      return json({ ok: true });
    }
    const approve = m[1] === "a";
    const when = new Date().toISOString().slice(11, 16) + " UTC";
    await markDecided(env, row, approve ? "approved" : "denied", approve ? `✅ <b>Approved</b> (${when})` : `❌ <b>Denied</b> (${when})`);
    await answer(approve ? "Approved ✅" : "Denied ❌");
    return json({ ok: true });
  }

  const msg = update.message;
  if (msg && typeof msg.text === "string") {
    const cmd = msg.text.trim().split(/\s+/)[0].replace(/@\w+$/, "").toLowerCase();
    const reply = (text) =>
      tg(env, "sendMessage", { chat_id: msg.chat.id, message_thread_id: msg.message_thread_id, text, parse_mode: "HTML" });
    const fromOwner = owner && String(msg.from?.id) === owner;

    if (cmd === "/whoami" || cmd === "/start") {
      await reply(
        `Your Telegram user id: <code>${esc(msg.from?.id)}</code>\nThis chat id: <code>${esc(msg.chat.id)}</code>` +
          (owner ? (fromOwner ? "\nYou are the owner ✅" : "") : "\nSet TELEGRAM_OWNER_ID on the relay to this user id."),
      );
    } else if (cmd === "/bind" && fromOwner) {
      if (msg.chat.type === "private") {
        await reply("Send /bind inside the group you want approvals in, not in this private chat.");
      } else {
        await setSetting(env.DB, "chat_id", msg.chat.id);
        await setSetting(env.DB, "forum", msg.chat.is_forum ? "1" : "0");
        await env.DB.prepare("DELETE FROM topics").run();
        await reply(
          msg.chat.is_forum
            ? "✅ Linked. Approvals will arrive here, one topic per project."
            : "✅ Linked, but Topics are OFF in this group, so everything lands in one thread. Turn on Topics in group settings, then send /bind again.",
        );
      }
    } else if (cmd === "/unbind" && fromOwner) {
      await env.DB.prepare("DELETE FROM settings WHERE key IN ('chat_id','forum')").run();
      await reply("Unlinked. New approval requests will be blocked until you /bind again.");
    } else if (cmd === "/pending" && fromOwner) {
      const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM approvals WHERE status = 'pending' AND expires_at > ?")
        .bind(Date.now())
        .first();
      await reply(`Pending approvals: ${r?.n ?? 0}`);
    }
  }
  return json({ ok: true });
}

// ---------- API for the hooks ----------

async function handleApi(request, env, url) {
  if (!(await authed(request, env))) return json({ error: "unauthorized" }, 401);
  const path = url.pathname;

  if (path === "/status" && request.method === "GET") {
    const chat = await boundChat(env.DB);
    const info = await tg(env, "getWebhookInfo", {});
    return json({
      ok: true,
      version: VERSION,
      chatBound: !!chat,
      forum: !!chat?.forum,
      ownerSet: !!env.TELEGRAM_OWNER_ID,
      webhook: info.ok ? info.result.url === `${url.origin}/telegram` : null,
    });
  }

  if (path === "/setup-webhook" && request.method === "POST") {
    const r = await tg(env, "setWebhook", {
      url: `${url.origin}/telegram`,
      secret_token: await webhookSecret(env),
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    });
    return json({ ok: !!r.ok, description: r.description }, r.ok ? 200 : 502);
  }

  if (path === "/request" && request.method === "POST") {
    const b = await request.json().catch(() => null);
    if (!b || typeof b.title !== "string") return json({ error: "bad_request" }, 400);
    const chat = await boundChat(env.DB);
    if (!chat) return json({ error: "chat_not_bound" }, 409);
    const timeoutSec = Math.min(Math.max(Number(b.timeoutSeconds) || 600, 30), 3600);
    const id = crypto.randomUUID();
    const text = approvalText(b, Math.round(timeoutSec / 60));
    const now = Date.now();
    await env.DB.prepare(
      "INSERT INTO approvals (id, status, text, chat_id, created_at, expires_at) VALUES (?, 'pending', ?, ?, ?, ?)",
    )
      .bind(id, text, String(chat.chatId), now, now + timeoutSec * 1000)
      .run();
    const r = await sendToTopic(env, chat, b.topic || b.project, {
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Approve", callback_data: `a:${id}` },
          { text: "❌ Deny", callback_data: `d:${id}` },
        ]],
      },
    });
    if (!r.ok) {
      await env.DB.prepare("UPDATE approvals SET status = 'denied', decided_at = ? WHERE id = ?").bind(now, id).run();
      return json({ error: "telegram_send_failed", description: r.description }, 502);
    }
    await env.DB.prepare("UPDATE approvals SET message_id = ? WHERE id = ?").bind(r.result.message_id, id).run();
    // housekeeping: forget requests older than 7 days
    await env.DB.prepare("DELETE FROM approvals WHERE created_at < ?").bind(now - 7 * 864e5).run();
    return json({ id });
  }

  if (path === "/decision" && request.method === "GET") {
    const id = url.searchParams.get("id") || "";
    const row = await getApproval(env, id);
    if (!row) return json({ error: "not_found" }, 404);
    return json({ status: row.status });
  }

  if (path === "/expire" && request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    const row = await env.DB.prepare("SELECT * FROM approvals WHERE id = ?").bind(String(b.id || "")).first();
    if (row) await markDecided(env, row, "expired", "⌛ <b>Expired — denied automatically</b>");
    return json({ ok: true });
  }

  if (path === "/notify" && request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    const chat = await boundChat(env.DB);
    if (!chat) return json({ error: "chat_not_bound" }, 409);
    const r = await sendToTopic(env, chat, b.topic || b.project, {
      text: `${esc(cut(b.text, 3000))}\n\n${footer(b)}`,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      disable_notification: !!b.silent,
    });
    return json({ ok: !!r.ok }, r.ok ? 200 : 502);
  }

  return json({ error: "not_found" }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return json({ ok: true, version: VERSION });
    if (!env.RELAY_SECRET || env.RELAY_SECRET.length < 24 || !env.TELEGRAM_BOT_TOKEN || !env.DB) {
      return json({ error: "relay_not_configured" }, 500);
    }
    await ensureSchema(env.DB);
    try {
      if (url.pathname === "/telegram" && request.method === "POST") return await handleTelegram(request, env);
      return await handleApi(request, env, url);
    } catch (err) {
      return json({ error: "internal", description: String(err?.message || err) }, 500);
    }
  },
};
