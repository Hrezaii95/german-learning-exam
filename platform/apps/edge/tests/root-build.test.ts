import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import {
  createIsolationFixture,
  createPagesBuildController,
  DYNAMIC_FALSE,
  DYNAMIC_TRUE,
} from "../../web/scripts/build-pages-lib.js";
import { withRootSourceIsolation } from "../scripts/build-root.js";

test("root build leaves ambiguous live and parked proxy files untouched", async (context) => {
  const root = mkdtempSync(join(tmpdir(), "gl-root-ambiguous-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  createIsolationFixture(root, { proxyBody: "/* live proxy must survive */\n" });
  const controller = createPagesBuildController({ webRoot: root, log: () => {} });
  const parked = "/* conflicting parked proxy must survive */\n";
  writeFileSync(controller.proxyParked, parked);
  const live = readFileSync(controller.proxyPath, "utf8");
  const beforeSignals = process.listenerCount("SIGTERM");
  let ranBuild = false;

  await assert.rejects(withRootSourceIsolation(controller, async () => { ranBuild = true; }), /Ambiguous proxy state/);

  assert.equal(ranBuild, false);
  assert.equal(readFileSync(controller.proxyPath, "utf8"), live);
  assert.equal(readFileSync(controller.proxyParked, "utf8"), parked);
  assert.equal(process.listenerCount("SIGTERM"), beforeSignals);
});

test("a failed root build restores the real proxy and every patched route", async (context) => {
  const root = mkdtempSync(join(tmpdir(), "gl-root-failure-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const { pages } = createIsolationFixture(root);
  const controller = createPagesBuildController({ webRoot: root, log: () => {} });
  const originalProxy = readFileSync(controller.proxyPath, "utf8");
  const originalPages = new Map(pages.map((page) => [page, readFileSync(controller.filePath(page), "utf8")]));
  const beforeSignals = process.listenerCount("SIGTERM");

  await assert.rejects(withRootSourceIsolation(controller, async () => {
    assert(!existsSync(controller.proxyPath));
    assert(existsSync(controller.proxyParked));
    for (const page of pages) {
      const patched = readFileSync(controller.filePath(page), "utf8");
      assert(patched.includes(DYNAMIC_FALSE));
      assert(!patched.includes(DYNAMIC_TRUE));
      assert(existsSync(controller.bakPath(page)));
    }
    throw new Error("injected export failure");
  }), /injected export failure/);

  assert.equal(readFileSync(controller.proxyPath, "utf8"), originalProxy);
  assert(!existsSync(controller.proxyParked));
  for (const page of pages) {
    assert.equal(readFileSync(controller.filePath(page), "utf8"), originalPages.get(page));
    assert(!existsSync(controller.bakPath(page)));
  }
  assert.equal(controller.isProxyIsolated(), false);
  assert.equal(controller.mutatedParamRels.size, 0);
  assert.equal(process.listenerCount("SIGTERM"), beforeSignals);
});
