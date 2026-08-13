# Full Goal Gap Register — Lessons 1–2 Alpha

Status: current-state audit and executable closure register  
Audited: 2026-08-13  
Audited revision: `b87f153912060e6490f847e480ae01082a763177` on `codex/live-alpha`  
Scope: original 77-message conversation, docs 00–18, references/indexes, plans/register/baton, current `platform/`, current tests, and live GitHub Pages evidence

## 1. Verdict and authority

The platform is a real, deployed vertical slice, not the full accepted Alpha.

- **Proven now:** typed publication and provenance contracts; Lessons 1–2 route shell; 23 learner-published activity routes; six top-level hub routes; typed search; three representative detail families; six functional game modes plus one honestly unavailable audio mode; five-level representative conversation; recorder lifecycle; event-sourced mastery/review/persistence/rewards; 15 owner-approved workbook tracks; and a green guarded GitHub Pages deployment.
- **Not proven now:** full teacher-extra access; complete official/extra vocabulary coverage at learner level; published grammar/listening/concepts; all ten required verbs; a complete learning loop for every activity/concept type; generated pronunciation coverage approved by a German reviewer; accessible alternatives for source listening; offline/cache behavior; the four-viewport browser/accessibility matrix; final release evidence; and owner acceptance.
- **Release wording:** “live Lessons 1–2 vertical slice” is supported. “Full Alpha complete”, “production-ready”, and “all original goals delivered” are not.

Authority order for this register:

1. latest explicit owner decision;
2. immutable source files and original conversation;
3. validated publication data, generated learner projections, and current executable tests;
4. live workflow/deployment state at the audited revision;
5. plans, reports, packet claims, and prose.

Status vocabulary: **PROVEN** means current direct evidence covers the whole requirement; **PARTIAL** means a real slice exists; **MISSING** means required learner behavior/data is absent; **BLOCKED** means a named human/external decision prevents acceptance; **DEFERRED** means intentionally outside Alpha.

## 2. Current proof snapshot

| Proof | Authoritative evidence | Current result |
|---|---|---|
| Original intent | `resources/project-context/conversation/Interactive-Course-Creation.json`; `docs/00-session-decision-ledger.md` | 77 messages present; retained goals traceable |
| Immutable sources | `resources/INDEX.md`; `content/source-index/source-manifest.json`; `content/source-index/source-lock.json` | 397 source files are the pinned source inventory |
| Canonical publication | `platform/content/published/*.json`; content package validators | 2 lessons, 24 activity records, 48 teacher rows, 15 workbook mappings |
| Learner routes | `platform/apps/web/generated/learner-projection.json`; `tests/web/p3a-web-shell.test.ts` | 23 published activity routes; teacher-deck activity remains review-only |
| Hub exposure | `platform/apps/web/generated/learner-hubs.json`; `tests/web/p3b-hubs.test.ts` | item counts `69/4/0/58/0/0` for vocabulary/verbs/grammar/phrases/listening/concepts |
| Extra professions | `platform/content/published/teacher-professions.json`; `generated/enrichment/learner-content-enrichment.json` | 48 rows encoded; 86 unique teacher lexemes and the collection are review-only and excluded; 26 core profession cards visible |
| Media | `tests/web/p5-media-integration.test.ts`; `media/qa/alpha-tts-technical-audit.json` | exactly 15 approved workbook tracks shipped; 327 generated clips technically pass but lack qualified listening approval |
| Local gate | `npm run check` run during this audit | 32 files / 497 tests passed; publication validation passed |
| Deployment | `.github/workflows/deploy-pages.yml`; GitHub run `31671485029` | all workflow steps passed for `b87f153`; Pages status `built`, HTTPS enforced |
| Live routes | `https://hrezaii95.github.io/german-learning-exam/` probed during this audit | dashboard, Lessons 1–2, six hubs, search, practice, conversation, review/session, and settings returned HTTP 200 |

The live repository is `Hrezaii95/german-learning-exam`, while the original conversation named `Hrezaii95/german-learning-os`. This naming/remote substitution requires an explicit owner decision before final acceptance.

## 3. Original-goal proof and gaps

