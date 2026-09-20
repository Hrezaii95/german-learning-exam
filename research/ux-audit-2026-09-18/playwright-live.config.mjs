import {defineConfig} from '../../platform/node_modules/@playwright/test/index.mjs';

// Reuse the same learner journeys against the deployed app in isolated profiles.
export default defineConfig({
  testDir:'../../platform/tests/e2e',
  testMatch:['40-ux-readability.spec.ts','41-complete-backup.spec.ts','42-shared-learning-actions.spec.ts','43-navigation-and-continue.spec.ts','44-professions-learning.spec.ts','45-lessons-and-libraries.spec.ts','46-cheat-sheet-summaries.spec.ts','47-sheet-selection.spec.ts','48-people-learning.spec.ts','49-grammar-sheets.spec.ts'],
  timeout:180000,workers:2,retries:0,
  expect:{timeout:15000},
  reporter:[['list']],outputDir:'./live-test-results',
  use:{baseURL:'https://hrezaii95.github.io/german-learning-exam/',serviceWorkers:'block',screenshot:'only-on-failure',trace:'retain-on-failure'},
});
