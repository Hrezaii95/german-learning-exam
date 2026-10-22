import assert from 'node:assert/strict';
import { test } from 'node:test';
import app from '../src/app.js';
import { createSession } from '../src/auth/session.js';
import { API_CONTENT_SECURITY_POLICY } from '../src/security.js';
import type { PlatformEnv, Role } from '../src/types.js';
import { createTestDb } from './classes-db.js';

const ORIGIN = 'https://german.learnilabs.com';
const PAGES = 'https://hrezaii95.github.io';
async function fixture() {
  const db = createTestDb();
  const now = new Date().toISOString();
  const cookies: Record<string, string> = {};
  for (const role of ['student', 'teacher', 'admin'] as const satisfies readonly Role[]) {
    const id = `headers-${role}`;
    await db.prepare('INSERT INTO users(id,username,display_name,role,created_at) VALUES(?,?,?,?,?)').bind(id, id, `Synthetic ${role}`, role, now).run();
    cookies[role] = (await createSession(db, id)).cookie;
  }
  await db.prepare('INSERT INTO classes(id,name,teacher_id,join_code,created_at) VALUES(?,?,?,?,?)').bind('headers-class', 'Synthetic class', 'headers-teacher', 'SYNTHETIC-CODE', now).run();
  await db.prepare('INSERT INTO class_members(class_id,user_id,joined_at) VALUES(?,?,?)').bind('headers-class', 'headers-student', now).run();
  await db.prepare('INSERT INTO assignments(id,class_id,title,scope_json,skills_json,created_by,created_at) VALUES(?,?,?,?,?,?,?)').bind('headers-assignment', 'headers-class', 'Synthetic assignment', JSON.stringify({ v: 1, skills: ['meaning'], count: 2 }), '["meaning"]', 'headers-teacher', now).run();
  const env: PlatformEnv = { DB: db, BUILD_SHA: 'synthetic-build-sha', ASSETS: { fetch: async () => new Response('not found', { status: 404 }) } };
  return { db, env, cookies };
}
function assertApiHeaders(response: Response, privateData = true): void {
  const cache = response.headers.get('Cache-Control') ?? '';
  assert.match(cache, /(?:^|,)\s*no-store(?:\s|,|$)/i);
  if (privateData) assert.match(cache, /(?:^|,)\s*private(?:\s|,|$)/i);
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(response.headers.get('Strict-Transport-Security'), 'max-age=31536000');
  assert.equal(response.headers.get('Content-Security-Policy'), API_CONTENT_SECURITY_POLICY);
  assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
  assert.equal(response.headers.get('Access-Control-Allow-Credentials'), null);
}

test('the API boundary secures JSON responses from every handler and all guarded failures', async () => {
  const { db, env, cookies } = await fixture();
  try {
    const cases: Array<{ path: string; role?: string; status: number; method?: string; body?: unknown; origin?: string }> = [
      { path: '/api/auth/me', role: 'student', status: 200 },
      { path: '/api/me/history', role: 'student', status: 200 },
      { path: '/api/me/classes', role: 'student', status: 200 },
      { path: '/api/me/dashboard', role: 'student', status: 200 },
      { path: '/api/admin/users', role: 'admin', status: 200 },
      { path: '/api/sync/pull?store=unregistered', role: 'student', status: 400 },
      { path: '/api/auth/me', status: 401 },
      { path: '/api/admin/users', role: 'student', status: 403 },
      { path: '/api/auth/logout', role: 'student', status: 403, method: 'POST', body: {}, origin: 'https://other.invalid' },
    ];
    for (const item of cases) {
      const headers: Record<string, string> = { Origin: item.origin ?? PAGES };
      if (item.role) headers.Cookie = cookies[item.role] ?? '';
      if (item.body !== undefined) headers['Content-Type'] = 'application/json';
      const response = await app.fetch(new Request(`${ORIGIN}${item.path}`, { method: item.method ?? 'GET', headers, ...(item.body === undefined ? {} : { body: JSON.stringify(item.body) }) }), env);
      assert.equal(response.status, item.status, item.path);
      assert.match(response.headers.get('Content-Type') ?? '', /^application\/json/);
      assertApiHeaders(response);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), null, `Private API cannot expose CORS: ${item.path}`);
    }
  } finally { db.close(); }
});

test('CSV exports retain their media type and receive the same private/security headers as JSON', async () => {
  const { db, env, cookies } = await fixture();
  try {
    for (const [path, role] of [
      ['/api/teacher/assignment?id=headers-assignment&format=csv', 'teacher'],
      ['/api/admin/audit?format=csv', 'admin'],
    ] as const) {
      const response = await app.fetch(new Request(`${ORIGIN}${path}`, { headers: { Cookie: cookies[role] ?? '', Origin: PAGES } }), env);
      assert.equal(response.status, 200, path);
      assert.match(response.headers.get('Content-Type') ?? '', /^text\/csv/);
      assert.match(response.headers.get('Content-Disposition') ?? '', /^attachment;/);
      assertApiHeaders(response);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
      assert.ok((await response.text()).length > 0);
    }
  } finally { db.close(); }
});

test('public health grants readiness CORS only to the exact Pages origin and only for GET', async () => {
  const env: PlatformEnv = { BUILD_SHA: 'synthetic-version', ASSETS: { fetch: async () => { throw new Error('health must not consult assets'); } } };
  for (const origin of [PAGES, 'https://other.invalid', 'https://hrezaii95.github.io.other.invalid']) {
    for (const method of ['GET', 'HEAD', 'OPTIONS', 'POST']) {
      const response = await app.fetch(new Request(`${ORIGIN}/api/health`, { method, headers: { Origin: origin } }), env);
      assert.equal(response.status, ['GET', 'HEAD'].includes(method) ? 200 : 405);
      assertApiHeaders(response, false);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), method === 'GET' && origin === PAGES ? PAGES : null);
      if (method === 'HEAD') assert.equal(await response.text(), '');
      if (!['GET', 'HEAD'].includes(method)) assert.equal(response.headers.get('Allow'), 'GET, HEAD');
    }
  }
});

test('unknown API GETs remain honest uncached JSON 404s without asset fallback or public CORS', async () => {
  const response = await app.fetch(new Request(`${ORIGIN}/api/not-a-route`, { headers: { Origin: PAGES } }), { ASSETS: { fetch: async () => { throw new Error('unknown API must not reach assets'); } } });
  assert.equal(response.status, 404);
  assertApiHeaders(response, false);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  assert.deepEqual(await response.json(), { error: 'not_found' });
});
