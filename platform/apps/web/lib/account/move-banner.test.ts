import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mountMoveBanner } from "./move-banner";

const { JSDOM } = createRequire(import.meta.url)("jsdom") as {
  JSDOM: new (html: string, options: { url: string }) => { window: Window & typeof globalThis };
};
function setup(url = "https://hrezaii95.github.io/german-learning-exam/") {
  const dom = new JSDOM("<!doctype html><html><body><main>Lesson</main><footer>Credits</footer></body></html>", { url });
  const keys = ["window", "document", "fetch"] as const;
  const original = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true });
  Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true });
  return { window: dom.window, restore() {
    dom.window.close();
    for (const key of keys) { const descriptor = original.get(key); if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  } };
}
function health(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}
test("failed or invalid readiness leaves the learning page without a move notice", async () => {
  const dom = setup();
  try {
    for (const response of [health({ ok: false, service: "german-web" }), health({ ok: true, service: "another-service" }), health({ ok: true, service: "german-web" }, 503)]) {
      globalThis.fetch = async () => response;
      await mountMoveBanner();
      assert.equal(document.getElementById("gl-move-banner"), null);
    }
    globalThis.fetch = async () => { throw new TypeError("Offline"); };
    await mountMoveBanner(); assert.equal(document.getElementById("gl-move-banner"), null);
  } finally { dom.restore(); }
});
test("valid readiness uses only a cookie-free GET and exposes a fixed responsive action above mobile navigation", async () => {
  const dom = setup(); const requests: { url: string; options?: RequestInit }[] = [];
  try {
    globalThis.fetch = async (url, options) => { requests.push({ url: String(url), ...(options ? { options } : {}) }); return health({ ok: true, service: "german-web" }); };
    await mountMoveBanner();
    assert.equal(requests.length, 1); assert.equal(requests[0]?.url, "https://german.learnilabs.com/api/health");
    assert.equal(requests[0]?.options?.method, "GET"); assert.equal(requests[0]?.options?.credentials, "omit"); assert.equal(requests[0]?.options?.cache, "no-store"); assert.equal(requests[0]?.options?.body, undefined);
    const banner = document.getElementById("gl-move-banner")!;
    assert.equal(banner.style.position, "fixed"); assert.match(banner.style.bottom, /--measured-bottom-nav-height/);
    assert.match(banner.style.width, /100vw/); assert.notEqual(banner.style.display, "none");
    assert.equal(banner.getAttribute("aria-label"), "New learning address");
    assert.ok([...banner.querySelectorAll("button")].some(button => button.textContent === "Take my progress with me"));
    await mountMoveBanner(); assert.equal(document.querySelectorAll("#gl-move-banner").length, 1);
    const dismiss = banner.querySelector<HTMLButtonElement>('button[aria-label="Dismiss new address notice"]')!;
    dismiss.click(); assert.equal(document.getElementById("gl-move-banner"), null);
  } finally { dom.restore(); }
});
test("the progress action downloads a validated backup and opens only the new import page", async () => {
  const dom = setup(); const downloads: { href: string; filename: string }[] = []; const opened: unknown[][] = [];
  const originalCreate = URL.createObjectURL; const originalRevoke = URL.revokeObjectURL;
  let blob: Blob | undefined;
  URL.createObjectURL = value => { blob = value as Blob; return "blob:progress-backup"; };
  URL.revokeObjectURL = () => {};
  dom.window.HTMLAnchorElement.prototype.click = function () { downloads.push({ href: this.href, filename: this.download }); };
  dom.window.open = (...args: unknown[]) => { opened.push(args); return null; };
  try {
    globalThis.fetch = async () => health({ ok: true, service: "german-web" });
    await mountMoveBanner();
    const banner = document.getElementById("gl-move-banner")!;
    [...banner.querySelectorAll("button")].find(button => button.textContent === "Take my progress with me")!.click();
    assert.deepEqual(downloads, [{ href: "blob:progress-backup", filename: "german-learning-progress.json" }]);
    assert.deepEqual(opened, [["https://german.learnilabs.com/account/import/", "_blank", "noopener,noreferrer"]]);
    const backup = JSON.parse(await blob!.text()) as { format: string; version: number };
    assert.equal(backup.format, "german-learning-complete"); assert.equal(backup.version, 1);
    assert.match(banner.querySelector('[role="status"]')!.textContent!, /download has started/);
    assert.equal(banner.querySelector("a")?.getAttribute("rel"), "noopener noreferrer");
  } finally { URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke; dom.restore(); }
});
test("the new production address never requests readiness or mounts the Pages notice", async () => {
  const dom = setup("https://german.learnilabs.com/"); let calls = 0;
  try { globalThis.fetch = async () => { calls++; return health({ ok: true, service: "german-web" }); }; await mountMoveBanner(); assert.equal(calls, 0); assert.equal(document.getElementById("gl-move-banner"), null); }
  finally { dom.restore(); }
});
