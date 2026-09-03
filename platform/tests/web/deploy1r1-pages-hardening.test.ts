/**
 * DEPLOY1R1 — Pages release-hardening fault injection.
 * Uses disposable fixtures; does not mutate the real web app tree.
 */
import { mkdirSync, mkdtempSync, renameSync, writeFileSync } from "node:fs";
import { normalizeExportSegments } from "../../apps/web/scripts/normalize-export-segments.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertPagesExportEnv } from "../../apps/web/lib/content/pages-export-env.js";
import { PAGES_BASE_PATH } from "../../apps/web/lib/content/pages-base-path.js";
import {
  BAK_SUFFIX,
  DYNAMIC_FALSE,
  DYNAMIC_PARAM_PAGES,
  DYNAMIC_TRUE,
  PROXY_PARKED_NAME,
  createIsolationFixture,
  createPagesBuildController,
  readUtf8,
  removeTree,
} from "../../apps/web/scripts/build-pages-lib.js";

const fixtures: string[] = [];

describe("Windows static RSC segment export", () => {
  it("provides browser filenames, preserves payloads and is idempotent", () => {
    const root = freshFixture();
    const nested = join(root, "vocabulary", "__next.vocabulary", "w126");
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(nested, "__PAGE__.txt"), "RSC payload");
    expect(normalizeExportSegments(root)).toBe(1);
    const target = join(root, "vocabulary", "__next.vocabulary.w126.__PAGE__.txt");
    expect(readUtf8(target)).toBe("RSC payload");
    expect(normalizeExportSegments(root)).toBe(0);
    writeFileSync(target, "conflict");
    expect(() => normalizeExportSegments(root)).toThrow(/Conflicting RSC segment/);
    expect(readUtf8(target)).toBe("conflict");
  });
});

function freshFixture() {
  const root = mkdtempSync(join(tmpdir(), "gl-pages-harden-"));
  fixtures.push(root);
  createIsolationFixture(root);
  return root;
}

afterEach(() => {
  while (fixtures.length > 0) {
    const root = fixtures.pop();
    if (root) removeTree(root);
  }
});

describe("DEPLOY1R1 pages export env fail-fast", () => {
  it("no-ops when GL_PAGES_EXPORT is unset", () => {
    expect(() =>
      assertPagesExportEnv({ NEXT_PUBLIC_GL_PAGES_BASE_PATH: "" }),
    ).not.toThrow();
  });

  it("fails when export enabled without public base", () => {
    expect(() =>
      assertPagesExportEnv({
        GL_PAGES_EXPORT: "1",
        NEXT_PUBLIC_GL_PAGES_BASE_PATH: "",
      }),
    ).toThrow(/nonempty NEXT_PUBLIC_GL_PAGES_BASE_PATH/);
  });

  it("fails when public base is missing entirely", () => {
    expect(() =>
      assertPagesExportEnv({
        GL_PAGES_EXPORT: "1",
      }),
    ).toThrow(/nonempty NEXT_PUBLIC_GL_PAGES_BASE_PATH/);
  });

  it("fails when public base does not match configured Pages base", () => {
    expect(() =>
      assertPagesExportEnv({
        GL_PAGES_EXPORT: "1",
        NEXT_PUBLIC_GL_PAGES_BASE_PATH: "/wrong-base",
      }),
    ).toThrow(/must equal configured Pages base/);
  });

  it("accepts matching configured base", () => {
    expect(() =>
      assertPagesExportEnv({
        GL_PAGES_EXPORT: "1",
        NEXT_PUBLIC_GL_PAGES_BASE_PATH: PAGES_BASE_PATH,
      }),
    ).not.toThrow();
  });
});

describe("DEPLOY1R1 transactional isolation", () => {
  it("restores every written backup after partial patch failure", () => {
    const root = freshFixture();
    const originals = Object.fromEntries(
      DYNAMIC_PARAM_PAGES.map((rel: string) => [rel, readUtf8(join(root, rel))]),
    );
    // Sabotage a later page so the real patcher throws after earlier baks exist.
    const failRel = DYNAMIC_PARAM_PAGES[2]!;
    writeFileSync(
      join(root, failRel),
      `/* sabotaged — missing dynamicParams literal */\nexport default function Page(){return null}\n`,
    );

    const ctrl = createPagesBuildController({ webRoot: root, log: () => {} });
    expect(() => ctrl.patchDynamicParams()).toThrow(/Expected/);
    expect(ctrl.mutatedParamRels.size).toBeGreaterThan(0);
    ctrl.restoreDynamicParams();

    for (const rel of DYNAMIC_PARAM_PAGES) {
      if (rel === failRel) continue;
      expect(readUtf8(join(root, rel))).toBe(originals[rel]);
      expect(() => readUtf8(`${join(root, rel)}${BAK_SUFFIX}`)).toThrow();
    }
    expect(() => readUtf8(`${join(root, failRel)}${BAK_SUFFIX}`)).toThrow();
  });

  it("byte-for-byte restores sources after successful patch+restore", () => {
    const root = freshFixture();
    const originals = Object.fromEntries(
      DYNAMIC_PARAM_PAGES.map((rel: string) => [rel, readUtf8(join(root, rel))]),
    );
    const ctrl = createPagesBuildController({ webRoot: root, log: () => {} });
    ctrl.isolateProxy();
    ctrl.patchDynamicParams();
    for (const rel of DYNAMIC_PARAM_PAGES) {
      expect(readUtf8(join(root, rel))).toContain(DYNAMIC_FALSE);
    }
    ctrl.restoreAll();
    for (const rel of DYNAMIC_PARAM_PAGES) {
      expect(readUtf8(join(root, rel))).toBe(originals[rel]);
    }
    expect(readUtf8(join(root, "proxy.ts"))).toContain("proxy");
  });

  it("byte-for-byte restores sources after failed build path via restoreAll", () => {
    const root = freshFixture();
    const originals = Object.fromEntries(
      DYNAMIC_PARAM_PAGES.map((rel: string) => [rel, readUtf8(join(root, rel))]),
    );
    const proxyOriginal = readUtf8(join(root, "proxy.ts"));
    const ctrl = createPagesBuildController({ webRoot: root, log: () => {} });
    ctrl.isolateProxy();
    ctrl.patchDynamicParams();
    expect(() => {
      throw new Error("simulated next build failure");
    }).toThrow(/simulated next build failure/);
    ctrl.restoreAll();
    for (const rel of DYNAMIC_PARAM_PAGES) {
      expect(readUtf8(join(root, rel))).toBe(originals[rel]);
    }
    expect(readUtf8(join(root, "proxy.ts"))).toBe(proxyOriginal);
  });
});

