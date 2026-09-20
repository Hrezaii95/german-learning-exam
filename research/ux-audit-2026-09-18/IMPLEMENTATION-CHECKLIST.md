# UI/UX improvement checklist

Reference: [whole-app audit](UI-UX-AUDIT.md). Countries & languages and Home & furniture remain the design standard. This is the single task list for all 23 findings; existing completion records are retained.

## Steps at a glance

Use the checkboxes below as the completion record. Start at the first unchecked task; reuse anything already finished.

**Current checkpoint:** Steps 1–6 have recorded live verification. Step 7 is in progress: Countries/Home, People and Verbs/Questions have passed local and live verification. Next: Numbers and the remaining sheet briefs. The complete Step 7 checkpoint and Steps 8–9 remain open. Earlier completion notes are historical evidence, not instructions to repeat work.

| Step | Main task | Checkpoint before marking complete |
|---|---|---|
| 1 | Repair readability | Cards and diagrams fit phone, tablet and desktop; approved sheets remain intact. |
| 2 | Protect learning progress | Save/remove, reload, resume and a complete backup/restore round trip preserve the expected data. |
| 3 | Unify styles and actions | Colors, audio, meaning, save and filters behave consistently across representative learning views. |
| 4 | Simplify navigation | Continue and due review appear first; phone navigation and returning to prior content work. |
| 5 | Finish Professions | Find a profession, understand and hear its four forms, save it, practise it and return. |
| 6 | Improve lessons and libraries | Every lesson and library supports a clear learning path, compact browsing and accurate search. |
| 7 | Complete the 15 cheat sheets | Each sheet has a useful visual overview, explanation, audio, saving and a short recall task. |
| 8 | Connect book and listening | Read → listen → understand a phrase → save → review → return to the same book page. |
| 9 | Verify the release | Live learning journeys, accessibility, data recovery and failure states pass; limitations are recorded. |

## Working rules

- Follow the steps in order, starting with the first unfinished task. Keep existing content, working features, saved data and approved visuals.
- Fix shared components once, then reuse them. Improve existing diagrams and activities before creating replacements.
- Use this checklist as the work tracker; use the audit for detail. No additional planning documents or approval rounds are needed.
- Each checkpoint is a verification task for the implementer, not a request for user sign-off.
- Run checks relevant to each change. Run the complete release checks at the end; repeat earlier checks only when later changes affect them.

**Use the same four actions for each step:**

1. Pick the first unchecked task below; inspect what already works and change only what is missing or broken.
2. Finish a small usable batch and run the relevant checkpoint checks.
3. Publish the finished batch and verify the changed learning journey on the live site.
4. Tick only the verified tasks and add one evidence line to the completion record. Move to the next step when all its tasks and its checkpoint pass.

If a check fails, fix that batch before moving on. Keep incomplete changes out of the release. Do not restart completed steps, repeat unaffected checks, or create another tracker.

## 1. Restore readable layouts

- [x] Fix the narrow-column bug in lesson, grammar, verb and phrase cards.
- [x] Fix Countries' small-phone overflow and provide readable phone layouts for wide diagrams.
- [x] Remove content overlap from fixed navigation and dictionary controls.

**Checkpoint:** Affected pages are readable at 320, 390, 768 and 1440 pixels. No clipped controls, word-by-word paragraph wrapping or accidental horizontal page scrolling. Countries and Home still look and work as approved.

Audit coverage: A01, A12, A23; layout portion of A11.

## 2. Make saving, review and resume reliable

- [x] Make saved items, review marks, notes, quiz position and lesson section survive reloads.
- [x] Provide one complete backup/restore flow that includes both existing learning-data systems; preserve older saved data.
- [x] Make add/remove, review ratings, due status, restart, merge, replace and reset behave consistently and explain their scope.

**Checkpoint:** Save a word and concept, add a note/bookmark, answer a quiz question, and reload. Export, restore into a fresh browser profile, and recover the same data and progress. A rejected import preserves existing data. Removing an item also persists.

Audit coverage: A02, A03, A06, A22.

## 3. Standardize shared appearance and actions

