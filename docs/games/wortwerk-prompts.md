# Wortwerk prompts

Two ready-to-paste prompts for the master game in [master-game-design.md](master-game-design.md):

1. **Screens prompt**: for ChatGPT image generation, one screenshot per view and state.
2. **Spec, build and deploy prompt**: for a coding agent (Claude Code or Codex) working in this repository.

---

## Prompt 1: every screen as a separate screenshot

````
I'm designing a German vocabulary game called "Wortwerk" inside an app called "German Learning OS". I need a SEPARATE mockup image for every screen and state listed below: 35 images in total.

HOW TO WORK
- Generate ONE image per reply, in the numbered order below. Put the number and name above it, e.g. "07 · Word token detail".
- After each image, wait for me to type "next". If I type "redo", regenerate the same screen.
- Every image: mobile portrait 1024x1536, flat screenshot, no phone frame, no hands, no perspective.

SHARED STYLE (identical on every screen)
- A calm, premium learning app. Warm cream background #F3EFE8. Cards: off-white #FFFDF8, thin warm-grey border #E4DDD2, 16px rounded corners, very soft shadow.
- Text: deep green-black #203536. Bold, tight, modern sans-serif headings (like Inter Display Bold); regular sans-serif body; small-caps eyebrow labels in letter-spaced grey #596660.
- German gender colours are the core system and must always come with the article word, never colour alone: der = blue #245FA7, die = raspberry red #B82E4C, das = green #237149, plural = purple #8C4DAA.
- Noun illustrations: simple single-colour outline icons (2px line, rounded caps, no fill, no gradient, no 3D, no faces) in the gender colour inside a soft pale circle.
- Plural endings sit in a small butter-yellow chip #F8E1A1 with an amber underline #B27B19. Umlaut vowels sit in a small lavender chip #DFD6F2 with a violet underline #8760AF.
- Primary buttons: dark green #345D4C pills with white text. Secondary buttons: off-white pills with a thin border.
- Streak icon: a small orange flame. XP: a small green spark.
- Bottom tab bar on every screen: dark indigo #211A3D with five white line icons labelled Play, Map, Review, Sheets, Menu. "Play" is active with a lavender pill.
- Mood: editorial, uncluttered, generous white space, like a printed study sheet that became interactive. No mascots, no confetti, no neon, no dark mode, no leaderboards, no gems or shop.
- Spell all German text EXACTLY as written, including ä, ö, ü.

SCREENS

A · Daily habit
01 · Home / check-in: flame "🔥 12 days", a row of 7 day dots (Mon–Sun, 5 filled, today glowing), a daily goal ring "Daily Run 0 / 1", a card "Word of the day" showing a blue outline of glasses, "die Brille → die Brillen" (the "n" in a yellow chip) and a speaker button, a big button "Start Daily Run · 6 min", and below it a small map preview "214 / 660 nouns".
02 · Streak calendar: heading "Your streak", a month calendar with filled days, two snowflake-shaped freeze icons labelled "2 freezes saved", "Longest streak: 31 days", and the note "Earn a freeze every 7 days in a row".
03 · Freeze earned: a centred card with a snowflake icon, "Streak freeze earned", "It protects your streak for one missed day.", and a button "Nice".
04 · Reminder settings: heading "Reminder", a time picker showing "19:30", a toggle "One gentle reminder a day" (on), a preview notification "3 words are ready for you", and a "Daily goal" picker with options "1 Run", "2 Runs", "3 Runs".

B · The map
05 · Full map: heading "Gender × plural", progress "214 / 660 nouns", a 3-column grid "der / die / das" with row labels "-s", "-e", "-(e)n", "—", "-er", "Umlaut only", "Umlaut + -e", "Umlaut + -er", "-in → -innen". Cells hold small round tokens at different levels: grey silhouette, outline, half filled, filled, gold ring. A legend at the top: "New · Seen · Known · Solid · Mastered · Gold".
06 · Cell detail: heading "die × -(e)n", "138 nouns · 61 mastered", a list of token rows such as "die Lampe → die Lampen", "die Tasche → die Taschen", "die Uhr → die Uhren", each with a level ring, and a button "Practise this cell".
07 · Word token detail: a card for "der Stuhl → die Stühle" (the "ü" lavender, the "e" yellow) with a blue chair outline, two speaker buttons "Singular" and "Plural", three skill bars "Meaning", "Gender", "Plural", the label "Level 3 · Solid", "Next review: in 4 days", and a link "Open in cheat sheet".
08 · Row complete: a calm celebration card, a badge with a gold outline "Umlaut + -er", "21 / 21 mastered", a rule card "Umlaut + -er: das Buch → die Bücher, das Haus → die Häuser, der Mann → die Männer", and buttons "Save rule card" and "Back to map".

