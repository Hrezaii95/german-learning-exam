/**
 * The pronunciation listening surface (`/review-audio`) — everything about it
 * that can be checked without a browser.
 *
 * The first test in this file is the important one. An earlier attempt at this
 * page let a `"use client"` component import the module that reads the audio
 * manifest off disk; webpack follows value imports across the client boundary,
 * so `node:fs` landed in the browser bundle and `next build` failed with
 * `UnhandledSchemeError`, blocking every gate behind it. A comment saying
 * "server only" would not have caught that. Walking the real import graph does.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LEARNER_STATE_STORAGE_KEY } from "@german-learning/learning";
import {
  FULL_GENERATED_SET_SIZE,
  PRONUNCIATION_RISK_TAGS,
  clipReference,
  compareReviewClips,
  isPronunciationRiskTagId,
  riskTagById,
  riskTagsFor,
  summarisePronunciationReview,
} from "../../apps/web/lib/audio/pronunciation-review.js";
import { listPronunciationReviewClips } from "../../apps/web/lib/audio/pronunciation-review.server.js";
import {
  REVIEW_EXPORT_SCHEMA_VERSION,
  REVIEW_VERDICTS,
  REVIEW_VERDICT_LABELS,
  REVIEW_VERDICT_STORAGE_KEY,
  buildReviewExport,
  clearVerdict,
  emptyVerdictBook,
  isReviewed,
  parseVerdictBook,
  recordNote,
  recordVerdict,
  reviewExportFilename,
  reviewedCount,
  serializeVerdictBook,
  verdictFor,
  withReviewer,
} from "../../apps/web/lib/audio/review-verdicts.js";
import { isShellHtmlRoute } from "../../apps/web/lib/offline/policy.js";
import { pronunciationReviewPageMetadata } from "../../apps/web/lib/content/page-metadata.js";
import { learnerLanguageFindings } from "../../../tools/learner-language-rules.mjs";

const webRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "apps",
  "web",
);

/* ===========================================================================
 * 1. The client boundary — the defect that broke the export
 * ======================================================================== */

const NODE_BUILTINS = new Set([
  "fs",
  "path",
  "url",
  "os",
  "crypto",
  "child_process",
  "http",
  "https",
  "stream",
  "zlib",
  "util",
  "buffer",
  "process",
  "module",
  "worker_threads",
]);

const SKIP_DIRS = new Set(["node_modules", ".next", "out", "generated", "public"]);

function sourceFiles(directory: string, out: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      sourceFiles(absolute, out);
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      out.push(absolute);
    }
  }
  return out.sort();
}

/**
 * Module specifiers that survive into the bundle.
 *
 * `import type … from "x"` is erased by the compiler and cannot pull anything
 * into the browser — which is exactly why several client components legitimately
 * name server-side modules for their types. Only value imports are collected.
 */
