# UX / visual design consistency audit

- Date: 2026-10-22
- Scope: every route under `platform/apps/web/app` (47 `page.tsx` files) and the shared components each one renders.
- Reference standard: the newest illustrated cheat sheets, as the owner named them. These are `/cheat-sheets/plurals` and `/cheat-sheets/subjects[/<subject>]`, rendered by `components/study/SubjectInfographic.tsx`, `SubjectPluralGrid.tsx`, `SubjectSheetFilters.tsx`, `SubjectWordDropdown.tsx` and `SubjectIllustration.tsx`, and styled by `app/cheat-sheets/subjects/subjects.css` and `plurals.css`. Commits 2941f115, 3a024c80, b1dbea93, ab8c5b3a and b80be61b define this style.
- Method:
  - I read the code: CSS, TSX and the docs/04–06 specs.
  - I took Playwright/Chromium screenshots of the live GitHub Pages build at 1366×900 and 390×844, one concrete URL per route template.
  - On each live page I measured computed styles inside `<main>`: the h1 style, content width, how many radii, colours and button styles are used, how many SVG and image elements there are, which audio controls appear, and whether the page scrolls sideways.
  - Scripts, screenshots and `metrics.json` are in `/tmp/claude-0/-home-user-german-learning-exam/be392e8c-832b-5130-8f55-a41dc5df0c99/scratchpad/ux-audit/`. They are not committed.
- What I did not verify:
  - Printed output. I read the print CSS but did not print or export a PDF of any page.
  - Dark mode. The app declares `colorScheme: "light"` only.
  - Dynamic routes beyond the one instance per template I opened. For lessons I opened 01, 04 and 05.

---

## 1. The reference design language (rules taken from the preferred sheets)

### 1.1 Colour tokens
The reference does **not** use the global token file. It defines **local** tokens on `.subject-sheet, .subject-directory` (`subjects.css:1`) and hard-codes hex values everywhere else. Both CSS files together hold 106 hex literals: 34 in `subjects.css` and 72 in `plurals.css`. So the first fix is to promote these values to global tokens (see P0-1).

| Role | Reference value | Where | Closest global token today |
|---|---|---|---|
| Ink | `#203536` | `subjects.css:1` `--subject-ink` | `--study-ink #203536` (same); `--ink #1c1a24` (different) |
| Muted text | `#596660` | `--subject-muted` | `--study-muted #526164`, `--ink-muted #5c5868` |
| Rule/line | `#d9dfd7` | `--subject-line` | `--study-line #dce4df`, `--border #e4ddd2` |
| Paper (cards) | `#fffdf8` | `--subject-paper` | `--study-paper #fffefa`, `--surface #fff` |
| Action/link green | `#345d4c` | `.subject-back`, `.subject-tile-action`, switch track | `--brand`/`--study-green #28634f` |
| Soft green tint | `#eaf0e7` / `#edf3e7` / `#f0f4e9` / `#f3f5ea` / `#f7f8f1` | hover, pressed, filter panel, related box, plain lanes | `--surface-brand-soft #edf3eb`, `--study-tint #edf3eb` |
| Focus ring | `#9c671d` (amber), 3px, offset 3px | `subjects.css:114`, `plurals.css` `.subject-plural-entry:focus-visible` | `--focus-ring #28634f` (green) |
| **der** (masc.) | `#245fa7` | `subjects.css:46` `.subject-tone-male` | `--gender-m #246bfd`, `--gender-m-ink #174dac` |
| **die** (fem.) | `#b82e4c` | `subjects.css:47` | `--gender-f #e64c86`, `--gender-f-ink #a92f5d` |
| **das** (neut.) | `#237149` | `subjects.css:48` | `--gender-n #2e9d68`, `--gender-n-ink #1f744d` |
| **die** (plural) | `#8c4daa` | `subjects.css:49` | `--gender-pl #7957d5` |
| Plain / non-noun | `#3d5d55` | `subjects.css:50` | n/a |
| Ending highlight | bg `#f8e1a1`, underline `#b27b19` | `plurals.css:13` | `--rule-special #d8901c` (amber, close) |
| Umlaut highlight | bg `#dfd6f2`, underline `#8760af` | `plurals.css:14` | n/a |
| Source qualifier ("Teacher extra") | `#745b2c` | `subjects.css:63` | n/a |

How article colour is applied: one `--subject-tone` custom property per tone class, and every surface is derived from it with `color-mix`:
- lane border: tone 28% on white
- lane top: 4px solid tone
- lane background: tone 3% on paper
- hover/pressed: tone 7% on paper, plus an inset 3px left bar
- text: the tone itself

The word, its icon and the large article (`der`/`die`/`das`, 2rem/650) all take the tone colour. A text legend ("der masculine · die feminine · das neuter · die plural") repeats the colour cue in words (`SubjectInfographic.tsx:145`).

### 1.2 Typography
- One family only: Inter Variable (from `--font`). No serif anywhere.
- Kicker: `.study-eyebrow`, 11px, weight 750, letter-spacing .14em, uppercase, muted.
- h1: `clamp(2.1rem,4.5vw,3.6rem)`, weight 700, letter-spacing −.045em, line-height 1.07 (`subjects.css:19`). It measured 57.6px on desktop, 2.6rem below 800px and 2.2rem below 580px.
- Section h2: 1.3rem, letter-spacing −.02em. Tile h2: 1.24rem.
- Entry word: 1.01rem/650. Plural and meaning: .76–.77rem muted. Pattern header h4: 1.35rem/650.
- Weights in use: 450, 500, 600, 650, 700, 750.

### 1.3 Spacing, radius and elevation
- Page gutter `clamp(16px,3vw,42px)`, top 24px, bottom 90px. The page widens past the shell's 52rem reading width through `.shell-main:has(.subject-sheet)` (`subjects.css:2`). Max content width is 1320px.
- Radii: 16px for the overview panel, 12px for tiles, tables, switcher and related box, 10px for lanes and switch buttons, 9px for inputs and plural cards, 7px for entries and group-filter buttons.
- Elevation: borders only. The single shadow is on the open switcher dropdown (`0 12px 24px #233b2c1a`). No card shadows.

