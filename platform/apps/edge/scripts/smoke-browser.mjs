/** Optional real-browser root hosting check; install Playwright Chromium or set GL_BROWSER_EXECUTABLE. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const edgeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = require('@playwright/test');
const portServer = createServer();
await new Promise(r => portServer.listen(0, '127.0.0.1', r));
const port = portServer.address().port;
await new Promise(r => portServer.close(r));
const base = `http://127.0.0.1:${port}`;
const state = mkdtempSync(join(tmpdir(), 'german-l3-browser-state-'));
const worker = spawn(process.execPath, [join(dirname(require.resolve('wrangler/package.json')), 'bin/wrangler.js'), 'dev', '--local', '--ip', '127.0.0.1', '--port', String(port), '--inspector-port', '0', '--persist-to', state], { cwd: edgeRoot, env: { ...process.env, CLOUDFLARE_API_TOKEN: '', CLOUDFLARE_ACCOUNT_ID: '', WRANGLER_SEND_METRICS: 'false', CI: 'true' }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
worker.stdout.on('data', c => output = (output + c).slice(-8000));
worker.stderr.on('data', c => output = (output + c).slice(-8000));
let browser;
try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
        try {
            const r = await fetch(base + '/api/health', { signal: AbortSignal.timeout(1000) });
            ready = r.ok;
            await r.body?.cancel();
        }
        catch { }
        if (ready)
            break;
        await delay(250);
    }
    assert(ready, output);
    browser = await chromium.launch({ headless: true, executablePath: process.env.GL_BROWSER_EXECUTABLE ?? chromium.executablePath(), args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote'] });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { window.__cspViolations = []; document.addEventListener('securitypolicyviolation', e => window.__cspViolations.push(e.effectiveDirective + ':' + e.blockedURI)); });
    const response = await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    assert.equal(response.status(), 200);
    await page.waitForFunction(() => navigator.serviceWorker.controller || navigator.serviceWorker.getRegistrations().then(x => x.length > 0), undefined, { timeout: 60000 });
    const scope = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return r.scope; });
    assert.equal(scope, base + '/');
    const link = page.getByRole('link', { name: 'Lessons', exact: true }).first();
    assert.equal(await link.getAttribute('href'), '/lessons/');
    await link.click();
    await page.waitForURL(base + '/lessons/', { timeout: 30000 });
    await page.locator('main').waitFor({ state: 'visible' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const csp = await page.evaluate(() => window.__cspViolations);
    assert.deepEqual(csp, []);
    assert.deepEqual(errors, []);
    await context.setOffline(true);
    const offline = await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    assert.equal(offline.status(), 200);
    await page.locator('main').waitFor({ state: 'visible' });
    await context.setOffline(false);
    console.log(JSON.stringify({ pass: true, viewport: '390x844', hydrationErrors: errors.length, cspViolations: csp.length, serviceWorkerScope: scope.replace(base, 'localhost'), clientNavigation: '/lessons/', offlineReload: 200 }));
}
finally {
    await browser?.close();
    try {
        process.kill(-worker.pid, 'SIGTERM');
    }
    catch { }
    await delay(500);
    try {
        process.kill(-worker.pid, 'SIGKILL');
    }
    catch { }
    rmSync(state, { recursive: true, force: true });
}