describe("DEPLOY1R1 stale recovery", () => {
  it("auto-recovers proxy missing + parked present", () => {
    const root = freshFixture();
    const original = readUtf8(join(root, "proxy.ts"));
    renameSync(join(root, "proxy.ts"), join(root, PROXY_PARKED_NAME));
    const ctrl = createPagesBuildController({ webRoot: root, log: () => {} });
    const result = ctrl.recoverStaleState();
    expect(result.proxyRestored).toBe(true);
    expect(readUtf8(join(root, "proxy.ts"))).toBe(original);
  });

  it("auto-recovers source + valid backup pairs", () => {
    const root = freshFixture();
    const originals = Object.fromEntries(
      DYNAMIC_PARAM_PAGES.map((rel: string) => [rel, readUtf8(join(root, rel))]),
    );
    for (const rel of DYNAMIC_PARAM_PAGES) {
      const full = join(root, rel);
      writeFileSync(`${full}${BAK_SUFFIX}`, originals[rel]!);
      writeFileSync(
        full,
        originals[rel]!.replace(DYNAMIC_TRUE, DYNAMIC_FALSE),
      );
    }
    const ctrl = createPagesBuildController({ webRoot: root, log: () => {} });
    const result = ctrl.recoverStaleState();
    expect(result.paramsRestored).toHaveLength(DYNAMIC_PARAM_PAGES.length);
    for (const rel of DYNAMIC_PARAM_PAGES) {
      expect(readUtf8(join(root, rel))).toBe(originals[rel]);
    }
  });

  it("fails closed when proxy and parked both exist", () => {
    const root = freshFixture();
    writeFileSync(join(root, PROXY_PARKED_NAME), "parked\n");
    const ctrl = createPagesBuildController({ webRoot: root, log: () => {} });
    expect(() => ctrl.recoverStaleState()).toThrow(/Ambiguous proxy state/);
  });

  it("fails closed when patched without bak", () => {
    const root = freshFixture();
    const rel = DYNAMIC_PARAM_PAGES[0]!;
    writeFileSync(
      join(root, rel),
      `/* orphan patch */\n${DYNAMIC_FALSE}\n`,
    );
    const ctrl = createPagesBuildController({ webRoot: root, log: () => {} });
    expect(() => ctrl.recoverStaleState()).toThrow(/fail closed|without/);
  });
});

describe("DEPLOY1R1 signal cleanup", () => {
  it("registers SIGINT/SIGTERM handlers that restore isolation", () => {
    const root = freshFixture();
    const originals = Object.fromEntries(
      DYNAMIC_PARAM_PAGES.map((rel: string) => [rel, readUtf8(join(root, rel))]),
    );
    const proxyOriginal = readUtf8(join(root, "proxy.ts"));
    const ctrl = createPagesBuildController({ webRoot: root, log: () => {} });
    ctrl.isolateProxy();
    ctrl.patchDynamicParams();

    const beforeTerm = process.listeners("SIGTERM").length;
    const beforeInt = process.listeners("SIGINT").length;
    const dispose = ctrl.installSignalHandlers({ exitProcess: false });
    try {
      expect(process.listeners("SIGTERM").length).toBe(beforeTerm + 1);
      expect(process.listeners("SIGINT").length).toBe(beforeInt + 1);
      const handler = process.listeners("SIGTERM").at(-1);
      expect(handler).toBeTypeOf("function");
      handler?.("SIGTERM");
      for (const rel of DYNAMIC_PARAM_PAGES) {
        expect(readUtf8(join(root, rel))).toBe(originals[rel]);
      }
      expect(readUtf8(join(root, "proxy.ts"))).toBe(proxyOriginal);
    } finally {
      dispose();
      ctrl.restoreAll();
    }
  });
});
