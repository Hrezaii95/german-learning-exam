# Decision Records

## ADR-001 — Standalone platform, not StudyMe runtime

**Status:** Accepted  
**Decision:** Build a standalone responsive platform. StudyMe activity ideas are reference material only.  
**Why:** Required hubs, content graph, custom review, media control, offline data and later assessment exceed the plugin course model.  
**Consequence:** We own routing, persistence, QA and deployment.

## ADR-002 — Lessons and concept hubs coexist

**Status:** Accepted  
**Decision:** Keep the official lesson path while exposing learned/unlocked content through type and concept hubs.  
**Why:** The learner wants lesson-by-lesson guidance and non-linear review/access.  
**Consequence:** Canonical content cannot live only inside lesson JSON.

## ADR-003 — Content is assertion/provenance based

**Status:** Accepted  
**Decision:** Canonical concepts preserve multiple source assertions and explicit publication selection.  
**Why:** Glossary, book, workbook, teacher notes and personal additions overlap and sometimes conflict.  
**Consequence:** Ingestion is more structured but changes and conflicts are inspectable.

## ADR-004 — Visual and grammar colors are semantic

**Status:** Accepted  
**Decision:** M blue, F pink-red, N green, PL violet; regular teal, spelling adjustment amber, irregular magenta-red; every cue also has label and shape.  
**Why:** Consistency supports memory and accessibility; morphology must not be confused with gender.  
**Consequence:** Brand colors cannot casually reuse grammar roles.

## ADR-005 — Pre-generated reviewed neural audio

**Status:** Accepted for Alpha  
**Decision:** Use cached/pre-generated de-DE neural audio for forms/examples and verified publisher audio for source listening. Continue the approved `edge-tts` prototype voice now; preserve a migration path to official Azure Speech.  
**Why:** Device browser voices are inconsistent; static assets are fast and offline-capable.  
**Consequence:** Codex owns generation/QA; voice/version metadata is mandatory.

## ADR-006 — No authoritative pronunciation score in Alpha

**Status:** Accepted  
**Decision:** Alpha supports listen/record/playback/retry but not claimed AI scoring.  
**Why:** Provider scores require German learner benchmarking, privacy/cost design and human validation.  
**Consequence:** Production practice evidence is recorded without false accuracy percentages.

## ADR-007 — Event-based learner state and FSRS-compatible scheduler

**Status:** Accepted  
**Decision:** Store append-only attempts/reviews and derive mastery; wrap an FSRS-compatible scheduler behind an interface.  
**Why:** Review history remains auditable and algorithm upgrades are possible.  
**Consequence:** UI never writes “mastered” directly.

## ADR-008 — Local-first Alpha

**Status:** Accepted  
**Decision:** Core content/media and learner state work locally/offline after load; backend is optional for later sync/AI.  
**Why:** Personal use, privacy and reliable pronunciation playback do not require permanent connectivity.  
**Consequence:** IndexedDB/export/import and cache versioning are required.

## ADR-009 — Cursor implements; Codex generates media

**Status:** Accepted  
**Decision:** Cursor consumes approved media manifests and sends structured gaps; it does not invent or generate learning images/audio.  
**Why:** The failed demo showed that ungoverned implementation drift damages data, UX and media quality.  
**Consequence:** Media gaps can block a packet and must remain visible.

## ADR-010 — Rebuild, do not repair failed demo

**Status:** Accepted  
**Decision:** The quarantined Cursor implementation is not a code/data foundation. The approved functional sample may seed interaction/design behavior.  
**Why:** The failed demo mixed sources, mislabeled audio and diverged from the intended design.  
**Consequence:** Useful facts must be re-derived from original resources.

## ADR-011 — Publisher media stays private until rights are recorded

**Status:** Accepted  
**Decision:** Track and align publisher audio in provenance manifests, but exclude the files and transcript text from every public artifact while `redistributionBasis` is unset. Public demos use generated model pronunciation and explain the rights gate.  
**Why:** Possession of purchased course resources does not by itself establish permission to redistribute them through a public web deployment.  
**Consequence:** Alignment can proceed privately without creating an accidental public media mirror.  
**Revisit when:** The owner records a license, permission or authenticated-use design that explicitly covers the planned delivery channel.

## ADR-012 — Use Vite Preview for local production verification

**Status:** Accepted  
**Decision:** The sample application uses `vite preview --host 0.0.0.0` for its local production-like `start` command. The deployment adapter remains responsible for the eventual hosted runtime.  
**Why:** The current `vinext start` path served application routes but did not mount built `/assets/*`, causing a visually broken production check even though development mode passed. Vite Preview serves the exact built asset graph and is suitable for local release verification.  
**Consequence:** A passing development server is not release evidence. Validation must build first, start the preview server, and run the responsive browser suite against that server. This decision does not claim that Vite Preview is a public production server or replace the future deployment verification.

## ADR-013 — Derived English gloss for `verb:leben` is published and labeled, not treated as verbatim

**Status:** Accepted with owner-revisit flag (recorded by Claude Code ORCH 2026-08-13)  
**Decision:** Publish `verb:leben` with the English gloss "to live", derived from the official glossary's p.3 entries "zusammen|leben — to live together" and "Lebt ihr zusammen? — Do you live together?". The glossary carries no standalone `leben` headword. The derivation is recorded in `tools/build-alpha-content.mjs` next to the gloss table and here; all five sibling verb glosses (wohnen, haben, arbeiten, machen, studieren) and every one of the 36 stored noun plurals in the same wave are verbatim glossary forms.  
**Why:** The German side of `leben` — infinitive and full seven-person paradigm — is already coursebook-sourced and unaffected; only the English meaning label lacked a standalone entry. Withholding the whole verb over an English gloss that the source unambiguously implies would understate real coverage, while silently presenting it as verbatim would overstate source authority.  
**Consequence:** Lesson 2 publishes ten supported verbs rather than nine. If the owner or a qualified German reviewer rejects the derivation, reverting is a one-line change to the `fullFormGlosses` table plus a rebuild, returning `verb:leben` to review-blocked status.  
**Revisit when:** The owner rules on the derivation, or a source with a standalone `leben` headword is added.

## ADR-014 — Kursbuch CD2 intake duplicates are quarantined, not re-registered

**Status:** Accepted (recorded by Claude Code ORCH 2026-08-13)  
**Decision:** Of the owner-restored 90-track Kursbuch delivery, the 31 CD2 files were byte-identical (same filename and sha256) to the already-registered `Momente_A1_1_KB_CD2` pack. They are held at `archive/duplicates/Kursbuch-20260813T121208Z-1-001-CD2/`, excluded from the source manifest and git-ignored; the 59 new CD1 files are registered normally. The archive copies remain the single canonical registered instances.  
**Why:** Registering a second copy of identical bytes would inflate the source count, create two provenance ids for one artifact, and weaken the manifest's one-file-one-hash guarantee.  
**Consequence:** Source manifest holds 456 files; nothing is deleted, so the intake set stays recoverable. Rights status is unchanged — all Kursbuch audio remains private-rights-gated per ADR-011.
