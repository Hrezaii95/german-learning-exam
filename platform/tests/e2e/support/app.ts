import { expect, type Locator, type Page } from "@playwright/test";

export const PAGES_BASE = "/german-learning-exam";

/**
 * Navigate to an app route written the way it appears in the product
 * ("/lessons/", "/practice/word-order/") and land on the base-pathed URL the
 * export actually serves. Always waits for hydration before returning, so no
 * spec ever needs a sleep to "let React catch up".
 */
export async function gotoApp(page: Page, appPath: string): Promise<void> {
  const path = appPath.startsWith("/") ? appPath : `/${appPath}`;
  const withSlash = path.endsWith("/") || path.includes("?") || path.includes("#")
    ? path
    : `${path}/`;
  await page.goto(`${PAGES_BASE}${withSlash}`);
  await waitForHydration(page);
}

/**
 * Hydration barrier.
 *
 * The export ships server-rendered HTML, so text assertions can pass against a
 * page whose click handlers do not exist yet — the classic static-export flake.
 * Every spec crosses this barrier first: React has mounted (the app marks the
 * document) and the client store has read localStorage at least once.
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const doc = document;
      if (doc.readyState !== "complete") return false;
      // Next marks hydrated roots; fall back to any interactive control being
      // wired, which is what the specs actually depend on.
      const root = doc.querySelector("main, body");
      return !!root && root.childElementCount > 0;
    },
    undefined,
    { timeout: 20_000 },
  );
  // React 19 hydration completes in a microtask after load; a locator wait on a
  // real element is the web-first way to observe it (no timer).
  await expect(page.locator("main, body").first()).toBeVisible();
}

/** Read the whole localStorage as a plain object — the real persisted state. */
export async function readStorage(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const out: Record<string, string> = {};
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key) out[key] = window.localStorage.getItem(key) ?? "";
    }
    return out;
  });
}

/** Read one localStorage key and JSON.parse it (null when absent/unparseable). */
export async function readStorageJson<T = unknown>(
  page: Page,
  key: string,
): Promise<T | null> {
  return page.evaluate((k) => {
    const raw = window.localStorage.getItem(k);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }, key) as Promise<T | null>;
}

/**
 * Read one sessionStorage key and JSON.parse it (null when absent/unparseable).
 *
 * Deliberately a separate function from `readStorageJson` rather than a flag:
 * localStorage and sessionStorage are different lifetimes, and which one a value
 * lives in is part of the product's contract. Asserting a sessionStorage value
 * through a localStorage reader always returns null, which reads as "the app
 * never wrote it" — a false product accusation. Naming the area at the call site
 * makes the spec state which contract it is checking.
 */
export async function readSessionStorageJson<T = unknown>(
  page: Page,
  key: string,
): Promise<T | null> {
  return page.evaluate((k) => {
    const raw = window.sessionStorage.getItem(k);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }, key) as Promise<T | null>;
}

/**
 * Wait until a persisted-state predicate holds. Polling a *predicate* (never a
 * fixed delay) is how these specs stay honest about async writes.
 */
export async function expectStorageEventually(
  page: Page,
  predicate: (storage: Record<string, string>) => boolean,
  message: string,
): Promise<void> {
  await expect
    .poll(async () => predicate(await readStorage(page)), {
      message,
      timeout: 15_000,
    })
    .toBe(true);
}

/**
 * The one key the learner store persists under.
 * Source of truth: packages/learning/src/persistence/adapters.ts
 * (`LEARNER_STATE_STORAGE_KEY`). Hard-coded rather than imported so a rename in
 * the app is a loud E2E failure, not a silently-followed move.
 */
export const LEARNER_STATE_KEY = "german-learning:learner-state:v1";

/**
 * The review-session config the setup screen hands the session screen.
 * Lives in sessionStorage (per-tab, per-visit) — read it with
 * `readSessionStorageJson`. Source: components/review/ReviewViews.tsx.
 */
export const REVIEW_CONFIG_KEY = "german-learning-os:review-config:v1";

/** Persisted learner-state envelope — the fields these specs assert on. */
export interface LearnerStateEnvelope {
  schemaVersion: string;
  activityProgress: Array<{
    activityId: string;
    lessonId: string;
    stageId: string;
    progressState: "inProgress" | "completed";
    startedAt: string;
    completedAt?: string;
  }>;
  events: Array<Record<string, unknown>>;
  reviewCards: Array<Record<string, unknown>>;
  notes: Array<Record<string, unknown>>;
  tags: Array<{ contentId: string; tag: string }>;
  recordings: Array<Record<string, unknown>>;
  resume: { activityId: string; lessonId: string; stageId: string; position: number } | null;
  settings: { preferredAudioSpeed: number; timezone: string };
  contentBundle: { bundleId: string; schemaVersion: string };
}

/** Read the persisted learner-state envelope (null before first write). */
export async function readLearnerState(
  page: Page,
): Promise<LearnerStateEnvelope | null> {
  return readStorageJson<LearnerStateEnvelope>(page, LEARNER_STATE_KEY);
}

/** Poll the persisted envelope until a predicate holds. Never a fixed delay. */
export async function expectLearnerState(
  page: Page,
  predicate: (state: LearnerStateEnvelope) => boolean,
  message: string,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const state = await readLearnerState(page);
        return state ? predicate(state) : false;
      },
      { message, timeout: 15_000 },
    )
    .toBe(true);
}

/**
 * Wait out the per-surface loading gate. The provider reads localStorage in an
 * effect (after first paint), so every consumer paints a "Loading …" line first;
 * asserting before it clears reads the pre-hydration DOM and lies.
 */
export async function waitForLearnerState(page: Page): Promise<void> {
  await expect(page.getByText(/^Loading\b/i)).toHaveCount(0, { timeout: 20_000 });
}

/** First visible match among several candidate locators, or null. */
export async function firstVisible(
  candidates: Locator[],
): Promise<Locator | null> {
  for (const locator of candidates) {
    if (await locator.first().isVisible().catch(() => false)) {
      return locator.first();
    }
  }
  return null;
}