### 1.4 Card anatomy (vocabulary entry)
Entry markup is `.subject-entry-wrap > button.subject-vocabulary-entry` (`SubjectInfographic.tsx:119-122`):
1. a 43–46px line illustration (`SubjectVocabularyVisual`), coloured by the tone
2. a text stack: the German word with its article (`strong`, tone colour, `lang="de"`), then the plural forms (muted), then the English meaning (muted, .76rem), then an optional source qualifier (`em`, `#745b2c`)
3. a chevron (`.subject-entry-chevron`)

The whole card is one toggle button (`aria-pressed`, `aria-expanded`). Opening it mounts an **inline dropdown card** (`SubjectWordDropdown`) right under the entry. The dropdown shows:
- heading with illustration, category and meaning
- separate "Singular" and "Plural" form boxes, each with its own `LineAudio` button
- examples with compact audio
- patterns
- Save + "Full vocabulary card →"
- tag list
- collapsible source notes

Three containers hold entries:
- gender lanes (`.subject-vocabulary-lane`, 3–4 columns)
- a flat card grid when gender grouping is off (`.subject-vocabulary-flat`, `plurals.css:134`)
- plural-pattern cards (`.subject-plural-card`, `plurals.css:131`) or the gender × plural table (`.subject-plural-table`, `plurals.css:16`)

Directory tiles (`.subject-directory-tile`) have:
- a 60px icon in a 14px-radius tint square
- a 1.24rem title
- muted counts
- a footer action row above a top rule

### 1.5 Illustration style
- Single-weight line art: `viewBox 0 0 100 100`, `stroke="currentColor"`, `strokeWidth 2.6`, round caps and joins, no fill.
- A faint disc behind each drawing: `circle r=46`, `fill=currentColor`, opacity .055 (`SubjectIllustration.tsx:36-38`).
- The drawing inherits the article tone, so the icon and the word share a colour.
- Path tables live in `lib/study/*-illustrations.ts` (noun, verb, expression, grammar, geography, refined; commit b80be61b).
- The heading mark is the subject icon in a 105px circle (`#f3f5e9` fill, `#d9dfd2` border).

### 1.6 Filter and switch controls
- **Live search** (`input type=search`, 48px tall, 9px radius, `#aebbb1` border) next to a status line ("Lessons 1–12 · 1338 of 1338 entries…"). There is no "Apply" button; results filter as you type.
- **Group filter buttons** (`.subject-group-filters button`, `subjects.css:32-36`):
  - 40px tall, 7px radius, paper fill, 1px line border
  - each takes its tone colour and shows a count `span`
  - pressed state is `aria-pressed=true`: tinted fill, `currentColor` border and a 2px inset underline
- **Grouping switches** (`.subject-grouping-switch`, `plurals.css:70-78`): `role="switch"` buttons, 62px tall, 10px radius, with a 38×23px track, a 15px knob and an On/Off label. They are independent ("Group by gender", "Group by plural pattern").
- **Disclosure filters** (`SubjectSheetFilters`, `plurals.css:92+`): `<details>` dropdowns for Lessons and Subject tags with checkbox grids and counts, a Source `<select>`, "Reset all filters", and a summary line. The panel is tinted `#f0f4e9`.
- **Subject switcher**: a `<details>` styled as a select. The kicker reads "CHOOSE A SUBJECT · 21 AVAILABLE", and the native marker is hidden (`subjects.css:6-15`).
- Browse state is written to the URL (`sheetBrowseQuery`) and restored on popstate.

### 1.7 Audio buttons
`LineAudio` (`StudyAudio.tsx:135-157`) renders `.study-audio-button` (`study.css:104-120`):
- 38px tall, 9px radius, `#f0f5ed` fill, `#28634f` icon
- an inline SVG speaker that becomes a pause icon while playing
- a "Listen" label, which `compact` drops
- `aria-pressed` while playing, plus a fallback status message

In the reference it appears only inside the dropdown card, never on the grid.

### 1.8 Layout grid and responsive behaviour
- Gender lanes: 3–4 columns by default (`--subject-lanes`). 2 columns at ≤800px, 1 column at ≤480px.
- Plain-group and flat grids: 4 columns at ≥1280px, 3 by default, 2 at ≤1000px, 1 at ≤580px.
- The plural table collapses into stacked cards below 760px, with labels inside each cell (`.subject-plural-mobile-label`).
- Directory grid: 4, 3, 2, then 1 column, where each tile becomes a 52px icon plus a text row.
- Reference breakpoints: 1280 (min), 1050, 1000, 800, 760, 580, 480, 420.
- Touch targets are 40–48px. Reduced-motion turns off transitions.

### 1.9 Print
The **live sheet itself** prints. There is no separate print component (`subjects.css:121-122`, `plurals.css` print blocks).
- The shell, controls, filters, switches and dropdowns are hidden.
- Type is set in pt (h1 28pt, entry 9pt).
- Lanes and cards keep their colours with `print-color-adjust: exact`.
- Entries and cards avoid page breaks. Icons shrink to 27–32px.
- The button reads "Print / save as PDF".

### 1.10 Known defects in the reference (fix before copying it)
- **Words break mid-word in narrow lanes.** `overflow-wrap:anywhere` on `.subject-entry-text strong` (`subjects.css:61`) splits words such as "Auszubildend|e", "Automechanik|er" and "Familienmitgli|ed" in the 4-lane People sheet at 1366px (screenshot `cs-subject-people-deep.png`). Use `hyphens:auto` with `lang="de"` and `overflow-wrap:break-word`.
- The tokens are local and every surface tint is a hard-coded hex, so other pages cannot reuse them (see P0-1).
- The focus ring is amber `#9c671d`, but the global token is green `--focus-ring #28634f`.

---

## 2. Quantified inconsistency