C · Daily Run: Four Corners
09 · Run intro: heading "Today's run", a short reason line "8 due · 4 tricky · 6 new · 2 listening", an estimated time "≈ 6 min", and a button "Go".
10 · Meaning corners: progress "3 / 20", combo "×3". A centre card with a blue chair outline, "der Stuhl" and a speaker icon, shown mid-drag with a faint motion trail toward the top-right corner. The four screen corners hold rounded targets "chair", "table", "door", "lamp".
11 · Reverse meaning corners: the centre card shows only a picture of a lamp and the English word "lamp"; the four corners show "die Lampe", "die Tasche", "die Uhr", "die Tür".
12 · Gender corners: the centre card shows a picture and the bare word "Lampe". Corners: "der" (blue, top-left), "die" (raspberry red, top-right), "das" (green, bottom-left), "plural" (purple, bottom-right). Each corner shows the article word in large letters.
13 · Plural-pattern corners: the centre card shows "der Stuhl"; the corners hold pattern chips "-e", "Umlaut + -e", "-(e)n", "-s".
14 · Plural-form corners: the centre card shows "das Buch"; the corners hold spellings "die Buche", "die Bücher", "die Buchs", "die Büchen".
15 · Correct answer: the "die Bücher" corner is lit softly green with a check mark, the card is snapping into it, and a small strip at the bottom reads "das Buch → die Bücher" with a speaker icon playing.
16 · Wrong answer: the card has bounced back to the centre, the chosen corner shows a thin grey cross, the correct corner "Umlaut + -e" is outlined in dark green, and a calm note reads "der Stuhl → die Stühle · This word comes back in a moment."
17 · Hint ladder: a bottom sheet with four steps "1 Hear it again" (used), "2 Show the pattern", "3 First changed letter", "4 Show answer", and the note "Hints are fine; they just count a little less."

D · Listening
18 · Listening corners: no text on the card, only a large speaker with a waveform and a "0.75×" toggle. Corners show pictures: one apple, three apples, one chair, three chairs.
19 · Article ear: heading "Singular or plural?", a speaker card playing "die Lehrer", and two large targets: "one person" (a single outline figure) and "several people" (three outline figures). The note: "The noun doesn't change. Listen to the article."
20 · Dictation: a speaker card, a text field containing "die Äpf", an on-screen helper row of keys "ä", "ö", "ü", "ß", and a button "Check".
21 · Minimal pairs: heading "Which one did you hear?", two cards "die Mutter" and "die Mütter" (the "ü" in a lavender chip), and a replay button.

E · Production
22 · Forge: label "BUILD THE PLURAL", heading "das Buch" with a green book outline, letter tiles "die B ü ch e r" with "ü" lavender (dots snapping on) and "e r" in yellow chips. Shelves below: "Umlaut" (ä, ö, ü) and "Ending" (-e, -n, -en, -er, -s, none). A button "Check" and the sentence line "Ich habe drei ____."
23 · Echo: heading "Say it", the target "die Äpfel", a large dark green record button (recording, with a pulsing ring), two waveform rows "Model" and "You", pill buttons "✓ Close" and "↻ Again", and a tiny grey label "Preview voice".

F · Muster-Detektiv
24 · Case board: heading "What's the pattern?", label "CASE 1 · FEMININE NOUNS", six raspberry-red cards "die Lampe → die Lampen", "die Tasche → die Taschen", "die Uhr → die Uhren", "die Wohnung → die Wohnungen", "die Flasche → die Flaschen", "die Tür → die Türen" (endings in yellow chips), and three answer cards, the first selected: "Most die nouns add -(e)n", "All nouns add -s", "die nouns never change".
25 · Case solved: "Case solved", a rule card "Most die nouns add -(e)n", a check "die Brille → die Brillen ✓", an exception card "die Mutter → die Mütter: learn the pair", and the line "2× XP on this row for 7 days".

