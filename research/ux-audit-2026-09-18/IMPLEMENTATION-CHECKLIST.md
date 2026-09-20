# UI/UX improvement checklist

Reference: [whole-app audit](UI-UX-AUDIT.md). Countries & languages and Home & furniture remain the design standard. This is the single task list for all 23 findings; existing completion records are retained.

## Working rules

- Follow the steps in order, starting with the first unfinished task. Keep existing content, working features, saved data and approved visuals.
- Fix shared components once, then reuse them. Improve existing diagrams and activities before creating replacements.
- Use this checklist as the work tracker; use the audit for detail. No additional planning documents or approval rounds are needed.
- Each checkpoint is a verification task for the implementer, not a request for user sign-off.
- Run checks relevant to each change. Run the complete release checks at the end; repeat earlier checks only when later changes affect them.

**Repeat this simple loop:** implement a small complete batch → run its relevant checkpoint checks → publish and verify live → tick the completed tasks and add one evidence line. If a check fails, fix that batch before moving on. Do not restart completed steps or create another tracker. Keep incomplete changes out of the release.

## 1. Restore readable layouts

- [x] Fix the narrow-column bug in lesson, grammar, verb and phrase cards.
- [x] Fix Countries' small-phone overflow and provide readable phone layouts for wide diagrams.
- [x] Remove content overlap from fixed navigation and dictionary controls.

**Checkpoint:** Affected pages are readable at 320, 390, 768 and 1440 pixels. No clipped controls, word-by-word paragraph wrapping or accidental horizontal page scrolling. Countries and Home still look and work as approved.

Audit coverage: A01, A12, A23; layout portion of A11.

## 2. Make saving, review and resume reliable

- [ ] Make saved items, review marks, notes, quiz position and lesson section survive reloads.
- [ ] Provide one complete backup/restore flow that includes both existing learning-data systems; preserve older saved data.
- [ ] Make add/remove, review ratings, due status, restart, merge, replace and reset behave consistently and explain their scope.

**Checkpoint:** Save a word and concept, add a note/bookmark, answer a quiz question, and reload. Export, restore into a fresh browser profile, and recover the same data and progress. A rejected import preserves existing data. Removing an item also persists.

Audit coverage: A02, A03, A06, A22.

## 3. Standardize shared appearance and actions

- [ ] Reuse the approved typography, spacing, card structure and control styles; enforce blue masculine, pink feminine, green neuter and purple plural with visible labels.
- [ ] Standardize pronunciation controls and preferred speed. Use original audio when available and clearly labelled generated pronunciation otherwise; show truthful availability and useful retry states.
- [ ] Standardize word/phrase lookup, opening existing cards, and save/remove across learning components.
- [ ] Make lesson/concept filters, result counts and practice pools agree; clearly identify out-of-selection content.

**Checkpoint:** On a representative sheet, word card, lesson and transcript, the same actions look and behave consistently. Test a word and a selected phrase; test one lesson, combined filters and zero results. Confirm actual audio playback at the saved speed and that starting a new clip stops the previous one.

Audit coverage: A04, A05, A08, A09, A13, A17.

## 4. Simplify navigation and the starting screen

- [ ] Put Continue, current lesson and due review at the top of the dashboard.
- [ ] Clarify saved collection versus scheduled review versus free practice; remove duplicate review sections and confusing entry points.
- [ ] Compact the mobile/tablet navigation and cheat-sheet chooser; preserve useful bottom destinations, active states and return links.

**Checkpoint:** From a phone, reach the current lesson, book, cheat sheets, listening and saved review without hunting. Back returns to the prior context. Menu opens/closes correctly and returns keyboard focus. Main content appears early on phone and tablet.

Audit coverage: A10, A11, A15.

## 5. Bring Professions up to the approved standard

- [ ] Add a compact illustrated overview and memorable groups for profession-form patterns.
- [ ] Reuse the shared word cards, colors, pronunciation, filters and persistent review from Steps 2–3.
- [ ] Put learning content first; move detailed source/readiness information into expandable material notes.

**Checkpoint:** Find a profession, understand its masculine/feminine singular and plural forms, hear them, save it, practise it and return. Verify on desktop and phone. No conflicting audio or review status.

Audit coverage: profession-specific A04, A05, A19, A20. This is the first complete example for the remaining rollout, not another component system.

## 6. Apply the shared approach to lessons and libraries

- [ ] Give all 12 lessons a consistent overview, Learn/Listen/Practise sequence, source links, checkpoint and Continue action.
- [ ] Replace huge expanded vocabulary/verb/grammar/phrase lists with compact results and progressive loading. Keep every existing item accessible.
- [ ] Make Concepts a useful relationship view within Grammar rather than a duplicate catalog; preserve existing links.
- [ ] Improve search with meaning, article, matching context and pronunciation; cover later lessons and preserve the query on return.
- [ ] Unify practice prompts, reveal/answer feedback, explanations and next actions. Correct stale coverage labels and simplify technical learner-facing copy.

**Checkpoint:** Check each lesson landing page and each library family. Find an early-lesson and a Lesson 12 item, open it, hear it, practise/save it and return without losing context. Counts match results; reading, self-rating and checked answers have distinct labels.

Audit coverage: A07, A14, A16, A19, A21, A22.

## 7. Finish the visual teaching across all 15 sheets

Use the existing tools wherever they already work. Add only the missing explanation, illustration, overview or interaction described in the audit.

- [ ] **01 Countries / 02 Home:** preserve approved maps, illustrations and color trails; finish responsive, audio/save and compact-print refinements.
- [ ] **03 People:** relationship tree and clear family/work sections.
- [ ] **04 Verbs / 07 Questions:** person–stem–ending and sentence-position diagrams; question/answer contrasts.
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

Step 1 — layout repairs, responsive diagram steps and toolbar dictionary implemented. Local checkpoint passed on 20 September 2026: Pages gates, 20 component tests, five browser tests across 320/390/768/1440px, and rendered screenshot inspection. Live checkpoint passed against deployment 35512028844 (commit 9a3c9c11): https://hrezaii95.github.io/german-learning-exam/. Evidence: step-1-live/verification.json. Step 2 is in progress; Steps 3–9 remain open.

Step 2 — complete backup/restore with merge, replace and reset; persistent lesson quizzes and profession review marks; current-note conflict handling; responsive import preview. Local checkpoint passed on 20 September 2026: 27 targeted tests, seven browser checks including a fresh-profile backup round trip, review ratings/due dates, malformed import, removal, replacement, reset and Lesson 4/12 resume. Pages gates, type checks, lint and rendered phone/desktop inspection passed. Evidence: step-2-tests.log, step-2-browser-tests.log, step-2-gates.log and step-2-local/. Live verification pending; tasks remain unchecked until it passes.
