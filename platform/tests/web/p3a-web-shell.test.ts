import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT,
  LEARNER_REVIEW_ONLY_ACTIVITY_IDS,
  VALIDATED_PUBLICATION_ACTIVITY_COUNT,
  projectPublishedLearnerWeb,
  serializeProjectionDeterministic,
} from "../../apps/web/lib/content/project.js";
import {
  crossLessonActivityPath,
  decideLearnerPathRequest,
  listCanonicalActivityPaths,
  listCanonicalLearnerStatePaths,
  rawColonActivityPath,
  resolveLearnerRoute,
} from "../../apps/web/lib/content/routes.js";
import {
  encodeActivityRouteSegment,
  encodePublicTypedIdSlug,
  isAbsoluteNormalizedPathname,
  tryDecodeActivityRouteSegment,
  tryDecodePublicTypedIdSlug,
} from "../../apps/web/lib/content/path-utils.js";

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");
const webRoot = join(platformRoot, "apps", "web");

const TEACHER_DECK_ID = LEARNER_REVIEW_ONLY_ACTIVITY_IDS[0];

describe("P3A learner publication policy", () => {
  it("derives learner count from validated total minus the single review-only policy", () => {
    expect(VALIDATED_PUBLICATION_ACTIVITY_COUNT).toBe(24);
    expect(LEARNER_REVIEW_ONLY_ACTIVITY_IDS).toEqual([
      "activity:lesson-02-teacher-professions-deck",
    ]);
    expect(EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT).toBe(
      VALIDATED_PUBLICATION_ACTIVITY_COUNT -
        LEARNER_REVIEW_ONLY_ACTIVITY_IDS.length,
    );
    expect(EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT).toBe(23);
  });

  it("keeps policy literals out of projection/access/types source", () => {
    const sources = [
      readFileSync(join(webRoot, "lib/content/project.ts"), "utf8"),
      readFileSync(join(webRoot, "lib/content/access.ts"), "utf8"),
      readFileSync(join(webRoot, "lib/content/types.ts"), "utf8"),
    ].join("\n");
    expect(sources).not.toMatch(/\bactivityCount:\s*23\b/);
    expect(sources).not.toMatch(/\bEXPECTED_PUBLISHED_ACTIVITY_COUNT\s*=\s*23\b/);
    expect(sources).not.toMatch(/parsed\.activityCount\s*!==\s*23/);
    expect(sources).toContain("EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT");
    expect(sources).toContain("learner-publication-policy");
  });
});

