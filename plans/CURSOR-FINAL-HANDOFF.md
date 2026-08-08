# Cursor Final Handoff — German Learning OS Lessons 1–2 Alpha

| Field | Authority |
|---|---|
| Status | EXECUTION AUTHORIZED by the owner; continue the existing plan, do not create a replacement plan |
| Plan of record | `plans/full-alpha-delivery-master-plan.md` |
| Status authority | `plans/PLAN-BATON-full-alpha.md` |
| Machine register | `plans/full-alpha-register.csv` |
| Adherence run | `E:\claude-cursor\central-home\adherence\runs\german-learning-full-alpha-2026-08-07` |
| Implementation model | Cursor `grok-4.5`, High, `fast=false` |
| Review model | Cursor `composer-2.5`, High, non-Max, `fast=false` |
| Repository root | `E:\claude-cursor\side projects\German learning` |
| Platform root | `E:\claude-cursor\side projects\German learning\platform` |
| Completion authority | Current register diff + executable evidence + all required gates + owner sign-off |

This is a continuation handoff, not permission to reinterpret the product. Read this file completely, then read the plan, baton, register, requirement traceability, and current-state matrix before editing. Preserve all existing user changes. Do not commit, push, deploy, purchase services, expose secrets, or close an OPEN/PINNED/TBD item without explicit owner authority.

The referenced global Codex master-plan SOP was not present at its declared machine path when this handoff was authored. The project-local master plan, baton, register, adherence run, and this handoff are therefore the operative execution controls.

---

## 1. Mission

Finish a truthful, responsive, local-first Lessons 1–2 Alpha for up to three initial users. The learner must be able to traverse both lessons, explore the six canonical hubs, search canonical content, practise vocabulary/verbs/grammar/Q&A/listening through typed activities, record and replay speech, receive deterministic review missions, preserve/export learner state, and hear fast-starting accurate German pronunciation from cached approved audio.

The Alpha covers:

- Momente A1.1 Lesson 1;
- Momente A1.1 Lesson 2;
- the attached 48-row teacher professions collection, only after its German/content approval boundary is satisfied;
- original/generated visual and pronunciation assets approved through their manifests.

Non-goals remain:

- authoritative pronunciation scoring;
- open-ended AI conversation;
- public redistribution of publisher audio without a documented rights basis;
- multi-user cloud synchronization;
- teacher administration;
- Lesson 3+, A1.2, or whole-book publication;
- production deployment before G6 and G-OWNER.

---

## 2. Mandatory orientation — read in this order

1. `plans/PLAN-BATON-full-alpha.md`
2. `plans/full-alpha-delivery-master-plan.md`
3. `plans/full-alpha-register.csv`
4. `docs/00-session-decision-ledger.md`
5. `docs/04-information-architecture-and-ux.md`
6. `docs/05-screen-and-interaction-spec.md`
7. `docs/09-audio-and-pronunciation.md`
8. `docs/10-infographic-and-visual-system.md`
9. `docs/11-qa-acceptance-and-release.md`
10. `docs/13-tts-generation-and-qa-runbook.md`
11. `docs/17-current-state-and-completion-matrix.md`
12. `docs/18-requirement-traceability.md`
13. `docs/cursor-packets/P3B-six-canonical-hubs.md`
14. `resources/INDEX.md`
15. `platform/README.md`

Then inspect current disk state and rerun baseline gates. Never trust an old status label, screenshot, prior agent claim, or this handoff when current executable evidence disagrees.

---

## 3. Existing boundaries that must not be crossed

### 3.1 Original and failed-demo isolation

- `resources/original/**` is immutable source material. Never edit, normalize, rename, move, or regenerate it.
- `archive/cursor-demo-2026-07-30/**` is the failed Cursor demo. Never import code, data shapes, CSS, assets, or behavior from it.
- `samples/german-learning-ui-samples/**` is a visual/interaction reference and partial vertical slice, not the production Alpha. Do not relabel or deploy it as the Alpha.
- Production work belongs under `platform/**`, generated media under `media/generated/**`, QA evidence under `research/**`, and governance under `plans/**`.

