# Claude Code Takeover and Codex Design Studio Handoff

Status: **ACTIVE HANDOFF — audit first; execute through the existing baton and register**  
Snapshot: 2026-08-13  
Repository: `E:\claude-cursor\side projects\German learning`  
Live app: https://hrezaii95.github.io/german-learning-exam/  
Branch/deploy source: `codex/live-alpha` → guarded GitHub Pages workflow

## 1. Mission and authority

Build the Lessons 1–2 German Learning OS Alpha as a visual-first, audio-first, learn-by-doing product. The governing loop is:

`See → Hear → Notice → Repeat → Recall → Use → Feedback → Review → Master`

The approved UI references establish a polished consumer learning product: dark indigo navigation, quiet off-white workspace, illustration-led heroes, spacious but information-rich cards, restrained purple interaction accents, coherent grammatical color semantics, and responsive desktop/tablet/mobile experiences.

Authority order remains:

1. latest explicit owner instruction;
2. official glossary/coursebook/workbook/transcript and verified audio;
3. teacher handout and learner notes for governed enrichment;
4. approved functional sample and refined UI renders for experience direction;
5. generated enrichment only when labeled and source-bounded.

Never use the archived Cursor demo as a foundation. Preserve honest gaps instead of inventing German, plurals, pronunciation approval, transcripts, or mastery.

## 2. Cost-efficient operating decision

The owner has Claude Max 5 ($100 tier) and Codex ($20 tier). Optimize for marginal quality, not equal token consumption.

### Claude Code owns the high-volume operating work

- continuous orchestration and project memory;
- source/material audit and content-gap bookkeeping;
- architecture and implementation;
- TypeScript/React/content-schema/learning-engine work;
- test creation, accessibility, E2E and release evidence;
- GitHub workflow, deployment and incident handling;
- integration of media/design artifacts;
- stakeholder communication and approval capture.
- Claude/Codex integration, MCP/skill/agent setup, routing policy, permissions, automations and scheduling.

### Codex owns the high-leverage specialist studio

- senior UX/UI audit against the approved mocks and learning model;
- visual direction, component composition and interaction critique;
- original image generation and editing;
- semantic infographic systems and design specifications;
- TTS batch production, exact-text binding and technical audio QA;
- responsive visual QA and adversarial design review.

Codex does not need to do routine app coding or configure Claude's harness. Claude may propose a temporary Codex expansion when visual-system implementation or another bounded task would materially improve quality. The owner approves or rejects that expansion in the Claude chat; the decision is then recorded in the YAML operating model. Codex hands control to Claude through an outcome-focused `/goal` plus evidence paths, not through additional harness mutation.

## 3. Current verified state

These are current-disk/live observations, not inherited completion claims.

| Surface | Current evidence | Verdict |
|---|---|---|
| Lessons | 2 lessons; Lesson 1 has 12 interactive activities, Lesson 2 has 11 core interactive activities | Strong functional slice |
| Details | 97 published detail routes: 69 vocabulary, 4 verbs, 10 grammar, 14 Q&A | Broad but not curriculum-complete |
| Hubs/search | 6 hubs; 166 typed search documents; listening and concepts use experience projections | Functional; some filter/mastery depth remains |
| Practice | 7 game routes; five-level conversation; local recorder | Implemented and tested |
| Learner state | local-first events, activity progress, mastery, review cards, mission, tags/notes, export/import, XP/streak/badges | Implemented; full live E2E remains |
| Teacher professions | optional collection with 48 source rows and 102 form lexemes | Live, explicitly review-pending |
| Publisher audio | 15/15 owner-approved Lesson 1–2 workbook tracks | Live and scoped to exact mapped tracks |
| Restored Kursbuch audio | 90 owner-supplied MP3s in intake (CD1: 59; CD2: 31); CD1 `1_01`–`1_17` names Lessons 1–2 | New primary evidence; not yet registered, deduplicated, organized or exercise-aligned |
| Generated speech | 110 exact public preview clips; 354 generated files on disk | Playable preview, not human-approved |
| Visual assets | 9 PNG + 3 public SVG plus code-native semantic diagrams | Useful base; below approved mock richness |
| Deployment | GitHub Pages automatic deploy from `codex/live-alpha` | Live and repeatable |

### Gates rerun for this handoff

