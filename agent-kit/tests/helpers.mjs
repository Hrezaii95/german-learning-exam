// Test doubles: an in-memory D1 (node:sqlite) and a fake Telegram Bot API.
import { DatabaseSync } from "node:sqlite";

export function fakeD1() {
  const db = new DatabaseSync(":memory:");
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
    all: async () => ({ results: db.prepare(sql).all(...args) }),
  });
  return {
    prepare: (sql) => stmt(sql),
    batch: async (stmts) => {
      for (const s of stmts) await s.run();
    },
  };
}

export function fakeTelegram() {
  const calls = [];
  let nextMessage = 1;
  let nextThread = 100;
  let webhookUrl = "";
  const realFetch = globalThis.fetch;
  const handler = async (url, init) => {
    const u = String(url);
    if (!u.startsWith("https://api.telegram.org/")) return realFetch(url, init);
    const method = u.split("/").pop();
    const body = init?.body ? JSON.parse(init.body) : {};
    calls.push({ method, body, token: u.split("/")[3] });
    let result = true;
    if (method === "sendMessage") result = { message_id: nextMessage++ };
    if (method === "createForumTopic") result = { message_thread_id: nextThread++, name: body.name };
    if (method === "setWebhook") webhookUrl = body.url;
    if (method === "getWebhookInfo") result = { url: webhookUrl };
    return new Response(JSON.stringify({ ok: true, result }), { headers: { "content-type": "application/json" } });
  };
  return {
    calls,
    install() {
      globalThis.fetch = handler;
    },
    restore() {
      globalThis.fetch = realFetch;
    },
    last(method) {
      return [...calls].reverse().find((c) => c.method === method);
    },
  };
}

export const SECRET = "test-relay-secret-0123456789abcdef";
export const OWNER = 4242;
export const GROUP = -100777;

export function makeEnv() {
  return { DB: fakeD1(), TELEGRAM_BOT_TOKEN: "123:abc", RELAY_SECRET: SECRET, TELEGRAM_OWNER_ID: String(OWNER) };
}
