# P3AR2 — Dependency Security and Canonical Routes

## Assignment

Worker: `C-WEB` using `grok-4.5`, High, `fast=false`.

Apply the remaining mandatory React review fixes to the current P3AR1 web implementation. Stay within original P3A write paths. Do not edit the sample, publication/content/learning engines, resources, archive or media. Do not commit or deploy.

## 1. Upgrade the vulnerable web dependency line

Current `next@15.5.23` production audit has three high advisories through bundled `postcss <=8.5.22` and `sharp <0.35.0`. The current stable registry release is `next@16.3.0`; official Next 16 upgrade guidance requires Node >=20.9, TypeScript >=5.1 and current React 19, all compatible with this workspace.

- Upgrade web to exact stable `next@16.3.0`, `react@19.2.8`, `react-dom@19.2.8`, and compatible current React type packages.
- Set the web/root Node engine floor to `>=20.9.0` where applicable.
- Remove the custom `webpack` `extensionAlias` workaround if it is not in the runtime app graph. Next 16 uses Turbopack by default and refuses custom Webpack config under the default build. Keep config minimal.
- Do not add canary/preview packages.
- Add an `audit:prod` script for `npm audit --omit=dev --audit-level=high` and document it as a release/security gate. Do not make ordinary offline type/test execution depend on registry availability.
- Run the production audit; acceptance is zero high/critical vulnerabilities.

## 2. Canonical activity URLs at the request boundary

The pure resolver and live Next currently accept aliases such as raw `activity:...`, relative paths and duplicate slashes. Canonical contract is the complete encoded activity ID in the URL (`activity%3A...`) with correct lesson ownership.

- The pure route resolver must accept only absolute normalized paths. Reject relative paths and duplicate slash aliases. Decide/document whether a single trailing slash redirects or rejects; behavior must be deterministic.
- Add a Next 16 `proxy.ts` only if needed to observe the raw request path before App Router decoding/normalization. Follow official Next 16 Proxy conventions. Use `skipProxyUrlNormalize` only if required.
- For a raw/lowercase/double-encoded or otherwise noncanonical alias that safely decodes to a known learner-published owned activity, issue one permanent canonical redirect to `ownership.canonicalPath`. Do not redirect unknown, malformed, review-only or wrong-lesson IDs into valid content.
- Wrong-lesson, unknown, review-only, malformed and extra-segment routes remain real 404s.
- Avoid redirect loops. Query strings may be preserved on a canonical redirect; fragments never reach the server.
- Add pure tests plus Next Proxy unit tests using official `next/experimental/testing/server` utilities when practical.
- Add a production HTTP smoke test or script proving:
  - canonical encoded activity path -> 200;
  - raw-colon known alias -> one redirect to canonical (or strict 404 if request-boundary limitations make redirect unsafe);
  - wrong-lesson -> 404;
  - unknown/review-only -> 404;
  - future hub -> 404;
  - no dashboard fallback.

## 3. Semantic teaching color correction

The navigation morphology motif currently shows `lern + bridge + en + irregular star` while coloring the ending with the masculine gender token. This violates the design system.

- For the regular `lernen` motif, show only the outlined stem plus `en` ending using `--rule-regular` with a `REG`/accessible text cue as appropriate.
- Do not show the amber bridge or irregular star for a regular form.
- Never use gender tokens as generic decoration.
- Add a focused test that the motif does not reference `--gender-m`, bridge or irregular star for the regular example.

## Required gates

Run and report exact results:

```powershell
cd platform
npm run check
npm run build:web
npm run test:web
npm run audit:prod
```

Also run the production HTTP route smoke if added. Expected course state remains 2 lessons, 24 validated activity records, 23 learner-published routes, teacher deck review-only and unrouteable.