### 3.2 Data publication firewall

- Learner routes may expose only records visible through the public learner `ContentIndexes` projection.
- Never call `openAuthorIndexes` from learner UI code.
- Never expose `review`, `draft`, or `blocked` entities to make a page look populated.
- Never ship `Source`, `SourceAssertion`, assertion values, original/private paths, rights-gated MP3 paths, author-only relationships, or secret/config values in browser artifacts.
- Unknown, wrong-kind, wrong-lesson, malformed, and review-only IDs must fail closed.
- Every new learner-facing projection must be deterministic, typed, publication-validated, recursively leak-scanned, and tested against known review-only IDs.

### 3.3 German/content authority

- Cursor may organize, render, validate, and propose structured gaps. It may not invent German forms, translations, plurals, conjugations, example sentences, accepted answers, grammar claims, sources, or pronunciations.
- A content promotion requires evidence already present in authoritative sources plus the relevant validation/human gate.
- If required content is absent or review-only, keep the learner state honest and emit a structured blocking gap. Do not silently promote it.

### 3.4 Media authority

- Cursor does not generate or replace illustrations, infographics, or audio. The Codex/media lane owns original generation and manifests.
- Cursor may wire only manifest-approved generated assets.
- Publisher workbook tracks remain private while `redistributionBasis` is absent. They must not enter public artifacts, route payloads, caches, tests, screenshots, or client bundles.
- Do not call live TTS at learner runtime. The Alpha uses cached static audio.

### 3.5 Secrets and providers

- Never read or print secret values into chat, logs, artifacts, source files, browser code, generated JSON, tests, screenshots, or reports.
- If a configured credential is needed, load only its named value from `E:\claude-cursor\central-home\secrets\.secrets.env` into the process environment and remove it after the process.
- Do not rotate providers, pool free APIs, add runtime third-party TTS, or purchase plans without a superseding owner decision.

---

## 4. Pinned product decisions

- Lessons and hubs are two views of the same canonical objects.
- Source priority is glossary → course/workbook → teacher material → personal enrichment.
- Core lesson completion and teacher-extra mastery remain separate.
- Gender tokens are semantic and never decorative:
  - masculine: blue + `M`/text/shape;
  - feminine: rose + `F`/text/shape;
  - neuter: amber + `N`/text/shape;
  - plural: violet + `PL`/text/shape.
- Morphology tokens are separate from gender tokens. Regular, spelling-adjusted, stem-change, umlaut, suffix, deletion, and lexical-pair operations must have coherent non-gender cues.
- Alpha pronunciation profile remains cached `de-DE-KatjaNeural` at `+4%` unless the owner supersedes the ADR.
- Audio must start quickly, play at natural speed, preserve pitch, support repeat and optional 0.8× study speed, and provide an honest unavailable/error state.
- Views and lucky multiple choice cannot create mastery.
- Recording is self-comparison only; never claim AI pronunciation scoring.
- The visual direction is a calm premium repeated-use learning workspace: dark navigation rail, warm off-white canvas, restrained violet actions, semantic grammar/morphology colors, generous spacing, and no generic gender-color decoration.
- Desktop, tablet, and mobile must be genuinely responsive, not scaled screenshots.

---

## 5. Verified baseline at handoff

These facts were independently verified immediately before this handoff. Rerun them; do not assume they remain current.

### 5.1 Governance/content/engine

- G0, G1, and G2 were approved in the baton.
- Immutable source manifest: 397 files, 350,139,546 bytes, exact disk/manifest/lock validation.
- Canonical publication validates across the five required fragments.
- Content schemas, typed references, runtime discriminants, publication authority, recursive rights firewall, learner/author indexes, German alias search, mastery, scheduler, and persistence passed prior adversarial review.
- The public learner index was previously verified not to leak review/draft/blocked IDs, hidden lesson IDs, or author-only relationships.

