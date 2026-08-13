# P5 Rapid Infographic Wave — QA Report

Date: 2026-08-13  
Owner: Codex media lane  
Scope: original local infographic assets for the current Lessons 1–2 publication and the review-only teacher professions collection

## Outcome

Produced seven reusable semantic SVG families plus seven 1200×720 PNG previews and one contact sheet. The family target was six; this wave adds the Lesson 1 greetings family because it is the clearest immediately deployable Lesson 1 visual.

| Family | Asset ID | SVG | Primary placements | Scope status |
|---|---|---|---|---|
| Gender/article | `info:system-gender-articles:v1` | `gender-article-system-v1.svg` | Lesson 2, vocabulary detail/hub/cards | mixed core + visibly labeled teacher example |
| Plural patterns/gaps | `info:l2-profession-plurals:v1` | `plural-patterns-and-gaps-v1.svg` | morphology, vocabulary detail, teacher deck | teacher examples review-only; core Ingenieur gap explicit |
| Person-form morphology | `info:l2-person-forms:v1` | `person-form-morphology-v1.svg` | Lesson 2 morphology, relation drawer/cards | core pairs published; lexical teacher pair labeled review-only |
| Verb endings | `info:l2-verb-patterns:v1` | `verb-endings-regular-special-irregular-v1.svg` | verb detail, Lesson 1/2 notice, review | published forms only |
| Q&A register | `info:l1-l2-qa-register:v1` | `qa-register-casual-formal-v1.svg` | Q&A detail, conversation, practice | published patterns only |
| Lesson map/progress | `info:l1-2-learning-map:v1` | `lesson-01-02-learning-map-v1.svg` | dashboard, lessons, checkpoints | core route plus optional separated teacher deck |
| Greetings/context | `info:l1-greetings-day:v1` | `greetings-context-day-v1.svg` | Lesson 1 overview/activity/cards | published Lesson 1 lexemes only |

Manifest: `media/generated/infographics/manifest.json`  
Rendered review sheet: `media/generated/infographics/previews/contact-sheet.png`

## Design and content controls

- Every SVG has a `1200 × 720` intrinsic size, `viewBox="0 0 1200 720"`, `preserveAspectRatio="xMidYMid meet"`, and a renderer-independent text alternative in the manifest.
- Every SVG has `role="img"`, one `<title>`, one `<desc>`, and `aria-labelledby="title desc"`.
- Teaching text remains live SVG text; it is not rasterized. PNG files are review/fallback previews, not the semantic source.
- German semantic color tokens match `docs/06-design-and-infographic-system.md`: masculine blue, feminine pink-red, neuter green, plural violet, regular teal, spelling adjustment amber, irregular magenta-red.
- Color is duplicated with article text, M/F/N/PL labels, stable shapes, REG/SPELL/IRR labels, or named suffixes.
- Published core and teacher review-only content are not visually conflated. Teacher examples are labeled `TEACHER DECK`, `REVIEW-ONLY`, or `optional · separate mastery` in the asset itself.
- No source-book, workbook, teacher-handout, original ChatGPT render, or Cursor mock illustration was copied. The three UI reference renders were inspected for layout intent only.
- The core `lex:ingenieur` plural is missing from the current published Lesson 2 bundle. The plural-family asset intentionally says it is pending and forbids guessing. This is a content gap, not an infographic failure.

## Automated validation evidence

Validation was run against the generated directory and the current `platform/content/published/*.json` authority.

| Check | Result |
|---|---:|
| SVG XML parse | 7/7 pass |
| Exact SVG dimensions/viewBox | 7/7 pass |
| Accessible title/description/role | 7/7 pass |
| External URLs/assets/fonts | 0 found |
| Script / `foreignObject` / active content | 0 found |
| Manifest SHA-256 match | 7/7 pass |
| Manifest asset IDs unique | 7/7 pass |
| Manifest paths unique | 7/7 pass |
| Concept/activity mappings resolve to current publication | 52/52 references pass |
| PNG previews | 7/7 at 1200×720, PNG |
| Contact sheet | 1 at 1440×864, PNG |

The XML/external-reference scan ignores the mandatory SVG namespace URI while rejecting other `http(s)`, `href`, `xlink:href`, `data:`, `@import`, external `url(...)`, `<script>`, and `<foreignObject>` content.

## Visual inspection

The seven rendered previews were inspected together through the contact sheet and individually at full resolution. The assets share:

- the calm off-white workspace, white teaching cards, dark ink and restrained violet brand accent from the approved direction;
- consistent typography, corner radii and annotation grammar;
- legible desktop composition with large semantic blocks that can scale into a horizontal-scroll or stacked mobile teaching region;
- no clipping after the person-form review badge was moved out of the long lexical pair.

## Exact gaps and follow-up

1. These assets are authored and QA-ready but are not wired into the web application by this media-only task. Cursor/UI must copy or serve the manifest-selected files through the media package and place the manifest text alternative in narrow/reflow layouts.
2. The manifest is a media-lane handoff manifest, not yet a canonical `MediaAsset` publication fragment. Publication still requires the project content/media validator and appropriate review state.
3. Audio hotspots are not embedded. The greetings asset explicitly says audio attaches in the app; audio IDs must come from the separately reviewed TTS/listening manifest.
4. Teacher-professions lexemes remain `review`, not learner-published. Graphics can enrich a gated teacher collection but must not make its cards public until German/content review closes the existing gaps.
5. The current published core profession nouns do not carry verified plural values. `Ingenieur` is shown as the representative gap. UI should apply the same fail-closed pattern to any other missing plural.
6. This rapid wave uses diagrams and typographic teaching objects, not job character illustrations. Original profession portraits/card crops remain a separate generation wave.
7. This rapid wave covers seven families, not the full infographic inventory in `docs/06`. Still outstanding include alphabet sounds, introduction flow, pronoun roles, countries with `aus`, wellbeing scale, numbers 0–100, profile/status, work prepositions, negation, full 48-profession categorized overview, and printable two-minute lesson sheets.

## Integration guidance

- Consume assets by manifest ID, never by constructing filenames from German text.
- Prefer the SVG source in the live app; use PNG only where a raster fallback is explicitly needed.
- Render within `width: 100%; height: auto;` and do not crop semantic edges with `object-fit: cover`.
- Below the component’s readability breakpoint, either retain the full SVG in horizontal teaching scroll or present the manifest text alternative plus focused sub-panels. Do not shrink the full 1200-wide diagram until labels are unreadable.
- Do not recolor grammatical regions or reuse their colors as decoration.
- Preserve `title`, `desc`, and the visible review-only/content-gap badges.
