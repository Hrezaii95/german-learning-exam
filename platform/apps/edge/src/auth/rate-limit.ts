import { HttpError } from '../http.js';
import type { D1Database } from '../types.js';
import { sha256 } from './session.js';

const WINDOW_MS = 15 * 60 * 1000;
const WRONG = 'Wrong username or password.';
export function invalidLogin(status = 401): HttpError { return new HttpError(status, 'wrong_username_or_password', WRONG); }
export async function loginKeys(request: Request, username: string): Promise<string[]> {
  // Only Cloudflare's trusted connecting IP is used. No raw IP/usernames persist.
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local-preview';
  return Promise.all([sha256(`username:${username}`), sha256(`ip:${ip}`)]);
}
/** Reserve before hashing, atomically, so concurrent guesses cannot race the cap. */
export async function reserveLogin(db: D1Database, keys: readonly string[], now = Date.now()): Promise<void> {
  const uniqueKeys = [...new Set(keys)];
  if (uniqueKeys.length === 0 || uniqueKeys.length > 8) throw new Error('invalid_rate_limit_keys');
  const placeholders = uniqueKeys.map(() => '?').join(',');
  const keyRows = uniqueKeys.map(() => '(?)').join(',');
  // The MATERIALIZED eligibility snapshot checks both buckets before either is
  // changed. A blocked IP cannot create unlimited new username-counter rows.
  const result = await db.prepare(`WITH permitted AS MATERIALIZED (
      SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM auth_rate_limits
        WHERE key_hash IN (${placeholders}) AND blocked_until>?)
    ), keys(key_hash) AS (VALUES ${keyRows})
    INSERT INTO auth_rate_limits(key_hash,attempts,window_started,blocked_until,updated_at)
    SELECT keys.key_hash,1,?,0,? FROM keys,permitted WHERE 1
    ON CONFLICT(key_hash) DO UPDATE SET
    attempts=CASE WHEN auth_rate_limits.window_started<? THEN 1 ELSE auth_rate_limits.attempts+1 END,
    window_started=CASE WHEN auth_rate_limits.window_started<? THEN ? ELSE auth_rate_limits.window_started END,
    blocked_until=CASE WHEN auth_rate_limits.window_started<? THEN 0
      WHEN auth_rate_limits.attempts+1>=5 THEN ? + MIN(3600000,60000 * (1 << MIN(6,auth_rate_limits.attempts-4))) ELSE 0 END,
    updated_at=? RETURNING attempts`).bind(...uniqueKeys, now, ...uniqueKeys, now, now, now - WINDOW_MS, now - WINDOW_MS, now, now - WINDOW_MS, now, now).all<{ attempts: number }>();
  if (result.results.length !== uniqueKeys.length) throw invalidLogin(429);
}
export async function clearLoginFailures(db: D1Database, keys: readonly string[]): Promise<void> {
  await db.batch(keys.map(key => db.prepare('DELETE FROM auth_rate_limits WHERE key_hash=?').bind(key)));
}