| Goal retained from the conversation | Status | Exact current proof | Remaining acceptance gap |
|---|---|---|---|
| Interactive Lessons 1–2 | PARTIAL | 2 lessons and 23 learner routes in `learner-projection.json`; route/build tests | Most activity pages are enriched shells, not complete See→Hear→Notice→Repeat→Recall→Use→Feedback→Review loops |
| Learn every profession from the supplied image/note | MISSING | 48 source rows and 102 collection members are encoded; 86 teacher-only lexemes are review-only | German review, publication promotion, learner filter/collection route, full forms/audio/visuals/games/review |
| Unified gender encoding everywhere | PARTIAL | semantic tokens and non-color cues; shell/detail/game tests | Needs full four-viewport and automated/manual accessibility proof on every generated infographic and form |
| Verb meanings, paradigms, irregularities, and infographics | PARTIAL | verb hub has 4 items; representative `sein`; rapid projection has 3 paradigms | Six Lesson 2 verbs remain review-only; no exact ten-verb learner-visible diff; visual coverage is not complete |
| Phrases and Q&A with glossary→book/workbook→teacher→personal priority | PARTIAL | 44 phrase patterns, 14 Q&A pairs encoded; 58 learner hub items | No exact source-to-published coverage diff; zero canonical dialogues; no governed personal-addition workflow |
| Lesson backlinks, difficulty tags, focused review | PARTIAL | typed navigation context, five tags, notes, deterministic mission, persistence tests | Back-context omits review in current proof; tags/notes exist only on implemented details; teacher filter has no published teacher deck |
| Pronunciation and listening as first-class learning | BLOCKED | 15 live workbook tracks, recorder, playback-rate controls; 327 generated candidates | Generated audio needs qualified German review and learner wiring; source tracks need a transcript/equivalent after attempt for deaf/HoH learners |
| AI speech analysis, corrections, score threshold | DEFERRED | ADR-006 and anti-score tests prohibit false scoring | Provider benchmark, human correlation, privacy/cost policy, error taxonomy, and owner approval are post-Alpha gates |
| Complete premium responsive UX for every named view | PARTIAL | all primary route families are deployed | Three hubs empty; settings omit target minutes/reduced-motion/text size; no offline UI; no full browser/a11y evidence matrix |
| Comprehensive docs and explicit Cursor execution instructions | PARTIAL | docs 00–18 plus 43 packet briefs exist | Current-state docs are stale; later execution lacks packet provenance; P5/P6 closure packets are absent |
| Live online URL | PROVEN | Pages run `31671485029`; live HTTP probes | Owner must decide whether the public `german-learning-exam` repo/URL is the canonical delivery target |
| Source-backed, extensible knowledge base | PARTIAL | schemas, assertions, scope firewall, indexes, deterministic projections | Extra vocabulary is encoded but not learner-published; grammar/dialogue/listening entities and content-diff workflow remain incomplete |

## 4. All 49 MUST requirements: current authoritative proof

Target IDs in `docs/18-requirement-traceability.md` are specifications. A target ID is not proof unless a current test or artifact implements it.

