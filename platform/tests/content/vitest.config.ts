import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@german-learning/content": resolve(__dirname, "../../packages/content/src/index.ts"),
    },
  },
  test: {
    include: ["tests/content/**/*.test.ts"],
    root: resolve(__dirname, "../.."),
    globals: false,
  },
});