describe("P3A learner-safe web projection", () => {
  const projection = projectPublishedLearnerWeb(publishedDir);
  const serialized = serializeProjectionDeterministic(projection);

  it("has exactly 2 lessons and learner-published activities from policy", () => {
    expect(projection.lessonCount).toBe(2);
    expect(projection.activityCount).toBe(
      EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT,
    );
    expect(projection.lessons).toHaveLength(2);
    expect(projection.activities).toHaveLength(
      EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT,
    );
    expect(Object.keys(projection.ownershipByActivityId)).toHaveLength(
      EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT,
    );
    expect(projection.ownershipByActivityId[TEACHER_DECK_ID]).toBeUndefined();
  });

  it("owns every projected activity by exactly one lesson/stage with one canonical URL", () => {
    const seen = new Set<string>();
    for (const lesson of projection.lessons) {
      for (const stage of lesson.stages) {
        for (const activityId of stage.activityIds) {
          expect(seen.has(activityId)).toBe(false);
          seen.add(activityId);
          const ownership = projection.ownershipByActivityId[activityId];
          expect(ownership).toBeDefined();
          expect(ownership?.lessonId).toBe(lesson.id);
          expect(ownership?.stageId).toBe(stage.id);
          expect(ownership?.canonicalPath).toBe(
            `/lessons/${lesson.routeSegment}/activity/${encodeActivityRouteSegment(activityId)}`,
          );
        }
      }
    }
    expect(seen.size).toBe(EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT);
  });

  it("excludes empty non-overview stages and teacher-review leakage from learner projection", () => {
    for (const lesson of projection.lessons) {
      for (const stage of lesson.stages) {
        if (stage.kind !== "overview") {
          expect(stage.activityIds.length).toBeGreaterThan(0);
        }
        expect(stage.titleEn).not.toBe("Teacher collection review");
        expect(stage.skillTargets).not.toContain("review-stability");
      }
      const recomputed = lesson.stages.reduce(
        (sum, stage) => sum + stage.estimatedMinutes,
        0,
      );
      expect(lesson.estimatedMinutesTotal).toBe(recomputed);
    }

    expect(serialized).not.toContain("Teacher collection review");
    expect(serialized).not.toContain("review-stability");
    expect(serialized).not.toContain(TEACHER_DECK_ID);
  });

  it("excludes provenance, sources, private paths, and non-published statuses", () => {
    expect(serialized).not.toMatch(/"kind": "Source"/);
    expect(serialized).not.toMatch(/"kind": "SourceAssertion"/);
    expect(serialized).not.toMatch(/SourceAssertion/);
    expect(serialized).not.toMatch(/originalPath/);
    expect(serialized).not.toMatch(/sourceAssertionIds/);
    expect(serialized).not.toMatch(/resources\/original/);
    expect(serialized).not.toMatch(/rights-gated:/);
    expect(serialized).not.toMatch(/"publicationStatus": "(review|draft|blocked)"/);
    expect(serialized).not.toMatch(/"status": "(review|draft|blocked)"/);
    expect(serialized).not.toMatch(/assert:/);
    expect(serialized).not.toMatch(/content\/alpha-content\.json/);
  });

  it("is deterministic across runs", () => {
    const again = serializeProjectionDeterministic(
      projectPublishedLearnerWeb(publishedDir),
    );
    expect(again).toBe(serialized);
  });

  it("derives zero-state continuation from Lesson 1 stage order", () => {
    const firstId = projection.lessons[0]?.stages.flatMap((s) => s.activityIds)[0];
    expect(projection.zeroState.continueActivityId).toBe(firstId);
    expect(projection.zeroState.continuePath).toContain("/lessons/01/activity/");
  });
});