| Measure | Value | Evidence |
|---|---|---|
| CSS files under `app/` + `components/` | **33** (7,104 lines, 339 KB) | `find app components -name '*.css'` |
| Hard-coded hex literals in CSS | **1,092** occurrences, **659 distinct** values | about 1,054 sit outside the two `:root` token blocks (`globals.css:2-81`, `study.css:2-10`) |
| Hex literals in TS/TSX | 54, in 10 files | e.g. `TimeTools.tsx:12`, `TravelDiagrams.tsx`, `SubjectIllustration.tsx:67`, `lib/study/object-sheet.ts:9-11` |
| Files with most hex | `study.css` 190, `countries.css` 74, `globals.css` 74, `plurals.css` 72, `collection.css` 61 | per-file count |
| Files with **zero** `var(--…)` | 16 of 33, e.g. `time.css`, `journeys.css`, `travel.css`, `past.css`, `hobbies.css`, `HobbyTimeLearning.css`, `JourneyLearning.css` | per-file count |
| Distinct `font-size` values | **170**. Only 43 of 916 declarations use a token | |
| Distinct `border-radius` values | **50**. Only 41 of 416 use `var(--radius*)` | |
| Distinct `font-weight` values | 15 (400–900) | |
| Distinct `box-shadow` values | 33 | |
| Distinct media-query widths | **37** | |
| Focus-ring variants | about **30** outline declarations: 22 hex colours plus 4 token forms | e.g. `#765194`, `#9c671d`, `#ffd56b`, `#24476e`, `var(--focus-ring)` |
| **Article-colour palettes** | **7** separate der/die/das hex sets (table in §3.1) | |
| Gender naming vocabularies | 3: `male/female/neuter`, `masculine/feminine/neuter`, `m/f/n`. Plus 3 class families: `.subject-tone-*`, `.study-tone-*`, `[data-gender]`, plus CSS-module `.male`/`.masculine` | grep `data-gender=` |
| Identical declaration blocks repeated across files | 89 | e.g. `background:#eef5ff;border-top-color:#37649c` in food, past, time and travel CSS; `display:block!important;margin:0!important…` in 6 `*Learning.css` print blocks |
| Selectors defined in 2+ files | 28 | e.g. `.food-sheet select` in both `food.css` and `FoodLearning.css`; same for hobbies, journey, past, time and travel; `.shell-main` in 5 files |
| Hand-minified one-line CSS files | 8 (`food`, `hobbies`, `office`, `past`, `time`, `travel`, `journeys`, `word-family-preview.module`) | every rule cites as "line 1" |
| Button systems | 2 global systems plus module and local ones: `.btn .btn-primary/secondary` (94 uses, 33 files) and `.study-primary/secondary` (131 uses, 44 files); `word-cards.module .primary/.secondary` | |
| Chip/pill styles | 6 or more: `.meta-chip` (999px), `.study-tag`, `.sheet-jump a` (30px pill), `.subject-group-filters button` (7px), food category pills, `.legend span` (professions) | |
| Page-header patterns | **7**: `.page-header` + `p.dense`; `.study-page-header`; `.collection-heading`; `.home-heading`; country heading; `.subject-page-heading`; `.book-header` (plus module `libraryHeader`) | grep before `<h1` |
| Live h1 sizes measured | **8**: 57.6, 54.6, 54, 46, 41, 40, 32.8, 27.2px | `metrics.json` |
| Live h1 colours measured | **5**: `#203536`, `#1c1a24`, `#29243a`, `#20372f`, `#283c39` | `metrics.json` |
| Content width at 1366px | 3 regimes: 1036px (reference, home, countries), 1063–1070px (dashboard, hubs, book), 848px (everything else) | `metrics.json` |
| Audio player implementations | **6**: `LineAudio`/`.study-audio-button`; `MeaningPlate` (`▶`/`❚❚` text glyphs, `MeaningPlate.tsx:125`); `PronunciationControl`; `WorkbookAudioPanel`; `ReviewClipRow`; inline `<audio>` in `HubViews.tsx:788` | |
| Components that render "one vocabulary item with article colour" | **12** (list in §3.3) | |
| Illustration systems | **4**: line-art SVG (reference); painted pastel raster (172 × 3 formats in `public/illustrations/vocabulary`); photo-like raster professions (48 × 3); flat full-colour lesson PNGs (8) | |
| Separate print-summary components | 15 `*PrintSummary` components plus `CheatSheetPrint.css` | reference prints the live page instead |
| Horizontal overflow at 390px | none of the 47 routes | `metrics.json` `mobHscroll:false` |

---

## 3. Cross-cutting findings

### 3.1 Seven article-colour schemes (most visible problem)
| # | der / die / das / plural | Where |
|---|---|---|
| A (reference) | `#245fa7` / `#b82e4c` / `#237149` / `#8c4daa` | `subjects.css:46-49` |
| B (global tokens + spec) | `#246bfd` / `#e64c86` / `#2e9d68` / `#7957d5`. Ink variants `#174dac` / `#a92f5d` / `#1f744d` | `globals.css:17-30`, `docs/06…md:14-17`, `study.css:250-253`, `word-cards.module.css`, `.visual-cue`, `.gender-badge` |
| C (lesson-sheet cards) | `#37649c` / `#a53a5b` / `#4d8655` (washes `#eef5ff` / `#fff0f4` / `#f1f8ed`). Plural `#7957d5` or `#765194` | `food.css:1`, `travel.css:1`, `time.css:1`, `past.css:1`, `FoodLearning.css:7`, `journeys.css:1` |
| D (objects/office) | `#205fa8` / `#b32947` / `#167044`. Plural `#765194` | `objects.css:1`, `office.css:1` |
| E (Lesson 4 words) | `#418cac` (teal) / `#c57486` / `#6a9d59` | `study.css:937-945` |
| F (professions) | `#2168d5` / `#c53174` / plural `#7047c7`, with M/F/∞ circle glyphs and `#8cb9f5` / `#eea4c7` gradients | `professions.module.css:6,12-14` |
| G (gender badge) | B hues with `M`/`F`/`N` letters and square/circle/diamond shapes, no `der`/`die`/`das` | `GenderBadge.tsx`, `globals.css:1656+` |