- [x] Reuse the approved typography, spacing, card structure and control styles; enforce blue masculine, pink feminine, green neuter and purple plural with visible labels.
- [x] Standardize pronunciation controls and preferred speed. Use original audio when available and clearly labelled generated pronunciation otherwise; show truthful availability and useful retry states.
- [x] Standardize word/phrase lookup, opening existing cards, and save/remove across learning components.
- [x] Make lesson/concept filters, result counts and practice pools agree; clearly identify out-of-selection content.

**Checkpoint:** On a representative sheet, word card, lesson and transcript, the same actions look and behave consistently. Test a word and a selected phrase; test one lesson, combined filters and zero results. Confirm actual audio playback at the saved speed and that starting a new clip stops the previous one.

Audit coverage: A04, A05, A08, A09, A13, A17.

## 4. Simplify navigation and the starting screen

- [x] Put Continue, current lesson and due review at the top of the dashboard.
- [x] Clarify saved collection versus scheduled review versus free practice; remove duplicate review sections and confusing entry points.
- [x] Compact the mobile/tablet navigation and cheat-sheet chooser; preserve useful bottom destinations, active states and return links.

**Checkpoint:** From a phone, reach the current lesson, book, cheat sheets, listening and saved review without hunting. Back returns to the prior context. Menu opens/closes correctly and returns keyboard focus. Main content appears early on phone and tablet.

Audit coverage: A10, A11, A15.

## 5. Bring Professions up to the approved standard

- [x] Add a compact illustrated overview and memorable groups for profession-form patterns.
- [x] Reuse the shared word cards, colors, pronunciation, filters and persistent review from Steps 2–3.
- [x] Put learning content first; move detailed source/readiness information into expandable material notes.

**Checkpoint:** Find a profession, understand its masculine/feminine singular and plural forms, hear them, save it, practise it and return. Verify on desktop and phone. No conflicting audio or review status.

Audit coverage: profession-specific A04, A05, A19, A20. This is the first complete example for the remaining rollout, not another component system.

## 6. Apply the shared approach to lessons and libraries

- [x] Give all 12 lessons a consistent overview, Learn/Listen/Practise sequence, source links, checkpoint and Continue action.
- [x] Replace huge expanded vocabulary/verb/grammar/phrase lists with compact results and progressive loading. Keep every existing item accessible.
- [x] Make Concepts a useful relationship view within Grammar rather than a duplicate catalog; preserve existing links.
- [x] Improve search with meaning, article, matching context and pronunciation; cover later lessons and preserve the query on return.
- [x] Unify practice prompts, reveal/answer feedback, explanations and next actions. Correct stale coverage labels and simplify technical learner-facing copy.

**Checkpoint:** Check each lesson landing page and each library family. Find an early-lesson and a Lesson 12 item, open it, hear it, practise/save it and return without losing context. Counts match results; reading, self-rating and checked answers have distinct labels.

Audit coverage: A07, A14, A16, A19, A21, A22.

## 7. Finish the visual teaching across all 15 sheets

Use the existing tools wherever they already work. Add only the missing explanation, illustration, overview or interaction described in the audit.

- [x] **01 Countries / 02 Home:** preserve approved maps, illustrations and color trails; finish responsive, audio/save and compact-print refinements.
- [x] **03 People:** relationship tree and clear family/work sections.
- [x] **04 Verbs / 07 Questions:** person–stem–ending and sentence-position diagrams; question/answer contrasts.
- [ ] **05 Numbers:** place value, reading direction, prices and listening recall.
- [ ] **06 Conversation:** dialogue flow, du/Sie contrasts and spelling audio.
- [ ] **08 Objects / 09 Office:** illustrated objects and a desk scene connecting articles, plurals and accusative.
- [ ] **10 Hobbies / 11 Time:** ability/frequency visuals, clock and weekly planner.
- [ ] **12 Food:** illustrated menu, consistent gender colors and ordering exchange.
- [ ] **13 Travel / 14 Yesterday / 15 Seasons:** journey sequences, sentence brackets, timeline, seasonal calendar and qualified haben/sein cues.

**Checkpoint for each sheet:** A clear overview, readable explanation, useful example, pronunciation, save/remove and short recall task work on phone and desktop. The visual teaches a specific relationship. Detailed reference content is optional, and the printable summary is concise. Check off each group as it is completed; do not wait for all fifteen to publish a finished group.

Audit coverage: A07, A12, A20 and all fifteen visual briefs.