| Requirement | Status | Current authoritative proof | Exact gap |
|---|---|---|---|
| LRN-001 | PARTIAL | P4A/P4B behavior tests; mastery/review packages | Representative games/Q&A only; generic lesson activities do not traverse the whole loop |
| LRN-002 | PARTIAL | `p3a-web-shell.test.ts`, `p3b-hubs.test.ts`; live routes | Direct entry works; prerequisite recommendation and learned/unlocked hub behavior are incomplete |
| LRN-003 | PARTIAL | `mastery.test.ts` proves six dimensions; dashboard derives summary | No per-lesson/per-concept six-dimension progress experience |
| LRN-004 | PROVEN | `ENGINE-MASTERY-ANTI-LUCK-01` and lapse tests in `mastery.test.ts` | Preserve |
| LRN-005 | PROVEN | scope fixtures and learner-projection leak tests | Preserve while promoting extras |
| LRN-006 | PARTIAL | `CONTENT-ATTACH-01`; typed relation/schema packages | No acceptance fixture for every required extra content kind and no learner authoring/import flow |
| LES-001 | PARTIAL | `LearnerDashboard.tsx`; P4C controller/reward tests | Recent items and explicit weak-skill display are absent/incomplete |
| LES-002 | PARTIAL | 23 route shells and lesson stages | Activity bodies and two-minute summaries do not implement the full stage contract |
| LES-003 | PARTIAL | lesson overview renders goals/time/activity counts | Source-priority counts, skill progress, and required teacher extras are missing |
| LES-004 | PARTIAL | stable activity URLs; persisted resume in `LessonNavViews.tsx` | Resume position is always `0`; exact within-activity step is not restored |
| LES-005 | PARTIAL | lesson chips, typed relations, three representative details | Not every hub item has an implemented detail/backlink surface |
| VOC-001 | PARTIAL | 69 vocabulary hub items; representative profession detail | Generic nouns lack complete plural/pattern/example/audio/review detail coverage |
| VOC-002 | PROVEN-DATA | 48 rows reconcile to independent form lexemes and `person-form-of` relations | Learner publication remains blocked |
| VOC-003 | PARTIAL | morphology operation schemas and representative UI/game | Missing learner-visible plurals/operations for core cards and broader pattern fixtures |
| VOC-004 | PARTIAL | exact game registry and behavior tests | Audio match is unavailable; full image/audio/plural/typing/spoken template coverage is absent |
| VOC-005 | MISSING | Current tests deliberately exclude 48 teacher rows and 86 teacher lexemes | Publish reviewed collection; add exact `Teacher extra · Lesson 2` filter/category/deck proof |
| VER-001 | PARTIAL | verb hub, `sein` detail, verb-builder tests | Only 4 learner-visible verbs; complete uses/examples/audio/source/review coverage absent |
| VER-002 | PARTIAL | representative regular/irregular/spelling labels and verb builder | No full operation coverage across all ten verbs and all surfaces |
| VER-003 | PARTIAL | canonical data contains 10 verbs; learner hub contains 4 | Promote/review the six Lesson 2 verbs and prove exact learner-visible ten-ID diff |
| GRM-001 | PARTIAL | rapid visual sections and form games | Canonical grammar entity count is 0; no grammar detail learning-loop renderer |
| GRM-002 | MISSING | Empty grammar hub is honestly rendered | Publish exact required grammar concept set with assertions and activities |
| PQA-001 | PARTIAL | first-class phrase/Q&A records and 58 hub items | Dialogue count is 0; embedded activity strings still lack complete canonical coverage |
| PQA-002 | PARTIAL | representative Q&A detail and grading pins | Complete intent/slot/variant/grammar relations are not proven for every pair |
| PQA-003 | PARTIAL | Lessons 1–2 contain 44 phrase patterns and 14 Q&A pairs | No exact required-intent/source coverage diff; family/relationship cases incomplete |
| PQA-004 | PARTIAL | exact five-level ladder works for one published profession Q&A | Generalize and prove the ladder for every eligible Q&A pattern |
| AUD-001 | BLOCKED | Explicit gaps and 327 technically valid generated clips | Qualified listening approval and complete object-to-asset-or-gap diff are absent |
| AUD-002 | PROVEN-SLICE | workbook player tests cover repeat, preferred/0.8/1.0 rates and pitch | Generated audio is not wired through the same approved controller |
| AUD-003 | PROVEN | separate origin/rights contracts and exact source-player label | Reconcile governing docs with the later scoped approval |
| AUD-004 | PROVEN | `p5-media-integration.test.ts` proves exact 15 files, hashes, and five activity mappings | Add accessible post-attempt equivalent; keep approval scope exact |
| AUD-005 | PROVEN | 14 recorder lifecycle tests plus spoken-role-play tests | Preserve in browser E2E |
| AUD-006 | PROVEN | no-score contracts in mastery, persistence, and conversation tests | Preserve |
| HUB-001 | PARTIAL | six exact top-level routes and `/hubs`; deterministic hub artifact | Grammar/listening/concepts have 0 items, so learned content is not exposed there |
| HUB-002 | PARTIAL | text, lesson, category filters | UI explicitly says learned/due/mastery/streak controls are unavailable; priority/tag/due filters absent |
| HUB-003 | PARTIAL | five built-in tags and personal notes on three details | Not available from all concept cards/details; filtered deck behavior incomplete |
| REV-001 | PARTIAL | deterministic scheduler/mission engine and P4C review UI | Live mixed-modality mission needs browser proof across eligible real cards |
| REV-002 | PROVEN | deterministic review tests; export/import/reload equivalence in persistence tests | Preserve |
| REV-003 | PARTIAL | seven IDs registered; six functional behavioral modes | Audio match is an unavailable state, not a provided practice mode |
| REV-004 | PROVEN | separate reward reducer/tests; mastery rejects reward fields | Preserve |
| DAT-001 | PROVEN | schema/index relationship tests and fail-closed fixtures | Preserve |
| DAT-002 | PROVEN | published-field assertion gate and real publication validation | Preserve through promotions |
| DAT-003 | PROVEN-DATA | teacher/core overlaps reuse canonical IDs; 48 rows map to 86 new lexemes plus existing core members | Add learner-visible dedupe proof after teacher promotion |
| DAT-004 | PROVEN | Lesson 3/A1.2/localized fixtures and recursive learner leak scans | Preserve |
| DAT-005 | PROVEN | `npm run check` invokes validation; mutation/negative fixtures fail | Preserve in deployment workflow |
| UX-001 | PARTIAL | responsive CSS contracts and earlier route smoke | No current four-viewport browser evidence for every primary route/journey |
| UX-002 | BLOCKED | hooks/a11y lint and component semantics tests pass | No automated browser a11y/manual SR matrix; source audio suppresses caption rule without equivalent content |
| UX-003 | PROVEN-SLICE | semantic labels/shapes and token tests | Extend proof to every future infographic/detail/game |
| UX-004 | MISSING | localStorage/export-import work | No service worker, versioned cache policy, downloaded media state, or offline E2E |
| UX-005 | PARTIAL | typed global search, safe aliases, match metadata | Lesson/priority/mastery filtering is incomplete |
| UX-006 | PARTIAL | lesson/hub/search context round-trips | Review-origin and exact scroll restoration are not proven |

