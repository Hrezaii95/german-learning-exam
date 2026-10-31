import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import worker, { _resetForTests } from "../relay/worker.js";
import { GROUP, OWNER, SECRET, fakeTelegram, makeEnv } from "./helpers.mjs";

const ORIGIN = "https://relay.example.workers.dev";
let env, tgm;

const api = (method, path, body, secret = SECRET) =>
  worker.fetch(
    new Request(ORIGIN + path, {
      method,
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );

async function webhookSecret() {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("telegram-webhook:" + SECRET));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function tgUpdate(update, secret) {
  return worker.fetch(
    new Request(ORIGIN + "/telegram", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": secret ?? (await webhookSecret()), "content-type": "application/json" },
      body: JSON.stringify(update),
    }),
    env,
  );
}

const bind = (isForum = true, from = OWNER) =>
  tgUpdate({ message: { text: "/bind", from: { id: from }, chat: { id: GROUP, type: "supergroup", is_forum: isForum } } });

const tap = (data, from = OWNER, chatId = GROUP) =>
  tgUpdate({ callback_query: { id: "cq1", data, from: { id: from }, message: { chat: { id: chatId } } } });

const request = (over = {}) =>
  api("POST", "/request", {
    kind: "email",
    title: "Email via Gmail",
    lines: ["To: boss@company.com"],
    preview: "<b>hi</b>",
    topic: "german-learning-exam",
    project: "german-learning-exam",
    agent: "Claude",
    session: "abcd1234",
    timeoutSeconds: 600,
    ...over,
  });

beforeEach(() => {
  _resetForTests();
  env = makeEnv();
  tgm = fakeTelegram();
  tgm.install();
});
afterEach(() => tgm.restore());

test("health is public; everything else needs the secret", async () => {
  assert.equal((await worker.fetch(new Request(ORIGIN + "/health"), env)).status, 200);
  assert.equal((await api("GET", "/status", undefined, "wrong-secret-wrong-secret-wrong")).status, 401);
  assert.equal((await api("GET", "/status")).status, 200);
});

test("refuses to run with a short relay secret", async () => {
  env.RELAY_SECRET = "short";
  assert.equal((await api("GET", "/status", undefined, "short")).status, 500);
});

test("request before /bind is refused with chat_not_bound", async () => {
  const r = await request();
  assert.equal(r.status, 409);
  assert.equal((await r.json()).error, "chat_not_bound");
});

test("only the owner can /bind; /whoami works for anyone", async () => {
  await bind(true, 999);
  assert.equal((await request()).status, 409);
  await tgUpdate({ message: { text: "/whoami", from: { id: 999 }, chat: { id: 999, type: "private" } } });
  assert.match(tgm.last("sendMessage").body.text, /999/);
  await bind(true);
  assert.equal((await request()).status, 200);
});

test("webhook rejects a wrong Telegram secret", async () => {
  const r = await tgUpdate({ message: { text: "/bind" } }, "nope");
  assert.equal(r.status, 403);
});

test("approve flow: topic per project, buttons, escaped text, owner tap approves", async () => {
  await bind(true);
  const { id } = await (await request()).json();
  const topic = tgm.last("createForumTopic");
  assert.equal(topic.body.name, "german-learning-exam");
  const sent = tgm.last("sendMessage");
  assert.equal(sent.body.message_thread_id, 100);
  assert.match(sent.body.text, /&lt;b&gt;hi&lt;\/b&gt;/); // preview is escaped, not rendered
  assert.deepEqual(sent.body.reply_markup.inline_keyboard[0].map((b) => b.callback_data), [`a:${id}`, `d:${id}`]);

  assert.equal((await (await api("GET", `/decision?id=${id}`)).json()).status, "pending");
  await tap(`a:${id}`);
  assert.equal((await (await api("GET", `/decision?id=${id}`)).json()).status, "approved");
  assert.match(tgm.last("editMessageText").body.text, /Approved/);

  // second request in the same project reuses the topic
  await request();
  assert.equal(tgm.calls.filter((c) => c.method === "createForumTopic").length, 1);
});

test("deny flow, and a decided request can't be flipped", async () => {
  await bind(true);
  const { id } = await (await request()).json();
  await tap(`d:${id}`);
  await tap(`a:${id}`);
  assert.equal((await (await api("GET", `/decision?id=${id}`)).json()).status, "denied");
});

test("taps from anyone but the owner are ignored", async () => {
  await bind(true);
  const { id } = await (await request()).json();
  await tap(`a:${id}`, 1234);
  assert.equal(tgm.last("answerCallbackQuery").body.text, "Not authorized.");
  assert.equal((await (await api("GET", `/decision?id=${id}`)).json()).status, "pending");
});

test("taps from a different chat are ignored", async () => {
  await bind(true);
  const { id } = await (await request()).json();
  await tap(`a:${id}`, OWNER, -555);
  assert.equal((await (await api("GET", `/decision?id=${id}`)).json()).status, "pending");
});

test("expired requests read as expired and can't be approved late", async () => {
  await bind(true);
  const { id } = await (await request({ timeoutSeconds: 30 })).json();
  await env.DB.prepare("UPDATE approvals SET expires_at = 1 WHERE id = ?").bind(id).run();
  assert.equal((await (await api("GET", `/decision?id=${id}`)).json()).status, "expired");
  await tap(`a:${id}`);
  assert.equal((await (await api("GET", `/decision?id=${id}`)).json()).status, "expired");
});

test("/expire from the hook marks it expired", async () => {
  await bind(true);
  const { id } = await (await request()).json();
  await api("POST", "/expire", { id });
  assert.equal((await (await api("GET", `/decision?id=${id}`)).json()).status, "expired");
});

test("without Topics everything goes to the main chat", async () => {
  await bind(false);
  await request();
  assert.equal(tgm.calls.filter((c) => c.method === "createForumTopic").length, 0);
  assert.equal(tgm.last("sendMessage").body.message_thread_id, undefined);
});

test("notify posts silently to the project topic", async () => {
  await bind(true);
  const r = await api("POST", "/notify", { topic: "p1", project: "p1", agent: "Claude", session: "s", text: "done <ok>", silent: true });
  assert.equal(r.status, 200);
  const sent = tgm.last("sendMessage");
  assert.equal(sent.body.disable_notification, true);
  assert.match(sent.body.text, /done &lt;ok&gt;/);
});

test("setup-webhook registers /telegram with a derived secret; status reports it", async () => {
  await api("POST", "/setup-webhook", {});
  const call = tgm.last("setWebhook");
  assert.equal(call.body.url, `${ORIGIN}/telegram`);
  assert.equal(call.body.secret_token, await webhookSecret());
  assert.ok(!call.body.secret_token.includes(SECRET));
  const s = await (await api("GET", "/status")).json();
  assert.equal(s.webhook, true);
  assert.equal(s.chatBound, false);
});