## 8. Connect the book, listening and transcripts

- [ ] Compact the reader toolbar and preserve page, view and zoom; make phone reading, selection and panning understandable.
- [ ] Create a focused recording/transcript view with speaker separation, repeat, phrase lookup/save and a return to the book exercise.
- [ ] Provide line pronunciation fallback where original line audio is unavailable; add synchronized highlighting/loops only where original timing is verified.
- [ ] Keep answer reveal deliberate and clearly distinguish official answers from study explanations.

**Checkpoint:** Complete book → recording → transcript → phrase meaning → save → review → return to the same page. Verify original playback and generated fallback separately. Reload and resume on phone and desktop.

Audit coverage: A11, A13, A17, A18 and book-reader recommendations.

## 9. Complete release verification

- [ ] Run required build/content/release checks and the route sweep, then inspect the changed live pages.
- [ ] Check keyboard navigation, focus, contrast, text enlargement, touch controls and readable alternatives to visual/drag interactions.
- [ ] Check representative slow-network, unavailable-audio, offline, empty-result and failed-import states; measure the large libraries on a constrained phone profile.
- [ ] Recheck the approved sheets, backup/restore, filters, pronunciation controls and the complete learning journey after integration. Check German labels, explanation consistency, source attribution and original/generated distinctions; do not count technical playback as pronunciation-quality approval.

**Checkpoint:** The final deployment passes the relevant checks, all 23 audit findings are accounted for, and remaining limitations are stated plainly. Record the live link and a short change summary. Do not mark an untested behavior as passed.

## Completion record

For each step, add one line here when its checkpoint passes:

`Step — completed changes — checkpoint result — live verification/link`

Step 7, Numbers batch — place-value reading order through one million, colored whole-word chunks with meaningful phone wrapping, price tags, saved number/price return links, range-based listening recall and filtered card practice. The course noun die Million is included with number tags while retaining the existing source-specific cards. Common traps and phone-digit reading are preserved. A concise one-page summary covers foundation words, tens, larger values, reading direction and prices. Local checkpoint passed on 20 September 2026: full check (959 tests and separate 620-test web run) before the final noun/word-wrap refinements; final 27 targeted tests, ten audio/dictionary inventory tests, E2E types, lint and Pages gates passed. Four final Numbers journeys and six shared-action journeys passed; the earlier eight approved-sheet/overview regressions also passed. A source-card-specific browser selector was corrected after it matched both existing Million source cards. Actual final phone/desktop views and A4/Letter PDFs inspected; both PDFs fit one page. Four new generated clips bring the collection mapping to 2,462 exact texts with existing files reused. Evidence: step-7-numbers-check.log, step-7-numbers-final-targeted.log, step-7-numbers-final-audio.log, step-7-numbers-final-gates.log, step-7-numbers-final-browser.log, step-7-numbers-source-selector.log, step-7-numbers-browser.log and step-7-numbers-local/. Live verification remains pending; Numbers is not yet checked off.

Step 7, Verbs/Questions batch — 111 published verb models with person/stem/ending explanations, labelled exceptions and separable/reflexive distinctions; sentence-position contrasts; full question-builder replies; filtered recall; exact saved-context restoration; expanded dictionary coverage and pronunciation; one-page printable summaries. Local checkpoint passed on 20 September 2026: full check (955 tests, plus the separate 616-test web run), E2E types, final Pages gates and all 13 final browser journeys, including shared dictionary/audio regressions. The preceding eight Countries/Home/overview journeys also passed. Actual A4 and Letter exports each fit one page; phone and desktop rendering inspected, with stacked verb parts refined for small phones. Collection speech maps 2,454 exact texts; 16 new clips were generated and existing clips reused. Evidence: step-7-grammar-check.log, step-7-grammar-final-gates.log, step-7-grammar-e2e-types.log, step-7-grammar-final-browser.log, step-7-grammar-browser.log and step-7-grammar-local/. Live checkpoint passed: deployment 35529952434 (commit 36b633af), full CI checks and all 21 live browser journeys. Live A4/Letter PDFs each retain one page and match the local summary text. Evidence: step-7-grammar-deployment.json, step-7-grammar-live-tests.log and step-7-grammar-live/print-check.json. Verbs/Questions are complete; the remaining Step 7 groups and Steps 8–9 stay open.

