import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tests/**/*.test.ts','tests/**/*.test.tsx'],environment:'jsdom',maxWorkers:2},esbuild:{jsx:'automatic'}});
