import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { finalizeOfflineExport, precacheGroupFor } from "../../apps/web/scripts/offline-export";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "apps", "web");
const fixtures: string[] = [];
afterEach(() => { for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true }); });

describe("moved sheet install-time availability", () => {
  it("keeps the canonical country and vocabulary pages in the shell without adding the content long tail", () => {
    for (const path of ["cheat-sheets/countries/index.html", "cheat-sheets/vocabulary/index.html"]) expect(precacheGroupFor(path)).toBe("html");
    for (const path of ["cheat-sheets/subjects/home/index.html", "cheat-sheets/food/index.html", "vocabulary/w466/index.html"]) expect(precacheGroupFor(path)).toBeNull();
  });

  it.each(["", "/german-learning-exam"])("stamps both moved pages into the real worker configuration at base %s", base => {
    const out = mkdtempSync(join(tmpdir(), "sheet-offline-"));
    fixtures.push(out);
    writeFileSync(join(out, "sw.js"), readFileSync(join(webRoot, "public", "sw.js")));
    for (const path of ["index.html", "cheat-sheets/index.html", "cheat-sheets/countries/index.html", "cheat-sheets/vocabulary/index.html", "cheat-sheets/subjects/home/index.html"]) {
      const file = join(out, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, `<h1>${path}</h1>`);
    }
    const summary = finalizeOfflineExport(out, base);
    const html = summary.entries.filter(entry => entry.group === "html").map(entry => entry.url);
    expect(html).toEqual(expect.arrayContaining([`${base}/`, `${base}/cheat-sheets/`, `${base}/cheat-sheets/countries/`, `${base}/cheat-sheets/vocabulary/`]));
    expect(html).not.toContain(`${base}/cheat-sheets/subjects/home/`);
    const worker = readFileSync(summary.serviceWorkerFile, "utf8");
    for (const url of html) expect(worker).toContain(JSON.stringify(url));
  });
});