describe("P3A route resolution", () => {
  it("uses a bijective GitHub Pages-safe slug for every published activity", () => {
    const slugs = new Set<string>();
    for (const activity of projection.activities) {
      const slug = encodePublicTypedIdSlug(activity.id);
      expect(slug).toMatch(/^id-[0-9a-f]+$/);
      expect(slug).not.toMatch(/:|%3a/i);
      expect(tryDecodePublicTypedIdSlug(slug)).toBe(activity.id);
      expect(slugs.has(slug)).toBe(false);
      slugs.add(slug);
      expect(activity.canonicalPath).toContain(`/activity/${slug}`);
    }
    expect(tryDecodePublicTypedIdSlug("id-6C6578")).toBeNull();
    expect(tryDecodePublicTypedIdSlug("id-abc")).toBeNull();
    expect(tryDecodePublicTypedIdSlug("activity%3Ax")).toBeNull();
  });

  const projection = projectPublishedLearnerWeb(publishedDir);
  const canonical = listCanonicalActivityPaths(projection);

  it("resolves all learner-published activity routes and rejects the review teacher deck", () => {
    expect(canonical).toHaveLength(EXPECTED_LEARNER_PUBLISHED_ACTIVITY_COUNT);
    for (const path of canonical) {
      const resolved = resolveLearnerRoute(path, projection);
      expect(resolved.kind).toBe("activity");
    }
    expect(resolveLearnerRoute("/", projection).kind).toBe("dashboard");
    expect(resolveLearnerRoute("/lessons", projection).kind).toBe("lessons");
    expect(resolveLearnerRoute("/lessons/01", projection).kind).toBe("lesson");
    expect(resolveLearnerRoute("/lessons/02", projection).kind).toBe("lesson");
    const teacherPath =
      "/lessons/02/activity/" + encodeURIComponent(TEACHER_DECK_ID);
    expect(resolveLearnerRoute(teacherPath, projection).kind).toBe("not-found");
  });

  it("fails cross-lesson activity routes", () => {
    for (const activity of projection.activities) {
      const wrong = crossLessonActivityPath(projection, activity.id);
      expect(wrong).toBeTruthy();
      const resolved = resolveLearnerRoute(wrong!, projection);
      expect(resolved.kind).toBe("not-found");
      if (resolved.kind === "not-found") {
        expect(resolved.reason).toBe("activity-wrong-lesson");
      }
    }
  });

  it("resolves learner-state routes and fails unknown lesson/activity/extra routes without dashboard fallback", () => {
    expect(listCanonicalLearnerStatePaths()).toEqual([
      "/review",
      "/review/session/today",
      "/settings",
    ]);
    expect(resolveLearnerRoute("/review", projection).kind).toBe("review");
    const reviewSession = resolveLearnerRoute("/review/session/today", projection);
    expect(reviewSession.kind).toBe("review");
    if (reviewSession.kind === "review") expect(reviewSession.sessionId).toBe("today");
    expect(resolveLearnerRoute("/settings", projection).kind).toBe("settings");
    const cases = [
      "/lessons/03",
      "/lessons/01/activity/activity%3Amissing",
      "/lessons/01/extra",
      "/lessons/01/activity/activity%3Alesson-01-greetings-by-context/extra",
      "/review/unknown",
      "/settings/unknown",
      "/dashboard",
    ];
    for (const path of cases) {
      const resolved = resolveLearnerRoute(path, projection);
      expect(resolved.kind).toBe("not-found");
      expect(resolved.kind).not.toBe("dashboard");
    }
    expect(resolveLearnerRoute("/vocabulary", projection).kind).toBe("hub");
    expect(resolveLearnerRoute("/hubs", projection).kind).toBe("hubs-directory");
    expect(
      resolveLearnerRoute("/vocabulary/lex:ingenieur", projection).kind,
    ).toBe("not-found");
  });

  it("fails closed on malformed percent sequences instead of echoing the raw segment", () => {
    expect(tryDecodeActivityRouteSegment("%E0%A4%A")).toBeNull();
    expect(tryDecodeActivityRouteSegment("%")).toBeNull();
    expect(tryDecodeActivityRouteSegment("%ZZ")).toBeNull();

    const malformed = [
      "/lessons/01/activity/%E0%A4%A",
      "/lessons/01/activity/%",
      "/lessons/02/activity/%ZZ",
    ];
    for (const path of malformed) {
      const resolved = resolveLearnerRoute(path, projection);
      expect(resolved.kind).toBe("not-found");
      if (resolved.kind === "not-found") {
        expect(resolved.reason).toBe("malformed-activity-segment");
      }
    }
  });

  it("rejects double-encoded IDs, query/fragment-like segments, wrong-lesson, unknown, and extra", () => {
    const sample = projection.activities[0]!;
    const once = encodeURIComponent(sample.id);
    const twice = encodeURIComponent(once);
    const doubleEncoded = `/lessons/${sample.lessonRouteSegment}/activity/${twice}`;
    const doubleResolved = resolveLearnerRoute(doubleEncoded, projection);
    expect(doubleResolved.kind).toBe("not-found");

    const withQuery = `/lessons/01/activity/${encodeURIComponent("activity:foo?x=1")}`;
    const withFragment = `/lessons/01/activity/${encodeURIComponent("activity:foo#bar")}`;
    expect(resolveLearnerRoute(withQuery, projection).kind).toBe("not-found");
    expect(resolveLearnerRoute(withFragment, projection).kind).toBe("not-found");

    const wrongLesson = crossLessonActivityPath(projection, sample.id)!;
    expect(resolveLearnerRoute(wrongLesson, projection).kind).toBe("not-found");

    expect(
      resolveLearnerRoute("/lessons/99/activity/activity%3Ax", projection).kind,
    ).toBe("not-found");
    expect(
      resolveLearnerRoute(
        `/lessons/${sample.lessonRouteSegment}/activity/${once}/extra`,
        projection,
      ).kind,
    ).toBe("not-found");
  });

  it("rejects relative paths, duplicate slashes, and trailing slashes as non-normalized", () => {
    expect(isAbsoluteNormalizedPathname("lessons/01")).toBe(false);
    expect(isAbsoluteNormalizedPathname("/lessons//01")).toBe(false);
    expect(isAbsoluteNormalizedPathname("/lessons/01/")).toBe(false);
    expect(isAbsoluteNormalizedPathname("/lessons/01/../02")).toBe(false);
    expect(isAbsoluteNormalizedPathname("/lessons/01")).toBe(true);

    expect(resolveLearnerRoute("lessons/01", projection).kind).toBe("not-found");
    expect(resolveLearnerRoute("/lessons//01", projection).kind).toBe("not-found");
    expect(resolveLearnerRoute("/lessons/01/", projection).kind).toBe("not-found");
    expect(resolveLearnerRoute("/lessons/01/../02", projection).kind).toBe(
      "not-found",
    );
  });

  it("redirects safe noncanonical aliases of owned learner activities once", () => {
    const sample = projection.activities[0]!;
    const raw = rawColonActivityPath(projection, sample.id)!;
    const legacyEncoded = `/lessons/${sample.lessonRouteSegment}/activity/${encodeURIComponent(sample.id)}`;

    const rawResolved = resolveLearnerRoute(raw, projection);
    expect(rawResolved.kind).toBe("canonical-redirect");
    if (rawResolved.kind === "canonical-redirect") {
      expect(rawResolved.canonicalPath).toBe(sample.canonicalPath);
      expect(rawResolved.status).toBe(308);
    }

    const legacyResolved = resolveLearnerRoute(legacyEncoded, projection);
    expect(legacyResolved.kind).toBe("canonical-redirect");
    if (legacyResolved.kind === "canonical-redirect") {
      expect(legacyResolved.canonicalPath).toBe(sample.canonicalPath);
    }

    // Wrong-lesson raw colon must not redirect into the owning lesson.
    const otherLesson = sample.lessonRouteSegment === "01" ? "02" : "01";
    const wrongRaw = `/lessons/${otherLesson}/activity/${sample.id}`;
    expect(resolveLearnerRoute(wrongRaw, projection).kind).toBe("not-found");

    // Review-only / unknown must not redirect.
    const teacherRaw = `/lessons/02/activity/${TEACHER_DECK_ID}`;
    expect(resolveLearnerRoute(teacherRaw, projection).kind).toBe("not-found");
  });

  it("decideLearnerPathRequest strips trailing slash and preserves query on alias redirect", () => {
    const sample = projection.activities[0]!;
    const raw = rawColonActivityPath(projection, sample.id)!;
    const decision = decideLearnerPathRequest(`${raw}/`, "?ref=1", projection);
    expect(decision).toEqual({
      action: "redirect",
      location: `${sample.canonicalPath}?ref=1`,
      status: 308,
    });

    const pass = decideLearnerPathRequest(sample.canonicalPath, "", projection);
    expect(pass).toEqual({ action: "next" });
  });
});

