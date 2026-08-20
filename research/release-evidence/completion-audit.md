# P6-03 — Requirement and register final diff

**Machine-readable source of truth: `research/release-evidence/completion-audit.json`.**
This page says the same things in prose. Where they differ, the JSON wins.

Audited 2026-08-20 by Claude Code, read-only. No application source was changed, no build was
run, no git operation was performed. Every number below was measured from files on disk during
this run — not copied from a plan that claimed it.

> **Concurrency note.** Two items that were open when this audit began were closed by other
> agents while it ran, and both are reflected below: live service-worker verification landed on
> disk, and the end-to-end suite moved from 33-passed/3-failed to a reported 36/36 green. This
> audit read and checked those artifacts; it did **not** re-execute the browser session or the
> Playwright run behind them, and says so wherever it relies on them.

---

## The headline

> **Requirements** 32 met · 17 partial · 0 unmet · of 49
> **Register** 23 completed · 1 in review · 5 pending · of 29 rows
> **Gates** 10 of 10 scripted green (9 verified here, 1 reported) · **0 of 5 human gates closed**

The content graph, the learning engine and the scripted gate layer are in good, measurable
shape. The learner-facing product has real, named holes in filtering, activity-to-concept
wiring, examples and morphology data. **Nothing that requires a human has been done** — no
German review, no pronunciation listening, no screen-reader pass, no owner acceptance — and no
amount of green scripted output changes that.

---

## 1. Requirement coverage — the id-set diff

`docs/02-product-requirements.md` declares **49 requirements**:
LRN 6 · LES 5 · VOC 5 · VER 3 · GRM 2 · PQA 4 · AUD 6 · HUB 3 · REV 4 · DAT 5 · UX 6
→ 6+5+5+3+2+4+6+3+4+5+6 = **49**.

Cross-check: the id set in `docs/18-requirement-traceability.md` is also 49, and the symmetric
difference between the two documents is **empty**.

*Keyword note:* 48 of the 49 are **MUST**; exactly one, **UX-004** (offline), is **SHOULD**.
`docs/02` says "Each MUST is a release gate", so by the spec's own rule UX-004 is not one.
`docs/18`'s change history calls all 49 "MUST requirement IDs" — inaccurate by one.

**Completeness proof (required = covered ∪ open):**

| bucket | count | ids |
|---|---|---|
| covered (met) | **32** | LRN-002/003/004/005/006 · LES-004 · VOC-002 · VER-002/003 · PQA-001/003/004 · AUD-001/002/003/004/005/006 · HUB-001/003 · REV-001/002/003/004 · DAT-001/002/003/004/005 · UX-003/**004**/006 |
| open (partial) | **17** | LRN-001 · LES-001/002/003/005 · VOC-001/003/004/005 · VER-001 · GRM-001/002 · PQA-002 · HUB-002 · UX-001/002/005 |
| unmet | 0 | — |
| out of alpha scope | 0 | — |

**32 + 17 + 0 + 0 = 49.** No id appears in two buckets. No id falls outside the union.

### The 17 partials, in one line each

| id | what is measurably missing |
|---|---|
| LRN-001 | `LearningActivity.phases[]` (the contract docs/18 declares) does not exist; **23 of 24 activities have `conceptIds: []`**; no Repeat/Feedback/Master activity mode |
| LES-001 | 5 of 7 dashboard elements — **weak skills** and **recent items** have no section at all |
| LES-002 | lesson:01 has **no Review stage** (5 stages, not 6); on the learner surface *neither* lesson renders a Review stage |
| LES-003 | overview shows objectives + time + activity count, but **no counts by source priority** and **no required teacher extras** |
| LES-005 | lesson backlinks complete (104/104), **activity backlinks 0/104** |
| VOC-001 | **0 example sentences exist anywhere**; 0/48 nouns carry a plural *pattern* |
| VOC-003 | 0/48 nouns carry plural patternIds or morphology ops; 2 of the 7 infographic families never reach the learner bundle |
| VOC-004 | 0/69 lexemes carry `cardTemplateIds`; 6 of 7 game modes playable (audio-match honest-unavailable) |
| VOC-005 | no "Teacher extra" filter exists; the whole collection is review-gated; hub categories are parts of speech, not the 7 semantic groups |
| VER-001 | 0/10 verbs carry examples, grammar links or card templates; 6 of 10 have no audio |
| GRM-001 | 0/10 grammar concepts link an activity; 0/10 carry typed examples |
| GRM-002 | `gram:und-linking-l1` never encoded (10 of 11) |
| PQA-002 | QAPair has **no slots field**; 0/15 grammar links; 0/15 audioIds at the content layer |
| HUB-002 | filter state is `{q, lesson, category}` — **2 of the 6 required scope filters**; hubs do not default to learned/unlocked |
| UX-001 | **no viewport dimension appears in any test file**; Playwright is Desktop Chrome only; the 360/390/820/1440 claim is prose |
| UX-002 | **no axe or equivalent scanner exists anywhere in the repo**; no keyboard-journey automation; no human screen-reader pass |
| UX-005 | **mastery is absent** from the search document and from rendered results — 3 of 4 dimensions |