## 5. Stale or contradictory authority documents

These files may remain historical specifications, but they must not be cited as current-state proof until corrected or explicitly superseded.

| File/location | Contradiction | Required reconciliation |
|---|---|---|
| `docs/00-project-brief.md:3` | Says `pre-implementation` | Mark as original brief/specification; point current state to this register |
| `docs/INDEX.md:4,30,53` | Last updated 2026-08-07; says `platform/` exists “once created” and sample is current | Add docs 19 and distinguish baseline design from current platform/live evidence |
| `docs/04-information-architecture-and-ux.md:43` | Claims `/vocabulary/:id` for 48 teacher professions | Current learner details are only three representatives; teacher collection is review-only |
| `docs/09-audio-and-pronunciation.md:16`; `docs/DECISIONS.md:73-79`; `docs/CURSOR-TTS-LEGWORK-BRIEF.md:30` | Says redistribution basis is unset and publisher MP3s cannot be public | Supersede narrowly with the 2026-08-13 owner approval for tracks `1_01`–`1_15`; keep every other publisher asset blocked |
| `docs/12-technical-architecture.md:42-46`; ADR-008 | Implies IndexedDB/local-offline cache contract | Current persistence uses localStorage; offline cache is not implemented |
| `docs/13-quality-and-acceptance.md:96`; `docs/14-cursor-execution-plan.md:91`; `docs/15-roadmap-and-backlog.md:49` | Target private deployment | Current GitHub Pages site is public; owner must accept or replace it |
| `docs/14-cursor-execution-plan.md` | Generic Packet 0–9 order no longer matches actual C0/C1/C2/P3/P4/DEPLOY packets | Retain as historical roadmap or rewrite against the dependency register below |
| `docs/15-roadmap-and-backlog.md` | Lists completed platform work as future and source audio as unapproved | Rebase statuses on current artifacts and scoped rights decision |
| `docs/17-current-state-and-completion-matrix.md` | Says clean `platform/`, mastery, scheduler, routes, search, games, and deployment are absent | Superseded for current state by this register |
| `docs/18-requirement-traceability.md:18-66` | Uses target IDs and several obsolete `/hubs/*` route forms as if they were proof | Map targets to actual current test files/results; canonical hubs are top-level routes |
| `docs/REFERENCES.md:16` | Calls the sample the functional baseline without naming current platform/live source | Keep as design history; add current platform and deployment evidence |
| `plans/full-alpha-delivery-master-plan.md:25`; `plans/CURSOR-FINAL-HANDOFF.md:417,436,611,659` | Forbid any public publisher audio | Supersede only for the exact approved 15-track set |
| `plans/PLAN-BATON-full-alpha.md:3,6,16,58,60` | Active phase/next action and deploy run are stale; P4C review state omits the current caption finding | Refresh only after independent P4C/a11y closure and current run evidence |