describe("P3A UI binds to projection (no second course object)", () => {  it("lesson views render projection fields rather than hard-coded titles", () => {
    const lessonViews = readFileSync(
      join(webRoot, "components/lessons/LessonViews.tsx"),
      "utf8",
    );
    const activityViews = readFileSync(
      join(webRoot, "components/lessons/ActivityAndBrowser.tsx"),
      "utf8",
    );
    const pages = [
      readFileSync(join(webRoot, "app/page.tsx"), "utf8"),
      readFileSync(join(webRoot, "app/lessons/page.tsx"), "utf8"),
      readFileSync(
        join(webRoot, "app/lessons/[lessonSegment]/page.tsx"),
        "utf8",
      ),
      readFileSync(
        join(
          webRoot,
          "app/lessons/[lessonSegment]/activity/[activityId]/page.tsx",
        ),
        "utf8",
      ),
    ].join("\n");

    expect(lessonViews).toContain("lesson.titleDe");
    expect(lessonViews).toContain("projection");
    expect(lessonViews).not.toContain("Ich heiße Miriam");
    expect(lessonViews).not.toContain("Was macht ihr beruflich?");
    expect(activityViews).toContain("activity.promptPlainText");
    expect(activityViews).toContain("promptPlainText");
    expect(activityViews).not.toContain("Ich heiße Miriam");
    expect(pages).toContain("loadLearnerProjection");
    expect(pages).not.toContain("alpha-content.json");
    expect(pages).toContain("dynamicParams = false");
    expect(pages).toContain("dynamicParams = true");
    expect(
      readFileSync(
        join(
          webRoot,
          "app/lessons/[lessonSegment]/activity/[activityId]/page.tsx",
        ),
        "utf8",
      ),
    ).toContain("dynamicParams = true");
    expect(
      readFileSync(
        join(webRoot, "app/lessons/[lessonSegment]/page.tsx"),
        "utf8",
      ),
    ).toContain("dynamicParams = false");
  });

  it("not-found uses no active navigation item", () => {
    const notFound = readFileSync(join(webRoot, "app/not-found.tsx"), "utf8");
    expect(notFound).toContain("current={null}");
    expect(notFound).not.toContain('current="dashboard"');
  });
});

