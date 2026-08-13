# P3D worker report — Representative vocabulary, verb, and Q&A details

Status: implementation evidence returned; **no approval claimed**  
Packet: `docs/cursor-packets/P3D-representative-details.md`  
Model: `cursor-grok-4.5-high` (non-Fast)  
Date: 2026-08-13

## Exact changed paths

Write-scoped:

| Path | Change |
|---|---|
| `platform/apps/web/lib/content/detail-types.ts` | Learner detail types; exact 3 representative IDs; canonical path helpers |
| `platform/apps/web/lib/content/detail-project.ts` | Deterministic projection from validated bundle + learner indexes |
| `platform/apps/web/lib/content/media-availability.ts` | Read-only TTS manifest status → `approved` / `pending-review` / `missing` (no paths) |
| `platform/apps/web/lib/content/media-copy.ts` | Client-safe control copy strings |
| `platform/apps/web/lib/content/qa-normalize.ts` | Ellipsis-safe construction match against published patterns only |
| `platform/apps/web/lib/content/detail-page.tsx` | Thin re-export helper |
| `platform/apps/web/lib/content/access.ts` | Load/assert `learner-details.json`; fail-closed leak scan |
| `platform/apps/web/lib/content/routes.ts` | Detail resolve + raw-colon → encoded 308; wrong-kind/unknown 404 |
| `platform/apps/web/lib/content/path-utils.ts` | Entity segment encode/decode |
| `platform/apps/web/lib/content/navigation-context.ts` | Allowlist encoded detail paths |
| `platform/apps/web/lib/content/search-project.ts` | Link only the three implemented details |
| `platform/apps/web/scripts/project-content.ts` | Emit `learner-details.json` |
| `platform/apps/web/scripts/smoke-canonical-routes.mjs` | Detail 200 / raw-colon / wrong-kind 404 checks |
| `platform/apps/web/proxy.ts` | Detail alias redirects via detail projection |
| `platform/apps/web/generated/learner-details.json` | Generated artifact (3 representatives) |
| `platform/apps/web/generated/learner-search.json` | Regenerated with detail `canonicalHref`s |
| `platform/apps/web/app/vocabulary/[entityId]/page.tsx` | SSG vocab detail |
| `platform/apps/web/app/verbs/[entityId]/page.tsx` | SSG verb detail |
| `platform/apps/web/app/phrases/[entityId]/page.tsx` | SSG Q&A detail |
| `platform/apps/web/components/details/*` | Detail UX, gender badge, verb self-check, Q&A practice |
| `platform/apps/web/components/audio/PronunciationControl.tsx` | Shared audio-control contract; disabled pending-review |
| `platform/apps/web/components/hubs/HubViews.tsx` | Hub cards link only representatives + nav context |
| `platform/apps/web/app/globals.css` | Detail / gender / paradigm / Q&A styles |
| `platform/tests/web/p3d-details.test.ts` | Artifact, routes, leaks, search links, QA normalize |
| `platform/tests/web/p3d-details-ui.test.ts` | Semantic tokens, seven forms, patterns, disabled controls, nav |
| `platform/tests/web/p3c-search.test.ts` | Allow representative detail hrefs in linkability assert |
| `platform/tsconfig.json` | Exclude `p3d-details-ui.test.ts` from root (covered by web-tests) |
| `research/cursor-execution/P3D-worker-report.md` | This report |

Not edited: plans, packet docs, content/learning packages, resources, archive, samples, media (read-only), governance.

## Representatives delivered

1. **Vocabulary** `lex:architekt` → `/vocabulary/lex%3Aarchitekt`  
   - `der Architekt` + published person-form `die Architektin`  
   - Stem/`-in` infographic from published lemma pair only  
   - Empty plurals → “Plural awaiting content approval”  
   - No `Architekten` / `Architektinnen`
2. **Verb** `verb:sein` → `/verbs/verb%3Asein`  
   - Seven present forms exact; irregular legend; optional self-check (no persistence/mastery)
3. **Q&A** `qa:profession-casual-main` → `/phrases/qa%3Aprofession-casual-main`  
   - Informal; question + three answer patterns exact  
   - Model / guided / construction; later levels marked pending P4  
   - Recorder disabled with exact copy

Media: all three `pending-review` (TTS candidates exist; listening approval pending). No paths/hashes/asset IDs exposed. Pronunciation control disabled + exact explanation.

## Artifact hash / leak scan

- Path: `platform/apps/web/generated/learner-details.json`
- `representativeCount`: **3**
- Bytes: **9543**
- SHA-256: `17a7fe2038b1be434ff5864e6492fc1c0ba6e6e9b765120b0fd31f6a90e357bd`
- Assert + tests: no review plurals, no `.mp3` / `media/generated` / `candidate-needs-listening-review` / assertion/source keys; media enum only `pending-review` with `assetId: null`

## Command results

From `platform/`:

| Command | Exit | Summary |
|---|---:|---|
| `npm run check` | 0 | typecheck + typecheck:web + typecheck:web-tests + test + validate:publication + test:web; **15** files / **374** tests; publication `VALIDATION_OK`; web **9** files / **86** tests |
| `npm run build:web` | 0 | Next 16.3.0; **●** 2 lessons + **●** 23 activities + **●** 3 detail routes SSG |
| `npm run audit:prod` | 0 | **0** vulnerabilities |
| `npm run smoke:web-routes` | 0 | **26/26** checks PASS (prior SSG/hubs/search + detail 200/raw-colon/404) |

## Remaining gaps (honest)

- **Content:** Plurals for `Architekt` / `Architektin` still unpublished — gap UI only.
- **Media:** Matching TTS remains `candidate-needs-listening-review`; cannot activate playback without listening approval. No files copied to public.
- **Alternate lexeme:** `lex:architektin` is shown as related person-form on the architekt page; it is **not** its own detail route (exact ID set = 3).
- **Other hub details / Review / Add-to-Review / recorder / mastery:** still next-phase (P4+).
- Hub list routes remain **ƒ Dynamic** (server `searchParams`); lesson/activity/detail representatives are SSG.
- Orchestrator owns approval / register closure; this report does not claim them.

## Honesty

No approval claim. No commit/push. No German invention, review-plural promotion, candidate-media exposure, resources/archive/samples edits, or security/publication gate weakening. Shared audio-control contract is ready for an approved manifest later without redesign; playback is not faked.