Step 7, Countries/Home and People batch — country and home practice now follows the visible selection/search/saved pool; country saves share consistent tags, including legacy recovery; full-card links return to the chosen item. People has a connected fictional family, two speaker viewpoints, a readable phone alternative, sentence/form pronunciation, saving, word-card links, focused work/family sections, filtered recall and a one-page summary. Collection browsing starts with 12 cards and preserves query/category/saved/page context on return. Twenty new generated clips complete the updated 1,897-entry collection speech inventory using existing audio where available. German sentence punctuation stays attached to its lookup word. Local checkpoint passed on 20 September 2026: 948 tests plus 609 web tests, Pages release gates, E2E types, and all 25 browser journeys. Final phone/desktop views and actual A4/Letter PDFs inspected: Countries two pages, Home one, People one. Evidence: step-7-people-final-check.log, step-7-people-release-gates.log, step-7-people-release-browser.log, step-7-people-e2e-types.log and step-7-people-local/. Live checkpoint passed: deployment 35527893530 (commit 0027eef6), full CI checks and all 25 live browser journeys. Actual live PDFs match the local summary text and page counts in both A4 and Letter; live desktop family rendering was inspected. Evidence: step-7-people-deployment.json, step-7-people-live-tests.log and step-7-people-live/print-check.json. Countries/Home and People groups are complete; the remaining Step 7 groups and Steps 8–9 stay open.

Step 7, first batch — compact Countries summary (two pages with all 41 names, flags, AUS patterns and language examples) and Home summary (one page with all 30 illustrated words, plurals and memory notes); printing preserves filters and recall; Home uses the preferred pronunciation speed unless its explicit slow override is on; shared overviews mount one set of content and preserve parent selections and native keyboard focus. Local checkpoint passed on 20 September 2026: final Pages gates, web/E2E types and lint, 17 country/home data and audio tests, five responsive browser journeys, and eight final print/audio/overview journeys. Actual Chromium PDFs from the final export pass on both A4 and Letter with 12 mm margins; rendered output and the approved screen views were inspected. Evidence: step-7-first-final-gates.log, step-7-first-browser.log, step-7-first-final-browser.log, step-7-first-e2e-types.log and step-7-first-verified/. Live checkpoint passed: deployment 35524859647 (commit f58d082a), full CI checks and all eight targeted live browser journeys. Live Chromium PDFs retain two Countries pages and one Home page on both A4 and Letter. Evidence: step-7-first-deployment.json, step-7-first-live-tests.log and step-7-first-live/print-check.json. A remaining scope mismatch was reproduced: Lesson 12 shows seven country entries and zero Home entries, but both quizzes still use their full fixed pools (step-7-remaining-scope-evidence.json). The Countries/Home group remains open for its remaining selection/save checks; the other sheet briefs and Steps 8–9 remain open.

Step 6 — shared Learn/Listen/Practise paths and source-book links across all 12 lessons; bounded word libraries and lesson word lists; compact later-lesson verb/grammar/phrase cards; grammar relationship explorer; complete later-lesson search with meaning, gender cues, matching forms, pronunciation and return context; explicit unscored recall versus checked practice. Local checkpoint passed on 20 September 2026: final Pages gates, type checks, lint, 40 targeted component tests, ten final browser journeys including all twelve lesson paths, and rendered phone/desktop inspection. The full suite passed 934 tests plus 595 web tests before the final search-snippet refinement; final targeted tests cover that refinement. Generated content and report writes now replace complete files to avoid the reproduced Windows truncation error. Live checkpoint passed for deployment 35523076449 (commit ee0d7c82): the initial sweep passed 25 journeys; the remaining tablet return check exceeded five seconds with requests still pending, then passed three consecutive runs with a 15-second network allowance. All 26 distinct journeys are verified. The final deployed commit passed 935 tests plus 596 web tests in CI. Evidence: step-6-deployment.json, step-6-live-tests.log, step-6-live-return-checks.log, step-6-check.log, step-6-final-gates.log, step-6-final-components.log, step-6-final-browser.log and step-6-local/.

