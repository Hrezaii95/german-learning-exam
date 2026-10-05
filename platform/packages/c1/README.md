# Lingovo C1 integration

Source: Wortweg TestDaF, source commit `49a5ee439109b8dfb18634db5999d2ba71f42fa8`.

The original interactive course, source studio, workbook, vocabulary review, notebook, teacher workspace and progress tools are mounted under `/prepare/c1`. The Next app supplies the shared Armenian/Russian locale and Lingovo navigation. Existing `wortweg-study-v2` and `wortweg-device-v1` storage schemas remain unchanged. Browser storage is origin-specific: existing learners must export/import their data when moving from the old domain. No cloud account migration is implied.

The package retains its original strict TypeScript contract and compiles independently; the host app retains its additional strict compiler options. `npm run prepare:c1` verifies source assets, compiles the package, and generates the scoped C1 stylesheet. `npm run build:cloudflare` builds both systems for Cloudflare Pages. The immutable asset manifest records original and transformed SHA-256 hashes; missing files are restored from the existing published source site. Original scans and media remain identifiable and their qualifications/attributions are preserved.

Browser speech synthesis has been removed. Original recordings and microphone recording remain available. New synthesized speech requires an OpenAI speech integration; there is no fallback speech provider. Billing, authentication, cross-device synchronization, and additional CEFR levels are not implemented by this integration.