## 6. Missing Cursor implementation/evidence packets

Existing packet coverage ends at P4C plus DEPLOY1R1. Reports exist for DEPLOY1R2/R3 without matching packet briefs. P5 rapid integration was performed without a bounded Cursor packet. No P6 packets exist.

| Required packet | Depends on | Required ownership/output | Acceptance command |
|---|---|---|---|
| `P4CR1-learner-state-a11y-closure` | P4C | Close independent review; add an accessible post-attempt transcript/equivalent for workbook audio; strengthen mission/tag/note/UI tests | `npm run lint:web && npx vitest run --config vitest.config.ts tests/web/p4c-state-core.test.ts tests/web/p4c-learner-ui-behavior.test.ts` |
| `DOC-RIGHTS1-scoped-audio-supersession` | owner approval already recorded | Reconcile ADR/docs/plans with exact 15-track scope; no media/code change | `rg -n "redistributionBasis is unset|Never expose publisher|publisher MP3 public-path count = 0" docs plans` must return only clearly historical/superseded text |
| `P5A-source-coverage-and-teacher-promotion` | qualified German/content review | Exact glossary/course/workbook/teacher/personal ID diff; publish reviewed 48-row collection, six verbs, grammar/listening/dialogue records or explicit blocking gaps | `npx vitest run --config vitest.config.ts tests/content tests/web/p5-content-enrichment.test.ts` plus a new exact source-coverage test |
| `P5B-media-and-infographic-completion` | P5A; qualified generated-audio review | Wire approved TTS, all required visual families, post-attempt text alternatives, and object-to-media/gap manifest | `node ../tools/audit-alpha-tts.mjs && npx vitest run --config vitest.config.ts tests/web/p5-media-integration.test.ts tests/web/p5-rich-visuals.test.ts` |
| `P5C-full-learning-loop` | P5A/P5B | Replace generic shells with typed interactive activities; make all seven modes functional; generalize five-level Q&A | `npx vitest run --config vitest.config.ts tests/web/p4a-games-behavior.test.ts tests/web/p4b-conversation-behavior.test.ts` plus a new 23-route learning-loop E2E |
| `P6A-offline-settings-and-recovery` | P4CR1/P5B | Versioned cache/service worker; offline status/download; target minutes, reduced motion, text size; corrupt/cache rollback | New `npm run test:e2e:offline`; `npm run build:pages && npm run smoke:pages` |
| `P6B-accessibility-responsive-critical-e2e` | P5C/P6A | Automated a11y, keyboard, manual SR checklist, four viewport matrix, all critical journeys, external-request/console gates | New `npm run test:e2e:release` at 1440×1000, 820×1080, 390×844, 360×800 |
| `P6C-completion-audit-and-doc-rebase` | P6B | Current evidence bundle, 49-ID diff, register diff, route/content/media matrices, docs 00–18 rebase | New `npm run audit:completion`; output `research/release-evidence/completion-audit.json` |
| `DEPLOY-EVIDENCE1` | P6C, owner release approval | Preserve the actual workflow run, deployed commit, URL, HTTP/browser checks, and rollback record; reconstruct DEPLOY1R2/R3 provenance without pretending retroactive execution | `gh run view <run-id> --json conclusion,headSha,jobs,url` and live route/browser smoke |

## 7. Dependency-ordered closure register

