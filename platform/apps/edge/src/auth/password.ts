import { deriveArgon2, type Argon2Parameters } from './argon2-runtime.js';

export const PASSWORD_PARAMETERS = Object.freeze({ memoryKiB: 19_456, iterations: 2, parallelism: 1, hashLength: 32, saltLength: 16 });
const PREFIX = '$argon2id$v=19$m=19456,t=2,p=1$';
function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/=+$/, '');
}
function decode(value: string, length: number): Uint8Array | null {
  if (!/^[A-Za-z0-9+/]+$/.test(value)) return null;
  try {
    const bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0));
    return bytes.length === length && encode(bytes) === value ? bytes : null;
  } catch { return null; }
}
function parse(encoded: string): { salt: Uint8Array; digest: Uint8Array; parameters: Argon2Parameters } | null {
  if (typeof encoded !== 'string' || encoded.length > 160) return null;
  const match = /^\$argon2id\$v=19\$m=(8192|19456),t=(1|2),p=1\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/.exec(encoded);
  if (!match) return null;
  const salt = decode(match[3] ?? '', PASSWORD_PARAMETERS.saltLength);
  const digest = decode(match[4] ?? '', PASSWORD_PARAMETERS.hashLength);
  return salt && digest ? { salt, digest, parameters: { memoryKiB: Number(match[1]), iterations: Number(match[2]), parallelism: 1, hashLength: 32 } } : null;
}
export function needsPasswordRehash(encoded: string): boolean {
  const parsed = parse(encoded);
  return !parsed || parsed.parameters.memoryKiB !== PASSWORD_PARAMETERS.memoryKiB || parsed.parameters.iterations !== PASSWORD_PARAMETERS.iterations;
}
export function validateNewPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 12 && new TextEncoder().encode(password).length <= 1024;
}
export async function hashPassword(password: string, salt = crypto.getRandomValues(new Uint8Array(PASSWORD_PARAMETERS.saltLength))): Promise<string> {
  const byteLength = typeof password === 'string' ? new TextEncoder().encode(password).length : 0;
  if (byteLength < 8 || byteLength > 1024 || salt.length !== PASSWORD_PARAMETERS.saltLength) throw new Error('invalid_password_input');
  const digest = await deriveArgon2(password, salt);
  return `${PREFIX}${encode(salt)}$${encode(digest)}`;
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const byteLength = typeof password === 'string' ? new TextEncoder().encode(password).length : 0;
  if (byteLength < 8 || byteLength > 1024) return false;
  const parsed = parse(encoded);
  if (!parsed) return false;
  const actual = await deriveArgon2(password, parsed.salt, parsed.parameters);
  let difference = actual.length ^ parsed.digest.length;
  for (let i = 0; i < parsed.digest.length; i++) difference |= (actual[i] ?? 0) ^ (parsed.digest[i] ?? 0);
  return difference === 0;
}