The plural violet is also reused as a general UI accent. Examples:
- the selected toggle on the Time sheet (`#493660`/`#765194`)
- hobby frames
- travel prefix bridges
- past timelines
- focus rings (`#765194`)

`docs/06` forbids this: "Gender colors are not generic card-decoration colors."

### 3.2 Two design systems plus sheet dialects
- **Studio system** (`globals.css`): `.page-header` with a `p.dense` kicker, a 32.8px h1 in ink `#1c1a24` (purple-black), white `.panel` cards with an 18px radius and `--shadow`, `.btn` buttons with a 12px radius, `.meta-chip` pills, and an "Apply filters" form. Used by the dashboard, lessons 1–2, activities, all six hubs, details, practice, conversation, search, review, settings and references.
- **Study system** (`study.css`): `.study-page-header` with `.study-eyebrow`, a 41px h1 in `#203536`, `.study-primary/secondary` buttons with a 9px radius, and `LineAudio`. Used by the legacy lesson cheat sheets, lessons 3 and 5–12, book, saved and listening.
- **Reference** (`subjects.css`/`plurals.css`): a larger h1, its own local tokens, wide layout, lanes and switches.
- **Sheet dialects**:
  - `collection.css`, with a purple-ink palette (`color:#29243a`, `--sheet-purple:#614294`, pill jump links)
  - `countries.css`
  - `home.css`
  - each lesson sheet's own CSS file plus its `*Learning.css` twin
- Typography goes off-system in places. Georgia serif is used in 12 rules (`study.css:291,430,437,703,718,738,789,817,842,864,1000,1239`), including the Lesson 4 hero h1 and the chapter cards on `/lessons`. The reference is all Inter.

### 3.3 Twelve components draw the same "vocabulary item" card
1. `SubjectInfographic` entry, `SubjectPluralGrid` card and `SubjectWordDropdown` (reference)
2. `ObjectVocabularyOverview` lanes (`.object-vocabulary-lane`, `.study-tone-*`): an earlier version of the reference lanes, used by objects and office
3. `HomeCheatSheet` (`.home-word-card`, `.home-focus`) plus a `<select>`-driven explorer
4. `FoodTools` (`.food-board` tinted cards plus a separate `.food-selected` panel below the grid)
5. Travel, Journey, Past, Time and Hobby tools: five copies of the same `[data-gender]` tinted card pattern
6. `CountryCheatSheet` (passport rows and map side panel)
7. `WordFamilyPreview` (`.hub-card` plus a module card with a raster image)
8. `WordFamilyCard` (22px-radius card, form table, raster hero)
9. `LessonFour` (`.lesson-word`, teal and coral top borders)
10. `ProfessionInfographic` (`.formLane .masculine/.feminine` gradient lanes)
11. `DetailViews` (`.detail-form-card`)
12. `components/collections/ExtraProfession*` with `extra-professions.module.css` (145 lines). No route or test imports these, so they appear to be **dead code**.

### 3.4 Illustration style
- Reference: tone-coloured line art.
- Legacy sheets: Food, Hobby, Home, Object and Country illustrations use **the same line grammar** (100-unit viewBox, 2.6–2.7 stroke). But:
  - they are **ink-coloured, not tone-coloured**
  - they sit on cream discs (`#f8f0da`-like) instead of the 5.5% tone disc
  - each sheet has its own path table inside its component (`FoodTools.tsx`, `HobbyTools.tsx`, `HomeIllustration.tsx`, `ObjectIllustration.tsx`)
- Vocabulary hub, `/vocabulary/[id]`, `WordFamilyPreview` and lesson cards use **painted pastel raster** art (`public/illustrations/vocabulary/*-square-240.{avif,webp,jpg}`). The same noun therefore looks different on the subject sheet and on its own card.
- Professions use photo-like hand close-ups (`public/illustrations/professions`).
- The dashboard and lesson 1–2 visuals are flat full-colour people scenes (`public/illustrations/lesson-*.png`).
- German colour words have **two swatch palettes**: `lib/study/object-sheet.ts:9-11` (`rot #da3848`, `blau #2866be`…) and `SubjectIllustration.tsx:67` (`rot #c64d4d`, `blau #417ba6`…).

### 3.5 Navigation and headers
- Legacy sheets use `CheatSheetNav` (`components/study/CheatSheetNav.tsx`). It is a numbered chooser ("CHEAT SHEET 12 / 15") **whose native disclosure marker ▶ shows on desktop**: `study.css:1888` sets no `list-style:none` and does not hide `::-webkit-details-marker` (visible in every legacy-sheet screenshot). It also adds two underlined promo links ("All subject infographics →", "Gender × plural patterns →").
- The reference uses "← All subjects" plus a subject switcher ("CHOOSE A SUBJECT · 21 AVAILABLE").
- So there are **two numbering systems**: 15 legacy sheets and 21 subjects.
- `/cheat-sheets` (the nav target for "Cheat sheets") renders the **Countries sheet**, not a directory. The directory of the newest format lives at `/cheat-sheets/subjects`.
- Back links vary: "← Back" (`.back-link`), "← All lessons", "← Professions", "← All subjects", "Back to the book →" and "Back to review" (as a primary button). Legacy sheets have none.
- In-page section navigation comes in 3 styles: underlined text links (home, countries, objects), pill buttons (`.sheet-jump`: food, time, conversation, people) and tabs (lessons 3–12).

### 3.6 Filters
| Pattern | Pages |
|---|---|
| Reference live search + tone filter buttons + switches + `<details>` checkbox filters | plurals, subjects |
| Studio "Search / Lesson / Category" form with **Apply filters / Clear filters** buttons | vocabulary, grammar, verbs, phrases, concepts |
| Search + Category `<select>` + "Show saved cards" toggle | `SheetWordIndex` (all lesson sheets) |
| Pill category buttons | food, lesson 4 |
| 4-column select grid | `WordCardLibrary` |

