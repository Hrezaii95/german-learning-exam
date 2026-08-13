# P3C worker report — Typed global search and canonical back context

Status: implementation evidence returned; **no approval claimed**  
Packet: `docs/cursor-packets/P3C-global-search-and-back-context.md`  
Model: `cursor-grok-4.5-high` (non-Fast)  
Date: 2026-08-13

## Exact changed paths

Write-scoped only:

| Path | Change |
|---|---|
| `platform/apps/web/lib/content/search-types.ts` | Learner-safe search projection / hit / field types |
| `platform/apps/web/lib/content/search-project.ts` | Deterministic published-only search artifact from public indexes |
| `platform/apps/web/lib/content/search-query.ts` | `searchContent`-compatible scoring, sanitize/parse, grouping helpers |
| `platform/apps/web/lib/content/navigation-context.ts` | Typed bounded `NavigationContext` codec, path allowlist, Back href |
| `platform/apps/web/lib/content/match-keys.ts` | Shared NFC/umlaut match keys + tokenize for search scoring |
| `platform/apps/web/lib/content/access.ts` | Load/validate `learner-search.json` |
| `platform/apps/web/lib/content/nav.ts` | `search` nav key |
| `platform/apps/web/lib/content/routes.ts` | `/search` → 200 kind; `/search/*` → 404 |
| `platform/apps/web/scripts/project-content.ts` | Emit search artifact beside lesson/hub artifacts |
| `platform/apps/web/scripts/smoke-canonical-routes.mjs` | `/search` 200 + `/search/extra` 404 |
| `platform/apps/web/proxy.ts` | Matcher for `/search` |
| `platform/apps/web/components/shell/AppShell.tsx` | Desktop/tablet Search entry (not bottom nav) |
| `platform/apps/web/components/search/SearchViews.tsx` | `/search` UI: empty honesty, grouped results, safe links |
| `platform/apps/web/components/nav/BackLink.tsx` | Canonical Back control |
| `platform/apps/web/components/hubs/HubViews.tsx` | Mobile-accessible Search entry from `/hubs` |
| `platform/apps/web/components/lessons/ActivityAndBrowser.tsx` | Back-context on lesson/activity; preserve inbound search/hub |
| `platform/apps/web/app/search/page.tsx` | Canonical search route |
| `platform/apps/web/app/lessons/[lessonSegment]/page.tsx` | Parse/pass nav context |
| `platform/apps/web/app/lessons/.../activity/.../page.tsx` | Parse/pass nav context |
| `platform/apps/web/app/globals.css` | Search groups, Back link, hubs mobile search styles |
| `platform/apps/web/generated/learner-search.json` | Generated artifact (156 docs) |
| `platform/tests/web/p3c-search.test.ts` | Projection, ranking parity, leaks, nav roundtrip/malice |
| `platform/tests/web/p3c-search-ui.test.ts` | SSR a11y, empty/group/alias UI, back-context render |
| `research/cursor-execution/P3C-worker-report.md` | This report |

Not edited: plans, docs (except this report), content/learning packages, resources, archive, samples, media, governance, `platform/tsconfig.json`.

Note: `p3c-search-ui.test.ts` uses `// @ts-nocheck` because root `tsc` has no JSX (same reason prior UI tests are excluded). Orchestrator may add it to `tsconfig.json` `exclude` later; not done here (outside write-only).

## Result counts

| Surface | Count |
|---|---:|
| Search documents (published learner) | **156** |
| Lessons in search | 2 (linkable `/lessons/01`, `/lessons/02`) |
| Learning activities in search | 23 (linkable via ownership canonical paths) |
| Hub-kind docs (vocab/verbs/phrases/…) | remaining; **canonicalHref = null** → “Detail view next phase” |
| Hub list (unchanged) | vocabulary=69, verbs=4, grammar=0, phrases=58, listening=0, concepts=0 |
| Learner activities (unchanged) | **23** |

## Artifact hash / leak scan

- Path: `platform/apps/web/generated/learner-search.json`
- `documentCount`: 156
- Bytes: 387887
- SHA-256: `446eb5cbbbecfdece86f29caeb83ebd85822a4bdb7864ed640a6bc66ed2525d5`
- Leak scan (serializer + on-disk when present): known review/draft IDs absent; no `SourceAssertion` / `assert:` / `.mp3` / `resources/original` / absolute Windows or `/Users/` paths; forbidden key fragments absent; all `publicationStatus=published`.

## Behavior delivered

### Search

1. Desktop/tablet shell Search link; mobile entry from `/hubs` (bottom nav unchanged).
2. Deterministic `learner-search` artifact from validated publication + public indexes (never `openAuthorIndexes`).
3. Runtime `searchLearnerContent` mirrors content `searchContent` (exact ID/ranking equality asserted).
4. Empty query → guidance (“recent searches not stored”); never dumps all items.
5. Nonempty results grouped by semantic kind.
6. Cards show canonical German display, kind, lesson membership, source priority, matched field/reason.
7. Alias matches (e.g. `heissen`) teach `heißen`; normalized spellings never shown as display.
8. Query sanitize/bound: controls, markup delimiters, arrays/duplicates, length 200.
9. Review/draft/blocked/private/audio/secret absent from artifact and rendered HTML checks.
10. Unimplemented detail destinations are non-links with “Detail view next phase”; lessons/activities link.

### Back context

- Typed `NavigationContext` (`lesson` | `hub` | `review` | `search`) with safe return path + optional q/hub filters/resultId.
- Validates allowlisted internal paths; rejects external, protocol-relative, backslash, traversal, malformed/double-encoded, excessive, unknown.
- Preserves search query / hub filters on outbound links; one canonical Back href (not history-only).
- Never carries assertions, source paths, secrets, arbitrary JSON, or learner answers.
- Fails closed to `/hubs`, `/lessons`, or `/search`.
- Integrated on search→lesson/activity and lesson→activity navigation; review typed but routes still deferred → hubs fallback.

### Routing

- `/search` → 200
- `/search/extra` → 404
- Prior hub/activity canonicalization unchanged; unsafe return paths never redirect externally.

## Command results

From `platform/`:

| Command | Exit | Summary |
|---|---:|---|
| `npm run check` | 0 | typecheck + typecheck:web + test + validate:publication + test:web; **13** files / **357** tests; publication `VALIDATION_OK`; web **7** files / **69** tests |
| `npm run build:web` | 0 | Next 16.3.0; **38** pages; search projected **156** documents; hubs unchanged; 23 learner activities |
| `npm run audit:prod` | 0 | **0** vulnerabilities |
| `npm run smoke:web-routes` | 0 | **17/17** checks PASS (prior 15 + `/search` 200 + `/search/extra` 404) |

## Remaining gaps (honest)

- Hub detail routes, Review, and representative concept-detail surfaces remain next-phase; search marks those results non-linkable.
- Recent-search history unavailable (empty-state honesty).
- G3 “same concept from lesson/hub/search/review” still blocked on unimplemented details/review.
- Grammar/listening/concepts hubs still empty (content/review gates).
- Orchestrator owns approval / register closure; this report does not claim them.
- Optional follow-up: exclude `p3c-search-ui.test.ts` from root `tsconfig.json` like other UI tests.

## Honesty

No approval claim. No commit/push. No review-content promotion, German invention, resources/archive/samples edits, or security/publication gate weakening. Stopped inside write-only paths.