### The strongest met requirements (scripted, not asserted)

- **DAT-002** — 373 of 373 published fields resolve to a real `SourceAssertion` carrying
  location, extraction, confidence and status. Not a sample; every field.
- **DAT-001** — 1307 records, **1307 distinct ids, 0 duplicates**; 309 typed relationships,
  **0 unresolved endpoints**.
- **DAT-003** — the 8 professions in both the core Lesson 2 set and the teacher collection
  (Friseur, Architekt, Lehrer, Kellner, Verkäufer, Arzt, Ingenieur, Journalist) resolve to
  **one canonical record each**, referenced from both.
- **VER-003 / PQA-003** — verb and Q&A-intent id-set diffs are now **empty** (10/10 and 15/15),
  closing what the 2026-08-14 curriculum diff recorded as 4/10 and 14/15.
- **UX-004** — offline is **live-verified**: the worker registers, activates and controls the
  deployed page, and `/vocabulary/` is genuinely stored in an 85-entry shell cache (315,824
  bytes, title matched). Moved partial → met during this audit.
- **HUB-003** — exactly the five required tags plus a personal note, surviving export → reset →
  import.

---

## 2. Register diff

29 rows in `plans/full-alpha-register.csv`. Every declared artifact path exists on disk.
12 rows declare a re-measurable count and **12 of 12 match**. 13 rows declare count 0 or 1
(an existence check). **3 rows have a numeric delta; 3 rows carry a status that disagrees
with disk.**

| row | declared | measured | delta |
|---|---|---|---|
| P0-02 | 1 | source manifest **456 files** (was 397 at P0) | 0 |
| P0-04 | 49 | **49** requirement ids, symmetric diff empty | 0 |
| P1-04 | 48 | **48** teacher source rows (86 fragment lexemes, all `review`) | 0 |
| P1-05 | 24 | **24** records present, **23 published** | 0 records / **−1 published** |
| P1-06 | 15 | **15** assets, all published, 6 exercise refs covering all 4 required exercises | 0 |
| P3-01 | 24 | **23** activity routes exported (the 24th intentionally 404s) | **−1** |
| P3-02 | 6 | **6** hubs — vocab 69, verbs 10, grammar 10, phrases 64, listening 15, concepts 6 topics | 0 |
| P4-01 | 7 | **7** game ids, asserted exact at runtime | 0 |
| P4-02 | 5 | **5** ladder levels, "centralized, ordered, immutable" | 0 |
| P5-01 | 1 | 354 = 354 = 354, 0 technical failures, **354/354 awaiting listening review** | 0 |
| P5-02 | 6 | **7** families on disk; **only 3 shipped** to the learner bundle | **+1** |
| P5-03 | 2 | 6 report files present; the two *human* passes not performed | 0 |

**P6-02** moved from 2 of 4 dimensions to **3 of 4** during this audit (accessibility, offline,
E2E have artifacts; responsive has none).

### Three status disagreements — flagged, not smoothed

1. **P5-02** says `completed, count 6`. Disk holds **7** infographic families, and only **3**
   reach `public/infographics`. "Completed 6" simultaneously overstates delivery and
   understates authoring.
2. **P6-01** says `pending`. All three of its scripted gate artifacts exist and report
   `gate: pass`. The row legitimately cannot close (it depends on P5-03, a genuine human gate),
   but bare "pending" misrepresents what is on disk.