### 3.7 Audio
`LineAudio` is the standard and is already used in 40 files. The exceptions are:
- `MeaningPlate`, which uses text glyphs (`▶`/`❚❚`, `MeaningPlate.tsx:125`) and its own class; it is used by details, activities and professions
- `PronunciationControl` (`.audio-control`, uses `.btn`)
- `WorkbookAudioPanel` and `ReviewClipRow`, each with its own `<audio>` element
- an inline `<audio>` element in `HubViews.tsx:788`
- dead `.listen` button CSS in `word-cards.module.css:21` (`WordFamilyCard` now uses `LineAudio`)

### 3.8 Icons
- Inline SVG is used for audio, illustrations and some chevrons.
- Unicode glyphs serve as icons elsewhere: `→` 293 times in 67 files, `←` 16, `×` 12, `↗` 11, `●` 7, `⌄` 5, `✕` 4, `✓` 3, plus `★ ☆ ☷ ◫ ⌘ ✧`.
- Close buttons use both `×` and `✕`. The dropdown chevrons are `⌄` text characters while the audio icons are SVG.
- There is no shared icon component.

### 3.9 Print
- Reference: prints the live page.
- Legacy sheets: hide the page and print a separate hand-built summary. There are 15 `*PrintSummary` components plus `CheatSheetPrint.css` (`body:has(.sheet-print-summary)`), so print content can drift from screen content.
- No print rules at all: `office.css`, `VerbWorkshop.css`, `BookLearning.css`. Office relies on `ObjectPrintSummaries`.
- `objects` also links a static PDF (`public/cheat-sheets/*.pdf`).

### 3.10 Shell (shared by all pages, noted for completeness)
- The dark indigo rail and the study-selection bar with the Dictionary pill are consistent everywhere except `/review-audio`, which is deliberately outside the shell (`app/review-audio/page.tsx:21-25`).
- On 390px the bottom-nav label "Cheat sheets" wraps inside the active pill and is left-aligned while the other labels are centred (`cs-*-mob.png`).
- The rail is not full height in full-page captures. I did not check whether this is a capture artefact.

---

## 4. Page-by-page ratings (47 routes)

Ratings: **Matches** means the page is the reference or uses it unchanged. **Partial** means the page shares the study palette, line illustrations or `LineAudio` but differs in structure, tokens or controls. **Divergent** means a different design system.

### Cheat sheets (19)
| Route | Renders | Rating | Specific differences from reference |
|---|---|---|---|
| `/cheat-sheets/plurals` | `SubjectInfographic allNouns` | **Matches** | Reference. Has the mid-word-break defect (§1.10). |
| `/cheat-sheets/subjects` | `SubjectDirectory` | **Matches** | Reference directory. |
| `/cheat-sheets/subjects/[subject]` | `SubjectInfographic` | **Matches** | Reference. Mid-word breaks in 4-lane layouts (People). |
| `/cheat-sheets` (Countries) | `CountryCheatSheet`, `countries.css` | Partial | Full width like the reference, but: own h1 (46px, `#20372f`); numbered chooser with ▶ marker; underlined jump links; map in green and purple fills; flag images, not line art; side panel says "Masculine · der" in small blue; separate print summary; 74 hex, 12 vars. Also acts as the cheat-sheet landing page (IA issue, §3.5). |
| `/cheat-sheets/home` | `HomeCheatSheet`, `home.css` | Partial | Line illustrations in article colour (close), but: `<select>` explorer instead of inline dropdown; underlined jump links; own `--home-line` palette; h1 54px `#283c39`; separate print summary; uses `--gender-pl` (scheme B) for plurals. |
| `/cheat-sheets/objects` | `ObjectCheatSheet`, `ObjectVocabularyOverview`, `collection.css`, `objects.css` | Partial (closest) | Same der/die/das lane idea, but: scheme D colours; `.study-tone-*` classes; 848px width; `study-page-header` (41px h1); tag chips under the h1; no gender/plural switches or checkbox filters; static PDF link and separate print summary. |
| `/cheat-sheets/office` | `OfficeCheatSheet`, `objects.css` + `office.css` | Partial | As objects. Also: an office-desk illustration with its own wood palette; no print CSS of its own. |
| `/cheat-sheets/food` | `FoodCheatSheet`, `FoodTools`, `food.css` + `FoodLearning.css` | Partial | Scheme C; ink-coloured icons on cream discs; word in ink, not tone; selection opens a panel **below** the grid, not inline; pill jump links and pill category filters; 848px; duplicate selectors across 2 CSS files; one-line CSS. |
| `/cheat-sheets/travel` | `TravelCheatSheet`, `TravelDiagrams`, `travel.css` + `TravelLearning.css` | Partial | Scheme C; plural violet as accent on prefix bridges; diagram SVG with its own hex fills (`TravelDiagrams.tsx`); pills; 848px. |
| `/cheat-sheets/time` | `TimeCheatSheet`, `TimeTools`, `time.css` + `HobbyTimeLearning.css` | Partial | Scheme C; selected segmented toggle in plural violet `#493660`; clock SVG with 7 inline hex (`TimeTools.tsx:12`); pills; 0 vars in CSS. |
| `/cheat-sheets/past` | `PastCheatSheet`, `PastTools`, `past.css` + `PastLearning.css` | Partial | Scheme C; `#765194` timeline accents; pills; 848px. |
| `/cheat-sheets/journeys` | `JourneyCheatSheet`, `JourneyTools`, `journeys.css` + `JourneyLearning.css` | Partial | Blue `#24476e`/`#37649c` season UI (masculine hue reused as decoration); purple haben trail; pills. |
| `/cheat-sheets/hobbies` | `HobbiesCheatSheet`, `HobbyTools`, `hobbies.css` + `HobbyTimeLearning.css` | Partial | Purple `#765194`/`#493660` modal-verb frames as decoration; line icons in ink; pills. |
| `/cheat-sheets/questions` | `QuestionCheatSheet`, `collection.css`, `questions.css` | Divergent | `collection-heading` (h1 54.6px in purple-ink `#29243a`); question-family colours (place/person/time) unrelated to tokens; no illustrations; pill jumps. |
| `/cheat-sheets/conversation` | `SheetPage` → `CollectionCheatSheet` + `ConversationWorkshop` | Divergent | Purple-ink collection palette; no illustrations; pill jumps; workshop cards in cream; separate print summary. |
| `/cheat-sheets/numbers` | `CollectionCheatSheet` + `NumbersWorkshop` | Divergent | As conversation, plus a number-ladder palette (`#4e8878`, `#a1782e`). |
| `/cheat-sheets/people` | `CollectionCheatSheet` + `PeopleFamily` | Divergent | As conversation, plus a 900×580 family-tree SVG in its own style. The subject sheet `/cheat-sheets/subjects/people` covers the same vocabulary in reference style. |
| `/cheat-sheets/verbs` | `CollectionCheatSheet` + `VerbWorkshop` | Divergent | Purple verb-stage palette (`#614294`, `#ebe0fa`); no print CSS in `VerbWorkshop.css`. |

