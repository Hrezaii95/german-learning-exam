import { API_CONTENT_SECURITY_POLICY, withSecurityHeaders } from './security.js';
import type { D1Database, PlatformEnv } from './types.js';

export class HttpError extends Error {
  constructor(public readonly status: number, public readonly code: string, message?: string) {
    super(message ?? code);
    this.name = 'HttpError';
  }
}
export function json(value: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  const headers = new Headers(extraHeaders);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store, private');
  headers.set('Vary', 'Cookie');
  return withSecurityHeaders(new Response(JSON.stringify(value), { status, headers }), API_CONTENT_SECURITY_POLICY);
}
export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) return json({ error: error.code, ...(error.message !== error.code ? { message: error.message } : {}) }, error.status);
  return json({ error: 'service_unavailable' }, 503);
}
export function requireDb(env: PlatformEnv): D1Database {
  if (!env.DB) throw new HttpError(503, 'service_unavailable');
  return env.DB;
}
export function assertWrite(request: Request): void {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) throw new HttpError(405, 'method_not_allowed');
  if (request.headers.get('Origin') !== new URL(request.url).origin) throw new HttpError(403, 'invalid_origin');
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') ?? '')) throw new HttpError(415, 'json_required');
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export async function readJson(request: Request, maxBytes = 65_536): Promise<Record<string, unknown>> {
  assertWrite(request);
  const length = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(length) && length > maxBytes) throw new HttpError(413, 'payload_too_large');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'invalid_json');
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.length;
      if (total > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, 'payload_too_large');
      }
      chunks.push(chunk.value);
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'invalid_json');
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new HttpError(400, 'invalid_json'); }
  if (!isRecord(value)) throw new HttpError(400, 'invalid_json');
  return value;
}
export function stringField(value: unknown, min: number, max: number): string {
  if (typeof value !== 'string' || value.length < min || value.length > max) throw new HttpError(400, 'invalid_input');
  return value;
}
export function requireMethod(request: Request, allowed: readonly string[]): void {
  if (!allowed.includes(request.method)) throw new HttpError(405, 'method_not_allowed');
}