### 5.2 P3-01 shell and lessons

- Next.js 16.3.0 / React 19.2.8 responsive shell is present.
- `/`, `/lessons`, `/lessons/01`, and `/lessons/02` work.
- Publication contains 24 validated activity records.
- Exactly 23 are learner-published routes.
- `activity:lesson-02-teacher-professions-deck` is review-only and correctly returns 404.
- Canonical raw-colon activity aliases redirect once to encoded canonical URLs.
- Wrong-lesson, malformed, unknown, and future routes fail closed.
- Desktop rail, tablet top navigation, and mobile bottom navigation passed prior visual E2E with no horizontal overflow or external requests.

### 5.3 P3-02 hub implementation present but not formally accepted

The latest bounded Cursor implementation created:

- `/vocabulary`
- `/verbs`
- `/grammar`
- `/phrases`
- `/listening`
- `/concepts`
- `/hubs` mobile directory

Current derived learner counts at the last build:

| Hub | Published learner items |
|---|---:|
| Vocabulary | 69 |
| Verbs | 4 |
| Grammar | 0 |
| Phrases & Q&A | 58 |
| Listening | 0 |
| Concepts | 0 |

The zeroes are intentional publication truth, not permission to pull review data into the UI. Lesson 2 contains 43 published core lexemes, including profession pairs such as `Ingenieur/Ingenieurin`, `Architekt/Architektin`, and `Arzt/Ärztin`. The six Lesson 2 verbs and all 15 workbook listening assets remain review-only. The teacher collection remains review-only.

Last independent commands:

- `npm run check`: PASS, 11 test files, 332 tests.
- `npm run build:web`: PASS, 37 generated pages, 23 activity SSG paths, all seven hub/directory routes.
- `npm run audit:prod`: PASS, zero vulnerabilities.
- `npm run smoke:web-routes`: PASS, 15 checks.
- Generated hub artifact contained 131 records and every projected record had `publicationStatus: published`.

However, the final Composer and executable code-review passes were deliberately stopped to conserve the owner’s weekly model allowance. Therefore:

- do not mark P3-02 completed yet;
- first perform the focused review/remediation packet described below;
- update the register and baton only after current-disk evidence is green.

### 5.4 Audio/media

- 327 generated Edge neural clips exist.
- The technical audit passes exact manifest/disk path equality, hashes, codec, sample rate, channel count, duration, and per-asset rows.
- All 327 remain pending qualified German listening review.
- The 15 workbook tracks are mapped but rights-gated and excluded from the public artifact.
- No generated infographic family has yet passed G5 as a complete responsive set.

---

## 6. Execution governance

### 6.1 One orchestrator and one baton writer

The active Cursor parent session is ORCH for this continuation. Only one engine writes the baton/adherence run at a time. Before editing:

1. set `active_engine: cursor` and a unique `orchestrator_session` in `plans/PLAN-BATON-full-alpha.md`;
2. preserve all existing worker history;
3. set the accurate active phase and next action;
4. never erase Codex evidence or rewrite prior verdicts;
5. record every worker/run ID, model, owned paths, returned artifacts, and verification result.

### 6.2 Models

- Implementation: `grok-4.5`, High, Fast off.
- Cursor-side review: `composer-2.5`, High, non-Max, Fast off.
- Never substitute Fast, Max, or another model silently.
- A model/provider failure is a recorded blocker or decision row, not permission to change policy.

### 6.3 Write ownership

