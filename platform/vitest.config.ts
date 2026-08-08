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
  },
  esbuild: {
    jsx: "automatic",
  },
});
