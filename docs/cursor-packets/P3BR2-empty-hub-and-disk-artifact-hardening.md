# P3BR2 — Empty-hub parity and on-disk artifact hardening

Implement with Cursor `grok-4.5` High, `fast=false`. Do not commit or claim approval.

## Read first

- `docs/cursor-packets/P3B-six-canonical-hubs.md`
- `docs/cursor-packets/P3BR1-hub-acceptance-and-baseline-remediation.md`
- `research/cursor-execution/P3BR1-worker-report.md`
- `research/cursor-execution/P3BR1-composer-review-result.json`
- current hub components/query/access and P3B tests

## Write only

- `platform/apps/web/components/hubs/**`
- `platform/tests/web/p3b-hubs-ui.test.ts`
- `platform/tests/web/p3b-hubs.test.ts`
- `research/cursor-execution/P3BR2-worker-report.md`

## Fix exactly two P2 findings

1. Every hub page, including currently empty grammar/listening/concepts, must expose the shared search and lesson filter surface required by P3B. Category may be omitted when no categories exist. Preserve the specific “No published items yet” state; filters must not fabricate results/state. Ensure accessible labels, valid form behavior, clear/active summary honesty, responsive layout, and no fake mastery/due controls.
2. Add an independent recursive leak scan over the actual bytes parsed from `apps/web/generated/learner-hubs.json`, not only the in-memory serializer. Assert its schema/kinds/statuses/IDs and forbidden keys/strings with the same publication/private/audio/secret boundary. Keep the existing independent set and deterministic checks.

Add behavioral rendered tests for empty-hub filter presence and retained honest empty state. Run:

```powershell
cd platform
npm run check
npm run build:web
npm run audit:prod
npm run smoke:web-routes
```

Write the report with exact paths and results. Stop on any need to promote review content or alter canonical data.