- `npm run check`: PASS; 42 test files / 539 tests, followed by the dedicated web run at 35 files / 237 tests.
- publication validation: PASS.
- `npm run audit:prod`: PASS; 0 vulnerabilities.
- `npm run build:pages`: PASS; 197 static pages generated.
- `npm run smoke:pages`: PASS; 48-route manifest, 1,176 exported files leak-scanned, HTTP checks passed.
- `node tools/validate-source-manifest.mjs`: PASS; 397 files, 350,139,546 bytes.
- `node tools/audit-alpha-tts.mjs`: **FAIL**; base manifest 327, disk 354, audited 327, 27 `TTS_UNMANIFESTED_FILE` failures. The supplement has its own audit, but the canonical all-disk gate is not reconciled.

Worktree note: `samples/german-learning-ui-samples` was already dirty before this handoff. Do not revert it.

## 4. Audit against the initial specification

| Requirement family | Current state | Main remaining gap |
|---|---|---|
| Visual/audio-first learning loop | Partial | Interactive activities exist, but the complete nine-step loop is not demonstrated uniformly across every concept family and journey. |
| Lesson completeness | Partial | The 23 core activities are real; Overview/Review/two-minute-summary orchestration and broad E2E proof remain weaker than the specification. |
| Vocabulary | Partial | 69 details and strong profession pairing exist; only five published nouns have exact stored plurals, and individual visual-card coverage remains thin. |
| Verbs | Partial | Four published verb details exist, but the specification names ten supported Lesson 1–2 verbs. Six remain outside learner detail publication pending source/review decisions. |
| Grammar | Strong content slice | Ten concepts now have detail routes, models and semantic diagrams; guided manipulation and contextual mastery evidence need full journey verification. |
| Phrases/Q&A/conversation | Strong slice | Fourteen Q&A details and 58 hub items exist; coverage of every required intent, accepted variants and independent role-play needs a fresh exact diff. |
| Listening/pronunciation | Partial/blocking | Workbook audio is strong and generated clips are playable. Qualified German listening approval is absent, transcript/equivalent publication is unresolved, and the canonical TTS disk/manifest audit is red. |
| Review/mastery/rewards | Strong engine, partial experience | Engine tests are deep. A new learner sees a zero-card mission until review cards are added; onboarding and default learning-to-review flow need UX validation. |
| Accessibility | Partial | Semantic landmarks, labels, native controls and responsive reflow are visible. Full axe-equivalent, keyboard, screen-reader, transcript and four-viewport evidence is not complete. |
| Offline-first | Missing/partial | Local static assets and learner state exist; explicit service-worker/cache/version policy and offline journey evidence remain. |
| Provenance/scope | Strong | Publication, leak and scope controls are substantial. Human German and media gates remain deliberately open. |

## 5. Senior UX/UI assessment

### What is working

- Navigation and information architecture are understandable.
- Live Lesson 2 has a useful hero, profession illustration, visual lesson route and semantic article/person-form system.
- The 390×844 activity route reflows without obvious horizontal overflow, uses readable controls and preserves a mobile bottom navigation.
- Color meaning is backed by articles, labels and shapes rather than color alone.
- Activities expose honest status, source-backed choices, pronunciation state and missing-plural language.

### What is below the approved mocks

1. **Dashboard and hubs are too sparse and utilitarian.** They read as a validated engineering shell, not the rich learning OS shown in the original composites.
2. **Visual hierarchy is inconsistent by route.** Lesson pages feel designed; generic hubs often look like filter forms followed by repeated text cards.
3. **Card and page repetition is high.** Long mobile activities stack multiple versions of the same word inventory and semantic explanation, increasing scroll cost.
4. **Illustration reuse sometimes weakens meaning.** A small set of scenes carries many unrelated routes; the old audit's semantic-mismatch concerns still apply where reused artwork does not match the exact concept.
5. **Vocabulary is not yet image-led at item level.** Most of the 69 vocabulary entries have pronunciation but not a dedicated recognition/memory visual.
6. **The visual system needs a senior pass before more bulk generation.** Lock composition, line weight, character style, crop behavior, focal metadata, icon grammar and responsive asset budgets first.
7. **Large PNG delivery requires optimization.** Produce AVIF/WebP derivatives and correct eager/lazy policy before multiplying the current raster library.
8. **The learning loop needs stronger progress choreography.** Start, active, feedback, completion, review transfer and next-step states should feel like one product rather than adjacent panels.

## 6. Immediate takeover sequence

Claude Code should execute this sequence without asking the owner to restate the brief:

### T0 — Acquire and reconcile

