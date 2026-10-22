# Wortwerk pack foundation (L2-1)

This slice supplies the reusable content boundary. Interaction components and generated game tasks belong to the subsequent slices; capability entries here describe eligibility, not completed playable screens.

- `src/loader.server.ts`: deterministic filesystem discovery of `content/packs/*/pack.json`; validates profile references, hydrated items and referenced JSON resources. File traversal and symlink escapes fail. Pending packs are disabled by default.
- `src/capabilities.ts`: per-item templates/dimensions and minimum-pool eligibility; the CLI writes a deterministic `capabilities.json` per installed pack.
- `src/registry.ts`: browser-safe, atomic, idempotent overlay registration. Input/output copies prevent callers changing stored class content. `clearOverlayPacks` supports sign-out and class changes.
- `src/normalization.ts`: profile-defined normalization and accepted/hint matches; nouns retain case where the profile requires it.
- `scripts/validate-packs.ts`: `npm run packs:validate` (no manifests is an error).
- `scripts/migrate-a1.ts`: `npm run packs:migrate-a1 [-- --write]`. Data-specific configuration lives in `content/packs/a1-migration.json`.

The content package defines/export types and dependency-free JSON Schema validation. The original publication schema and Alpha source firewall remain intact. Legacy article/gender types remain compatible; new pack items use profile-defined values.

Migration consumes the same vocabulary as the illustrated sheets. It preserves row IDs, sources, forms, source audio and display metadata. It checks the entire source before writing and never invents book pages, resolves source collisions silently, promotes review status or generates media. See `content/packs/a1-migration-status.json` for the recorded source blockers; rerun the CLI for current evidence.

Review and release: this slice introduces no routes or learner UI. All packs produced by migration start `pending-german-review`. Qualified review is separate from schema validation, and a pending pack is off by default. Fixture content is test-only and is not installed by the production loader.