| Worker | Write-only scope | Forbidden |
|---|---|---|
| C-UI | `platform/apps/web/**`, `platform/tests/web/**` | canonical content, media generation, governance except returned evidence |
| C-DATA | `platform/packages/content/**`, `platform/content/**`, `platform/tests/content/**` | UI, media, unreviewed German invention |
| C-ENGINE | `platform/packages/learning/**`, `platform/tests/learning/**` | UI redesign, media, canonical content promotion |
| C-REVIEW | reports under `research/cursor-execution/**` | edits to implementation |
| ORCH | baton, register statuses, decisions, release evidence | claiming worker deliverables without verification |

Do not run overlapping writers on the same paths. Parallel work is allowed only for genuinely disjoint paths with distinct worker IDs recorded before dispatch.

### 6.4 Evidence before status

For every packet:

1. inspect the actual diff and changed-path set;
2. assert every returned artifact exists;
3. verify no cross-owner path was changed;
4. run the packet tests plus the root regression gates;
5. run a read-only Composer review;
6. remediate all P0–P2 findings and re-review;
7. update register/baton only after zero unresolved P0–P2;
8. keep `open_items_unchanged: true` unless the named authority explicitly closes one.

The adherence board is only a view. Direct artifacts, tests, manifests, and the baton decide status. The only final `done` authority in the adherence run is its sweep script, and owner acceptance is still separately required.

---

## 7. Remaining work in mandatory order

## Phase A — Accept or remediate P3-02 hubs · Gate G3 remains open

### Objective

Review the current P3B implementation on disk before adding more features.

### Required probes

1. Independently recompute all six hub memberships with the learner-safe typed indexes and compare exact ID sets and counts to the generated artifact.
2. Recursively scan the generated artifact and SSR output for:
   - review/draft/blocked IDs;
   - known teacher collection IDs;
   - all six review-only Lesson 2 verb IDs;
   - all review-only listening asset IDs;
   - teacher-deck activity ID;
   - Source/SourceAssertion/assertion values;
   - absolute/private paths;
   - MP3 paths or URLs;
   - secrets or forbidden key names.
3. Verify two consecutive projection runs are byte-identical.
4. Verify canonical German display remains canonical while `ae/oe/ue/ss` aliases are matching-only.
5. Probe query parameters for duplicate keys, arrays, excessive lengths, HTML, control characters, malformed encodings, unknown lesson/category, and unsafe reflection.
6. Verify exact active navigation and zero `aria-current` on 404.
7. Verify `/hubs` is the mobile directory and not a duplicate canonical content hub.
8. Verify unknown detail routes such as `/vocabulary/lex:ingenieur` remain 404 until their detail implementation exists.
9. Render populated, zero-published, and zero-match states from real components.
10. Run desktop/tablet/mobile browser checks for overflow, keyboard focus, skip link, landmarks, disabled controls, console errors, external requests, and responsive reflow.

### Gate A acceptance

- exact hub route set size = 6;
- mobile directory route count = 1;
- hub artifact learner record count equals independent index result;
- leaked review/draft/blocked/private/source/audio/secret fields = 0;
- deterministic projection byte diff = 0;
- unresolved P0–P2 review findings = 0;
- root test/build/audit/smoke gates pass.

Then mark `P3-02` completed and append evidence to the baton. Do not close G3 because P3-03 remains.

## Phase B — P3-03 typed global search and navigation context

### Objective

Implement learner-safe global search and exact back-context restoration without duplicating content or exposing author data.

### Required behavior

- A global search entry available from the responsive shell.
- Search only published learner documents through the existing typed index search.
- Group results by type; never flatten semantic types into ambiguous cards.
- Match canonical German, normalized umlaut alternatives as secondary aliases, English/Spanish meaning where authoritative, forms, realizations, category, and safe examples.
- Display canonical German orthography even when the query uses an alias.
- Show matched-field/reason metadata without exposing internal assertion data.
- Preserve typed `entryContext` from lesson, hub, review, and search.
- Preserve query, filters, and scroll restoration when returning from a detail/activity page.
- Reject or safely normalize invalid query state; bound query/filter payloads.
- Search results may link only to implemented canonical routes. Unimplemented detail destinations must be visibly unavailable or deferred, never routed to Dashboard or a generic hub.

