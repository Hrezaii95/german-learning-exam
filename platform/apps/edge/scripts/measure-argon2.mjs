/** Local workerd benchmark. No cloud account, password input or live mutation. */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { argon2id } from 'hash-wasm';
import WebSocket from 'ws';
const require = createRequire(import.meta.url);
const edge = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporary = mkdtempSync(join(tmpdir(), 'lane3-argon2-'));
const config = join(temporary, 'wrangler.json');
writeFileSync(config, JSON.stringify({ name: 'lane3-argon2-benchmark',
  main: join(edge, 'tests/argon2.worker.ts'), compatibility_date: '2026-10-22' }));
const port = Number(process.env.GL_HASH_BENCH_PORT ?? 8811);
const inspector = port + 2000;
const cli = join(dirname(require.resolve('wrangler/package.json')), 'bin/wrangler.js');
let logs = '', closed = false;
const child = spawn(process.execPath, [cli, 'dev', '--config', config, '--local', '--ip', '127.0.0.1',
  '--port', String(port), '--inspector-port', String(inspector), '--show-interactive-dev-session=false'],
  { cwd: edge, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CLOUDFLARE_API_TOKEN: '', CLOUDFLARE_ACCOUNT_ID: '', CI: 'true', WRANGLER_SEND_METRICS: 'false' } });
child.on('close', () => { closed = true; });
for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { logs = (logs + data).slice(-10000); });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  for (let attempt = 0; !logs.includes('Ready on') && !closed && attempt < 180; attempt++) await delay(250);
  if (closed || !logs.includes('Ready on')) throw new Error(`Local benchmark failed to start:\n${logs}`);
  const targets = await (await fetch(`http://127.0.0.1:${inspector}/json/list`)).json();
  const target = targets.find(item => item.webSocketDebuggerUrl && item.title?.includes('lane3-argon2')) ?? targets[0];
  if (!target?.webSocketDebuggerUrl) throw new Error('workerd CPU profiler unavailable');
  const socketUrl = new URL(target.webSocketDebuggerUrl);
  socketUrl.hostname = '127.0.0.1';
  socket = new WebSocket(socketUrl, { headers: { Origin: 'http://localhost' }, handshakeTimeout: 10000 });
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => { const message = JSON.parse(data); if (message.id) {
    const item = pending.get(message.id); pending.delete(message.id);
    if (message.error) item?.reject(new Error(JSON.stringify(message.error))); else item?.resolve(message.result);
  } });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  // Warm Wasm setup once, then sample four hashes with V8's CPU profiler.
  await (await fetch(`http://127.0.0.1:${port}/`)).json();
  await call('Profiler.enable');
  await call('Profiler.setSamplingInterval', { interval: 100 });
  await call('Profiler.start');
  const before = performance.now();
  const response = await fetch(`http://127.0.0.1:${port}/`);
  const result = await response.json();
  const wallMs = performance.now() - before;
  const { profile } = await call('Profiler.stop');
  const idle = new Set(profile.nodes.filter(node => ['(idle)', '(program)', '(root)'].includes(node.callFrame.functionName)).map(node => node.id));
  const sampledCpuMs = profile.samples.reduce((total, id, index) => total + (idle.has(id) ? 0 : (profile.timeDeltas[index] ?? 0)), 0) / 1000;
  const expected = await argon2id({ password: 'public interoperability vector', salt: new Uint8Array(16).fill(7),
    memorySize: 19456, iterations: 2, parallelism: 1, hashLength: 32, outputType: 'hex' });
  if (result.digest !== expected) throw new Error('Worker and independent Node Argon2id outputs disagree');
  const record = { runtime: 'local workerd', interop: 'pass', parameters: result.parameters,
    hashes: 4, sampledCpuMsPerHash: sampledCpuMs / 4, wallMsPerHash: wallMs / 4,
    targetCpuMs: 300, targetMet: sampledCpuMs / 4 < 300,
    note: 'V8 profiler samples local CPU; production Paid hardware is not measured here.' };
  console.log(JSON.stringify(record));
  if (!record.targetMet) process.exitCode = 1;
} finally {
  socket?.close();
  try { process.kill(-child.pid, 'SIGTERM'); } catch { /* Already stopped. */ }
  await Promise.race([new Promise(resolve => child.once('close', resolve)), delay(2000)]);
  rmSync(temporary, { recursive: true, force: true });
}
