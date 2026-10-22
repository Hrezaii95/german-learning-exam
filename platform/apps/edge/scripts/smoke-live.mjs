/** Public read-only post-deploy smoke. Never receives or prints credentials. */
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
const input = process.argv[process.argv.indexOf("--origin") + 1];
assert(input, "Pass --origin https://german.learnilabs.com");
const origin = new URL(input);
const versionIndex = process.argv.indexOf("--version");
const version = versionIndex < 0 ? undefined : process.argv[versionIndex + 1];
assert(origin.protocol === "https:" && !origin.username && !origin.password && origin.pathname === "/", "Use a credential-free HTTPS origin");
let lastError;
for (let attempt = 0; attempt < 6; attempt++) {
    try {
        for (const path of ["/", "/lessons/", "/cheat-sheets/plurals/", "/manifest.webmanifest", "/sw.js", "/api/health", "/api/no-such-route", "/no-such-alpha-route/"]) {
            const response = await fetch(new URL(path, origin), { redirect: "manual", signal: AbortSignal.timeout(15000) });
            const expected = path.includes("no-such") ? 404 : 200;
            assert.equal(response.status, expected, `${path}: unexpected status`);
            for (const header of ["content-security-policy", "strict-transport-security", "x-content-type-options", "referrer-policy"])
                assert(response.headers.has(header), `${path}: missing ${header}`);
            const body = await response.text();
            if (path === "/api/health") {
                const health = JSON.parse(body);
                assert.equal(health.ok, true);
                if (version)
                    assert.equal(health.version, version, "Deployed commit differs from the tested commit");
            }
            if (path === "/") {
                const asset = body.match(/(?:src|href)="(\/_next\/static\/[^"<>]+\.(?:js|css))"/);
                assert(asset, "Missing root hydration asset");
                assert.equal((await fetch(new URL(asset[1], origin))).status, 200, "Hydration asset failed");
            }
        }
        console.log(`[smoke:live] PASS ${origin.origin}`);
        process.exit(0);
    }
    catch (error) {
        lastError = error;
        if (attempt < 5)
            await delay(5000);
    }
}
throw lastError;