3. **P0-01 → `docs/17-current-state-and-completion-matrix.md`** says `completed`, and it is —
   as a *frozen 2026-08-07 baseline written against the sample app*. Read as current state it
   is badly wrong: it records LRN-003, REV-002, DAT-002, DAT-003, LES-004 as Missing and
   "Concepts hub is missing". All six are now met and measured. **This file supersedes it.**

**P6-03 (this artifact)** did not exist before this run and now does. Its register status is
deliberately *not* changed here: its dependencies P6-01 and P6-02 are both still open, and an
executing session must not ratify its own completion.

---

## 3. Gates

### Scripted — 10 of 10 green (9 verified here, 1 reported)

| gate | what it computes | result |
|---|---|---|
| `npm run check` | typecheck ×3 + eslint(0 warnings) + vitest + validate:publication | **green** — 659 tests, 357 web |
| `npm run build:pages` | static export under the Pages base path | **green** — 205 pages, 1369 files |
| `npm run smoke:pages` | HTTP smoke over the computed canonical route set + asserts projection counts | **green** — 49 routes |
| `audit-learner-language.mjs` | 8 learner-language rules over every exported HTML file | **pass** — 205 files, **0 findings** |
| `audit-offline-export.mjs` | SW version stamping, precache fetchability, base-path, webmanifest | **pass** — 87 precache / 4.35 MB / 19 nav routes / **0 failures** |
| `audit-attribution.mjs` | ADR-016 credit for 7 required works, nav-reachable | **pass** — **0 failures** |
| `audit-alpha-tts.mjs` | exact manifest/disk bijection + SHA-256/codec/rate/duration | **green** — **354 = 354 = 354** |
| `validate-source-manifest.mjs` | one-file-one-hash source integrity | **green** — **456 files** |
| `assert-no-build-intermediate.mjs` | pre-commit refusal of build-intermediate state | **green** |
| `npm run test:e2e` | 12 journey specs against the served export (31 static `test(` call sites) | **reported 36/36 green** by a concurrent agent — *not executed by this audit* |

Three of these were **fixture-tested to reject a known-bad input**, and one guard was caught
giving a *false pass* by its own fixture test. The E2E suite likewise earned its keep on first
run: it found a real product defect — the resume pointer was overwritten on every mount, so no
stored pointer survived a reload and **Continue always sent the learner backwards** — now fixed
behind a guard proven non-vacuous (3 of 4 guard cases fail when the fix is disabled). This gate
layer has demonstrated it can fail something real, which is what makes the green meaningful.

**But the E2E suite is not on the release path.** `playwright.config.ts` states the boundary
explicitly: it is deliberately outside `npm run check` and absent from `gates:pages`. A passing
suite nobody runs before a deploy protects nothing.

### Human-judged — 0 of 5 closed

| gate | state |
|---|---|
| Gate 1 — German spelling/forms review | **OPEN** — 86 of 86 teacher lexemes still `review` |
| Gate 2 — pronunciation acceptance (2 listening passes) | **OPEN** — 0 of 354 clips listened to |
| Gate 5 — accessibility human half (keyboard, screen reader, zoom) | **OPEN** — never performed |
| Gate 6 — responsive/visual baselines | **OPEN** and unautomated |
| Gate 7 — independent review + clean worktree | **PARTIAL** — reviews returned APPROVE; worktree dirty |

---

## 4. Still open — 10 live items (2 closed during the audit)