### Gate B acceptance

- search surface count = 1;
- learner-only result set diff = 0;
- known review/draft/blocked result count = 0;
- canonical/alias/adversarial query suite passes;
- back-context E2E passes from lesson, each populated hub, and search;
- 404 routing remains exact;
- unresolved P0–P2 = 0.

Only then mark `P3-03` completed and evaluate G3. G3 is green only when the representative same concept opens consistently from lesson, hub, search, and review/back context. If detail/review routes needed for that evidence are not implemented, G3 remains partial/open.

## Phase C — Content completeness and representative detail surfaces

### Objective

Create the canonical content and detail-page foundation required by the user’s requested vocabulary, verb, and Q&A samples without bypassing review gates.

### Required representative pages

1. Vocabulary detail using a published Lesson 2 profession other than the original mockup sample where possible. It must support article/gender, independent singular/plural/person forms, meaning, pronunciation controls, examples, morphology operations, source/lesson chips, review action, responsive infographic, loading/error/unavailable states, and keyboard accessibility.
2. Verb detail using approved published content first—`sein` is the safe irregular representative unless another verb is formally published. It must show full present paradigm, stem/endings, regular/spelling-adjusted/irregular operation vocabulary, examples, audio, review action, and responsive layout.
3. Q&A detail using a published pair. It must show register, model question/answer, accepted authoritative variants, guided choice, substitution, construction, record/replay, and self-comparison language without scoring claims.

### Content gap protocol

- First produce an exact requirement-to-published-ID diff for all Lesson 1–2 verbs, grammar concepts, Q&A intents, dialogues/listening models, and teacher collection members.
- If authoritative source fields exist but are still review-only, create a promotion-candidate report with source IDs, fields, confidence, validation state, and required human decision. Do not change status to `published` automatically.
- If a field is absent, add a typed `ContentGap`; do not synthesize German.
- If the teacher 48 collection is not approved, keep its collection/detail routes learner-invisible while allowing approved core profession lexemes to remain visible.

### Gate C acceptance

- three representative detail families implemented from canonical records;
- internal IDs are not primary learner labels;
- all displayed German traces to approved assertions;
- no review-only content leak;
- morphology cues do not misuse gender colors;
- audio/recording error paths are honest;
- desktop/tablet/mobile behavioral and visual tests pass;
- unresolved P0–P2 = 0.

## Phase D — P4 practice, speaking, review, rewards

Implement in dependency order, using the already approved mastery/review/persistence packages rather than creating UI-local alternatives.

### D1. Seven required game modes

Exact required set:

1. flashcards;
2. picture/word match;
3. article sort/choice;
4. audio match;
5. word order;
6. verb builder;
7. word/morphology puzzle.

Each renderer must consume typed canonical prompts, emit typed learner events/attempts, support keyboard/touch, expose feedback without equating reveal with correctness, and cover retry/empty/error states. Do not generate distractors from unverified German.

### D2. Conversation ladder

Implement five levels:

1. model;
2. guided recognition;
3. substitution;
4. independent construction;
5. spoken role-play/self-comparison.

Persist progression as events. Do not use transcript confidence or a self-rating as authoritative pronunciation accuracy.

### D3. Recorder lifecycle

Implement permission request, permission denied, unavailable device, record, stop, playback, retry, replace, and navigation/unmount cleanup. Prevent races, leaked streams, duplicate recordings, and stale object URLs. Recording must never block non-speaking study.

### D4. Review and learner state UI

- Wire deterministic mission generation to actual persisted learner state.
- Display due/weak/new/reinforcement categories and balanced listening/production/form mix.
- Respect publication/unlock/new-card limits.
- Implement Favorite, Difficult/Confusing, Teacher, Exam tags and personal notes through the persistence contract.
- Implement XP/streak/reward UI from the reward reducer, entirely separate from mastery.
- A lucky MCQ, page view, reveal, or self-rated flashcard must not produce Mastered.
- Later lapses must visibly revoke readiness until the lapsed required dimension recovers.

