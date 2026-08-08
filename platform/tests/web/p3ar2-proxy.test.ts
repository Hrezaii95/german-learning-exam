/**
 * Next Proxy unit tests (P3AR2).
 * Excluded from the root `tsc` project (Next App Router modules); covered by
 * `typecheck:web` for `proxy.ts` and by `vitest` / `test:web` for this file.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  getRedirectUrl,
  // Next 16.3.0 docs renamed the helper to unstable_doesProxyMatch, but the
  // published testing package still exports the middleware-era name.
  unstable_doesMiddlewareMatch,
} from "next/experimental/testing/server";
import { projectPublishedLearnerWeb } from "../../apps/web/lib/content/project.js";
import {
  rawColonActivityPath,
} from "../../apps/web/lib/content/routes.js";
import { extractRawPathname } from "../../apps/web/lib/content/path-utils.js";
import { LEARNER_REVIEW_ONLY_ACTIVITY_IDS } from "../../apps/web/lib/content/learner-publication-policy.js";
import { proxy, config as proxyConfig } from "../../apps/web/proxy";
import nextConfig from "../../apps/web/next.config";

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");
const TEACHER_DECK_ID = LEARNER_REVIEW_ONLY_ACTIVITY_IDS[0];

describe("P3AR2 Next proxy canonical redirects", () => {
  const projection = projectPublishedLearnerWeb(publishedDir);
  const sample = projection.activities[0]!;

  it("matches lesson activity paths via unstable_doesMiddlewareMatch", () => {
    expect(
      unstable_doesMiddlewareMatch({
        config: proxyConfig,
        nextConfig,
        url: sample.canonicalPath,
      }),
    ).toBe(true);
    expect(
      unstable_doesMiddlewareMatch({
        config: proxyConfig,
        nextConfig,
        url: "/",
      }),
    ).toBe(false);
  });

  it("issues one 308 from raw-colon alias to canonical and preserves query", async () => {
    const raw = rawColonActivityPath(projection, sample.id)!;
    const request = new NextRequest(`http://localhost${raw}?utm=1`);
    const response = await proxy(request);
    expect(response.status).toBe(308);
    const redirectUrl = getRedirectUrl(response);
    expect(redirectUrl).toBe(`http://localhost${sample.canonicalPath}?utm=1`);
  });

  it("does not redirect canonical encoded paths (no loop)", async () => {
    const request = new NextRequest(`http://localhost${sample.canonicalPath}`);
    const response = await proxy(request);
    expect(response.status).toBe(200);
    expect(getRedirectUrl(response)).toBeNull();
  });

  it("does not redirect wrong-lesson or review-only aliases into content", async () => {
    const otherLesson = sample.lessonRouteSegment === "01" ? "02" : "01";
    const wrong = new NextRequest(
      `http://localhost/lessons/${otherLesson}/activity/${sample.id}`,
    );
    const wrongRes = await proxy(wrong);
    expect(getRedirectUrl(wrongRes)).toBeNull();

    const teacher = new NextRequest(
      `http://localhost/lessons/02/activity/${TEACHER_DECK_ID}`,
    );
    const teacherRes = await proxy(teacher);
    expect(getRedirectUrl(teacherRes)).toBeNull();
  });

  it("extractRawPathname keeps percent-encoding", () => {
    expect(
      extractRawPathname(
        `http://localhost${sample.canonicalPath}?x=1#ignored`,
      ),
    ).toBe(sample.canonicalPath);
  });
});
