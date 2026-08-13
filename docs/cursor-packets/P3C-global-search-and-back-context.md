# P3C — Typed global search and canonical back context

Implement with Cursor `grok-4.5` High, `fast=false`. Do not commit, push, deploy, use subagents/MCP, or claim approval.

## Read first

- `plans/CURSOR-FINAL-HANDOFF.md`
- `plans/PLAN-BATON-full-alpha.md`
- `docs/04-information-architecture-and-ux.md`
- `docs/05-screen-and-interaction-spec.md`
- `docs/18-requirement-traceability.md` (`UX-005`, `UX-006`, `P3-03`)
- `platform/packages/content/src/indexes/**`
- current web projections, routes, shell, hubs, and web tests

## Write only

- `platform/apps/web/**`
- `platform/tests/web/**`
- `research/cursor-execution/P3C-worker-report.md`

Do not edit canonical content, content/learning packages, media, resources, archive, samples, plans, or other docs.

## Objective

Implement a learner-safe global search surface at canonical `/search` and typed navigation context. Search only the public learner index; never call `openAuthorIndexes` or project source/assertion/private data.

### Search requirements

1. Add a real search entry to desktop/tablet shell and an accessible mobile entry from `/hubs`; do not overcrowd bottom navigation.
2. Build a deterministic learner-safe search artifact from the validated publication and public typed indexes, or reuse the hub artifact only if it preserves typed search fields/reasons without leaking data.
3. Use the existing `searchContent` semantics rather than a second incompatible search algorithm.
4. Empty query shows guidance/recent-unavailable honesty, not every item as a fake result.
5. Group nonempty results by semantic hub/type.
6. Show canonical German display, kind, lesson membership, source priority, and safe matched field/reason.
7. Normalized umlaut/ß aliases are matching-only; never display normalized spellings as canonical German.
8. Bound/sanitize query state and handle arrays, duplicates, control/markup, malformed encoding, and excessive values safely.
9. Known review/draft/blocked/private/source/audio IDs or values must never occur in artifact/SSR.
10. Results whose canonical detail route is not yet implemented must be non-links with an honest “Detail view next phase” state. Lesson results and other actually implemented routes may link.

### Back-context requirements

Define a typed, bounded, serializable navigation context for entry from `lesson`, `hub`, `review`, or `search` containing only safe route/query/filter/result metadata. It must:

- validate allowed entry contexts and canonical internal paths;
- reject external, protocol-relative, backslash, traversal, malformed/double-encoded, excessive, or unknown paths;
- preserve the search query and hub filters when navigating to an implemented route;
- provide one canonical Back link/target instead of relying only on browser history;
- never carry assertion values, source paths, secrets, arbitrary JSON, or learner answers;
- fail to a safe canonical hub/lesson/search default.

Integrate it where real navigation exists now without inventing links to unfinished detail/review pages. Build the reusable contract so representative details can consume it next.

### Canonical routing

- `/search` returns 200.
- Unknown `/search/*` returns 404.
- Existing hub/activity canonicalization remains unchanged.
- Raw/unsafe return paths never redirect externally.

## Tests

Add behavioral tests for:

- exact learner result ID/ranking equality with independent `searchContent` for canonical and aliases;
- empty, no-match, grouped, bounded, array/duplicate, markup/control/malformed query behavior;
- canonical orthography and safe matched-field metadata;
- review/draft/blocked/private/audio/secret recursive absence in generated artifact and rendered output;
- typed back-context roundtrip for lesson/hub/search, safe fallback for every malicious path class;
- accurate `aria-current`, one main, labels, keyboard-focusable search entry, mobile access;
- production HTTP `/search` 200 and `/search/extra` 404;
- prior 23 activity, 6 hub, and detail-404 boundaries.

Run from `platform/`:

```powershell
npm run check
npm run build:web
npm run audit:prod
npm run smoke:web-routes
```

Write the report with exact paths, result counts, artifact hashes, leak scan, command results, and remaining gaps. Stop if canonical data promotion or German invention is required.