### Lessons, book and study (9)
| Route | Renders | Rating | Specific differences |
|---|---|---|---|
| `/` | `DashboardView` (Studio) | Divergent | `.page-header`; flat full-colour people illustration; white shadowed panels; `.btn-primary`; ink `#1c1a24`. |
| `/lessons` | `LessonBrowser` + `NewChapterCards` | Divergent | Two card styles on one page: Studio panels with large `.btn-primary`, and cream chapter cards with **Georgia** numerals and titles. Two primary-button sizes. |
| `/lessons/[lessonSegment]` | 01–02 `LessonOverview` (Studio); 04 `LessonFour`; 03 and 05–12 `CourseStudy` | Divergent (3 systems in one template) | L1–2 are Studio. L4 has a Georgia serif hero, its own room illustration and teal/coral gender borders (scheme E). L5 uses `study-page-header`, tabs, `WordFamilyPreview` raster cards and `LineAudio`. |
| `/lessons/[seg]/activity/[id]` | `ActivityScreen` (Studio) | Divergent | `.page-header`, `.panel`, `.btn`, `MeaningPlate` glyph audio. |
| `/book` | `BookReader`, `BookLearning.css` | Partial | Study palette and buttons; Georgia chapter numbers; content is the scanned book by design. |
| `/saved` | `SavedReview` | Partial | `study-page-header`, `study-*` buttons; no illustrations or tone cards. |
| `/listening` | `HubRoutePage` → `CourseListening`/`ListeningWorkspace` | Partial | `study-page-header` inside a hub route (the other hubs are Studio). |
| `/review` | `ReviewSetup` (Studio) + a `study-secondary` link | Divergent | Mixes both button systems on one page. |
| `/review/session/today` | `ReviewSession` (Studio) | Divergent | "Back to review" rendered as a primary button. |

### Hubs, details and collections (14)
| Route | Renders | Rating | Specific differences |
|---|---|---|---|
| `/hubs` | `HubDirectoryView` + ad-hoc `.country-hub-link` / `.home-hub-link` promos | Divergent | Studio; promo links styled in `study.css`/`countries.css`. |
| `/vocabulary` | `HubListView` + `WordFamilyPreview` | Divergent | "Apply filters" form; white shadowed `.hub-card`; **painted raster** thumbnails; no tone lanes; 848px. |
| `/vocabulary/[entityId]` | `WordFamilyCard` | Partial | Study palette and `LineAudio`, but: scheme B inks with plural `#7957d5`; 22px-radius shadowed card; painted raster hero; own eyebrow; h1 650 weight; dead `.listen` CSS. |
| `/collections/professions` | `ProfessionCollectionClient` + `ProfessionInfographic` | Divergent | Scheme F with M/F/∞ glyph badges; radial-gradient hero; photo-like raster cards; centred card text; `.btn`. |
| `/collections/professions/[sourceRow]` | `WordFamilyCard` | Partial | Same as `/vocabulary/[id]`; arrow glyph instead of illustration in the hero. |
| `/grammar` | `HubListView` + `GrammarConnections` | Divergent | Studio form filters; numbered step cards. |
| `/grammar/[entityId]` | `DetailView` | Divergent | Studio `.panel` stack; amber example capsule; `← Back`. |
| `/verbs` | `HubListView` | Divergent | Studio. |
| `/verbs/[entityId]` | `DetailView` + `VerbSelfCheck` | Divergent | Studio; `.visual-cue` (scheme B / rule colours). |
| `/phrases` | `HubListView` | Divergent | Studio. |
| `/phrases/[entityId]` | `DetailView` + `QaPractice` | Divergent | Studio; `MeaningPlate` glyph audio. |
| `/concepts` | `HubListView` | Divergent | Studio. |
| `/conversation` | `ConversationSelector` | Divergent | Studio. |
| `/conversation/[entityId]` | `ConversationLadder` (5 level components) | Divergent | Studio; `.btn`. |

### Practice, search, settings and other (5)
| Route | Renders | Rating | Specific differences |
|---|---|---|---|
| `/practice` | `GameSelector` | Divergent | Studio. |
| `/practice/[gameId]` | `GameRenderer` | Divergent | Studio; article choice shows plain `der`/`die` radios with **no article colour** (`docs/05:94` requires label+shape+colour bins). |
| `/search` | `SearchView` | Divergent | Studio; mixes `.btn` and `.study-secondary`. |
| `/settings` | `SettingsView` | Divergent | Studio (expected for a settings screen; low priority). |
| `/references` | `ReferencesView` | Divergent | Studio (low priority). |
| `/review-audio` | outside the shell | Divergent (intentional internal tool) | Out of learner scope; leave as is. |

