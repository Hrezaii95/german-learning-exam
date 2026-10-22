import { HttpError, json, readJson, requireDb, requireMethod, stringField } from '../http.js';
import type { D1Database, PlatformEnv, Role, SessionUser } from '../types.js';
import { invalidLogin, loginKeys, reserveLogin } from '../auth/rate-limit.js';
import { hashPassword, needsPasswordRehash, validateNewPassword, verifyPassword } from '../auth/password.js';
import { audit, expiredSessionCookie, newSessionToken, requireSession, SESSION_MS, sessionCookie, sessionToken, sha256 } from '../auth/session.js';

const CREDENTIAL_MATCH = `EXISTS (SELECT 1 FROM identities i JOIN users u ON u.id=i.user_id WHERE i.user_id=? AND i.provider='password' AND i.password_hash=? AND u.status='active' AND u.deleted_at IS NULL)`;

interface LoginRow {
  id: string; username: string; display_name: string; role: Role; status: string;
  must_change_password: number; is_demo: number; password_hash: string | null;
}
function userView(row: LoginRow): SessionUser {
  return { id: row.id, username: row.username, displayName: row.display_name, role: row.role, mustChangePassword: row.must_change_password === 1, isDemo: row.is_demo === 1 };
}
async function flags(db: D1Database): Promise<Record<string, boolean>> {
  const rows = await db.prepare('SELECT key,value_json FROM feature_flags').all<{ key: string; value_json: string }>();
  const output: Record<string, boolean> = {};
  for (const row of rows.results) {
    try { output[row.key] = JSON.parse(row.value_json) === true; } catch { output[row.key] = false; }
  }
  // Provider UI cannot be enabled while its handlers are reserved, even if a
  // future admin accidentally toggles the stored flag before provider shipping.
  output.email_login = false;
  output.google_login = false;
  return output;
}
async function login(request: Request, env: PlatformEnv): Promise<Response> {
  requireMethod(request, ['POST']);
  const input = await readJson(request, 4096);
  const username = stringField(input.username, 2, 64).trim().toLowerCase();
  const password = stringField(input.password, 1, 1024);
  const passwordBytes = new TextEncoder().encode(password).length;
  if (!/^[a-z0-9][a-z0-9_.-]{1,63}$/.test(username) || passwordBytes < 8 || passwordBytes > 1024) throw invalidLogin();
  const db = requireDb(env);
  const keys = await loginKeys(request, username);
  await reserveLogin(db, keys);
  const row = await db.prepare(`SELECT u.id,u.username,u.display_name,u.role,u.status,u.must_change_password,u.is_demo,i.password_hash
    FROM users u JOIN identities i ON i.user_id=u.id AND i.provider='password'
    WHERE u.username=? AND u.deleted_at IS NULL`).bind(username).first<LoginRow>();
  // Do the same Argon2 work for unknown users to avoid a username timing oracle.
  const correct = row?.password_hash ? await verifyPassword(password, row.password_hash) : (await hashPassword(password), false);
  if (!row || row.status !== 'active' || !correct || !row.password_hash) throw invalidLogin();
  const expectedHash = needsPasswordRehash(row.password_hash) ? await hashPassword(password) : row.password_hash;
  const token = newSessionToken();
  const now = new Date();
  const previousToken = sessionToken(request);
  const statements = [];
  if (expectedHash !== row.password_hash) statements.push(db.prepare(`UPDATE identities SET password_hash=? WHERE user_id=? AND provider='password' AND password_hash=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND status='active' AND deleted_at IS NULL)`).bind(expectedHash, row.id, row.password_hash, row.id));
  if (previousToken) statements.push(db.prepare(`DELETE FROM sessions WHERE id_hash=? AND ${CREDENTIAL_MATCH}`).bind(await sha256(previousToken), row.id, expectedHash));
  const insertedIndex = statements.length;
  statements.push(db.prepare(`INSERT INTO sessions(id_hash,user_id,created_at,expires_at,last_seen_at) SELECT ?,?,?,?,? WHERE ${CREDENTIAL_MATCH}`).bind(await sha256(token), row.id, now.toISOString(), new Date(now.getTime() + SESSION_MS).toISOString(), now.toISOString(), row.id, expectedHash));
  for (const key of keys) statements.push(db.prepare(`DELETE FROM auth_rate_limits WHERE key_hash=? AND ${CREDENTIAL_MATCH}`).bind(key, row.id, expectedHash));
  statements.push(db.prepare(`INSERT INTO audit_log(id,actor_id,action,target_type,target_id,meta_json,created_at) SELECT ?,?,'auth.login','user',?,'{}',? WHERE ${CREDENTIAL_MATCH}`).bind(crypto.randomUUID(), row.id, row.id, now.toISOString(), row.id, expectedHash));
  if (expectedHash !== row.password_hash) statements.push(db.prepare(`INSERT INTO audit_log(id,actor_id,action,target_type,target_id,meta_json,created_at) SELECT ?,?,'auth.password_rehashed','user',?,'{}',? WHERE ${CREDENTIAL_MATCH}`).bind(crypto.randomUUID(), row.id, row.id, now.toISOString(), row.id, expectedHash));
  const result = await db.batch(statements);
  // Credential/status checks are in the same transaction as session creation.
  // A reset while Argon2 is running cannot mint a cookie from the old hash.
  if (result[insertedIndex]?.meta.changes !== 1) throw invalidLogin();
  const current = await db.prepare(`SELECT id,username,display_name,role,status,must_change_password,is_demo,NULL AS password_hash FROM users WHERE id=? AND status='active' AND deleted_at IS NULL`).bind(row.id).first<LoginRow>();
  if (!current) throw invalidLogin();
  return json({ user: userView(current), flags: await flags(db) }, 200, { 'Set-Cookie': sessionCookie(token) });
}
async function logout(request: Request, env: PlatformEnv): Promise<Response> {
  requireMethod(request, ['POST']);
  await readJson(request, 1024);
  const db = requireDb(env);
  const token = sessionToken(request);
  if (token) await db.prepare('DELETE FROM sessions WHERE id_hash=?').bind(await sha256(token)).run();
  return json({ ok: true }, 200, { 'Set-Cookie': expiredSessionCookie() });
}
async function changePassword(request: Request, env: PlatformEnv): Promise<Response> {
  requireMethod(request, ['POST']);
  const input = await readJson(request, 4096);
  const user = await requireSession(request, env, undefined, { allowPasswordChange: true });
  const currentPassword = stringField(input.currentPassword, 1, 1024);
  if (!validateNewPassword(input.newPassword)) throw new HttpError(400, 'invalid_password', 'Use at least 12 characters and at most 1024 UTF-8 bytes.');
  const db = requireDb(env);
  const row = await db.prepare("SELECT password_hash FROM identities WHERE user_id=? AND provider='password'").bind(user.id).first<{ password_hash: string }>();
  if (!row || !await verifyPassword(currentPassword, row.password_hash)) throw invalidLogin();
  if (currentPassword === input.newPassword) throw new HttpError(400, 'password_unchanged');
  const nextHash = await hashPassword(input.newPassword);
  const token = newSessionToken();
  const now = new Date();
  // nextHash has a fresh random salt and is a transaction-local revision marker.
  // If the old credential CAS loses, every following mutation is a no-op.
  const result = await db.batch([
    db.prepare(`UPDATE identities SET password_hash=? WHERE user_id=? AND provider='password' AND password_hash=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND status='active' AND deleted_at IS NULL)`).bind(nextHash, user.id, row.password_hash, user.id),
    db.prepare(`UPDATE users SET must_change_password=0 WHERE id=? AND ${CREDENTIAL_MATCH}`).bind(user.id, user.id, nextHash),
    db.prepare(`DELETE FROM sessions WHERE user_id=? AND ${CREDENTIAL_MATCH}`).bind(user.id, user.id, nextHash),
    db.prepare(`INSERT INTO sessions(id_hash,user_id,created_at,expires_at,last_seen_at) SELECT ?,?,?,?,? WHERE ${CREDENTIAL_MATCH}`).bind(await sha256(token), user.id, now.toISOString(), new Date(now.getTime() + SESSION_MS).toISOString(), now.toISOString(), user.id, nextHash),
    db.prepare(`INSERT INTO audit_log(id,actor_id,action,target_type,target_id,meta_json,created_at) SELECT ?,?,'auth.password_changed','user',?,'{}',? WHERE ${CREDENTIAL_MATCH}`).bind(crypto.randomUUID(), user.id, user.id, now.toISOString(), user.id, nextHash),
  ]);
  if (result[0]?.meta.changes !== 1 || result[3]?.meta.changes !== 1) throw new HttpError(409, 'credentials_changed');
  return json({ ok: true, user: { ...user, mustChangePassword: false } }, 200, { 'Set-Cookie': sessionCookie(token) });
}
async function exportData(request: Request, env: PlatformEnv): Promise<Response> {
  requireMethod(request, ['GET']);
  const user = await requireSession(request, env, undefined, { allowPasswordChange: true });
  const db = requireDb(env);
  await audit(db, user.id, 'account.export', 'user', user.id);
  const [profile, identities, devices, sessions, events, docs, memberships, classes, assignments, progress, extras, history] = await db.batch([
    db.prepare('SELECT id,username,display_name,email,email_verified_at,role,status,must_change_password,is_demo,created_at FROM users WHERE id=?').bind(user.id),
    db.prepare('SELECT provider,provider_subject,created_at FROM identities WHERE user_id=?').bind(user.id),
    db.prepare('SELECT id,label,last_sync_at FROM devices WHERE user_id=?').bind(user.id),
    db.prepare('SELECT created_at,expires_at,last_seen_at FROM sessions WHERE user_id=?').bind(user.id),
    db.prepare('SELECT store,event_id,device_id,server_seq,created_at,payload_json,event_type,schema_version FROM sync_events WHERE user_id=? ORDER BY server_seq').bind(user.id),
    db.prepare('SELECT store,doc_key,value_json,updated_at,device_id,schema_version FROM sync_docs WHERE user_id=?').bind(user.id),
    db.prepare('SELECT class_id,member_role,joined_at,left_at FROM class_members WHERE user_id=?').bind(user.id),
    db.prepare('SELECT id,name,teacher_id,book_id,position_lesson,position_page,created_at,archived_at FROM classes WHERE teacher_id=? OR id IN (SELECT class_id FROM class_members WHERE user_id=? AND left_at IS NULL)').bind(user.id, user.id),
    db.prepare('SELECT id,class_id,title,scope_json,skills_json,item_count,due_at,created_at FROM assignments WHERE created_by=?').bind(user.id),
    db.prepare('SELECT assignment_id,progress_json,completed_at FROM assignment_progress WHERE user_id=?').bind(user.id),
    db.prepare('SELECT id,class_id,pack_json,review_status,updated_at FROM teacher_extras WHERE owner_id=?').bind(user.id),
    db.prepare("SELECT action,target_type,target_id,meta_json,created_at FROM audit_log WHERE actor_id=? OR (target_type='user' AND target_id=?) ORDER BY created_at DESC").bind(user.id, user.id),
  ]);
  return json({ format: 'german-learning-account-export', version: 1, exportedAt: new Date().toISOString(), user: profile?.results[0], identities: identities?.results, devices: devices?.results, sessions: sessions?.results, events: events?.results, docs: docs?.results, memberships: memberships?.results, classes: classes?.results, assignments: assignments?.results, assignmentProgress: progress?.results, teacherExtras: extras?.results, history: history?.results }, 200, { 'Content-Disposition': 'attachment; filename="german-learning-account.json"' });
}
async function deleteAccount(request: Request, env: PlatformEnv): Promise<Response> {
  requireMethod(request, ['POST']);
  const input = await readJson(request, 4096);
  const user = await requireSession(request, env, undefined, { allowPasswordChange: true });
  if (input.confirm !== 'DELETE') throw new HttpError(400, 'confirmation_required');
  const db = requireDb(env);
  const password = stringField(input.password, 1, 1024);
  const row = await db.prepare("SELECT password_hash FROM identities WHERE user_id=? AND provider='password'").bind(user.id).first<{ password_hash: string }>();
  if (!row || !await verifyPassword(password, row.password_hash)) throw invalidLogin();
  const now = new Date().toISOString();
  const result = await db.batch([
    db.prepare(`INSERT INTO audit_log(id,actor_id,action,target_type,target_id,meta_json,created_at) SELECT ?,?,'account.deleted','user',?,'{}',? WHERE ${CREDENTIAL_MATCH}`).bind(crypto.randomUUID(), user.id, user.id, now, user.id, row.password_hash),
    db.prepare(`UPDATE audit_log SET actor_id=NULL,meta_json='{}' WHERE actor_id=? AND ${CREDENTIAL_MATCH}`).bind(user.id, user.id, row.password_hash),
    db.prepare(`UPDATE audit_log SET target_id=NULL,meta_json='{}' WHERE target_type='user' AND target_id=? AND ${CREDENTIAL_MATCH}`).bind(user.id, user.id, row.password_hash),
    db.prepare(`DELETE FROM users WHERE id=? AND ${CREDENTIAL_MATCH}`).bind(user.id, user.id, row.password_hash),
  ]);
  if (result[3]?.meta.changes !== 1) throw new HttpError(409, 'credentials_changed');
  return json({ ok: true }, 200, { 'Set-Cookie': expiredSessionCookie() });
}
function accountPagination(request: Request): { limit: number; offset: number } {
  const url = new URL(request.url);
  function integer(name: string, fallback: number, min: number, max: number): number {
    const raw = url.searchParams.get(name);
    if (raw === null) return fallback;
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < min || value > max) throw new HttpError(400, 'invalid_pagination');
    return value;
  }
  return { limit: integer('limit', 25, 1, 100), offset: integer('offset', 0, 0, 1_000_000) };
}
export async function handleAuth(request: Request, env: PlatformEnv): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (path === '/api/auth/login') return login(request, env);
  if (path === '/api/auth/logout') return logout(request, env);
  if (path === '/api/auth/password/change') return changePassword(request, env);
  if (path === '/api/auth/me') {
    requireMethod(request, ['GET']);
    const user = await requireSession(request, env, undefined, { allowPasswordChange: true });
    const token = sessionToken(request);
    return json({ user, flags: await flags(requireDb(env)) }, 200, token ? { 'Set-Cookie': sessionCookie(token) } : {});
  }
  if (['/api/auth/email/start', '/api/auth/email/verify', '/api/auth/google/start', '/api/auth/google/callback'].includes(path)) {
    requireMethod(request, ['GET', 'POST']);
    if (request.method === 'POST') await readJson(request);
    return json({ error: 'provider_not_enabled' }, 501);
  }
  if (path === '/api/me/export') return exportData(request, env);
  if (path === '/api/me/delete') return deleteAccount(request, env);
  if (path === '/api/me/devices' || path === '/api/me/history') {
    requireMethod(request, ['GET']);
    const user = await requireSession(request, env, undefined, { allowPasswordChange: true });
    const db = requireDb(env);
    const page = accountPagination(request);
    if (path.endsWith('/devices')) {
      const [count, devices] = await db.batch([
        db.prepare('SELECT COUNT(*) AS total FROM devices WHERE user_id=?').bind(user.id),
        db.prepare('SELECT id,label,last_sync_at FROM devices WHERE user_id=? ORDER BY last_sync_at DESC,id LIMIT ? OFFSET ?').bind(user.id, page.limit, page.offset),
      ]);
      return json({ devices: devices?.results ?? [], total: Number(count?.results[0]?.total ?? 0), ...page });
    }
    const [count, history] = await db.batch([
      db.prepare("SELECT COUNT(*) AS total FROM audit_log WHERE actor_id=? OR (target_type='user' AND target_id=?)").bind(user.id, user.id),
      db.prepare("SELECT id,action,target_type,target_id,meta_json,created_at FROM audit_log WHERE actor_id=? OR (target_type='user' AND target_id=?) ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?").bind(user.id, user.id, page.limit, page.offset),
    ]);
    return json({ history: history?.results ?? [], total: Number(count?.results[0]?.total ?? 0), ...page });
  }
  return null;
}