function valueImportSpecifiers(source: string): readonly string[] {
  const out: string[] = [];
  const statement =
    /(?:^|[\n;])[ \t]*(import|export)[ \t]+(type[ \t]+)?([^;]*?)from[ \t]*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = statement.exec(source))) {
    if (match[2]) continue; // `import type` / `export type`
    out.push(match[4] as string);
  }
  const sideEffect = /(?:^|[\n;])[ \t]*import[ \t]*["']([^"']+)["']/g;
  while ((match = sideEffect.exec(source))) out.push(match[1] as string);
  const dynamic = /\bimport\s*\(\s*["']([^"']+)["']/g;
  while ((match = dynamic.exec(source))) out.push(match[1] as string);
  const required = /\brequire\s*\(\s*["']([^"']+)["']/g;
  while ((match = required.exec(source))) out.push(match[1] as string);
  return out;
}

/** `@/…` and relative specifiers → a real file in this app, or null. */
function resolveLocal(specifier: string, fromFile: string): string | null {
  let base: string;
  if (specifier.startsWith("@/")) base = join(webRoot, specifier.slice(2));
  else if (specifier.startsWith(".")) base = join(dirname(fromFile), specifier);
  else return null;
  const withoutJs = base.replace(/\.js$/, "");
  for (const candidate of [
    `${withoutJs}.ts`,
    `${withoutJs}.tsx`,
    join(withoutJs, "index.ts"),
    join(withoutJs, "index.tsx"),
    base,
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function isClientFile(absolute: string): boolean {
  return /^\s*["']use client["']/.test(readFileSync(absolute, "utf8"));
}

function shortPath(absolute: string): string {
  return relative(webRoot, absolute).split(sep).join("/");
}

/** Every `<client entry> → <module> → <builtin>` reachable by value import. */
function nodeBuiltinLeaks(): readonly string[] {
  const leaks: string[] = [];
  for (const entry of sourceFiles(webRoot).filter(isClientFile)) {
    const seen = new Set<string>();
    const stack = [entry];
    while (stack.length > 0) {
      const file = stack.pop() as string;
      if (seen.has(file)) continue;
      seen.add(file);
      for (const specifier of valueImportSpecifiers(readFileSync(file, "utf8"))) {
        if (specifier.startsWith("node:") || NODE_BUILTINS.has(specifier)) {
          leaks.push(
            `${shortPath(entry)} → ${shortPath(file)} → ${specifier}`,
          );
          continue;
        }
        const resolved = resolveLocal(specifier, file);
        if (resolved) stack.push(resolved);
      }
    }
  }
  return leaks.sort();
}

describe("client boundary", () => {
  it("keeps every Node builtin above the client boundary", () => {
    // A leak here is not a style problem: it is `next build` failing with
    // UnhandledSchemeError and every downstream gate going with it.
    expect(nodeBuiltinLeaks()).toEqual([]);
  });

  it("finds the client components this page is actually made of", () => {
    const clients = sourceFiles(webRoot).filter(isClientFile).map(shortPath);
    expect(clients).toContain(
      "components/review-audio/PronunciationReviewBoard.tsx",
    );
    expect(clients).toContain("components/review-audio/ReviewClipRow.tsx");
    // The route itself must stay a server component — it is the only thing
    // allowed to read the manifest.
    expect(clients).not.toContain("app/review-audio/page.tsx");
  });

  it("would notice a reader smuggled back under the boundary", () => {
    // Guard the guard: the detector must reject the exact shape of the
    // original defect, or its passing verdict means nothing.
    const source = ['"use client";', 'import { readFileSync } from "node:fs";'].join(
      "\n",
    );
    expect(valueImportSpecifiers(source)).toContain("node:fs");
    expect(
      valueImportSpecifiers('import type { A } from "node:fs";'),
    ).not.toContain("node:fs");
  });

  it("reads the manifest from a server module only", () => {
    const server = readFileSync(
      join(webRoot, "lib", "audio", "pronunciation-review.server.ts"),
      "utf8",
    );
    expect(server).toMatch(/from "node:fs"/);
    // Prose about the builtins is fine — and load-bearing, since the header of
    // each file is where the rule is written down. What must not exist is an
    // import of one.
    for (const name of ["pronunciation-review.ts", "review-verdicts.ts"]) {
      const shared = readFileSync(join(webRoot, "lib", "audio", name), "utf8");
      expect(valueImportSpecifiers(shared).filter((s) => s.startsWith("node:"))).toEqual(
        [],
      );
      expect(shared).not.toMatch(/from\s+["']node:/);
    }
  });
});

/* ===========================================================================
 * 2. The clips themselves
 * ======================================================================== */

const clips = listPronunciationReviewClips();
const summary = summarisePronunciationReview(clips);

describe("the clip list", () => {
  it("carries every clip the running app can play", () => {
    const manifest = JSON.parse(
      readFileSync(
        join(webRoot, "public", "audio", "tts-de-de-v1", "manifest.json"),
        "utf8",
      ),
    ) as { assetCount: number; assets: readonly { id: string }[] };

    expect(clips).toHaveLength(manifest.assetCount);
    expect(clips).toHaveLength(110);
    expect(new Set(clips.map((clip) => clip.id)).size).toBe(clips.length);
    expect(new Set(clips.map((clip) => clip.id))).toEqual(
      new Set(manifest.assets.map((asset) => asset.id)),
    );
  });

  it("states the whole generated batch, not just the part in the app", () => {
    expect(summary.clipCount).toBe(110);
    expect(summary.fullSetSize).toBe(FULL_GENERATED_SET_SIZE);
    expect(FULL_GENERATED_SET_SIZE).toBe(354);
    expect(summary.fullSetSize).toBeGreaterThan(summary.clipCount);
  });

  it("gives every clip the things a listener needs", () => {
    for (const clip of clips) {
      expect(clip.spokenText.length).toBeGreaterThan(0);
      expect(clip.publicPath.startsWith("/audio/")).toBe(true);
      expect(clip.durationSeconds).toBeGreaterThan(0);
      expect(clip.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(clip.voice).toBe("de-DE-KatjaNeural");
      expect(clip.reference).toMatch(/^[0-9a-f]{8}$/);
    }
  });

  it("keeps the short reference unique, so a note can name one clip", () => {
    expect(new Set(clips.map((clip) => clip.reference)).size).toBe(clips.length);
    expect(clipReference("aud:tts:9b5ae83759130817:v1")).toBe("9b5ae837");
  });

  it("carries the phonetic classes the technical pass recorded", () => {
    const counts = Object.fromEntries(
      summary.tagCounts.map((entry) => [entry.riskTag.id, entry.count]),
    );
    expect(counts).toEqual({
      "ich-or-ach-sound": 22,
      "umlaut-or-eszett": 17,
      "r-sound": 72,
      "final-obstruent": 14,
      "feminine-in-or-innen": 15,
      "conjugated-form": 1,
      "profession-form": 26,
      "connected-speech": 81,
    });
    expect(summary.untaggedCount).toBe(4);
    // Every clip is reachable: eight filters plus the untagged bucket must
    // between them account for all 110, or a filter would hide work silently.
    const grouped = new Set([
      ...clips.filter((clip) => clip.primaryRiskTag !== null).map((c) => c.id),
      ...clips.filter((clip) => clip.primaryRiskTag === null).map((c) => c.id),
    ]);
    expect(grouped.size).toBe(clips.length);
  });

  it("drops audit markers that are not a sound a person can listen for", () => {
    expect(riskTagsFor(["r-sound", "independent-german-listening-review-pending"])).toEqual(
      ["r-sound"],
    );
    expect(isPronunciationRiskTagId("r-sound")).toBe(true);
    expect(isPronunciationRiskTagId("not-a-sound")).toBe(false);
    expect(() => riskTagById("r-sound")).not.toThrow();
  });

  it("orders hardest sound first and rebuilds the same page every time", () => {
    const ranks = clips.map((clip) =>
      clip.primaryRiskTag === null
        ? PRONUNCIATION_RISK_TAGS.length
        : PRONUNCIATION_RISK_TAGS.findIndex(
            (tag) => tag.id === clip.primaryRiskTag,
          ),
    );
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);

    const shuffled = [...clips].reverse().sort(compareReviewClips);
    expect(shuffled.map((clip) => clip.id)).toEqual(clips.map((clip) => clip.id));
  });

  it("names where a clip is heard in words, never with an internal id", () => {
    const withUsage = clips.filter((clip) => clip.usages.length > 0);
    expect(withUsage.length).toBeGreaterThan(100);
    for (const clip of clips) {
      for (const usage of clip.usages) {
        expect(usage.label.length).toBeGreaterThan(0);
        expect(usage.href.startsWith("/")).toBe(true);
        expect(["de", "en"]).toContain(usage.language);
        expect(learnerLanguageFindings(usage.label)).toEqual([]);
        expect(learnerLanguageFindings(usage.context)).toEqual([]);
      }
    }
  });

  it("never puts wording on screen that the copy gate would reject", () => {
    // The gate itself reads the exported HTML; this catches the same leak at
    // the source, where the failure is one file away instead of one build away.
    for (const clip of clips) {
      expect(learnerLanguageFindings(clip.spokenText)).toEqual([]);
      expect(learnerLanguageFindings(`Clip ${clip.reference}`)).toEqual([]);
    }
    for (const tag of PRONUNCIATION_RISK_TAGS) {
      expect(learnerLanguageFindings(tag.label)).toEqual([]);
      expect(learnerLanguageFindings(tag.listenFor)).toEqual([]);
    }
  });
});

/* ===========================================================================
 * 3. Verdicts — kept apart from learner state, bound to the audio judged
 * ======================================================================== */

const sampleClip = clips[0] as (typeof clips)[number];
const otherClip = clips[1] as (typeof clips)[number];
const AT = "2026-08-20T10:00:00.000Z";

describe("reviewer verdicts", () => {
  it("stores nothing where learner progress lives", () => {
    expect(REVIEW_VERDICT_STORAGE_KEY).not.toBe(LEARNER_STATE_STORAGE_KEY);
    expect(REVIEW_VERDICT_STORAGE_KEY.startsWith("german-learning:")).toBe(false);
    expect(LEARNER_STATE_STORAGE_KEY.startsWith("german-learning:")).toBe(true);
    // Neither key may be a prefix of the other, or a prefix sweep of one would
    // take the other with it.
    expect(REVIEW_VERDICT_STORAGE_KEY.startsWith(LEARNER_STATE_STORAGE_KEY)).toBe(
      false,
    );
    expect(LEARNER_STATE_STORAGE_KEY.startsWith(REVIEW_VERDICT_STORAGE_KEY)).toBe(
      false,
    );
  });

  it("offers exactly the three answers a listener is asked for", () => {
    expect(REVIEW_VERDICTS).toEqual(["approve", "needs-re-record", "reject"]);
    expect(REVIEW_VERDICT_LABELS.approve).toBe("Approve");
    expect(REVIEW_VERDICT_LABELS["needs-re-record"]).toBe("Needs re-record");
    expect(REVIEW_VERDICT_LABELS.reject).toBe("Reject");
  });

  it("records a verdict against the exact audio that was playing", () => {
    const book = recordVerdict(emptyVerdictBook(), {
      clipId: sampleClip.id,
      sha256: sampleClip.sha256,
      verdict: "approve",
      recordedAt: AT,
    });
    const entry = verdictFor(book, sampleClip.id);
    expect(entry?.verdict).toBe("approve");
    expect(entry?.sha256).toBe(sampleClip.sha256);
    expect(entry?.recordedAt).toBe(AT);
    expect(isReviewed(book, sampleClip.id)).toBe(true);
    expect(isReviewed(book, otherClip.id)).toBe(false);
    expect(reviewedCount(book, clips)).toBe(1);
  });

  it("keeps a note and a verdict from overwriting each other", () => {
    let book = recordVerdict(emptyVerdictBook(), {
      clipId: sampleClip.id,
      sha256: sampleClip.sha256,
      verdict: "reject",
      recordedAt: AT,
    });
    book = recordNote(book, {
      clipId: sampleClip.id,
      sha256: sampleClip.sha256,
      note: "The r is rolled.",
      recordedAt: AT,
    });
    expect(verdictFor(book, sampleClip.id)).toMatchObject({
      verdict: "reject",
      note: "The r is rolled.",
    });

    // A note on its own is a thought in progress, not a decision.
    const noteOnly = recordNote(emptyVerdictBook(), {
      clipId: otherClip.id,
      sha256: otherClip.sha256,
      note: "unsure",
      recordedAt: AT,
    });
    expect(isReviewed(noteOnly, otherClip.id)).toBe(false);
    expect(reviewedCount(noteOnly, clips)).toBe(0);
  });

  it("survives a round trip through storage, and shrugs off a corrupt one", () => {
    const book = withReviewer(
      recordVerdict(emptyVerdictBook(), {
        clipId: sampleClip.id,
        sha256: sampleClip.sha256,
        verdict: "needs-re-record",
        recordedAt: AT,
      }),
      "Anna B.",
    );
    const restored = parseVerdictBook(serializeVerdictBook(book));
    expect(restored).toEqual(book);

    expect(parseVerdictBook(null)).toEqual(emptyVerdictBook());
    expect(parseVerdictBook("{ not json")).toEqual(emptyVerdictBook());
    // A row that cannot say what audio it judged is not evidence of anything.
    expect(
      parseVerdictBook(
        JSON.stringify({ entries: { "aud:tts:x:v1": { verdict: "approve" } } }),
      ).entries,
    ).toEqual({});
  });

  it("undoes one clip without touching the rest of the sitting", () => {
    let book = recordVerdict(emptyVerdictBook(), {
      clipId: sampleClip.id,
      sha256: sampleClip.sha256,
      verdict: "approve",
      recordedAt: AT,
    });
    book = recordVerdict(book, {
      clipId: otherClip.id,
      sha256: otherClip.sha256,
      verdict: "reject",
      recordedAt: AT,
    });
    const cleared = clearVerdict(book, sampleClip.id);
    expect(verdictFor(cleared, sampleClip.id)).toBeNull();
    expect(verdictFor(cleared, otherClip.id)?.verdict).toBe("reject");
    expect(reviewedCount(cleared, clips)).toBe(1);
  });
});

/* ===========================================================================
 * 4. The downloaded file — the artifact the listening gate turns on
 * ======================================================================== */

describe("the download", () => {
  const book = withReviewer(
    recordNote(
      recordVerdict(emptyVerdictBook(), {
        clipId: sampleClip.id,
        sha256: sampleClip.sha256,
        verdict: "approve",
        recordedAt: AT,
      }),
      {
        clipId: sampleClip.id,
        sha256: sampleClip.sha256,
        note: "Clean.",
        recordedAt: AT,
      },
    ),
    "Anna B.",
  );

  const notes = buildReviewExport({
    book,
    clips,
    clipsInWholeGeneratedSet: FULL_GENERATED_SET_SIZE,
    generatedAt: "2026-08-20T11:22:33.400Z",
  });

  it("says what it is without a covering message", () => {
    expect(notes.schemaVersion).toBe(REVIEW_EXPORT_SCHEMA_VERSION);
    expect(notes.documentKind).toBe("german-pronunciation-listening-notes");
    expect(notes.reviewer).toBe("Anna B.");
    expect(notes.voice).toBe("de-DE-KatjaNeural");
    expect(notes.clipsInApp).toBe(110);
    expect(notes.clipsInWholeGeneratedSet).toBe(354);
    expect(notes.clipsReviewed).toBe(1);
    expect(notes.notice).toMatch(/computer-generated/);
    expect(notes.notice).toMatch(/changes nothing in the app/);
  });

  it("carries only the clips somebody actually judged", () => {
    expect(notes.rows).toHaveLength(1);
    expect(notes.rows[0]).toMatchObject({
      clipId: sampleClip.id,
      sha256: sampleClip.sha256,
      audioMatchesVerdict: true,
      spokenText: sampleClip.spokenText,
      audioPath: sampleClip.publicRelativePath,
      verdict: "approve",
      note: "Clean.",
      reviewer: "Anna B.",
      recordedAt: AT,
    });
    expect(notes.rows[0]?.riskTags).toEqual(sampleClip.riskTags);
  });

  it("says plainly when the recording changed under a verdict", () => {
    const stale = buildReviewExport({
      book: recordVerdict(emptyVerdictBook(), {
        clipId: sampleClip.id,
        sha256: "0".repeat(64),
        verdict: "approve",
        recordedAt: AT,
      }),
      clips,
      clipsInWholeGeneratedSet: FULL_GENERATED_SET_SIZE,
      generatedAt: AT,
    });
    expect(stale.rows[0]?.audioMatchesVerdict).toBe(false);
  });

  it("names the file so a second sitting cannot overwrite the first", () => {
    expect(reviewExportFilename("2026-08-20T11:22:33.400Z")).toBe(
      "german-pronunciation-listening-notes-2026-08-20T11-22-33-400.json",
    );
    expect(reviewExportFilename(AT)).not.toBe(
      reviewExportFilename("2026-08-20T10:00:01.000Z"),
    );
  });

  it("is plain JSON, so it can be read without this app", () => {
    const round = JSON.parse(JSON.stringify(notes)) as typeof notes;
    expect(round).toEqual(notes);
  });
});

/* ===========================================================================
 * 5. Where the route sits in the product
 * ======================================================================== */

describe("the route's place", () => {
  it("is absent from learner navigation", () => {
    const shell = readFileSync(
      join(webRoot, "components", "shell", "AppShell.tsx"),
      "utf8",
    );
    expect(shell).not.toMatch(/review-audio/);

    // Nothing a learner can open may link to it either.
    const linking = sourceFiles(webRoot).filter((file) => {
      if (file.endsWith(join("app", "review-audio", "page.tsx"))) return false;
      if (file.includes(join("components", "review-audio"))) return false;
      if (file.includes(join("lib", "audio"))) return false;
      if (file.includes(join("lib", "offline"))) return false;
      return /["']\/review-audio/.test(readFileSync(file, "utf8"));
    });
    expect(linking.map(shortPath)).toEqual([]);
  });

  it("carries a title of its own and stays out of search results", () => {
    const metadata = pronunciationReviewPageMetadata();
    expect(metadata.title).toBe("Pronunciation listening check");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(learnerLanguageFindings(String(metadata.title))).toEqual([]);
    expect(learnerLanguageFindings(String(metadata.description))).toEqual([]);
  });

  it("stays out of every learner's install-time cache", () => {
    // It is the largest page in the export and no learner opens it; putting it
    // in the shell would download a reviewer's tool onto every device and make
    // the shell version churn on work unrelated to the course.
    expect(isShellHtmlRoute("review-audio/index.html")).toBe(false);
    expect(isShellHtmlRoute("search/index.html")).toBe(true);
    expect(isShellHtmlRoute("references/index.html")).toBe(true);
  });

  it("changes nothing it reads", () => {
    // The projection is a pure read of two artifacts. Calling it twice must
    // return the identical frozen list, and no module here may open a file for
    // writing.
    expect(listPronunciationReviewClips()).toBe(clips);
    expect(Object.isFrozen(clips)).toBe(true);
    for (const name of [
      "pronunciation-review.ts",
      "pronunciation-review.server.ts",
      "review-verdicts.ts",
    ]) {
      const source = readFileSync(join(webRoot, "lib", "audio", name), "utf8");
      expect(source).not.toMatch(/writeFile|appendFile|rmSync|unlink|mkdir/);
    }
  });
});