### Tally
| Rating | Count | Routes |
|---|---|---|
| **Matches** | **3** | plurals, subjects, subjects/[subject] |
| **Partial** | **15** | 10 legacy lesson sheets (countries, home, objects, office, food, travel, time, past, journeys, hobbies), book, saved, listening, vocabulary/[id], professions/[row] |
| **Divergent** | **29** | 5 collection sheets, 4 lesson/dashboard routes, review ×2, 12 hub/detail/collection routes, practice ×2, search, settings, references, review-audio |

Only 3 of the 47 route templates (6%) match the reference. Among the 19 cheat-sheet routes: 3 match, 11 are partial and 5 are divergent.

---

## 5. Prioritised fix list

Effort: S is up to half a day, M is 1–3 days, L is more than 3 days.

### P0: foundations (do first; everything else depends on them)
| # | Change | Files | Effort |
|---|---|---|---|
| P0-1 | **Promote the reference palette to global tokens.** Add `--ink`, `--ink-muted`, `--line`, `--paper`, `--action`, `--tint-*` and `--focus-ring` with the §1.1 values. Set `--gender-m/f/n/pl` to the reference tones (`#245fa7`, `#b82e4c`, `#237149`, `#8c4daa`, plus `--tone-plain #3d5d55`). Derive washes and borders with `color-mix` as the reference does. Make `--study-*` aliases of these, then replace the local `--subject-*` and the hex in `subjects.css`/`plurals.css` with them. Re-check WCAG contrast of the new tones on 3% and 7% tints. | `app/globals.css:2-81`, `app/study.css:2-10`, `app/cheat-sheets/subjects/subjects.css`, `plurals.css` | M |
| P0-2 | **One article-colour scheme and one gender vocabulary.** Delete schemes C–G hex and point every gender rule at the tokens. Standardise on one attribute and value set (suggest `data-tone="male|female|neuter|plural|plain"` plus a `.tone-*` class), and keep the `der`/`die`/`das` word as the non-colour cue in place of M/F/N letters. Stop using plural violet and masculine blue as UI decoration (time toggle, hobby frames, travel bridges, journey season UI). | `food.css`, `travel.css`, `time.css`, `past.css`, `journeys.css`, `hobbies.css`, `objects.css`, `office.css`, `FoodLearning.css`, `HobbyTimeLearning.css`, `TravelLearning.css`, `PastLearning.css`, `JourneyLearning.css`, `study.css:250-253,937-945`, `professions.module.css:5-24,39-40`, `word-cards.module.css`, `word-family-preview.module.css`, `GenderBadge.tsx` + `globals.css:1656+`, `ObjectVocabularyOverview.tsx` | M |
| P0-3 | **One cheat-sheet frame.** Make every cheat sheet use the reference frame: `.subject-navigation` (back link + switcher), `.subject-page-heading` (eyebrow, h1, lead, heading mark), the `.subject-page-actions` print row and the full-width `.shell-main:has()` rule. Retire `CheatSheetNav`'s numbered chooser (or at least fix the ▶ marker at `study.css:1888`). Merge the 15-sheet and 21-subject lists into one switcher. Make `/cheat-sheets` a directory (the `SubjectDirectory` plus lesson-sheet tiles) and move Countries to `/cheat-sheets/countries`. | `components/study/CheatSheetNav.tsx`, all 12 `*CheatSheet.tsx`, `CollectionCheatSheet.tsx`, `app/cheat-sheets/page.tsx`, `lib/study/sheet-topics.ts`, `study.css` header rules, `collection.css` heading rules | M |
| P0-4 | **One vocabulary entry component.** Extract `VocabularyEntry` (illustration + word + plural + meaning + chevron, tone-driven) and `WordDropdown` from `SubjectInfographic.tsx:119-122` / `SubjectWordDropdown.tsx`. Use them for the word grids of food, home, objects/office, travel, time, past, journeys and hobbies: either embed `SubjectInfographic` filtered by lesson tag, or render the shared entry in the sheet's lanes. Remove the per-sheet `*-selected` panels and the `<select>` explorer. | `SubjectInfographic.tsx`, `ObjectVocabularyOverview.tsx`, `HomeCheatSheet.tsx`, `FoodTools.tsx`, `TravelDiagrams.tsx`, `TimeTools.tsx`, `PastTools.tsx`, `JourneyTools.tsx`, `HobbyTools.tsx`, `SheetWordIndex.tsx` | L |