### Gate D / G4 acceptance

- exact game-mode missing-ID count = 0;
- seven renderers emit valid typed attempts;
- five conversation levels work in order and resume correctly;
- recorder allow/deny/navigation tests pass;
- mixed mission includes required modalities when eligible;
- weak/failed concepts enter review;
- persistence reload/export/import reproduces the UI-derived state;
- reward/mastery separation tests pass;
- unresolved P0–P2 = 0.

## Phase E — P5 media integration (Cursor wiring only)

Cursor must not manufacture the media. Work only after the relevant Codex-generated manifests exist.

### Audio integration

- Resolve every published core form/model sentence to an approved generated asset or explicit blocking gap.
- Use the approved cached voice/profile only.
- Preload intelligently for fast first playback without loading the entire corpus.
- Use a singleton/shared controller; prevent overlapping speech unless explicitly intended.
- Default playback 1.0×, repeat, optional 0.8× study mode with pitch preservation.
- Provide loading, playing, paused/stopped, unavailable, and error states.
- Never expose publisher source MP3s.
- Do not present technically valid clips as human-approved until the listening review manifest says so.

### Infographic integration

Wire six original responsive infographic families after manifest approval:

1. noun gender/article;
2. singular/plural morphology;
3. profession person-form relations;
4. verb stem/ending and conjugation;
5. grammar contrast/case structure;
6. Q&A/conversation progression.

Every family needs desktop/mobile variants or a proven responsive vector/component, alt descriptions, non-color cues, local assets, and no copied mockup artwork.

### Gate E / G5 acceptance

- published required-audio missing-ID count = 0 or each missing ID has an explicit blocking gap;
- publisher MP3 public-path count = 0;
- six infographic families present with responsive/alt evidence;
- technical audit passes;
- qualified German human review evidence is present for every released clip/batch;
- unresolved media P0–P2 = 0.

If human listening review is still absent, G5 remains blocked even if integration is technically complete.

## Phase F — Offline, production hardening, and release evidence

### Required engineering work

- Add an explicit, versioned offline/cache policy for the core Lessons 1–2 shell, published JSON projections, and approved generated audio.
- Never cache private publisher media or secrets.
- Ensure cache invalidation follows content/media manifest versions.
- Preserve learner state across refresh, offline use, export/import, and version migrations.
- Provide recoverable error states for corrupt/old state.
- Keep production dependencies at zero known high-severity audit findings or record an explicit owner-approved risk decision.
- No external CDN/fonts/scripts/analytics requests unless explicitly approved.

### Required browser matrix

- 1440×1000 desktop;
- 820×1080 tablet;
- 390×844 mobile;
- 360×800 compact mobile.

Run the full critical journeys at the relevant sizes:

- new learner dashboard → Lesson 1;
- direct Lesson 2 selection;
- resume exact activity/step after reload;
- vocabulary detail + pronunciation;
- verb detail + builder;
- Q&A ladder + recording allow/deny/retry;
- all seven games;
- global search + canonical detail/back restoration;
- review mission + lapse/recovery behavior;
- export/import/replay equivalence;
- offline core journey;
- unknown/review-only/private routes and assets fail closed.

### Accessibility evidence

- one main landmark per page;
- accurate active navigation and zero active item on 404;
- functional skip link;
- complete keyboard journeys;
- visible focus;
- 44×44 minimum touch targets;
- labels/names/states for all controls;
- live status that does not chatter;
- reduced-motion behavior;
- no color-only grammar/gender/morphology meaning;
- contrast checks;
- manual screen-reader checklist for pronunciation, recorder, game feedback, search, and navigation.