Step 5 — illustrated masculine-plural groups and feminine ending trail, shared word-family previews and generated pronunciation, six initial results with access to all 48 professions and every alternative, query/filter-preserving return links, persistent optional recall, and expandable source notes. Local checkpoint passed on 20 September 2026: Pages gates, E2E types, 22 combined browser checks, and rendered 320/390/768/1440px inspection. Full check passed 924 tests plus 585 web tests; five targeted profession checks passed. Live checkpoint passed: deployment 35520145952 (commit a68d3e89), all 22 browser checks passed against https://hrezaii95.github.io/german-learning-exam/. Evidence: step-5-gates.log, step-5-check.log, step-5-browser-tests.log, step-5-live-tests.log, step-5-component-tests.log and step-5-local/.

Step 4 — compact searchable mobile/tablet menu and sheet chooser; dashboard Continue follows the last visited lesson and restores its section/quiz; due saved review is prominent; guided review has a distinct purpose; section links preserve router history; keyboard skip and menu focus work. Local checkpoint passed on 20 September 2026: Pages gates, lint, E2E type check, 21 component regressions and 17 browser checks; full earlier check passed 923 tests plus 584 web tests. The Windows artifact replacement fix passed 14 recovery tests. Phone/tablet/desktop screenshots inspected. After correcting the source-location assertion for the extracted skip link, all 22 shell contract tests passed. Live checkpoint passed: deployment 35519327130 (commit f10bf5ba), all 17 browser checks passed against https://hrezaii95.github.io/german-learning-exam/. Evidence: step-4-gates.log, step-4-browser-tests.log, step-4-live-tests.log, step-4-component-regression.log, step-4-build-recovery-tests.log and step-4-local/.

Step 1 — layout repairs, responsive diagram steps and toolbar dictionary implemented. Local checkpoint passed on 20 September 2026: Pages gates, 20 component tests, five browser tests across 320/390/768/1440px, and rendered screenshot inspection. Live checkpoint passed against deployment 35512028844 (commit 9a3c9c11): https://hrezaii95.github.io/german-learning-exam/. Evidence: step-1-live/verification.json. Steps 3–9 remain open.

Step 2 — complete backup/restore with merge, replace and reset; persistent lesson quizzes and profession review marks; current-note conflict handling; responsive import preview. Local checkpoint passed on 20 September 2026: 27 targeted tests, seven browser checks including a fresh-profile backup round trip, review ratings/due dates, malformed import, removal, replacement, reset and Lesson 4/12 resume. Pages gates, type checks, lint and rendered phone/desktop inspection passed. Evidence: step-2-tests.log, step-2-browser-tests.log, step-2-gates.log and step-2-local/. Live checkpoint passed: deployment 35513901094 (commit fbad08ee), seven browser checks against https://hrezaii95.github.io/german-learning-exam/. Evidence: step-2-live-tests.log. Full local check: 916 tests and publication validation passed, followed by 577 web tests. Step 3 is in progress.

Step 3, first batch — shared persisted audio speed across book/listening/word cards/generated speech, common stop behavior, truthful inline profession audio and shared filters, purple Food plurals, inherited control fonts, keyboard word/phrase lookup and explicit external translation labels. Local Pages gates and ten browser checks passed, including real generated/original playback, cross-page speed persistence, scope/search/review-pool agreement and keyboard focus return. Targeted component tests, type checks, lint and phone/desktop screenshot inspection passed. Evidence: step-3-gates.log, step-3-browser-tests.log, step-3-tests.log, step-3-shared-tests.log and step-3-local/. First-batch live checkpoint passed: deployment 35515047891 (commit 690f3adc), ten live browser checks; evidence: step-3-first-live-tests.log. The full Step 3 checkpoint remains open until the final batch is verified live.

Step 3, final batch — light word-family cards, shared dictionary/save identity in previews and profession lists, transcript line pronunciation/meaning/save, preferred-speed preview playback and retry, and context-correct example colors. Local Pages gates, 13 browser checks, 15 targeted component tests, type checks, lint and rendered phone inspection passed. Evidence: step-3-final-gates.log, step-3-final-browser-tests.log, step-3-final-regression.log and step-3-final-local/. Final-batch live checkpoint passed: deployment 35516537822 (commit 544c6a28), all 13 browser checks passed against https://hrezaii95.github.io/german-learning-exam/. Evidence: step-3-final-live-tests.log. Step 3 is complete; Step 4 is in progress.