1. Read this handoff, YAML operating model, existing baton/register and authoritative specs.
2. Confirm `git status --short`; preserve the dirty sample submodule.
3. Update the baton to `active_engine: claude-code` only after confirming no other engine is writing it.
4. Recompute current requirement/register ID diffs. Treat older 2026-08-07 matrices as historical where 2026-08-13 disk/live evidence supersedes them.
5. Ingest the restored Kursbuch audio from `resources/original/hossein added new material that needs to be moved to organized folder structure/Kursbuch-20260813T121208Z-1-001/`: hash/register all 90 MP3s, deduplicate against the mixed archive, move them into the governed audio hierarchy, update the source manifest/lock, and align CD1 `1_01`–`1_17` to Lesson 1–2 coursebook evidence. Do not relabel workbook tracks or publish later-lesson/CD2 material into the Alpha.

### T1 — Close the technical red gate

1. Reconcile the 27-clip supplement with the canonical TTS all-disk audit without regenerating successful clips.
2. Preserve hashes, exact spoken-text bindings, voice/rate/version and preview/human-review status.
3. Require `node tools/audit-alpha-tts.mjs` to see an exact manifest/disk bijection or replace it with a single explicitly authoritative merged audit contract.

### T2 — UX/UI direction before bulk assets

1. Claude inventories high-impact surfaces and passes a bounded brief to Codex UX Lead.
2. Codex produces three coherent direction options for dashboard/hub/activity density using the approved visual language, not a wholesale rebrand.
3. Owner picks the direction in Claude chat before broad promotion.
4. Codex converts the chosen direction into design tokens, page anatomy, component states, responsive rules and an asset-generation manifest.

### T3 — Parallel media/design production

- Codex Infographic Worker: remaining lesson maps, pronoun/person, numbers, `aus`, `nicht`, checkpoint maps and responsive grammar/morphology systems.
- Codex Image Worker: concept-specific vocabulary and dialogue scenes, profession derivatives and responsive crops.
- Codex Audio Worker: exact missing/changed utterances only; reuse all hash-approved clips; no blind regeneration.
- Codex Visual QA: compare actual live renders at 1440×1000, 820×1080, 390×844 and 360×800 against the chosen direction.

Claude integrates each accepted batch immediately; do not wait for all media before improving independent code/content flows.

### T4 — Product completion

1. exact Lesson 1–2 curriculum diff, especially six unpublished verb details, plural gaps and required Q&A intents;
2. default new-learner journey into real review rather than a zero-card dead end;
3. offline/cache/version policy;
4. complete accessibility and critical E2E matrix;
5. performance optimization for images/audio;
6. final requirement/register diff and owner acceptance.

## 7. Human/external gates that models must not invent closed

- qualified German review of generated pronunciation and candidate German forms;
- transcript/equivalent-content redistribution decision;
- acceptance of potentially dated or sensitive profession labels;
- chosen UX direction when options materially differ;
- final Alpha acceptance.

## 8. Definition of takeover success

Claude Code has successfully taken over when:

- it has acquired the baton without dual-writer conflict;
- the current audit replaces stale completion claims;
- the TTS canonical gate is green;
- the owner has an explicit UX direction choice;
- Codex media/design workers operate from a deduplicated inventory and return inspectable artifacts;
- Claude integrates and verifies those artifacts continuously;
- the final release evidence distinguishes engineering completion from open human gates.

## 9. Paste-ready `/goal` for Claude Code

> `/goal Take over the German Learning OS Lessons 1–2 Alpha as Claude Code ORCH. Read E:\claude-cursor\side projects\German learning\CLAUDE.md, docs\22-claude-code-takeover-and-codex-design-handoff.md, config\claude-codex-operating-model.yaml, docs\23-claude-codex-org-chart.md, plans\PLAN-BATON-full-alpha.md, plans\full-alpha-register.csv, and docs\INDEX.md. Independently reconcile current disk and live behavior against the original requirements; preserve the pre-existing dirty sample submodule. Ingest the owner-restored 90-track Kursbuch audio delivery from resources\original\hossein added new material that needs to be moved to organized folder structure\Kursbuch-20260813T121208Z-1-001: register hashes and provenance, deduplicate, move it into the governed audio structure, update the source manifest/lock, and align CD1 1_01–1_17 to Lessons 1–2 without publishing later-lesson material. Repair the red canonical TTS manifest/disk gate without regenerating accepted audio. Then complete the product using Claude and its own agents for integration setup, orchestration, source/content work, code, tests, accessibility, deployment and release evidence. Delegate to Codex only where its senior UX/UI taste, image generation, semantic infographic design, TTS production or visual/media QA improves quality. Propose any Codex scope expansion or reduction in this chat and wait for my approval before applying it. Produce three coherent UX uplift directions before bulk visual generation, reuse accepted assets, keep review-only content and human German/audio gates honest, continuously deploy verified batches, and finish with exact requirement/register diffs plus the live URL.`
