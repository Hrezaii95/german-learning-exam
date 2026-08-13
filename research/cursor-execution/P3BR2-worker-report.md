# P3BR2 worker report — Empty-hub parity and on-disk artifact hardening

Status: implementation evidence returned; **no approval claimed**  
Packet: `docs/cursor-packets/P3BR2-empty-hub-and-disk-artifact-hardening.md`  
Model: `cursor-grok-4.5-high` (non-Fast)  
Date: 2026-08-13

## Exact changed paths

Write-scoped only:

| Path | Change |
|---|---|
| `platform/apps/web/components/hubs/HubViews.tsx` | Always render shared search + lesson filters on every hub, including empty grammar/listening/concepts; omit category when no categories exist; keep honest “No published items yet” (never fabricate no-matches); tighten a11y labels/`htmlFor`; do not show “after filters” when `itemCount === 0` |
| `platform/tests/web/p3b-hubs-ui.test.ts` | Behavioral rendered coverage for empty-hub filter presence, category omission, active-filter honesty, retained empty state under query params, no fake mastery/due controls |
| `platform/tests/web/p3b-hubs.test.ts` | Independent recursive leak scan over actual `apps/web/generated/learner-hubs.json` bytes (schema/kinds/statuses/IDs + forbidden keys/strings); keep prior serializer leak scan + ID-set + deterministic checks |
| `research/cursor-execution/P3BR2-worker-report.md` | This report |

Not edited: plans, docs (except this report), content packages, resources, archive, samples, media, governance, `hub-query.ts`, canonical data.

## P2 fix 1 — Empty-hub filter parity

- `HubListView` always mounts `HubFilters` before the empty/results branch.
- Empty hubs (`itemCount === 0`) always render `HubEmptyPublished` (“No published items yet”), even when search/lesson query params are present.
- Filters never invent a “No matches” state on empty hubs.
- Category control is omitted when `hub.categories.length === 0` (empty hubs and any hub without categories); populated vocabulary still exposes category.
- Search + lesson remain GET form fields with accessible labels; clear/active summary stays honest; mastery/due remain explanatory unavailable text only.
- “Showing N after filters” only when there are published items and active filters.

## P2 fix 2 — On-disk artifact leak scan

New test: `recursively leak-scans on-disk learner-hubs.json bytes independently of the in-memory serializer`

- Reads raw bytes from `platform/apps/web/generated/learner-hubs.json`.
- Asserts `schemaVersion=1.0.0`, `projectionKind=learner-hubs`, `hubCount=6`, hub ID order, kinds via `HUB_KIND_MEMBERSHIP`, all item statuses `published`, ID sets equal independent learner index sets.
- Recursive key/string walk + raw text checks for review/draft/blocked IDs, known review-only IDs, `assert:`, `.mp3`/mp3 URLs, absolute/Windows/`/Users/`/`resources/original` paths, and forbidden key fragments (`SourceAssertion`, secrets, private paths, etc.).
- Existing serializer-based recursive scan, independent ID-set equality, and deterministic projection checks retained.

## Command results

From `platform/`:

| Command | Exit | Summary |
|---|---:|---|
| `npm run check` | 0 | typecheck + typecheck:web + test + validate:publication + test:web; **11** files / **339** tests; publication `VALIDATION_OK`; web **5** files / **51** tests |
| `npm run build:web` | 0 | Next 16.3.0; **37** pages; hubs projected `vocabulary=69, verbs=4, grammar=0, phrases=58, listening=0, concepts=0`; 23 learner activities |
| `npm run audit:prod` | 0 | **0** vulnerabilities |
| `npm run smoke:web-routes` | 0 | **15/15** checks PASS (canonical/raw-colon/wrong-lesson/404/hubs/detail) |

## Remaining content / human / rights gaps (unchanged)

- Grammar, listening, concepts hubs remain empty (absent or review-only records); filters are present but do not substitute review data.
- Six Lesson 2 verbs, teacher professions collection, teacher-deck activity, workbook listening assets remain review-only.
- 327 TTS assets technically audited; all remain human-review pending.
- Publisher workbook MP3s remain rights-gated / non-public.
- Orchestrator owns approval / register closure; this report does not claim them.

## Honesty

No approval claim. No commit/push. No review-content promotion, German invention, resources/archive/samples edits, or security/publication gate weakening. Stopped inside write-only paths.
