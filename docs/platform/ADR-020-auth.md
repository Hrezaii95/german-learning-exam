# ADR-020: Worker password authentication and account boundaries

Status: implemented for review in L3-2, per the 2026-10-22 orchestrator decision.

Use Argon2id v19, memory 19,456 KiB, two passes, one lane, a fresh 16-byte random salt and a 32-byte digest. Store PHC strings with the algorithm/version/parameters. Do not lower these parameters to fit WebCrypto PBKDF2 limits.

The Worker uses pinned `argon2id` 1.0.1 (OpenPGP.js) with uploaded precompiled SIMD/scalar Wasm modules. Its documented custom loader avoids runtime Wasm compilation, which Workers prohibit. The Node seed process uses pinned `hash-wasm` 4.12.0 through the same password module and format. Independent implementations agree on a fixed public interoperability vector. No pepper or additional owner secret is required.

Local workerd verification with the production Wasm loader passed: four warm hashes averaged 152.08 ms sampled V8 CPU and 164.17 ms request wall time (including full Wasm-memory wiping) per hash at the approved parameters. `node apps/edge/scripts/measure-argon2.mjs` repeats the benchmark, checks independent output and enforces the 300 ms local target. These figures measure local workerd, not production Paid hardware. This host requires a temporary loopback-only network-interface adapter for Wrangler's port discovery; application, Wasm and database code are unchanged by that adapter.

Better Auth was evaluated. Its default required-email user model and stored session-token schema do not directly meet the approved nullable-email and SHA-256-only session contract. Implement the small username/password/session contract with established Argon2id implementations and WebCrypto random/digest primitives. Email-link and Google routes remain explicit 501 responses with public flags off, regardless of database flag values.

Cookies contain 32 random bytes with `__Host-`, HttpOnly, Secure, SameSite=Lax and root Path. D1 stores only SHA-256 digests, with revocation and 30-day sliding expiry. Login, password reset and role/status changes invalidate the applicable old sessions. Every write checks exact Origin and JSON content type before bounded input parsing; every resource handler checks the user, role and ownership. Login reserves both hashed username and trusted-IP buckets atomically before the expensive password operation.

Private API JSON has no-store/private headers. The generated Cloudflare service worker bypasses every `/api` request, refuses private/no-store responses and purges old private cache entries. The Pages worker source remains unchanged. Static account/dashboard HTML contains no user data.

Personal exports omit credential/session hashes. Account deletion removes owned rows and anonymises audit actor/target identifiers. Admin endpoints never expose personal notes. Only an owner-configured qualified reviewer can mark content Reviewed; ordinary admin access does not grant German-language approval.

References: [orchestrator decisions](https://github.com/Hrezaii95/german-learning-exam/blob/claude/german-webapp-audit-game-i0plj0/docs/lanes/lane-3-platform.md#orchestrator-decisions-2026-10-22-in-answer-to-lane-3), [Workers Wasm](https://developers.cloudflare.com/workers/runtime-apis/webassembly/), [OpenPGP.js custom Wasm loaders](https://github.com/openpgpjs/argon2id#custom-wasm-loaders), [hash-wasm Worker discussion](https://github.com/Daninet/hash-wasm/discussions/56).