### Gate F / G6 acceptance

- automated gate failures = 0;
- responsive viewport missing-evidence count = 0;
- critical journey missing-ID count = 0;
- accessibility required-check missing count = 0;
- external request violations = 0;
- console/page errors in release journeys = 0;
- production audit high findings = 0 or explicit owner decision;
- rollback/version evidence exists;
- requirement/register missing-ID diff = 0;
- unresolved independent-review P0–P2 = 0.

---

## 8. Commands that must remain green

Run from `platform/` unless the command states otherwise:

```powershell
npm run typecheck
npm run typecheck:web
npm run test
npm run test:web
npm run validate:publication
npm run check
npm run build:web
npm run audit:prod
npm run smoke:web-routes
```

Run from the repository root for source/media integrity:

```powershell
node tools/validate-source-manifest.mjs
node tools/audit-alpha-tts.mjs
```

Before a phase/gate GREEN, also run the relevant browser E2E, leak scans, deterministic-generation diff, and exact register/requirement ID-set diff. Add scripts for these checks where absent; do not replace executable checks with prose or source-text grep.

For the adherence run, use the existing central scripts and run directory. Verify artifacts before any GREEN and use the sweep script only after the actual final acceptance conditions are met.

---

## 9. Testing standards

- Prefer behavior and executable state over source-text substring tests.
- Unit tests must include adversarial malformed/unresolved/wrong-kind/duplicate/private/review-only inputs.
- Render real React components for accessibility semantics.
- Use production HTTP/browser tests for canonical routing, redirects, 404s, caching, external requests, and runtime failures.
- Test deterministic reducers and projections with fixed clocks and stable ordering.
- Test rollback: invalid imports, failed persistence replacement, interrupted recording, failed audio, and cache/version mismatch must preserve the last valid state.
- Test immutability at runtime, not only `Readonly` TypeScript types.
- Never assert a hard-coded count when the policy says derive it from the validated publication; compare independently derived sets instead.
- A screenshot proves appearance only. It cannot close content, mastery, persistence, accessibility, rights, or German/audio gates.

---

## 10. UI and accessibility quality bar

- Reuse the established design system and responsive shell; do not restart the aesthetic.
- Avoid dense admin-dashboard styling, gratuitous gradients, excessive cards, tiny labels, and generic illustration filler.
- German text must have correct `lang="de"`; do not apply German language to mixed English/German strings.
- Internal canonical IDs are developer metadata, not primary learner labels.
- Empty states must distinguish:
  - no published content;
  - no filter matches;
  - content locked/unavailable;
  - media missing/error;
  - learner has no history yet.
- Disabled future controls must be genuinely disabled/non-focusable and honestly labelled.
- Do not route unfinished controls somewhere misleading.
- Keep forms/query state copyable in URLs where specified, bounded, canonical, and safely reflected.
- All audio and recording controls need visible textual states, not icon-only meaning.

---

## 11. Required evidence artifacts

Create/update release evidence under `research/release-evidence/**` without embedding secrets or private media:

- gate command report with versions, commands, exit codes, test counts, and timestamps;
- learner-publication recursive leak scan;
- exact hub/search/detail/activity route matrix;
- content requirement/published/gap ID diffs;
- media coverage and rights-boundary report;
- TTS technical and human-review summary;
- four-viewport responsive report with screenshots/traces;
- accessibility automated + manual checklist;
- offline/cache manifest and offline E2E report;
- critical journey E2E report;
- known limitations and OPEN items;
- version and rollback instructions;
- `completion-audit.json` containing the final register and requirement ID-set diffs.

Evidence must use current file hashes/build IDs where appropriate. Do not copy old evidence forward without rerunning it.

---

## 12. Stop conditions and owner decisions

Stop the affected lane, preserve other independent work, and record the blocker when any of these occurs:

- authoritative German field or accepted answer is missing;
- content promotion requires a German reviewer;
- generated audio lacks qualified human listening approval;
- publisher audio rights basis is absent;
- a model substitution is required;
- a material design change would replace the approved direction;
- public deployment, paid provider purchase, or secret rotation is needed;
- a destructive move/delete touches resources, archive boundaries, or user work;
- a P0/P1 finding cannot be remediated safely within scope.

Do not stop merely because another lane is blocked. Continue safe, independent work and leave the blocked gate visibly open.

OPEN items that must remain open unless their named authority closes them:

- qualified German review of candidate vocabulary and generated audio;
- publisher audio redistribution/authenticated-use basis;
- public deployment;
- owner acceptance.

PINNED items:

- Edge `de-DE-KatjaNeural` +4% Alpha profile;
- Cursor Grok 4.5 High implementation and Composer 2.5 High non-Max review policy;
- semantic gender/morphology separation;
- scope limited to Lessons 1–2 plus governed teacher collection.

---

## 13. Baton/register update protocol

After each accepted packet:

1. append, never erase, the worker/run row in `plans/PLAN-BATON-full-alpha.md`;
2. record exact model, effort, Fast state, changed artifact paths, test counts, review verdict, and verification result;
3. change only the corresponding row status in `plans/full-alpha-register.csv`;
4. keep gate pending until every row that gate depends on is accepted;
5. record substitutions/scope changes as explicit decision rows with what they supersede;
6. assert `open_items_unchanged: true` unless owner evidence says otherwise;
7. set `next_action` to one concrete executable step;
8. never set `active_phase: DONE` before G6, G-OWNER, register diff, and requirement diff are all satisfied.

Immediate first baton action for Cursor:

```text
active_engine: cursor
active_phase: P3
next_action: Review and remediate current P3B six-hub implementation; accept P3-02 only after exact learner-set, leak, deterministic, responsive, route, test, build, audit, smoke, Composer, and executable-review gates pass.
```

---

## 14. Final completion definition

Do not say “finished,” “production-ready,” or “full Alpha complete” unless every item below is true:

- register missing-ID count = 0;
- all 49 MUST requirement IDs have current implementation evidence;
- G0–G6 are green;
- G-OWNER is explicitly approved by the owner;
- 24 governed activity cases are accounted for and learner routing remains publication-safe;
- six hubs, typed global search, representative details, seven games, five-level conversation, recorder, review, rewards, persistence, export/import, and offline core journey work;
- canonical Lesson 1–2 content and governed teacher collection have exact coverage or explicit blocking gaps;
- every released generated audio asset has technical and qualified listening approval;
- publisher audio remains excluded unless rights evidence changes;
- six original responsive infographic families pass visual/accessibility QA;
- four viewport matrices and critical E2E journeys pass;
- accessibility evidence is complete;
- dependency/security and external-request gates pass;
- independent Composer and executable reviewers have zero unresolved P0–P2;
- public deployment is either separately approved and verified or explicitly listed as not performed;
- OPEN/PINNED/TBD states remain truthful.

If human/audio/rights/owner gates remain open after all autonomous engineering is complete, report: **engineering complete; Alpha acceptance blocked by named human/external gates**. That is a successful truthful handoff state. It is not permission to invent closure.

---

## 15. Required first response from Cursor

Before editing, return a short orientation record containing:

1. current baton phase/next action;
2. current `git status --short` summary without reverting user work;
3. rerun results for `npm run check`, `npm run build:web`, `npm run audit:prod`, and `npm run smoke:web-routes`;
4. exact P3B changed-path set;
5. exact six hub learner counts independently recomputed;
6. planned P3B review probes;
7. confirmation of model settings (`grok-4.5`, High, Fast off; Composer 2.5 High non-Max review);
8. confirmation that no review-only content, publisher audio, secrets, archive code, or sample code will be promoted.

Then execute the Phase A review/remediation. Do not ask the owner to restate information already present in this repository.