| # | item | owner | why no agent can close it |
|---|---|---|---|
| 1 | **G5 qualified German listening approval** of the synthetic voice | human listener | Perceptual judgement about speech. 354/354 clips are `candidate-needs-listening-review`. Untouched by ADR-015/016 — those are *rights* decisions, this is *pedagogy*. |
| 2 | **Teacher-deck German review** (86 lexemes) | German reviewer | Language judgements with a preservation constraint: slash alternatives, a lexical pair that isn't a suffix pair, a collective plural, and forms like *Putzmann* that must be preserved, not silently corrected. |
| 3 | **ADR-013 `verb:leben` derived gloss** | owner | Recorded "Accepted with owner-revisit flag". Publishing a derived gloss as verbatim overstates the source; withholding understates coverage. Only the owner rules. Reverting = one line + rebuild. |
| ~~4~~ | ~~Live service-worker registration~~ | — | **CLOSED during this audit** by `offline-live-verification.json`. Residual: 85 live vs 87 local shell entries (Windows/Linux path shape, every live URL resolves), and cached **audio** playing offline is still unproven. |
| 5 | **`gram:und-linking-l1` never encoded** | content agent → German gate | Encodable, but unmade curriculum work, and new German re-enters gate #2. |
| 6 | **18 spec phrases/lexemes unencoded** | content agent → German gate | 0 of 18 present anywhere. Includes three whole inventories: the alphabet, typed pronouns, numbers 0–100. Six published activities carry substance caveats because of it. 0 Dialogue records exist. |
| 7 | **Unadjudicated P6-02 leads** | re-run adjudication | Verification stopped after 24 of 102 agents. 48 raw → 7 confirmed, 41 refuted. The rest are *leads, not facts* — and at an 85% rejection rate, most are probably wrong, which is exactly why they can't be acted on unverified. Delivery weight (PNG size, font subsetting, per-route bundles) remains unverified. |
| ~~8~~ | **E2E green but off the release path** | e2e-triage agent | **PARTIALLY CLOSED** — reported 36/36. Still open: not wired into `check` or `gates:pages`; chromium only; not independently verified here. |
| 9 | **Responsive baselines have no artifact** | implementable, then sign-off | `1440`/`820`/`390`/`360` appear in **0 test files**. The claim lives only in prose. |
| 10 | **No a11y scanner; no screen-reader pass** | implementable + human | Repo-wide search for axe/jest-axe/@axe-core returns 0 real hits. `A11Y-AUTO-01` and `A11Y-KEYBOARD-01` are unimplemented. |
| 11 | **7 concepts have no audio (stale coverage manifest)** | media pipeline → gate #1 | *New, first measured here.* 97 of 104 details have audio; the 7 without are exactly the ADR-013 wave (6 verbs + `qa:work-casual-main`). The coverage manifest still reports **97/97 and `unmappedDetails: 0`** — a full-coverage report about a content set that has since grown to 104. |
| 12 | **P6-04 owner acceptance** | owner | By definition. |

---

## 5. Drifts worth a decision row

- **Transcript rights wording vs ADR-016.** `workbook-transcripts-lessons-01-02.json` still
  declares `rightsStatus: "not-separately-approved-for-public-redistribution"` and
  `publicationBlocked: true`, wording that predates ADR-016's full-rights-with-attribution
  grant. This is the project's own most expensive recorded failure mode — an old, well-encoded
  decision silently outvoting a newer one. *Note the correct behaviour may be unchanged anyway*:
  the product also withholds transcripts for a pedagogical reason (an authentic listening task
  withholds the answer). That is an owner call, not an agent edit.
- **`docs/18` LRN-001 contract vs the schema.** The traceability doc declares
  `LearningActivity.phases[]`; the implementation has a single `mode` per activity. One should move.
- **`docs/18` calls all 49 ids MUST.** 48 are; UX-004 is SHOULD. Anyone counting release gates
  from docs/18 would count 49 where the specification defines 48.
- **Stale TTS coverage manifest** reporting 97/97 for a 104-concept content set (item 11 above).
- **`PLAN-BATON` "Current verified facts"** still reads *verbs 10/4 published*, *listening 0/4*,
  *details 97*. Its own worker log rows below record the later waves correctly; the summary
  bullet above them was never updated.

---

## 6. What to do with this

**Do not read this file as permission to release.** It is the diff, not the acceptance.

1. The highest-value unblocked item is the **human German pass** — it gates the teacher deck,
   the 24th activity, the 24th route, VOC-005, and every future content wave.
2. **Wire the E2E suite onto the release path.** It is green and it has already caught a real
   learner-facing defect, but nothing forces it to run before a deploy.
3. Regenerate the 7 missing TTS clips **and** replace the static coverage manifest with a gate
   that re-derives coverage from the current detail set, so this staleness cannot recur.
4. Add a viewport-matrix Playwright project and an automated a11y scan. Both are implementable
   and both convert prose claims into re-runnable evidence.
5. Reconcile the transcript-rights wording as an explicit decision row.

Live build: <https://hrezaii95.github.io/german-learning-exam/>
