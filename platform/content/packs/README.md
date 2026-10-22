# Content pack manifests

The loader discovers only `*/pack.json`, in sorted order. Each pack uses the language and difficulty profiles alongside this directory. Run `npm run packs:validate` to validate all discovered packs and write their deterministic `capabilities.json` indexes.

The initial A1 migration is blocked by source headword collisions listed in `a1-migration-status.json`. Run `npm run packs:migrate-a1` for a fresh diagnostic. Once Lane 1 reconciles the canonical rows, `npm run packs:migrate-a1 -- --write` creates `de-a1-momente/` atomically. No source data or existing learner page is changed by the migration.

Migration preserves exact row IDs, forms, audio, source dimensions and display metadata. It never invents coursebook page references, promotes review status or generates media. Migrated packs start pending German review and disabled by default. Homographs and case distinctions require explicit source reconciliation; the strict duplicate gate does not silently choose a meaning.

A successful schema check does not constitute language review. The validator deliberately fails when no production pack manifest exists, so an empty inventory cannot appear release-ready.
