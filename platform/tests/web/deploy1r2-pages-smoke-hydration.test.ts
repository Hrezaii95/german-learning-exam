/**
 * DEPLOY1R2 — must200 HTTP smoke requires base-prefixed /_next hydration
 * assets and rejects bare root /_next (closes residual DEPLOY1R1 P2).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assertBasePrefixedNextAssets } from "../../apps/web/scripts/smoke-pages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const smokePagesPath = join(
  here,
  "../../apps/web/scripts/smoke-pages.mjs",
);
const PAGES_BASE = "/german-learning-exam";

describe("DEPLOY1R2 must200 hydration asset prefix", () => {
  it("accepts exact base-prefixed /_next hydration refs", () => {
    const html = `<html><script src="${PAGES_BASE}/_next/static/chunks/main.js"></script></html>`;
    expect(() =>
      assertBasePrefixedNextAssets(html, "/concepts/"),
    ).not.toThrow();
  });

  it("rejects HTML that only has bare root /_next (false-pass under weak OR)", () => {
    const html =
      '<html><script src="/_next/static/chunks/main.js"></script></html>';
    expect(() =>
      assertBasePrefixedNextAssets(html, "/concepts/"),
    ).toThrow(/missing base-prefixed _next|must not use bare root/);
  });

  it("rejects base path without /_next/ hydration prefix", () => {
    const html = `<html><a href="${PAGES_BASE}/vocabulary/">Vocab</a></html>`;
    expect(() =>
      assertBasePrefixedNextAssets(html, "/vocabulary/"),
    ).toThrow(/missing base-prefixed _next/);
  });

  it("rejects mixed pages that include bare src=/_next/ alongside a base prefix", () => {
    const html = `<html>
      <script src="${PAGES_BASE}/_next/static/chunks/main.js"></script>
      <script src="/_next/static/chunks/extra.js"></script>
    </html>`;
    expect(() =>
      assertBasePrefixedNextAssets(html, "/search/"),
    ).toThrow(/must not use bare root/);
  });

  it("rejects bare href=/_next/", () => {
    const html = `<html>
      <link rel="stylesheet" href="/_next/static/css/app.css"/>
      <script src="${PAGES_BASE}/_next/static/chunks/main.js"></script>
    </html>`;
    expect(() =>
      assertBasePrefixedNextAssets(html, "/lessons/"),
    ).toThrow(/must not use bare root/);
  });

  it("smoke-pages must200 uses assertBasePrefixedNextAssets (not weak PAGES_BASE||_next)", () => {
    const source = readFileSync(smokePagesPath, "utf8");
    const must200Idx = source.indexOf("const must200 = [");
    expect(must200Idx).toBeGreaterThanOrEqual(0);
    const afterMust200 = source.slice(must200Idx);
    const loopEnd = afterMust200.indexOf("// Asset from index");
    expect(loopEnd).toBeGreaterThan(0);
    const must200Block = afterMust200.slice(0, loopEnd);

    expect(must200Block).toContain("assertBasePrefixedNextAssets(text, path)");
    expect(must200Block).not.toMatch(
      /text\.includes\(PAGES_BASE\)\s*\|\|\s*text\.includes\("_next"\)/,
    );
  });
});
