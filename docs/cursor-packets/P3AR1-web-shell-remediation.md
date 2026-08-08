# P3AR1 — Web Shell Remediation

## Assignment

Worker: `C-WEB` using `grok-4.5`, High, `fast=false`.

Remediate the current P3A implementation based on the independent Composer review. Stay within the original P3A write ownership. Do not modify the sample, publication fragments, content/learning engines, resources, media, or archive. Do not commit or deploy.

## Required fixes

### P1 — learner-stage leakage

The author-review activity `activity:lesson-02-teacher-professions-deck` is correctly absent from learner activities, ownership and routes, but its now-empty parent stage is still projected as `Teacher collection review` with `review-stability` and adds 15 minutes to Lesson 2.

- Exclude any stage with zero learner-published activities, except the structural `overview` stage.
- Recompute lesson minutes only from retained learner-visible stages.
- Add behavioral tests that no learner projection contains the teacher-review stage title, `review-stability`, or a non-overview empty stage.
- Keep the teacher activity record unpublished and unrouteable. Do not leak it.

### P1 — web TypeScript omitted from root check

- Add a root `typecheck:web` script that executes the web workspace TypeScript check.
- Include it in root `npm run check` so `app/**` and `components/**` cannot be silently omitted.
- Keep engine typecheck and all current gates.

### P2 — policy/count centralization

- Remove scattered literal `23` constraints from projection/types/access.
- Keep a single explicit learner publication policy for the currently review-only teacher deck, and derive the expected learner count from the validated required-activity total minus that policy exclusion.
- The generated projection count remains 23 until deliberate publication approval. Promotion should require changing one policy point and tests, not several unrelated literals.
- Update the P3A packet language and `platform/README.md` to distinguish 24 validated activity records from 23 currently learner-published routes.

### P2 — route and 404 hardening

- Add `export const dynamicParams = false` to both dynamic lesson route modules.
- Make malformed URI decoding fail closed with an explicit route failure; do not return the malformed raw segment as if decoded.
- Add route tests for malformed percent sequences, double-encoded IDs, query/fragment-like text inside a segment, wrong-lesson routes, unknown segments and extra segments.
- Make the not-found page use no active navigation item; do not mark Dashboard `aria-current` on a 404.

### P2 — learner-facing activity labels

- Replace raw activity IDs in lesson overview link text with learner-facing prompt text from the generated projection.
- Keep activity IDs only as optional dense metadata inside the activity details page.
- Do not create a second course data object; resolve labels from projection activities.

### P2 — behavioral UI tests

- Retain useful source-contract checks but add server-rendered behavioral tests using React/ReactDOM server rendering (no browser dependency required) for at least:
  - one `main` and working skip-link target;
  - correct `aria-current` for Dashboard and Lessons;
  - no `aria-current` on not-found state;
  - learner lesson overview link text uses prompt labels, not `activity:` IDs;
  - no teacher-review stage text in rendered Lesson 2;
  - disabled future hubs expose honest `Next phase` text.
- Tests must consume the generated/validated projection, not a copied fixture of course text.

## Required gates

Run and report exact results:

```powershell
cd platform
npm run check
npm run build:web
npm run test:web
```

Expected public state remains: 2 lessons, 24 validated activity records in the publication bundle, 23 learner-published activities/routes, teacher deck unrouteable until approval.