### P1: visible consistency
| # | Change | Files | Effort |
|---|---|---|---|
| P1-1 | **Fix the reference before propagating it.** Replace `overflow-wrap:anywhere` with `overflow-wrap:break-word; hyphens:auto` on German words (relies on `lang="de"`, already present) to stop mid-word breaks. Use the global focus token. | `subjects.css:61-62`, `plurals.css` `.subject-plural-singular/.result` | S |
| P1-2 | **One illustration system.** Line art in tone colour everywhere. Move the Food, Hobby, Home and Object path tables into `lib/study/*-illustrations.ts` and render them through `SubjectVocabularyVisual` (tone colour + 5.5% disc, not ink on cream). Replace raster thumbnails and heroes in `WordFamilyPreview`/`WordFamilyCard` with `SubjectVocabularyVisual`, or keep raster only as an opt-in "photo" view. Merge the two colour-swatch palettes. | `FoodTools.tsx`, `HobbyTools.tsx`, `HomeIllustration.tsx`, `ObjectIllustration.tsx`, `WordFamilyCard.tsx`, `WordFamilyPreview.tsx`, `lib/study/object-sheet.ts:9-11`, `SubjectIllustration.tsx:67` | L |
| P1-3 | **One button set and one chip.** Collapse `.btn/.btn-primary/.btn-secondary` and `.study-primary/.study-secondary` (and `word-cards.module .primary/.secondary`) into one set using reference metrics (9px radius, 44px, paper fill, line border, action green). Add one filter chip equal to `.subject-group-filters button` (7px radius, count span, `aria-pressed` underline). Replace `.sheet-jump` pills, `.meta-chip` and food pills with it. | `globals.css:1293-1340`, `study.css:47-90`, `collection.css` `.sheet-jump`, `food.css`, `word-cards.module.css`, `professions.module.css` `.legend` | M |
| P1-4 | **Re-skin the Studio system from tokens.** Point `.page-header`/`.panel`/`.hub-card`/`.lede`/`.dense` at the new tokens. Use the reference type scale (eyebrow → `.study-eyebrow`, h1 → reference clamp or a smaller "app page" step), the paper fill with borders only and no `--shadow`, and the reference radii. This turns most Divergent routes into Partial without touching their TSX. | `globals.css:1243-1350, 2921-3000` and related Studio rules | M |
| P1-5 | **Type scale.** Define `--text-*` steps from the reference (eyebrow 11px/750, h1 clamp(2.1rem,4.5vw,3.6rem), h2 1.3rem, entry 1rem/650, meta .77rem) and use them. Remove Georgia from the 12 rules (`study.css:291…1239`). Keep 8 → 2 h1 sizes (sheet hero, app page) and 1 ink colour. | `globals.css`, `study.css`, `collection.css`, `home.css`, `countries.css`, `word-cards.module.css` | M |
| P1-6 | **One audio button.** Use `LineAudio` in `MeaningPlate` (drop the `▶`/`❚❚` glyphs), `PronunciationControl`, the `HubViews` inline player and `WorkbookAudioPanel` where it plays single lines. Keep a full transport only where scrubbing is needed (book, listening, review-audio). Delete dead `.listen` CSS. | `components/media/MeaningPlate.tsx:102-130`, `components/audio/PronunciationControl.tsx`, `components/hubs/HubViews.tsx:788`, `word-cards.module.css:21` | M |
| P1-7 | **Live filters on hub lists.** Replace the "Apply filters / Clear filters" forms with the reference pattern: live search, `SubjectSheetFilters`-style disclosure filters and a status count. | `components/hubs/HubViews.tsx`, `HubNavViews.tsx`, `components/word-cards/WordCardLibrary.tsx` | M |
| P1-8 | **One focus ring.** Replace the ~30 outline variants with `outline:3px solid var(--focus-ring); outline-offset:3px`. | all CSS (grep `outline:`) | S |
| P1-9 | **Article colour in practice games.** Show `der`/`die`/`das` options with tone colour and label in article-choice (as `docs/05:94` asks). | `components/games/ArticleChoiceGame.tsx` | S |
| P1-10 | **Lessons route.** Bring L1–2 (Studio), L4 (`LessonFour`, serif hero, scheme E) and L3/5–12 (`CourseStudy`) onto one lesson template. | `app/lessons/[lessonSegment]/page.tsx`, `LessonFour.tsx`, `CourseStudy.tsx`, `ActivityAndBrowser.tsx`, `study.css:700-1000` | L |

### P2: hygiene and longer-term
| # | Change | Files | Effort |
|---|---|---|---|
| P2-1 | **Print the live page.** Move the legacy sheets to reference-style `@media print` on the live sheet and retire the 15 `*PrintSummary` components and `CheatSheetPrint.css` (or keep one only where a different print layout is needed). Add print rules to office, verbs and book. Verify with real PDF exports; this audit did not. | `CheatSheetPrint.tsx/.css`, `*PrintSummary.tsx`, `*PrintSummaries.tsx`, `GrammarPrintSummaries.*`, `office.css`, `VerbWorkshop.css` | L |
| P2-2 | **Consolidate per-sheet CSS.** Merge each `app/cheat-sheets/<x>/<x>.css` with its `components/study/<X>Learning.css` twin (28 selectors are duplicated across files). De-minify the 8 one-line files. Delete the 89 repeated blocks by moving shared grids to utilities. Target: per-sheet files only for genuinely unique diagrams. | `app/cheat-sheets/**`, `components/study/*.css` | M |
| P2-3 | **Breakpoints.** Cut the 37 distinct widths down to the reference set (1280/1050/1000/800/760/580/480/420), preferably as documented custom media or comments. | all CSS | M |
| P2-4 | **Icons.** Add one `Icon` component (inline SVG: arrow, back, close, chevron, external, check, star). Replace the Unicode arrow and close glyphs (293 `→`, `×`/`✕` mix, `⌄`). | components (grep glyphs) | M |
| P2-5 | **Remove dead code.** `components/collections/ExtraProfessionsHub.tsx`, `ExtraProfessionDetail.tsx` and `extra-professions.module.css` are not imported by any route or test. | `components/collections/*` | S |
| P2-6 | **Hard-coded colours in TSX.** Move SVG fills and strokes to `currentColor`/tokens. | `TimeTools.tsx:12`, `TravelDiagrams.tsx`, `JourneyTools.tsx`, `ObjectIllustration.tsx`, `CountryOverview.tsx:27` | S |
| P2-7 | **Update the spec to the reference.** `docs/06` still specifies a violet brand (`#6946E8`; the code uses green `#28634f`), gender hexes from scheme B, M/F/N badges and 16–24px card radii. Rewrite §"Semantic color tokens", §"Typography and layout" and §"Vocabulary illustration system" to codify §1 of this audit, and add the switch, filter and print rules. | `docs/06-design-and-infographic-system.md` | S |
| P2-8 | **Mobile bottom nav.** Centre or shorten the "Cheat sheets" label so it does not wrap inside the active pill at 390px. | `components/shell/MobileNavigation.tsx`, `globals.css` bottom-nav rules | S |
| P2-9 | **Settings, references, review-audio.** Leave them on whatever system P1-4 produces; no bespoke work needed. | n/a | n/a |

### Suggested order
1. P0-1 and P0-2 (tokens + one article scheme) make every page *look* closer at once.
2. P1-1, P1-8 and P1-4 (fix the reference, one focus ring, Studio re-skin).
3. P0-3 and P0-4 (one cheat-sheet frame and one entry component).
4. P1-2 and P1-3, then the rest.
