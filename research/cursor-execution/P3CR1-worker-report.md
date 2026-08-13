# P3CR1 worker report — Search SSG, link, artifact, and test remediation

Status: implementation evidence returned; **no approval claimed**  
Packet: `docs/cursor-packets/P3CR1-search-ssg-and-artifact-remediation.md`  
Model: `cursor-grok-4.5-high` (non-Fast)  
Date: 2026-08-13

## Exact changed paths

Write-scoped / supporting:

| Path | Change |
|---|---|
| `platform/apps/web/app/lessons/[lessonSegment]/page.tsx` | Remove server `searchParams`; Suspense + client nav boundary for SSG |
| `platform/apps/web/app/lessons/.../activity/.../page.tsx` | Same static-compatible nav pattern |
| `platform/apps/web/components/lessons/LessonNavViews.tsx` | Client `useSearchParams` wrappers for lesson/activity |
| `platform/apps/web/components/search/SearchViews.tsx` | Allowlist `canonicalHref` via `isSafeNavigationPath` before `<Link>` |
| `platform/apps/web/components/nav/BackLink.tsx` | Fail closed if pathname fails allowlist |
| `platform/apps/web/lib/content/search-types.ts` | Omit non-canonical `hubDestination.path` |
| `platform/apps/web/lib/content/search-project.ts` | Project hub destination hub-only |
| `platform/apps/web/lib/content/access.ts` | Strengthen `assertLearnerSearchProjection` (shape/kind/fields/href/leaks) |
| `platform/apps/web/generated/learner-search.json` | Regenerated (no `path` keys) |
| `platform/apps/web/scripts/smoke-canonical-routes.mjs` | Assert prerender-manifest SSG: 2 lessons + 23 activities |
| `platform/apps/web/tsconfig.tests.json` | Dedicated JSX/Next typecheck for all `tests/web/**` |
| `platform/apps/web/package.json` | `typecheck:tests` script |
| `platform/tests/web/p3c-search.test.ts` | Disk-mandatory artifact, tamper assert, parity + intent, typecheck coverage |
| `platform/tests/web/p3c-search-ui.test.ts` | Remove `@ts-nocheck`; malicious nav SSR; tampered href non-link |
| `platform/tests/web/p3a-web-shell-ui.test.ts` | Typecheck-friendly casts / optional children props |
| `platform/tests/web/p3b-hubs-ui.test.ts` | Same |
| `platform/tests/web/tsconfig.json` | Extends web `tsconfig.tests.json` |
| `platform/tests/web/react-test-shims.d.ts` | Stable include marker for web-tests project |
| `platform/tsconfig.json` | Exclude `p3c-search-ui.test.ts` from root (covered by dedicated config) |
| `platform/tsconfig.web-tests.json` | Extends apps/web tests config |
| `platform/package.json` | `typecheck:web-tests` in `check`; root `@types/react` / `@types/react-dom` for UI test resolution |
| `research/cursor-execution/P3CR1-worker-report.md` | This report |

Not edited: plans, packet docs, content/learning packages, resources, archive, samples, media, governance.

## P1/P2 fixes

### 1 — SSG restored (P1)

- Lesson + activity pages no longer await server `searchParams`.
- Nav context parsed in `LessonNavViews` via `useSearchParams` under `<Suspense>` with static fallback shells.
- `next build` route table: **● `/lessons/01`**, **● `/lessons/02`**, **● 23 activity paths** (`[+20 more paths]` in table).
- Smoke parses `.next/prerender-manifest.json` and asserts **lessons=2 activities=23**.

### 2 — `canonicalHref` allowlist at render (P2)

- `SearchViews` links only when `isSafeNavigationPath(canonicalHref)`; else non-link + “Detail view next phase”.
- UI test: tampered `//evil.example` never reaches `href`.

### 3 — Omit `hubDestination.path` (P2)

- Learner search artifact/types omit unused non-canonical index paths.
- Assert rejects artifacts that still carry `path`.

### 4 — Malicious `nav` SSR Back tests (P2)

- Lesson/activity renders with protocol-relative, external, traversal, encoded, backslash, off-allowlist payloads.
- No `://`, `//`, `\`, traversal, or attacker host in rendered hrefs; `BackLink` fail-closed.

### 5 — Search parity extended (P2)

- Parity queries include `Wie heißen Sie?` and intent/multi-token `name-formal` (expects `qa:name-formal`).

### 6 — Disk artifact mandatory (P2)

- Tests `readFileSync` the generated file with **no** absence try/catch; bytes/hash/IDs must match deterministic serializer.

### 7 — Strengthened `assertLearnerSearchProjection` (P2)

- Exact top-level keys; status/kind/lessons/fields/hub; `canonicalHref` null or allowlisted; no `path`; forbidden keys/strings; fail closed without echoing unsafe values.
- Tamper tests for hostile hrefs, draft status, secret top-level keys.

### 8 — Remove `@ts-nocheck` / typecheck every web test (P2)

- `npm run typecheck:web-tests` → `apps/web/tsconfig.tests.json` includes all `tests/web/**`.
- Wired into `npm run check`.
- Root `tsc` still excludes JSX/Next UI tests; dedicated config typechecks them (not hidden).

## Artifact hash / leak scan

- Path: `platform/apps/web/generated/learner-search.json`
- `documentCount`: **156**
- Bytes: **371751**
- SHA-256: `863668ad804ed8c42169be47c144f08afe565e9db20e15c892b9c01f042df058`
- No `"path"` keys; review/draft IDs absent; no `SourceAssertion` / `assert:` / `.mp3` / `resources/original` / absolute Windows or `/Users/` paths in assert + tests.

## Command results

From `platform/`:

| Command | Exit | Summary |
|---|---:|---|
| `npm run check` | 0 | typecheck + typecheck:web + typecheck:web-tests + test + validate:publication + test:web; **13** files / **361** tests; publication `VALIDATION_OK`; web **7** files / **73** tests |
| `npm run build:web` | 0 | Next 16.3.0; **38** pages; **●** 2 lesson + **●** 23 activity SSG; `/search` dynamic (query); hubs projected unchanged |
| `npm run audit:prod` | 0 | **0** vulnerabilities |
| `npm run smoke:web-routes` | 0 | **18/18** checks PASS (prior + SSG prerender assert + `/search` 200 + `/search/extra` 404) |

## Remaining gaps (honest)

- Hub list routes (`/vocabulary` etc.) remain **ƒ Dynamic** due to server `searchParams` (out of this packet’s pinned lesson/activity SSG requirement).
- Hub detail / Review / representative concept-detail routes still next-phase.
- Orchestrator owns approval / register closure; this report does not claim them.

## Honesty

No approval claim. No commit/push. No review-content promotion, German invention, resources/archive/samples edits, or security/publication gate weakening. SSG for the pinned 2+23 routes was reconciled with the nav-context contract via client `useSearchParams` under Suspense (not waived).
