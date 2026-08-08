# P3A — Web Shell and Lesson 1–2 Routes

## Assignment

Worker: `C-WEB` (Cursor mechanical implementation only)

Model contract: `grok-4.5`, High effort, `fast=false`. Do not use Max. A separate read-only review will use `composer-2.5`, High, `fast=false`.

Implement the first clean web-platform slice under `platform/apps/web`. The existing app under `samples/german-learning-ui-samples` is a reference-only functional sample and must remain untouched. Do not import its data, state, route dispatcher, or giant page component.

## Authoritative inputs

- `platform/content/published/*.json`
- `platform/packages/content/**`
- `docs/04-information-architecture-and-ux.md`
- `docs/05-screen-and-interaction-spec.md`
- `docs/06-design-and-infographic-system.md`
- `docs/11-lessons-01-02-content-spec.md`
- `plans/full-alpha-register.csv`

The validated publication bundle is the only course-data authority. UI labels such as navigation names may be local, but lesson titles, goals, stages, activity IDs, prompts, minutes, skill targets, and counts must come from a generated learner-safe projection. Never ship `Source`, `SourceAssertion`, private paths, publisher paths, or review/draft/blocked entities to the client.

## Scope

Build:

1. A vinext/Next-style app in `platform/apps/web`, structurally compatible with the existing Sites foundation.
2. A build-time content-projection step that:
   - loads and validates `platform/content/published` using the content package;
   - fails closed on any validation/publication failure;
   - emits a deterministic, learner-safe generated artifact used by the web app;
   - includes only the two published lessons, their learner-visible stages, and the currently learner-published activities (23 of 24 validated activity records; the review-only teacher deck stays unpublished/unrouteable);
   - excludes provenance values, source objects, assertions, private paths, review/draft/blocked content, and any unknown fields;
   - is reproducible and tested against the validated bundle.
3. Exact routes:
   - `/`
   - `/lessons`
   - `/lessons/01`
   - `/lessons/02`
   - `/lessons/01/activity/:activityId`
   - `/lessons/02/activity/:activityId`
4. Strict routing rules:
   - all 23 currently learner-published canonical activity IDs resolve under their owning lesson;
   - an activity under the wrong lesson returns the real not-found page;
   - unknown lesson/activity/extra segments return not found;
   - never silently fall back to the dashboard;
   - canonical route segments use the complete encoded activity ID after `/activity/`.
5. Views:
   - dashboard with greeting, honest continuation state, today’s mission placeholder derived from zero-state, compact metrics, two lesson cards, and disabled/not-yet-built hub shortcuts;
   - lessons browser with the two validated lesson cards;
   - lesson overview with title, outcome/goals, stages, minutes, skill targets, required/optional labels, and activity links;
   - generic activity screen that honestly presents its validated prompt, stage, skills and evidence/source-status metadata without pretending the future interaction is already implemented. Include a clear “activity interaction arrives in the next slice” state; no fake completion button or fake scores.
6. Responsive accessible shell:
   - desktop: persistent dark indigo side rail;
   - tablet: compact top navigation;
   - mobile: fixed/sticky bottom navigation that never covers content;
   - skip link, semantic landmarks, one `main`, visible focus, `aria-current`, labelled navigation, 44px minimum interactive targets, reduced-motion support, 200% zoom/reflow, German strings marked `lang="de"`;
   - desktop, tablet, and mobile layouts must be deliberate rather than scaled screenshots.
7. Honest states:
   - route-level not found;
   - content projection failure at build time;
   - unavailable future hubs are disabled or labelled “Next phase,” not routed to dashboard;
   - no synthetic learner progress, XP, streak, learned-word totals, or made-up activity completion.

## Design direction

Calm, premium, visual-first learning workspace for repeated daily use. Use warm off-white canvas, generous white surfaces, dark indigo navigation, and restrained violet action color. The first viewport prioritizes real lesson content and continuation, not decorative hero art.

Use the semantic teaching system exactly:

- masculine: blue + `M` + square + `der`;
- feminine: pink-red + `F` + round + `die`;
- neuter: green + `N` + diamond + `das`;
- plural: violet + `PL` + stacked badge + `die`;
- regular morphology: teal + `REG`;
- spelling adjustment: amber + `SPELL`;
- irregular: magenta-red + `IRR`.

Do not use gender colors as generic decoration. Body text is at least 16px. Dense metadata is at least 13px with adequate contrast. Cards use borders and restrained elevation. Avoid glassmorphism, confetti, excessive gradients, stock-photo styling, and emoji as primary lesson illustrations. It is acceptable for this slice to use abstract CSS teaching motifs; real Codex-produced media arrives later.

Use a repeated morphology-strip motif (outlined stem, colored ending capsule, amber bridge, irregular star) as subtle product identity where relevant. Do not claim an infographic exists when it does not.

## Architecture constraints

- Do not create a single giant client component or a `pushState` view switcher.
- Use real file routes and server-first rendering where possible.
- Keep data access/projection separate from UI components.
- Keep route resolution pure and independently testable.
- Do not use localStorage or browser-only learner state in this slice.
- Do not add a database, authentication, API service, TTS generation, recorder, games, hubs, or review UI yet.
- Do not modify `samples/**`, `resources/**`, `archive/**`, `media/**`, publication fragments, or engine behavior.
- Avoid network/CDN dependencies. Use system/local font fallbacks.
- Preserve all existing content/learning tests and validation.

## Expected ownership

Allowed writes:

- `platform/apps/web/**`
- `platform/tests/web/**`
- `platform/package.json`
- `platform/package-lock.json`
- `platform/tsconfig.json`
- `platform/vitest.config.ts`
- `platform/README.md`

Do not revert or overwrite edits outside these paths. Other workers may exist in the repository; accommodate their changes.

## Required tests and gates

Add executable tests that prove:

1. generated projection has exactly 2 lessons and 23 learner-published activities (24 validated publication records; teacher deck excluded by policy);
2. every activity is owned by exactly one lesson/stage and has one canonical URL;
3. all 23 currently learner-published correct routes resolve;
4. cross-lesson activity routes fail;
5. unknown lesson/activity/extra routes fail;
6. learner projection contains none of: `Source`, `SourceAssertion`, `originalPath`, source assertion values, private/publisher paths, review/draft/blocked statuses;
7. lesson UI data (titles, goals, counts, prompts) is derived from the projection rather than a second hard-coded course object;
8. shell contract includes skip link, landmarks, aria-current behavior and responsive navigation breakpoints;
9. build succeeds.

Run and report exact results for:

```powershell
cd platform
npm run check
npm run build:web
npm run test:web
```

If scripts differ, add clear root workspace scripts with these exact names. `npm run check` must continue to run all existing typecheck/tests/publication validation and must not silently omit web checks.

## Definition of done

- Implementation is confined to allowed paths.
- Existing 288 tests stay green and new web tests are included in the reported total or explicitly reported separately.
- Build artifact is produced successfully.
- No sample data, fake progress, source leakage, route fallback, or activity-ownership bypass.
- Provide a concise change summary, file list, commands/results, and known next-slice limitations.
