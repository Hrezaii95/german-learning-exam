/** Live sign-in smoke. Passwords/cookies are kept in memory and never printed. */
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function parseSeedAccounts(raw) {
  let accounts;
  try { accounts = JSON.parse(raw ?? ''); }
  catch { throw new Error('SEED_ACCOUNTS_JSON must be valid JSON with the five documented account keys'); }
  const keys = ['admin', 'teacher1', 'student1', 'student2', 'student3'];
  assert(accounts && typeof accounts === 'object' && !Array.isArray(accounts), 'SEED_ACCOUNTS_JSON must be an object');
  const supplied = Object.keys(accounts);
  assert(supplied.length === keys.length && keys.every((key) => Object.hasOwn(accounts, key)),
    'SEED_ACCOUNTS_JSON must contain exactly the five documented account keys');
  for (const key of keys) assert(typeof accounts[key] === 'string' && accounts[key].length >= 12 && accounts[key].length <= 128 && accounts[key].trim().length > 0,
    'Every seed password must contain 12–128 characters and must not be blank');
  return accounts;
}

export async function smokeAccounts({ origin, accounts, fetcher = fetch, allowLocal = false }) {
  const url = new URL(origin);
  assert(!url.username && !url.password && url.pathname === '/' && !url.search && !url.hash, 'Use a credential-free origin');
  assert(url.protocol === 'https:' || (allowLocal && url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)), 'Account smoke requires HTTPS');
  for (const [username, role] of [['student1', 'student'], ['teacher1', 'teacher']]) {
    assert(typeof accounts?.[username] === 'string' && accounts[username].length >= 12, `Seed password for ${username} is missing or invalid`);
    let cookie;
    try {
      const login = await fetcher(new URL('/api/auth/login', url), {
        method: 'POST', headers: { Origin: url.origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: accounts[username] }), redirect: 'manual', signal: AbortSignal.timeout(20_000),
      });
      assert.equal(login.status, 200, `${username}: sign-in failed; existing account passwords are never silently reset`);
      const header = login.headers.get('set-cookie') ?? '';
      const token = header.match(/(?:^|,\s*)(__Host-gl_session=[^;,]+)/);
      // Capture a minted token before validating response policy so a failed
      // smoke still revokes its session in finally.
      cookie = token?.[1];
      assert.match(login.headers.get('cache-control') ?? '', /(?:^|,)\s*no-store\s*(?:,|$)/i, 'Sign-in response must not be cached');
      assert(token && /;\s*HttpOnly(?:;|$)/i.test(header) && /;\s*Secure(?:;|$)/i.test(header) && /;\s*SameSite=Lax(?:;|$)/i.test(header) && /;\s*Path=\/(?:;|$)/i.test(header), 'Session cookie attributes are invalid');
      const body = await login.json();
      assert.equal(body.user?.role, role, `${username}: wrong role`);
      const me = await fetcher(new URL('/api/auth/me', url), { headers: { Cookie: cookie }, redirect: 'manual', signal: AbortSignal.timeout(20_000) });
      assert.equal(me.status, 200, `${username}: authenticated session failed`);
      assert.match(me.headers.get('cache-control') ?? '', /(?:^|,)\s*no-store\s*(?:,|$)/i, 'Session response must not be cached');
      assert.equal((await me.json()).user?.id, body.user?.id, `${username}: wrong session owner`);
    } catch {
      // Avoid assertion output that might serialize an HTTP object or cookie.
      throw new Error(`Account smoke failed for ${username}; verify the configured seed password and auth deployment`);
    } finally {
      if (cookie) {
        const logout = await fetcher(new URL('/api/auth/logout', url), {
          method: 'POST', headers: { Cookie: cookie, Origin: url.origin, 'Content-Type': 'application/json' }, body: '{}',
          redirect: 'manual', signal: AbortSignal.timeout(20_000),
        });
        await logout.body?.cancel();
        if (logout.status !== 200 && logout.status !== 204) throw new Error(`Account smoke sign-out failed for ${username}`);
        const revoked = await fetcher(new URL('/api/auth/me', url), { headers: { Cookie: cookie }, redirect: 'manual', signal: AbortSignal.timeout(20_000) });
        await revoked.body?.cancel();
        assert.equal(revoked.status, 401, `${username}: session was not revoked`);
      }
    }
  }
  return { accounts: ['student1', 'teacher1'], signedInAndOut: true };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const index = process.argv.indexOf('--origin');
    assert(index >= 0 && process.argv[index + 1], 'Pass --origin');
    const result = await smokeAccounts({ origin: process.argv[index + 1], accounts: parseSeedAccounts(process.env.SEED_ACCOUNTS_JSON) });
    console.log(JSON.stringify(result));
  } catch { console.error('Account smoke failed; passwords, cookies and provider responses were withheld'); process.exitCode = 1; }
}