G · Challenges
26 · Blitz playing: a 60-second timer bar (about one third left), strikes "✕ ✕ ○", score "18", a thin grey ghost bar "Yesterday: 21", and a centre card "das Kind" with corners "-e", "-er", "-s", "-(e)n".
27 · Blitz over: "Time's up", "Score 23 · New personal best", a comparison bar "You 23 / Yesterday 21", a list "Missed: das Kind → die Kinder", and buttons "Play again" and "Back".
28 · Daily puzzle: heading "Tagesrätsel · 22 Oct", "Same 6 words for everyone today", six cards in a 2×3 grid "Tisch", "Lampe", "Kind", "Apfel", "Lehrerin", "Auto", each with small der/die/das buttons and a plural field.
29 · Puzzle result: "5 / 6 solved", a 2×3 grid of coloured squares (blue, red, green, blue, red, green, one grey), and buttons "Share result" and "See answers".
30 · Weekly quests: heading "This week", three quest cards with progress bars: "Hear 50 plurals 38 / 50", "Forge 10 umlaut plurals 4 / 10", "Clear the -in → -innen row 52 / 74", and the line "Quests are picked from your weakest rows."

H · Progress
31 · Run results: "Daily Run complete", accuracy "18 / 20", best combo "×9", XP "+120", "🔥 13 days", a row "4 words levelled up" showing four tokens, and a button "Back to map".
32 · Level-up moment: one large token "das Haus" (green house outline) animating from half to full fill, the label "Level 3 · Solid", "die Häuser" with "ä" lavender and "er" yellow, and the note "You remembered it on a new day."
33 · Badges: heading "Pattern badges", a grid of 10 round outline badges named after the rows ("-s", "-e", "-(e)n", "—", "-er", "Umlaut only", "Umlaut + -e", "Umlaut + -er", "-in → -innen", "Other"), with 3 earned (coloured) and 7 still outlined grey with progress like "38 / 104".
34 · Tricky words: heading "Tricky words", "12 words you missed recently", a list of rows "der Schlüssel → die Schlüssel", "die Mutter → die Mütter", "das Café → die Cafés", each with a small miss count, and a button "Practise these".
35 · Skills overview: heading "Your skills", five labelled bars "Meaning 88%", "Gender 74%", "Plural 61%", "Listening 57%", "Spelling 49%", a note "Separate skills, not one score", and a small line chart "Words remembered over 30 days".

Start with 01.
````

---

## Prompt 2: specification, build and deployment

````
You are implementing "Wortwerk", the master vocabulary game, in the German Learning OS repository (Hrezaii95/german-learning-exam). Work as the repository's orchestrator, under its own rules.

