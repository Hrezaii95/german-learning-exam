/** Real local HTTPS/D1/browser rehearsal. Never uses Cloudflare credentials or writes passwords. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import https from 'node:https';
import { mkdtempSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const edgeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const platformRoot = resolve(edgeRoot, '../..');
const require = createRequire(import.meta.url);
const { chromium, request: playwrightRequest, expect } = require('@playwright/test');
const wrangler = join(dirname(require.resolve('wrangler/package.json')), 'bin/wrangler.js');
const config = join(edgeRoot, 'wrangler.local.jsonc');
const temporary = mkdtempSync(join(tmpdir(), 'german-platform-browser-'));
const state = join(temporary, 'd1');
mkdirSync(state, { mode: 0o700 });
const passwords = Object.fromEntries(['admin', 'teacher1', 'student1', 'student2', 'student3'].map(name => [name, randomBytes(24).toString('base64url')]));
const changedAdminPassword = randomBytes(24).toString('base64url');
const knownSecrets = [...Object.values(passwords), changedAdminPassword];
const childEnv = { ...process.env, CLOUDFLARE_API_TOKEN: '', CLOUDFLARE_ACCOUNT_ID: '', WRANGLER_SEND_METRICS: 'false', CI: 'true', WRANGLER_LOG_PATH: join(temporary, 'wrangler.log') };
delete childEnv.SEED_ACCOUNTS_JSON;
const children = new Set();
let browser;
let phase = 'initialization';
const passed = [];
const apiPolicyFailures = new Set();
const browserErrors = [];
const browserDiagnostics = [];
const contexts = [];
let base;
function sanitized(error) {
  let value = String(error?.stack ?? error);
  for (const secret of knownSecrets) value = value.replaceAll(secret, '[redacted]');
  return value.replace(/(__Host-gl_session[=:\s]+)[^;\s,"}]+/gi, '$1[redacted]').replace(/\$argon2id\$[^\s,"}]+/g, '[redacted hash]').slice(0, 5000);
}
function success(name) { passed.push(name); console.log(`[platform-browser] PASS ${name}`); }
function groupAlive(child) { try { if (process.platform === 'win32') return child.exitCode === null; process.kill(-child.pid, 0); return true; } catch { return false; } }
async function stopChild(child) {
  if (!child?.pid) return;
  const kill = signal => { try { if (process.platform !== 'win32') process.kill(-child.pid, signal); else child.kill(signal); } catch {} };
  kill('SIGTERM');
  for (let i = 0; i < 30 && groupAlive(child); i++) await delay(100);
  if (groupAlive(child)) kill('SIGKILL');
  children.delete(child);
}
let cleaning;
async function cleanup() {
  return cleaning ??= (async () => {
    await browser?.close().catch(() => {});
    await Promise.all([...children].map(stopChild));
    rmSync(temporary, { recursive: true, force: true });
  })();
}
const signal = () => { void cleanup().finally(() => process.exit(130)); };
process.once('SIGINT', signal); process.once('SIGTERM', signal);
const deadline = setTimeout(() => { console.error(`[platform-browser] TIMEOUT in ${phase}`); void cleanup().finally(() => process.exit(1)); }, 12 * 60_000);

async function privateCommand(args, extraEnv = {}, timeout = 120_000) {
  const child = spawn(process.execPath, args, { cwd: edgeRoot, env: { ...childEnv, ...extraEnv }, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  children.add(child);
  let output = '';
  for (const stream of [child.stdout, child.stderr]) stream?.on('data', chunk => { output = (output + chunk).slice(-16000); });
  let timer;
  try {
    await new Promise((done, reject) => {
      timer = setTimeout(() => { void stopChild(child).finally(() => reject(new Error(`Private CLI timed out during ${phase}`))); }, timeout);
      child.once('error', reject);
      child.once('close', code => code === 0 ? done() : reject(new Error(`Private CLI failed during ${phase}: ${sanitized(output)}`)));
    });
  } finally { clearTimeout(timer); await stopChild(child); }
}
async function freePort() {
  const server = createServer();
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  const port = server.address().port;
  await new Promise(done => server.close(done));
  return port;
}
function localHealth() {
  // TLS bypass is restricted to this generated loopback URL, never global.
  return new Promise(resolveHealth => {
    const req = https.get(`${base}/api/health`, { rejectUnauthorized: false, timeout: 1000 }, response => { response.resume(); resolveHealth(response.statusCode === 200); });
    req.on('error', () => resolveHealth(false)); req.on('timeout', () => { req.destroy(); resolveHealth(false); });
  });
}
async function newDevice(viewport) {
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true, serviceWorkers: 'allow' });
  contexts.push(context);
  context.on('response', response => {
    if (!new URL(response.url()).pathname.startsWith('/api/')) return;
    if (!/(?:^|,)\s*no-store\b/.test(response.headers()['cache-control'] ?? '')) apiPolicyFailures.add(new URL(response.url()).pathname);
  });
  const page = await context.newPage();
  // Observe real session notifications so offline tests never cut off initial identity validation.
  await page.addInitScript(() => { window.__platformSessionStatus = null; window.addEventListener('gl-session-change', event => { window.__platformSessionStatus = event.detail.status; }); });
  page.setDefaultTimeout(30_000);
  page.on('pageerror', error => browserErrors.push(sanitized(error)));
  page.on('console', message => { if (['error', 'warning'].includes(message.type()) && /service.worker|ssl|certificate|offline|registration/i.test(message.text())) browserDiagnostics.push(sanitized(message.text())); });
  return { context, page };
}
async function login(device, username) {
  const { page, context } = device;
  await page.goto(`${base}/login/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__platformSessionStatus === 'signed-out');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill(passwords[username]);
  const received = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/login' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  assert.equal((await received).status(), 200, `${username}: DOM login failed`);
  await page.waitForURL(`${base}${username === 'admin' ? '/account/' : '/dashboard/'}`);
  const me = await context.request.get(`${base}/api/auth/me`);
  assert.equal(me.status(), 200, `${username}: session unavailable`);
  const data = await me.json();
  assert.equal(data.user.username, username);
  const cookie = (await context.cookies()).find(value => value.name === '__Host-gl_session');
  assert(cookie && cookie.secure && cookie.httpOnly && cookie.sameSite === 'Lax' && cookie.path === '/', 'Secure session cookie policy failed');
  knownSecrets.push(cookie.value);
  await page.waitForFunction(id => localStorage.getItem('german-learning:local-owner:v1') === id, data.user.id);
  return data.user;
}
function panel(page, title) { return page.getByRole('heading', { name: title, exact: true }).locator('..'); }
async function study(page) { return page.evaluate(() => JSON.parse(localStorage.getItem('german-learning-os:study-book:v1') ?? '{"saved":{}}')); }
async function pageState(page) {
  return page.evaluate(async () => {
    const saved = JSON.parse(localStorage.getItem('german-learning-os:study-book:v1') ?? '{"saved":{}}').saved;
    return {
      pathname: location.pathname, online: navigator.onLine, sessionStatus: window.__platformSessionStatus,
      serviceWorkerController: Boolean(navigator.serviceWorker.controller),
      registrations: (await navigator.serviceWorker.getRegistrations()).map(registration => ({ active: registration.active?.state, waiting: registration.waiting?.state, installing: registration.installing?.state })),
      saved: Object.values(saved).map(item => ({ id: item.id, noteMarker: item.note === 'Offline browser verification memory cue' })),
      scope: JSON.parse(localStorage.getItem('german-study-scope-v1') ?? 'null'),
      cards: document.querySelectorAll('.study-saved-card').length,
      textareas: [...document.querySelectorAll('textarea')].map(input => ({ noteMarker: input.value === 'Offline browser verification memory cue', labelText: input.labels?.[0]?.textContent })),
      bodySummary: document.querySelector('main')?.innerText.slice(0, 1800),
    };
  });
}

async function exerciseSync(student, studentUser, anonymousId = '', anonymousItems = {}) {
  phase = 'global runtime on existing lesson route';
  await student.page.goto(`${base}/dashboard/`, { waitUntil: 'domcontentloaded' });
  await student.page.getByRole('link', { name: 'Lessons', exact: true }).first().click();
  await student.page.waitForURL(`${base}/lessons/`);
  await student.page.locator('a[href="/lessons/04/"], a[href="/lessons/04"]').first().click();
  await student.page.waitForURL(`${base}/lessons/04/`);
  await student.page.waitForFunction(id => localStorage.getItem('german-learning:local-owner:v1') === id && localStorage.getItem(`german-learning:sync:v1:${encodeURIComponent(id)}`), studentUser.id);
  await student.page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 60_000 });
  await student.page.waitForFunction(() => window.__platformSessionStatus === 'signed-in');
  await student.context.setOffline(true);
  await student.page.waitForFunction(() => !navigator.onLine);
  const buttons = student.page.getByRole('button', { name: /^Save to review:/ });
  let offlineButton;
  for (const button of await buttons.all()) if ((await button.getAttribute('aria-label')) !== `Save to review: ${anonymousItems[anonymousId]?.title ?? ''}`) { offlineButton = button; break; }
  assert(offlineButton, 'No distinct lesson item available to save offline');
  await offlineButton.click();
  const accountSaved = (await study(student.page)).saved;
  const offlineId = Object.keys(accountSaved).find(id => id !== anonymousId);
  assert(offlineId, 'Offline DOM save did not persist');
  await student.page.waitForFunction(({ userId, itemId }) => {
    const queue = JSON.parse(localStorage.getItem(`german-learning:sync:v1:${encodeURIComponent(userId)}`) ?? '{}');
    return queue.docs?.some(doc => doc.store === 'study.docs' && doc.key === `saved:${itemId}`);
  }, { userId: studentUser.id, itemId: offlineId }, { timeout: 30_000 });
  assert.equal(await student.page.evaluate(() => localStorage.getItem('german-learning:local-owner:v1')), studentUser.id);
  success('account runtime survives navigation; offline DOM edit is queued');
  phase = 'online replay and second-device sync';
  await student.context.setOffline(false);
  await student.page.waitForFunction(({ userId, itemId }) => {
    const queue = JSON.parse(localStorage.getItem(`german-learning:sync:v1:${encodeURIComponent(userId)}`) ?? '{}');
    return queue.docs && !queue.docs.some(doc => doc.key === `saved:${itemId}`);
  }, { userId: studentUser.id, itemId: offlineId }, { timeout: 45_000 });
  const secondDevice = await newDevice({ width: 1440, height: 1000 });
  await login(secondDevice, 'student1');
  await secondDevice.page.waitForFunction(itemId => Boolean(JSON.parse(localStorage.getItem('german-learning-os:study-book:v1') ?? '{"saved":{}}').saved[itemId]), offlineId, { timeout: 45_000 });
  await secondDevice.page.goto(`${base}/saved/`, { waitUntil: 'domcontentloaded' });
  await secondDevice.page.getByRole('button', { name: `Remove from review: ${accountSaved[offlineId].title}`, exact: true }).waitFor();
  // Keep the receiving Saved view mounted while the other device edits. This
  // detects missing same-tab storage notifications, rather than hiding them
  // behind a reload that rereads localStorage.
  await student.page.goto(`${base}/saved/`, { waitUntil: 'domcontentloaded' });
  const receivedNote = student.page.locator('article.study-saved-card').filter({ has: student.page.getByRole('button', { name: `Remove from review: ${accountSaved[offlineId].title}`, exact: true }) }).locator('textarea');
  await receivedNote.waitFor();
  const note = 'Offline browser verification memory cue';
  await secondDevice.page.waitForFunction(() => window.__platformSessionStatus === 'signed-in');
  await secondDevice.context.setOffline(true);
  const secondNote = secondDevice.page.locator('article.study-saved-card').filter({ has: secondDevice.page.getByRole('button', { name: `Remove from review: ${accountSaved[offlineId].title}`, exact: true }) }).locator('textarea');
  await secondNote.fill(note);
  await secondNote.blur();
  await secondDevice.page.waitForFunction(itemId => {
    const queue = Object.keys(localStorage).find(key => key.startsWith('german-learning:sync:v1:'));
    return queue && JSON.parse(localStorage.getItem(queue)).docs.some(doc => doc.key === `saved:${itemId}` && doc.value?.note);
  }, offlineId, { timeout: 30_000 });
  await secondDevice.context.setOffline(false);
  await secondDevice.page.waitForFunction(itemId => {
    const queue = Object.keys(localStorage).find(key => key.startsWith('german-learning:sync:v1:'));
    return queue && !JSON.parse(localStorage.getItem(queue)).docs.some(doc => doc.key === `saved:${itemId}`);
  }, offlineId, { timeout: 45_000 });
  await student.page.bringToFront();
  await student.page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await student.page.waitForFunction(({ itemId, note }) => JSON.parse(localStorage.getItem('german-learning-os:study-book:v1') ?? '{"saved":{}}').saved[itemId]?.note === note, { itemId: offlineId, note }, { timeout: 45_000 });
  await expect(receivedNote).toHaveValue(note, { timeout: 30_000 });
  assert.equal(await receivedNote.inputValue(), note, 'Synced note is absent from the already mounted saved-item UI');
  success('offline save and note replay across two real browser devices');

  return { offlineId, secondDevice };
}

async function diagnoseLogin(username, waitForHydration) {
  const device = await newDevice({ width: 1440, height: 1000 });
  const { page } = device;
  const network = [];
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/auth/login' || request.isNavigationRequest()) network.push({ type: 'request', path: new URL(request.url()).pathname, method: request.method() }); });
  page.on('requestfailed', request => { if (new URL(request.url()).pathname === '/api/auth/login') network.push({ type: 'failed', path: '/api/auth/login', reason: request.failure()?.errorText }); });
  await page.addInitScript(() => {
    window.addEventListener('submit', event => {
      sessionStorage.setItem('platform-browser-submit', JSON.stringify({ prevented: event.defaultPrevented, action: new URL(event.target.action).pathname }));
    });
  });
  await page.goto(`${base}/login/`, { waitUntil: 'domcontentloaded' });
  if (waitForHydration) await page.waitForFunction(() => window.__platformSessionStatus === 'signed-out');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill(passwords[username]);
  const inspect = () => page.evaluate(() => ({
    sessionStatus: window.__platformSessionStatus,
    inputs: [...document.querySelectorAll('form input')].map(input => ({ type: input.type, length: input.value.length, valid: input.validity.valid, reactAttached: Object.keys(input).some(key => key.startsWith('__reactProps$')) })),
    submit: JSON.parse(sessionStorage.getItem('platform-browser-submit') ?? 'null'),
    pathname: location.pathname,
    worker: Boolean(navigator.serviceWorker.controller),
  }));
  const before = await inspect();
  const response = page.waitForResponse(value => new URL(value.url()).pathname === '/api/auth/login' && value.request().method() === 'POST', { timeout: 10_000 }).then(value => value.status()).catch(() => null);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const status = await response;
  if (status === 200) await page.waitForURL(`${base}/dashboard/`);
  const after = await inspect();
  const result = { username, waitedForHydration: waitForHydration, status, before, after, network };
  console.log(JSON.stringify({ diagnostic: 'real-login-DOM', ...result }));
  return status;
}

async function noApiCaches(page) {
  const paths = await page.evaluate(async () => {
    const requests = (await Promise.all((await caches.keys()).map(async name => (await caches.open(name)).keys()))).flat();
    return requests.map(request => new URL(request.url).pathname).filter(pathname => pathname === '/api' || pathname.startsWith('/api/'));
  });
  assert.equal(paths.length, 0, 'Service worker cached a private API response');
}

try {
  assert(existsSync(join(edgeRoot, '../web/out/dashboard/index.html')), 'Build the current root export before running browser rehearsal');
  phase = 'local migrations';
  await privateCommand([wrangler, 'd1', 'migrations', 'apply', 'german-db-local', '--local', '--config', config, '--persist-to', state]);
  phase = 'private local seed';
  await privateCommand(['--import', 'tsx', join(edgeRoot, 'scripts/seed.ts'), '--local', '--database', 'german-db-local', '--config', config, '--persist-to', state], { SEED_ACCOUNTS_JSON: JSON.stringify(passwords) });
  success('local D1 migrations and private seed');
  phase = 'local HTTPS Worker';
  base = `https://127.0.0.1:${await freePort()}`;
  const worker = spawn(process.execPath, [wrangler, 'dev', '--local', '--config', config, '--local-protocol', 'https', '--ip', '127.0.0.1', '--port', new URL(base).port, '--inspector-port', '0', '--persist-to', state], { cwd: edgeRoot, env: childEnv, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  children.add(worker);
  let workerOutput = '';
  for (const stream of [worker.stdout, worker.stderr]) stream?.on('data', chunk => { workerOutput = (workerOutput + chunk).slice(-12000); });
  let ready = false;
  for (let i = 0; i < 160 && worker.exitCode === null; i++) { if (await localHealth()) { ready = true; break; } await delay(250); }
  assert(ready, `Local HTTPS Worker did not start: ${sanitized(workerOutput)}`);
  // All navigation is to generated loopback HTTPS. Chromium also needs this
  // test-only certificate exception for its service-worker network target.
  browser = await chromium.launch({ headless: true, executablePath: process.env.GL_BROWSER_EXECUTABLE ?? chromium.executablePath(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--ignore-certificate-errors'] });
  if (process.argv.includes('--diagnose-login')) {
    phase = 'targeted login hydration diagnosis';
    await diagnoseLogin('student1', false);
    const confirmed = await diagnoseLogin('teacher1', true);
    assert.equal(confirmed, 200, 'Hydrated teacher DOM login failed');
    success('targeted hydrated teacher login');
  } else if (process.argv.includes('--sync-only')) {
    const student = await newDevice({ width: 390, height: 844 });
    const user = await login(student, 'student1');
    await exerciseSync(student, user);
    success('targeted real cross-device offline sync');
  } else {
  const student = await newDevice({ width: 390, height: 844 });
  phase = 'anonymous progress';
  await student.page.goto(`${base}/lessons/04/`, { waitUntil: 'domcontentloaded' });
  const unsignedSave = student.page.getByRole('button', { name: /^Save to review:/ }).first();
  await unsignedSave.click();
  const anonymousItems = (await study(student.page)).saved;
  const anonymousId = Object.keys(anonymousItems)[0];
  assert(anonymousId, 'Anonymous DOM save did not persist');
  success('anonymous DOM save');
  phase = 'student role and consent';
  const studentUser = await login(student, 'student1');
  await student.page.getByText('This device has progress from before you signed in. Add it to your account?', { exact: true }).waitFor();
  await student.page.getByRole('button', { name: 'Keep separate', exact: true }).click();
  await student.page.getByRole('heading', { name: 'Your assignments', exact: true }).waitFor();
  assert(!(await study(student.page)).saved[anonymousId], 'Unsigned progress was added despite Keep separate');
  success('student dashboard and explicit progress consent');

  phase = 'teacher class and assignment DOM workflow';
  const teacher = await newDevice({ width: 1440, height: 1000 });
  await login(teacher, 'teacher1');
  await teacher.page.getByRole('link', { name: 'Teaching', exact: true }).click();
  await teacher.page.waitForURL(`${base}/teacher/`);
  const className = 'Browser verification class';
  const newClass = panel(teacher.page, 'New class');
  await newClass.getByLabel('Class name', { exact: true }).fill(className);
  const classResponse = teacher.page.waitForResponse(response => new URL(response.url()).pathname === '/api/teacher/classes' && response.request().method() === 'POST');
  await newClass.getByRole('button', { name: 'Create class', exact: true }).click();
  assert.equal((await classResponse).status(), 201, 'Class creation failed');
  const classPanel = panel(teacher.page, className);
  await classPanel.getByRole('link', { name: 'Open class', exact: true }).waitFor();
  const joinCode = (await classPanel.locator('strong').innerText()).trim();
  assert(joinCode.length >= 6, 'Created class has no join code');
  await classPanel.getByRole('link', { name: 'Open class', exact: true }).click();
  await teacher.page.getByRole('link', { name: 'New assignment', exact: true }).click();
  await teacher.page.getByLabel('Assignment title', { exact: true }).fill('Browser verification assignment');
  await teacher.page.getByLabel('Up to lesson', { exact: true }).fill('5');
  await teacher.page.getByLabel('Number of items', { exact: true }).fill('3');
  for (const name of ['gender', 'plural', 'listening']) await teacher.page.getByRole('checkbox', { name, exact: true }).uncheck();
  const assignmentResponse = teacher.page.waitForResponse(response => new URL(response.url()).pathname === '/api/teacher/assignments' && response.request().method() === 'POST');
  await teacher.page.getByRole('button', { name: 'Create assignment', exact: true }).click();
  assert.equal((await assignmentResponse).status(), 201, 'Assignment creation failed');
  await teacher.page.getByText('Assignment created.', { exact: true }).waitFor();
  success('teacher DOM creates class and scoped assignment');
  phase = 'student joins new class';
  await student.page.getByLabel('Class code', { exact: true }).fill(joinCode);
  const joinResponse = student.page.waitForResponse(response => new URL(response.url()).pathname === '/api/me/classes' && response.request().method() === 'POST');
  await student.page.getByRole('button', { name: 'Join class', exact: true }).click();
  assert([200, 201].includes((await joinResponse).status()), 'Student class join failed');
  await student.page.getByRole('link', { name: 'Browser verification assignment', exact: true }).waitFor();
  await panel(student.page, 'Your classes').getByText(className, { exact: false }).first().waitFor();
  const book = panel(student.page, 'My book');
  await book.getByLabel('Lesson', { exact: true }).fill('6');
  await book.getByLabel('Page', { exact: true }).fill('66');
  const positionResponse = student.page.waitForResponse(response => new URL(response.url()).pathname === '/api/me/position' && response.request().method() === 'POST');
  await book.getByRole('button', { name: 'Save', exact: true }).click();
  assert.equal((await positionResponse).status(), 200, 'Book position mutation failed');
  await student.page.getByText('momente-a1 · Lektion 6 · Seite 66', { exact: true }).waitFor();
  if (process.env.GL_PLATFORM_BROWSER_ARTIFACTS) {
    mkdirSync(process.env.GL_PLATFORM_BROWSER_ARTIFACTS, { recursive: true });
    await student.page.screenshot({ path: join(process.env.GL_PLATFORM_BROWSER_ARTIFACTS, 'student-dashboard-phone.png'), fullPage: true });
  }
  success('student DOM joins class, sees assignment, and updates book position');

  phase = 'nonadmin authorization';
  await student.page.goto(`${base}/admin/`, { waitUntil: 'domcontentloaded' });
  await student.page.getByRole('alert').filter({ hasText: 'Access denied' }).waitFor();
  assert.equal((await student.context.request.get(`${base}/api/admin/users`)).status(), 403);
  assert.equal((await student.context.request.get(`${base}/api/teacher/classes`)).status(), 403);
  success('student denied admin/teacher API and admin UI');

  const { offlineId, secondDevice } = await exerciseSync(student, studentUser, anonymousId, anonymousItems);

  phase = 'signout restores anonymous data';
  await student.page.goto(`${base}/account/`, { waitUntil: 'domcontentloaded' });
  await student.page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await student.page.waitForURL(`${base}/`);
  await student.page.waitForFunction(id => !localStorage.getItem('german-learning:local-owner:v1') && Boolean(JSON.parse(localStorage.getItem('german-learning-os:study-book:v1') ?? '{"saved":{}}').saved[id]), anonymousId);
  assert(!(await study(student.page)).saved[offlineId], 'Account progress leaked into restored anonymous data');
  assert.equal((await student.context.request.get(`${base}/api/auth/me`)).status(), 401);
  success('DOM signout revokes session and restores anonymous progress');

  phase = 'admin forced password and rotated session';
  const admin = await newDevice({ width: 1440, height: 1000 });
  const adminUser = await login(admin, 'admin');
  assert(adminUser.mustChangePassword, 'Seed administrator must change password');
  await admin.page.getByRole('alert').filter({ hasText: 'replace your temporary password' }).waitFor();
  const oldCookie = (await admin.context.cookies()).find(cookie => cookie.name === '__Host-gl_session').value;
  assert.equal((await admin.context.request.get(`${base}/api/admin/system`)).status(), 403);
  await admin.page.getByLabel('Current password', { exact: true }).fill(passwords.admin);
  await admin.page.getByLabel('New password', { exact: true }).fill(changedAdminPassword);
  const passwordResponse = admin.page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/password/change' && response.request().method() === 'POST');
  await admin.page.getByRole('button', { name: 'Change password', exact: true }).click();
  assert.equal((await passwordResponse).status(), 200, 'Admin DOM password change failed');
  await admin.page.getByText('Password changed. Other sessions have been signed out.', { exact: true }).waitFor();
  const newCookie = (await admin.context.cookies()).find(cookie => cookie.name === '__Host-gl_session').value;
  knownSecrets.push(newCookie);
  assert(oldCookie !== newCookie, 'Password change did not rotate the session');
  const oldSession = await playwrightRequest.newContext({ ignoreHTTPSErrors: true, extraHTTPHeaders: { Cookie: `__Host-gl_session=${oldCookie}` } });
  try { assert.equal((await oldSession.get(`${base}/api/auth/me`)).status(), 401, 'Previous admin session remained valid'); } finally { await oldSession.dispose(); }
  await admin.page.getByRole('link', { name: 'Admin', exact: true }).click();
  await admin.page.waitForURL(`${base}/admin/`);
  await admin.page.getByRole('heading', { name: 'People', exact: true }).waitFor();
  await admin.page.getByText('student:', { exact: false }).first().waitFor();
  const system = await admin.context.request.get(`${base}/api/admin/system`);
  assert.equal(system.status(), 200);
  const systemData = await system.json();
  assert.deepEqual(systemData.usersByRole, { admin: 1, student: 3, teacher: 1 });
  if (process.env.GL_PLATFORM_BROWSER_ARTIFACTS) await admin.page.screenshot({ path: join(process.env.GL_PLATFORM_BROWSER_ARTIFACTS, 'admin-dashboard-desktop.png'), fullPage: true });
  success('admin forced DOM password change rotates session and unlocks role UI');
  phase = 'API cache and browser integrity';
  for (const device of [student, teacher, secondDevice, admin]) await noApiCaches(device.page);
  assert.equal(apiPolicyFailures.size, 0, `API responses missing no-store: ${[...apiPolicyFailures].join(', ')}`);
  assert.equal(browserErrors.length, 0, `Browser runtime errors: ${browserErrors.join('; ')}`);
  success('no private API caches, no-store response policy, zero browser runtime errors');
  console.log(JSON.stringify({ passed: true, kind: 'real-local-https-d1-playwright', phases: passed, accountPasswordsLogged: false, externalCloudflareResources: 0 }));
  }
} catch (error) {
  const pages = [];
  for (const context of contexts) for (const page of context.pages()) {
    try { pages.push(await pageState(page)); } catch {}
  }
  console.error(JSON.stringify({ passed: false, phase, completed: passed, error: sanitized(error), browserErrors, browserDiagnostics, pages }));
  process.exitCode = 1;
} finally {
  clearTimeout(deadline);
  await cleanup();
  process.off('SIGINT', signal); process.off('SIGTERM', signal);
}