describe("P3A shell accessibility and responsive contract", () => {
  const shell = readFileSync(
    join(webRoot, "components/shell/AppShell.tsx"),
    "utf8",
  );
  const css = readFileSync(join(webRoot, "app/globals.css"), "utf8");

  it("includes skip link, landmarks, aria-current, and labelled navigation", () => {
    expect(shell).toContain('className="skip-link"');
    expect(shell).toContain('href="#main-content"');
    expect(shell).toContain('id="main-content"');
    expect(shell).toContain("<main");
    expect(shell).toContain('aria-current={isCurrent ? "page" : undefined}');
    expect(shell).toContain('aria-label="Primary"');
    expect(shell).toContain('aria-label="Desktop navigation"');
    expect(shell).toContain('aria-label="Tablet navigation"');
    expect(shell).toContain('aria-label="Mobile"');
    expect(shell).toContain('href: "/hubs"');
    expect(shell).toContain('href: "/vocabulary"');
    expect(shell).toContain("Coming soon");
  });

  it("defines deliberate desktop/tablet/mobile navigation breakpoints", () => {
    expect(css).toMatch(/@media \(min-width:\s*1100px\)/);
    expect(css).toMatch(/@media \(min-width:\s*700px\) and \(max-width:\s*1099px\)/);
    expect(css).toMatch(/@media \(max-width:\s*699px\)/);
    expect(css).toContain("shell-rail");
    expect(css).toContain("shell-topnav");
    expect(css).toContain("shell-bottomnav");
    expect(css).toContain("min-height: 44px");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("--gender-m");
    expect(css).toContain("--gender-f");
    expect(css).toContain("--gender-n");
    expect(css).toContain("--gender-pl");
    expect(css).toContain("var(--bottom-nav-height)");
  });

  it("regular lernen motif uses --rule-regular with REG cue, not gender/bridge/IRR star", () => {
    expect(shell).toContain('data-motif="lernen-regular"');
    expect(shell).toContain("morph-strip__stem");
    expect(shell).toContain("morph-strip__ending");
    expect(shell).toContain("REG");
    expect(shell).not.toContain("morph-strip__bridge");
    expect(shell).not.toContain("morph-strip__star");
    expect(shell).not.toContain("★");

    const endingBlock = css.slice(
      css.indexOf(".morph-strip__ending {"),
      css.indexOf(".morph-strip__cue {") + 80,
    );
    expect(endingBlock).toContain("var(--rule-regular)");
    expect(endingBlock).not.toContain("var(--gender-m)");
    expect(endingBlock).not.toContain("var(--gender-f)");
    expect(endingBlock).not.toContain("var(--rule-irregular)");
    expect(endingBlock).not.toContain("var(--rule-special)");
  });
});