## 0 · Read first, in this order
1. `CLAUDE.md` and everything it lists (takeover handoff, operating model, org chart, PLAN-BATON, register, docs/INDEX.md). Acquire the plan baton before writing code; release it when done.
2. `docs/games/master-game-design.md`: the authoritative game design. `docs/games/plural-vocab-game-ideas.md` is background.
3. `docs/audit/README.md`, `docs/audit/ux-design-consistency-audit.md` §1 (the reference design rules) and `docs/audit/ia-and-codebase-audit.md` §4 (data duplicates).
4. `docs/10-review-and-gamification.md` (review, XP and streak rules; no leaderboard; hints reduce evidence, not XP harshly; no pronunciation score until gate G5).
5. Existing code you must build on, not duplicate:
   - Vocabulary: `platform/apps/web/lib/study/subject-sheets.server.ts` (`loadSubjectVocabulary()`), `lib/study/plural-patterns.ts` (`pluralGenders`, `pluralPatterns`, plural pattern classification, `PluralDifference` with stem/ending/umlautIndices), `components/study/SubjectIllustration.tsx` (`SubjectVocabularyVisual`), `components/study/SubjectPluralGrid.tsx`.
   - Learning engine: `platform/packages/learning/src/{review,mastery,rewards,persistence}`. Note `review/alpha-scheduler.ts` (FSRS-compatible) and `review/mission.ts` (Today's Mission builder).
   - Learner state: `platform/apps/web/lib/learner-state/*`, plus backup in `lib/study/backup.ts` and `lib/study/storage.ts`.
   - Games: `platform/apps/web/components/games/*` (ArticleChoice, AudioMatch, PictureWordMatch, MorphologyPuzzle, GameFeedback) and `lib/games/*`.
   - Audio and recording: `lib/audio/*`, `lib/recorder/*`.
   Base branch: `codex/live-alpha`. Pull it fresh first; the vocabulary sheets changed recently (lesson and subject-tag grouping).

## 1 · Product spec

### 1.1 Content
- Item pool: every `SubjectVocabularyItem` with tone male/female/neuter, plus plural-only items (tone plural), from `loadSubjectVocabulary()`. That is about 660 gendered nouns and 572 taught plural forms.
- Each item needs: German singular with article, English meaning, gender, plural form(s), plural pattern id, illustration key, singular audio, plural audio (may be missing).
- Rules:
  - Items whose pattern is "not-taught" never appear in plural tasks.
  - Plural-only items appear only in gender tasks, as the "plural" corner.
  - Items with missing plural audio are skipped by audio-only plural tasks.
- Build the pool at build time into a static JSON module, so pages don't ship the whole catalogue twice.
- Respect the learner's study scope (lessons and subjects) from the existing scope store.

### 1.2 Task types
Every task records: correct, latency in ms, hints used (0–4), answer given, task type, item id.

| id | prompt | answer set | skill |
|---|---|---|---|
| corners.meaning | German + picture + audio | 4 English meanings | meaning |
| corners.reverse | picture + English | 4 German nouns with article | meaning (recall) |
| corners.gender | picture + bare noun | der / die / das / plural | gender |
| corners.pattern | singular with article | 4 pattern chips | plural |
| corners.form | singular with article | 4 plural spellings | plural |
| listen.picture | audio only | 4 pictures (incl. 1 vs many) | listening |
| listen.article | plural audio of an unchanged noun | singular / plural | listening |
| listen.dictation | audio | typed text (umlaut helper keys) | spelling |
| listen.pairs | audio | 2 near-identical forms | listening |
| forge | singular | built plural (umlaut dots + ending) | plural (recall) |
| echo | target form + model audio | record, then self-rate ✓ / ↻ | speaking (no score) |
| detective | 6 pairs from one grid cell | 3 rule hypotheses, then predict 3 unseen | plural rule |

Distractors:
- Draw them from the same grid row, the same lesson or the same subject first; never from unrelated categories.
- Never offer two answers that are equally correct; check against all of an item's plural variants.
- Generated wrong spellings (for corners.form) must not exist as real forms anywhere in the catalogue.

Grading:
- Use the Unicode NFC form. Typed answers are case-sensitive for nouns. Accept "ae/oe/ue/ss" only as a hint-level match (marked "almost", counts as hinted).

### 1.3 Four Corners interaction
- Drag or flick the centre card to a corner. Tap a corner also works. Keyboard: 1–4 or the arrow keys, Enter to confirm.
- On release, the card snaps to the nearest corner when the pointer is within 35% of the diagonal.
- Correct: the corner lights in its colour for 300 ms and the plural audio plays.
- Wrong: the card bounces back, the correct corner is outlined, and the item is re-queued 3–5 cards later.
- The same component (`FourCornersGame`) serves every corners.* and listen.picture mode through a `mode` prop.

### 1.4 Sessions
- **Daily Run (default):** about 20 cards. Extend `mission.ts`; do not write a second scheduler. Selection order: due → recent misses → required → new (capped by the daily-new limit). Interleave so that no more than 2 tasks of the same type come in a row. Structure: warm-up of 3 meaning cards on yesterday's words → main set → misses return → 1 finisher (echo or detective) → results. The learner can stop at any time, and every answer is saved.
- **Free Play:** start from any map cell, subject or lesson, using the same task mix.
- **Blitz:** 60 s, 3 strikes ends the round, a ghost bar shows the personal best from the last 7 days. Strikes exist ONLY in Blitz.
- **Tagesrätsel (daily puzzle):** 6 nouns chosen deterministically from a hash of the learner's local date (YYYY-MM-DD) over the full catalogue, so the same date gives the same 6 words for everyone. Guess gender and plural; one attempt; the share text is an emoji grid 🟦🟥🟩⬜ plus the date, with no personal data.

### 1.5 Progress rules
- **Word level 0–5:** New → Seen (meaning correct) → Known (gender and pattern correct) → Solid (listening and forge correct, and **on a later calendar day** than the last level-up) → Mastered (correct recall after the scheduled interval) → Gold (correct after 30+ days without a lapse). A lapse drops one level, never below Seen.
- **XP:** retrieval 10, hinted retrieval 5, corrected error 5, listening attempt 3, echo cycle 3, detective case 30. Combo multiplier ×2 from 5 in a row and ×3 from 10 in a row, during the Daily Run only.
- **Streak:** +1 when the daily goal (default 1 Run, adjustable to 2 or 3) is met by the learner's local midnight, with a grace period until 03:00. Earn 1 freeze per 7 consecutive days and hold at most 2; a freeze is used automatically. Store the longest streak. Freezes cannot be bought; nothing can be bought.
- **Check-in:** opening the app logs the day; 7 consecutive check-ins unlock a cosmetic or content reward (a bonus detective case). Missing days carries no penalty and no guilt copy.
- **Weekly quests:** 3 per ISO week, generated from the learner's 3 weakest rows and skills.
- **Badges:** one per pattern row, earned when every in-scope noun in that row reaches Mastered.
- **Mistakes deck:** items missed 2+ times in 14 days, plus the existing "Difficult" tag.
- **Reminders:** at most one local notification per day at the learner's chosen time, with the text "N words are ready". Off by default; ask for permission only from settings.

### 1.6 Persistence
- Client-side only (the site is a static export). Use the existing learner-state persistence with a versioned, migratable schema: `wortwerk.v1` = attempts (capped ring buffer), item levels, streak and freezes, check-in log, quests, badges, best Blitz scores, puzzle results.
- Include it in the existing backup export and import (`lib/study/backup.ts`). Wrap every storage call in try/catch, and fall back to in-memory state in private mode.

### 1.7 Routes and navigation
- New static routes: `/play` (home and check-in), `/play/run`, `/play/map`, `/play/blitz`, `/play/puzzle`, `/play/quests`, `/play/progress`. Pass state through query strings and the hash, not dynamic segments.
- Add "Play" to the primary navigation everywhere it is defined: the desktop rail, the tablet bar and the mobile tabs (`components/shell/*`; check for every nav list). Keep labels identical.
- From each word's cheat-sheet card, link to "Practise this word" (`/play/run?item=<id>`). From each map token, link back to the cheat-sheet card.

### 1.8 Design
- Follow the reference design in audit §1 exactly:
  - article tones `#245fa7 / #b82e4c / #237149 / #8c4daa`;
  - ending chip `#f8e1a1` with an underline of `#b27b19`, umlaut chip `#dfd6f2` with an underline of `#8760af`;
  - paper `#fffdf8`, ink `#203536`, action `#345d4c`.
  Define these once as CSS custom properties; add no new hex literals elsewhere.
- Reuse `SubjectVocabularyVisual` for every illustration. Use one audio button component.
- Mobile-first: correct at 360, 390 and 430 px, then at 768 and 1280 px; no horizontal scroll.
- The tab bar labels must not wrap at 390 px.
- Fix the reference's mid-word breaking: use `overflow-wrap:break-word; hyphens:auto` with `lang="de"` on German text.

### 1.9 Accessibility (blocking)
- Every drag action has a tap and a keyboard equivalent. Targets are at least 44×44 px.
- Gender is never shown by colour alone; the article word is always visible.
- Feedback is announced through an `aria-live="polite"` region.
- Focus returns to the next card after each answer.
- Respect `prefers-reduced-motion`: no fly or bounce, only an instant state change.
- Audio never autoplays before the first user gesture. Every audio cue has a visible text equivalent.
- WCAG 2.2 AA contrast for all tones on their tints.

### 1.10 Audio and pronunciation
- Use the existing audio files and manifest only; do not generate new TTS in this task.
- Generated audio is preview audio until gate G5 passes: show a small "Preview voice" label on Echo.
- Echo stores completion and self-rating only. No pronunciation score.

## 2 · Build plan: one PR per phase, each shippable

- **Phase 0, prerequisites (data fixes):**
  - Merge the Lesson 4 rows into existing word families so the catalogue has no duplicate headwords (Bild, Million, Glück, nur, mal, neu, finden, kennen, ein/eine, kein/keine). See `lib/content/word-cards.ts:35` and IA audit §7.1.
  - Correct the gender of "USA" to plural.
  - Fix the `/lessons/010–012/` 404s (the lesson segment must be zero-padded to two digits).
  - Add a test asserting there are no duplicate `de` headwords in `loadSubjectVocabulary()`.
- **Phase 1, core loop:** item pool, FourCornersGame (meaning, reverse, gender, pattern, form, listen.picture, listen.article), Daily Run via `mission.ts`, results screen, levels 0–2, XP, streak, check-in, `/play` and `/play/map` with token levels, nav entry, persistence and backup.
- **Phase 2, production:** forge, dictation, minimal pairs, levels 3–5, the mistakes deck, the skills overview.
- **Phase 3, challenges:** Blitz with strikes and ghost, Tagesrätsel with share, weekly quests, streak freezes, reminders.
- **Phase 4, depth:** detective cases and rule cards (rule wording comes from `pluralPatterns` explanations; mark any new rule text for owner review), Echo, badges, the row-complete moment.

## 3 · Tests (each phase must add its own)
- Unit tests (vitest, under `platform/tests/learning` and `platform/tests/web`):
  - pool building and exclusions;
  - distractor rules (same row first, never two correct answers, generated spellings never real);
  - grading (NFC, umlaut fallback);
  - re-queue after a miss;
  - interleaving limit;
  - level transitions, including the later-day rule and lapses;
  - XP and combo;
  - streak across midnight, the 03:00 grace and DST changes (Europe/Berlin and America/New_York);
  - freeze earning and use;
  - puzzle determinism (same date gives the same 6 items; different dates differ);
  - persistence migration and the private-mode fallback.
- Playwright e2e (`platform/tests/e2e`), at 390×844 and 1280×900:
  - complete a Daily Run three ways: by drag, by tap and by keyboard only;
  - a wrong answer re-appears;
  - streak and levels persist after a reload;
  - backup export and import round-trip;
  - reduced motion;
  - no horizontal scroll.
- Add every new route to the static smoke manifest (`platform/apps/web/scripts/smoke-pages.mjs`) and to the offline precache (`platform/apps/web/scripts/offline-export.ts`), so that `npm run audit:offline` covers them.

## 4 · Quality gates (all must pass before each PR is marked ready)
Run from `platform/`, ONE AT A TIME. Never run two builds, or a typecheck alongside a build: `build:pages` globally renames `proxy.ts`.
1. `npm run check` (typecheck ×3, lint with zero warnings, unit tests, publication validation, web tests)
2. `npm run test:e2e`
3. `npm run build:web`, then `npm run smoke:web-routes`
4. `npm run gates:pages` (Pages build → smoke → learner-language audit → offline audit → word-card export audit)
5. From the repo root: `node tools/audit-attribution.mjs`
6. `npm run audit:prod`

The pre-commit hook blocks commits that contain build-intermediate state. If it fires, restore `proxy.ts` and clean the build output; never bypass the hook.

## 5 · Git, PRs and deployment
- Branch per phase from fresh `codex/live-alpha`: `feat/wortwerk-phase-N`. Commit in small, clear steps.
- Open a **draft PR into `codex/live-alpha`**. In the body list:
  - what shipped;
  - the screenshots (mobile and desktop) for each new screen;
  - gate output;
  - anything deferred.
  Mark it ready only when all gates pass.
- **Deployment is automatic:** `.github/workflows/deploy-pages.yml` runs on every push to `codex/live-alpha` (`npm ci` → `check` → `build:web` → `audit:prod` → smokes → `build:pages` → `smoke:pages` → word-card audit → Pages deploy). Merging the PR deploys it. Do not push directly to `codex/live-alpha` and do not merge without the owner's approval.
- After the deploy finishes, verify the live site at https://hrezaii95.github.io/german-learning-exam/:
  - `curl` every new `/play/*` route and expect 200;
  - run one Daily Run with Playwright against the live URL at 390 px and save the screenshots;
  - confirm the Play nav entry appears on desktop and mobile;
  - confirm the cheat-sheet "Practise this word" links resolve.
  Report the results on the PR.
- **Rollback:** revert the merge commit on `codex/live-alpha`; that push redeploys the previous version. Learner data is versioned, so the old build ignores `wortwerk.v1` safely; verify this in tests.

## 6 · Out of scope
- Public leaderboards or leagues.
- Purchases or currency.
- Pronunciation scoring.
- New TTS generation.
- Server-side storage or accounts.
- Changes to the cheat-sheet pages beyond adding "Practise this word" links.
- The wider design-system clean-up from the audit (separate work).

## 7 · Definition of done (per phase)
- All gates in §4 pass, locally and in CI.
- Every screen in the phase matches the reference design and passes the §1.9 accessibility checks.
- The PR shows mobile and desktop screenshots.
- After merge: the live verification in §5 has passed and its results are posted on the PR.
- The plan baton is updated and released, and `plans/full-alpha-register.csv` has a row per phase with evidence links.

Start with Phase 0. Before writing code, post a short plan (files to add or change, any risk) and wait for the owner's go-ahead if anything in it conflicts with the repository's specs.
````
