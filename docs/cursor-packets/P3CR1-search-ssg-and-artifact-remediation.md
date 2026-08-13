# P3CR1 — Search SSG, link, artifact, and test remediation

Implement with Cursor `grok-4.5` High, `fast=false`. Do not commit or claim approval.

## Read first

- `docs/cursor-packets/P3C-global-search-and-back-context.md`
- `research/cursor-execution/P3C-worker-report.md`
- `research/cursor-execution/P3C-composer-review-result.json`
- all current P3C code/tests and Next route build output

## Write only

- `platform/apps/web/**`
- `platform/tests/web/**`
- `platform/tsconfig.json` only for correct test typecheck inclusion/exclusion if necessary
- `research/cursor-execution/P3CR1-worker-report.md`

## Fix every P1/P2 finding

1. Restore build-time static generation of both lesson routes and all 23 activity routes while preserving valid navigation-context behavior. Do not access async server `searchParams` in the static page. Use a small client boundary with `useSearchParams`/safe codec under Suspense, or another Next 16 static-compatible pattern. Build output/tests must prove 2 lesson SSG paths + 23 activity SSG paths, not merely route-list length.
2. Before any `<Link>`, independently allowlist `canonicalHref` with the canonical internal navigation-path validator. Tampered/protocol-relative/external/backslash/traversal hrefs render as non-links.
3. Remove unused/noncanonical `hubDestination.path` from the learner browser artifact, or replace it with a canonical safe path only. Prefer omission when unused; update schema/tests deterministically.
4. Add rendered malicious `nav` tests for lesson and activity Back links. No `://`, `//`, backslash, traversal, double encoding, off-allowlist, or raw attacker text may reach href/SSR.
5. Extend search parity to `Wie heißen Sie?` and at least one authoritative multi-token/intent query already used by content tests.
6. Disk search artifact is mandatory: tests fail if missing and compare actual bytes/hash/schema/IDs to deterministic projection. Do not `try/catch` absence.
7. Strengthen runtime `assertSearchProjection`: exact top-level shape/version/count; each document/hit status/kind/lessons/fields; `canonicalHref` null or safe allowlisted; no forbidden private/source/audio/secret keys/strings. Fail closed without echoing unsafe values.
8. Remove `@ts-nocheck` by making the UI test typecheck, or consistently include it in an explicit test TS config. Do not simply hide new code from all typechecking. Add a root command/test ensuring every web TS/TSX test is typechecked or explicitly compiled by a dedicated config.

## Required evidence

- tests for tampered artifact href and fields;
- production build route table parsed/asserted for SSG lesson/activity paths;
- current `/search` 200 and `/search/extra` 404;
- prior hub/activity boundaries;
- deterministic artifact required on disk;
- no review/private/audio/secret leak.

Run:

```powershell
cd platform
npm run check
npm run build:web
npm run audit:prod
npm run smoke:web-routes
```

Write the exact report. Stop if preserving SSG cannot be reconciled with the context contract; do not silently waive the pinned route requirement.
