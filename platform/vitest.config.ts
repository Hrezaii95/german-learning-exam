import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const platformRoot = resolve(__dirname);

export default defineConfig({
  resolve: {
    alias: {
      "@german-learning/content": resolve(platformRoot, "packages/content/src/index.ts"),
      "@german-learning/learning": resolve(platformRoot, "packages/learning/src/index.ts"),
      "@": resolve(platformRoot, "apps/web"),
    },
  },
  test: {
    include: [
      "tests/content/**/*.test.ts",
      "tests/learning/**/*.test.ts",
      "tests/web/**/*.test.ts",
    ],
    root: platformRoot,
    globals: false,
    // Bound simultaneous jsdom workers on the 24 GB Windows authoring machine
    // and the smaller Pages runner; assertions and timeouts are unchanged.
    maxWorkers: 4,
    // The behavioural web tests drive real user-event interaction against jsdom.
    // Individually they finish in ~1.5s, but under full-suite parallel load they
    // exceeded the 5s default and reported as failures — a flaky gate is worse
    // than a slow one, because it teaches everyone to re-run instead of read.
    // This raises only the wall-clock allowance; no assertion is relaxed.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
  esbuild: {
    jsx: "automatic",
  },
});
