import { HttpError, requireDb } from '../http.js';
import type { D1Database, PlatformEnv, Role, SessionUser } from '../types.js';

export const SESSION_COOKIE = '__Host-gl_session';
export const SESSION_DAYS = 30;
export const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;
export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function sessionToken(request: Request): string | null {
  const matches = (request.headers.get('Cookie') ?? '').split(';').map(part => part.trim()).filter(part => part.startsWith(`${SESSION_COOKIE}=`));
  if (matches.length !== 1) return null;
  const token = matches[0]?.slice(SESSION_COOKIE.length + 1) ?? '';
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MS / 1000}`;
}
export function expiredSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
interface SessionRow {
  id: string; username: string; display_name: string; role: Role;
  must_change_password: number; is_demo: number; last_seen_at: string;
}
export async function getSession(request: Request, env: PlatformEnv): Promise<SessionUser | null> {
  const token = sessionToken(request);
  if (!token) return null;
  const db = requireDb(env);
  const idHash = await sha256(token);
  const now = new Date();
  const row = await db.prepare(`SELECT u.id,u.username,u.display_name,u.role,u.must_change_password,u.is_demo,s.last_seen_at
    FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.id_hash=? AND s.expires_at>? AND u.status='active' AND u.deleted_at IS NULL`).bind(idHash, now.toISOString()).first<SessionRow>();
  if (!row) return null;
  if (Date.parse(row.last_seen_at) < now.getTime() - 5 * 60 * 1000) {
    await db.prepare('UPDATE sessions SET expires_at=?,last_seen_at=? WHERE id_hash=?').bind(new Date(now.getTime() + SESSION_MS).toISOString(), now.toISOString(), idHash).run();
  }
  return { id: row.id, username: row.username, displayName: row.display_name, role: row.role, mustChangePassword: row.must_change_password === 1, isDemo: row.is_demo === 1 };
}
export async function requireSession(request: Request, env: PlatformEnv, roles?: readonly Role[], options: { allowPasswordChange?: boolean } = {}): Promise<SessionUser> {
  const user = await getSession(request, env);
  if (!user) throw new HttpError(401, 'unauthorized');
  if (roles && !roles.includes(user.role)) throw new HttpError(403, 'forbidden');
  if (user.mustChangePassword && !options.allowPasswordChange) throw new HttpError(403, 'password_change_required');
  return user;
}
export function newSessionToken(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export async function createSession(db: D1Database, userId: string, previousToken?: string | null): Promise<{ token: string; cookie: string }> {
  const token = newSessionToken();
  const now = new Date();
  const statements = [];
  if (previousToken) statements.push(db.prepare('DELETE FROM sessions WHERE id_hash=?').bind(await sha256(previousToken)));
  statements.push(db.prepare('INSERT INTO sessions(id_hash,user_id,created_at,expires_at,last_seen_at) VALUES(?,?,?,?,?)').bind(await sha256(token), userId, now.toISOString(), new Date(now.getTime() + SESSION_MS).toISOString(), now.toISOString()));
  await db.batch(statements);
  return { token, cookie: sessionCookie(token) };
}
export async function revokeUserSessions(db: D1Database, userId: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE user_id=?').bind(userId).run();
}
function safeMeta(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[redacted]';
  if (Array.isArray(value)) return value.slice(0, 50).map(item => safeMeta(item, depth + 1));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !/password|token|secret|credential/i.test(key)).map(([key, item]) => [key, safeMeta(item, depth + 1)]));
  return value;
}
export async function audit(db: D1Database, actorId: string | null, action: string, targetType: string, targetId: string | null, meta: unknown = {}): Promise<void> {
  await db.prepare('INSERT INTO audit_log(id,actor_id,action,target_type,target_id,meta_json,created_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(), actorId, action, targetType, targetId, JSON.stringify(safeMeta(meta)), new Date().toISOString()).run();
}