| Order | Gap ID | Gate | Owner/blocker | Exit condition |
|---:|---|---|---|---|
| 1 | GAP-DOC-TRUTH | G0 | docs/orchestrator | Contradictory status/routes/rights/deployment language is superseded; docs 19 is indexed |
| 2 | GAP-P4C-A11Y | G4/UX-002 | Cursor + independent reviewer | Workbook listening has an accessible equivalent without revealing answers prematurely; P4C review has zero unresolved HIGH findings |
| 3 | GAP-GERMAN-CONTENT | G1/G5 | qualified German reviewer | Exact source-row/field decisions exist for teacher rows, six verbs, grammar, dialogues/listening, plurals, aliases, and examples |
| 4 | GAP-EXTRA-VOCAB | G1/VOC-005 | Cursor after review | All 48 teacher rows are learner-visible through a separate Lesson 2 collection/filter, deduplicated, with complete forms and honest media states |
| 5 | GAP-CANONICAL-COVERAGE | G1/G3 | Cursor | Ten verbs visible; grammar/listening/concepts hubs nonempty where required; exact glossary/book/workbook/teacher/personal coverage or blocking gaps |
| 6 | GAP-GENERATED-AUDIO | G5/AUD-001 | qualified listening reviewer + media owner | Every released generated clip has listening approval; every required object maps to an approved asset or blocking gap |
| 7 | GAP-LEARNING-LOOP | G4 | Cursor | All 23 learner activity routes implement required evidence phases; seven games functional; all eligible Q&A use the ladder |
| 8 | GAP-OFFLINE | G6/UX-004 | Cursor | Versioned offline/cache policy and offline core journey pass; no private/unapproved asset cached |
| 9 | GAP-E2E-A11Y | G6 | Cursor + manual SR reviewer | Four viewports, keyboard, automated a11y, manual SR, console/external-request, and critical journeys pass |
| 10 | GAP-REPO-DEPLOY-DECISION | G-OWNER | owner | Owner accepts canonical repo/name/public URL and exact public media scope, or directs migration/private hosting |
| 11 | GAP-FINAL-EVIDENCE | G6/G-OWNER | orchestrator | Current hashes/run IDs, 49/49 proof, register missing-ID 0, known limitations, rollback, and explicit owner acceptance recorded |

Gaps 2 and 3 may proceed in parallel. Gaps 4–5 require Gap 3. Gap 6 requires the media subset determined by Gaps 3–5. Gap 7 requires published content/media contracts. Gaps 8–9 require the stable feature set. Deployment/owner acceptance is last.

## 8. Acceptance command set

Run from `platform/` unless noted:

```powershell
npm ci
npm run check
npm run build:web
npm run audit:prod
npm run smoke:web-routes
npm run smoke:dev
npm run build:pages
npm run smoke:pages
```

Run from repository root:

```powershell
node tools/validate-source-manifest.mjs
node tools/audit-alpha-tts.mjs
git diff --check
git status --short
```

Live deployment proof:

```powershell
gh run list --workflow deploy-pages.yml --limit 5 --json databaseId,headSha,status,conclusion,url
gh api repos/Hrezaii95/german-learning-exam/pages
gh run view <successful-run-id> --json conclusion,headSha,jobs,url
```

The following scripts/tests are mandatory deliverables of P6 and do not exist yet; their absence is itself an open gap:

```powershell
npm run test:e2e:offline
npm run test:e2e:release
npm run audit:completion
```

## 9. Final acceptance rule

The full goal may be called complete only when:

- every row in Section 4 is PROVEN or explicitly owner-DEFERRED;
- the 48-row teacher assignment is actually learnable, not merely encoded;
- source coverage diffs are empty or every missing field has a named blocking gap;
- all released audio has its required rights, technical, listening, and accessibility evidence;
- offline, four-viewport, accessibility, critical-journey, security, external-request, and rollback gates pass;
- `completion-audit.json` proves zero missing requirement/register IDs against current hashes;
- the owner explicitly accepts the canonical repository, deployment visibility, media scope, and remaining deferrals.

Until then, the honest state is: **live vertical slice; engineering/content/accessibility/release closure still open**.
