# P6 media completion audit

Audit date: 2026-08-13  
Scope: read-only audit of the current checkout; no asset generation and no web-code changes.  
Authoritative learner scope: `platform/apps/web/generated/learner-projection.json`, Lesson 1 and Lesson 2 published JSON, current media registries, public files, and media manifests.

## Executive verdict

Media readiness: **62/100 — visually credible for an alpha walkthrough, but not complete as a pronunciation-first learning product.** Activity pages have broad contextual coverage, but it is concentrated in eight reused illustration concepts. Individual vocabulary and phrase surfaces remain mostly text-only, every detail pronunciation control is intentionally disabled, 54 technically valid TTS candidates still await qualified listening approval, and four useful infographics exist only in the generation workspace rather than the public app.

The highest-value next action is not another general hero. It is a controlled **entity-media wave**: approve and bind pronunciation clips to stable entity IDs, then create mechanically crop-safe profession/vocabulary cards and missing semantic diagrams.

## Exact audited surface

| Surface | Authoritative count | Notes |
|---|---:|---|
| Published lesson activity routes | 23 | 12 in Lesson 1; 11 in Lesson 2 |
| Vocabulary hub records | 69 | 69/69 published lexemes across Lesson 1 and Lesson 2 |
| Published verbs | 4 | `sein`, `heißen`, `kommen`, `lernen`; six additional verb records remain review-only and were excluded |
| Published Q&A groups | 14 | Part of the requested 58 Q&A/phrase records |
| Published phrase patterns | 44 | 14 Q&A + 44 phrase patterns = 58 combined records |
| Representative detail pages | 3 | `lex:architekt`, `verb:sein`, `qa:profession-casual-main` |
| Public illustrations | 9 PNG | Eight activity concepts plus one architect-detail image |
| Public infographics | 3 SVG | Greetings, register/Q&A, verb endings |
| Public audio | 15 MP3 | Exact owner-approved workbook tracks only |
| Public media payload | 27 files / 27,422,661 bytes | 9 PNG + 3 SVG + 15 MP3; no hash-identical public duplicates |
| Generated TTS pool | 327 MP3 | 327 unique SHA-256 hashes; all candidate status, none public |
| Rapid TTS listening queue | 54 MP3 | Technical gate passed; human-listening gate pending |

## Activity-route coverage

### Aggregate

| Coverage type | Lesson 1 | Lesson 2 | Total |
|---|---:|---:|---:|
| Direct registered illustration | 10/12 | 9/11 | **19/23** |
| Direct registered infographic | 4/12 | 3/11 | **7/23** |
| Direct approved workbook audio | 2/12 | 3/11 | **5/23** |
| At least one public media type | 11/12 | 11/11 | **22/23** |
| No registered public media | 1/12 | 0/11 | **1/23** |

The one wholly unmediated activity is `activity:lesson-01-pronoun-verb-builder`. A code-native pronoun/person diagram is more appropriate than raster art.

### Route-by-route matrix

Legend: I = illustration, G = infographic, A = approved workbook audio, — = none.

| Lesson | Activity ID | I | G | A | Audit note |
|---|---|:---:|:---:|:---:|---|
| 1 | `activity:lesson-01-alphabet-listen-spell` | ✓ | — | ✓ | Name/origin hero is only indirectly related to spelling; audio is task-specific |
| 1 | `activity:lesson-01-checkpoint-summary` | ✓ | — | — | Reuses name/origin class scene; checkpoint lacks a distinct summary map |
| 1 | `activity:lesson-01-greeting-farewell-match` | ✓ | ✓ | — | Strong contextual visual; no approved phrase-level pronunciation |
| 1 | `activity:lesson-01-greetings-by-context` | ✓ | ✓ | — | Strongest visually complete Lesson 1 page |
| 1 | `activity:lesson-01-guided-intro-recording` | ✓ | — | — | Context present; no approved model clip attached to recording flow |
| 1 | `activity:lesson-01-heissen-sein-notice` | ✓ | ✓ | — | Reuses `arbeiten/sein` scene although `arbeiten` is not the target here |
| 1 | `activity:lesson-01-name-model-dialogue` | ✓ | — | — | Good context; no public dialogue-model audio |
| 1 | `activity:lesson-01-origin-aus-contrast` | ✓ | — | — | Globe/postcard cue works; lacks semantic `aus + country` diagram |
| 1 | `activity:lesson-01-pronoun-verb-builder` | — | — | — | Only activity with no registered public media |
| 1 | `activity:lesson-01-register-qa-builder` | ✓ | ✓ | — | Good social scene and register diagram; no approved Q&A audio |
| 1 | `activity:lesson-01-wellbeing-scale` | ✓ | — | — | Strong five-state system; requires mobile panel treatment |
| 1 | `activity:lesson-01-workbook-listening` | — | — | ✓ | Correctly audio-led; transcript remains publication-blocked |
| 2 | `activity:lesson-02-checkpoint-summary` | ✓ | — | — | Reuses personal-profile scene; no distinct learning map |
| 2 | `activity:lesson-02-core-professions` | ✓ | — | ✓ | Ensemble and stress audio are useful; gender/article diagram absent from public app |
| 2 | `activity:lesson-02-full-person-conjugation` | ✓ | ✓ | — | Good semantic diagram; contextual image is reused |
| 2 | `activity:lesson-02-numbers-0-100` | — | — | ✓ | Audio-led; missing code-native number-building visual and telephone UI illustration |
| 2 | `activity:lesson-02-person-form-morphology` | ✓ | — | — | Pair sheet helps recognition; generated morphology SVG is not public/integrated |
| 2 | `activity:lesson-02-personal-profile` | ✓ | — | — | Strong context scene; profile fields remain appropriately HTML |
| 2 | `activity:lesson-02-profession-qa-builder` | ✓ | ✓ | — | Strong visual/register support; no approved model dialogue |
| 2 | `activity:lesson-02-profile-reading-writing` | ✓ | — | — | Reuses profile scene; no document-reading visual state |
| 2 | `activity:lesson-02-relationship-status` | ✓ | — | — | Inclusive contextual cues; needs a semantic `nicht` contrast diagram |
| 2 | `activity:lesson-02-sein-arbeiten-contrast` | ✓ | ✓ | — | Strongest grammar/context combination in Lesson 2 |
| 2 | `activity:lesson-02-workbook-listening` | — | — | ✓ | Correctly audio-led; transcript remains publication-blocked |

## Detail, vocabulary, verb, Q&A, and phrase coverage

### Representative detail pages

| Detail | Illustration | Infographic | Playable pronunciation |
|---|:---:|:---:|:---:|
| `lex:architekt` | ✓ dedicated | — | **No** |
| `verb:sein` | ✓ shared | ✓ | **No** |
| `qa:profession-casual-main` | ✓ shared | ✓ | **No** |

Result: **3/3 have an illustration, 2/3 have an infographic, 0/3 have playable pronunciation.** `PronunciationControl` explicitly resolves every state, including `approved`, to unavailable until a safe URL/playback contract is implemented.

### Vocabulary hub: 69 records

- Dedicated per-record public illustration: **1/69** (`lex:architekt`).
- Dedicated per-record public pronunciation: **0/69**.
- Shared contextual coverage exists for greeting/wellbeing/profession families, but a learner cannot reliably use a shared hero as the recognition image for an individual vocabulary card.
- The 13-pair profession contact sheet covers 26 gendered profession forms conceptually, but it is one square raster sheet, not 26 independently addressable/card-safe assets. It does not raise dedicated-card coverage above 1/69 until deterministic cell derivatives and stable concept mappings exist.

### Published verbs: 4 records

- Dedicated/shared illustration mapping: **1/4** (`sein`).
- Infographic mapping: **1/4** (`sein`).
- Playable pronunciation: **0/4**.
- The generated TTS manifest is metadata-addressable for **4/4** published verb IDs, but all remain candidate-only.
- `heißen`, `kommen`, and `lernen` lack distinct action/context visuals. `arbeiten` and `wohnen` appear in instructional visuals but their verb records are review-only; they must not be presented as published verb-detail coverage.

### Q&A and phrase records: 58 total

- Q&A records with shared detail illustration/infographic behavior: **14/14 Q&A groups**, assuming the general Q&A detail resolver is used.
- Phrase-pattern records with a dedicated media mapping: **0/44**.
- Combined dedicated/shared visual mapping: **14/58**.
- Combined playable pronunciation: **0/58**.
- Full TTS manifest ID metadata covers **7/14 Q&A IDs**, **0/44 phrase IDs**.
- Rapid 54-clip queue ID metadata covers **6/14 Q&A IDs**, **0/44 phrase IDs**.
- The zero phrase-ID result is a manifest-design defect, not proof that no phrase text was synthesized: entries store `spokenText` and broad lesson concepts but frequently omit the stable phrase/lexeme ID needed for safe binding.

## Audio and accessibility findings

### Approved workbook audio

- Exactly **15/15** owner-approved files are present publicly and referenced by the workbook registry.
- They map to **5/23** activities: Lesson 1 alphabet/spelling and workbook listening; Lesson 2 numbers, core professions, and workbook listening.
- Audio files total **5,398,400 bytes**.
- The transcript projection covers all 15 tracks internally, but its status is `verified-internal-projection-publication-blocked`; transcript redistribution was not included in the audio approval. Therefore visible transcripts must remain blocked.
- Listening pages need a separate pedagogical decision for transcript/answer reveal timing even after rights approval.

### Generated TTS

- Full pool: **327** technically produced MP3s, **327 unique file hashes**, all `candidate-needs-listening-review`.
- Rapid queue: **54** technically passing candidates, all `pending-human-listening-review` and `blocked-until-human-listening-approval`.
- No TTS file is in `platform/apps/web/public`, which is the correct fail-closed state.
- One voice and one rate dominate the pool (`de-DE-KatjaNeural`, `+4%`). Even if clips pass individually, this creates monotony and lacks register/speaker variation for dialogues.
- Pronunciation is the product’s highest-stated priority; until a qualified German listening pass and working playback contract are complete, the current app cannot claim its central feature is operational.

## Visual quality, duplication, and integration problems

1. **Coverage inflation through reuse.** Nineteen activity routes use illustrations, but those routes draw from only **eight activity illustration concepts**. The name/origin scene is reused on five routes; the profile scene on four; the verb context on three; greetings and conversation on two each. Reuse is economical, but several pages feel like the same shell with different text.

2. **Context mismatch.** The `heißen` versus `sein` notice uses an illustration designed around `arbeiten` versus state. It adds visual richness but weakens semantic precision.

3. **Generated but stranded infographics.** Seven source SVG families exist under `media/generated/infographics`, but only three are public. The following high-value assets are not public/integrated: `gender-article-system-v1.svg`, `person-form-morphology-v1.svg`, `plural-patterns-and-gaps-v1.svg`, and `lesson-01-02-learning-map-v1.svg`.

4. **Profession-sheet addressability.** The 13-pair contact sheet is coherent, but mobile and card usage requires deterministic crops. Serving the entire 1254×1254 sheet for one vocabulary item is inefficient and visually ambiguous.

5. **Large unoptimized raster payloads.** The nine public PNGs total roughly **22 MB**; individual files range from **1.66 MB to 2.98 MB**. `RichLessonVisual` uses one PNG source, no `srcset`, no AVIF/WebP derivative, and `loading="eager"` on every activity/detail illustration. This is likely expensive on mobile and repeated navigation.

6. **No hash-identical public duplication.** The public bundle has zero duplicate-hash groups. Source/generated and public copies are deliberate deployment duplication, not duplicate network payloads.

7. **Style drift.** The assets share an editorial direction but vary in line weight, rendering density, and composition: the profession overview is a cinematic ensemble, the pair sheet is a clean contact grid, and the small SVGs are minimal diagrams. A formal illustration token sheet is needed before scaling from 9 to dozens of cards.

8. **Infographic text scale.** Infographics are exposed in a keyboard-focusable scroll viewport and have text alternatives, which is good. They still require 390 px and 768 px rendered checks to ensure embedded SVG text is readable without excessive two-axis panning.

## Responsive and accessibility requirements

- Produce AVIF/WebP derivatives at approximately 480, 768, 1200, and source width; retain PNG only as fallback where needed.
- Switch non-critical images to lazy loading. Only the actual above-the-fold hero should be eager/high priority.
- Define per-breakpoint focal positions, not one `objectPosition` for every width.
- For five-state wellbeing, use a horizontally scrollable five-card system or pre-cut panels on mobile; a single cover crop destroys the scale meaning.
- For the profession sheet, create deterministic cell derivatives and bind each to exact masculine/feminine IDs; preserve the whole sheet only for the overview.
- Keep German labels, articles, color semantics, conjugation forms, and answers in HTML. Images remain context/memory cues.
- Preserve meaningful alt text; do not repeat adjacent captions verbatim. For decorative repeated cards, use empty alt after an accessible heading provides the same meaning.
- Add keyboard-operable audio controls with play/pause, 0.8×/1× rate, current state announcements, error recovery, and no autoplay.
- Test at 1440, 768, and 390 CSS pixels for crop loss, embedded-text readability, layout shift, focus visibility, reduced motion, and screen-reader naming.

## Prioritized next-wave generation manifest

This is a planning manifest, not authorization to generate or publish.

| Priority | Wave ID | Deliverable family | Count | Exact scope | Acceptance gate |
|---:|---|---|---:|---|---|
| P0 | `AUD-QA-54` | Qualified German listening decisions for existing rapid TTS | 54 reviews, no new generation | Every row in `rapid-preview-tts-candidates.json` | Two-axis decision per clip: linguistic accuracy/form and naturalness/pace; reject/regenerate list recorded |
| P0 | `AUD-BIND-V1` | Stable audio binding manifest | 1 manifest | 69 lexemes, 4 published verbs, 14 Q&A, 44 phrases | Every approved clip maps to exact stable IDs and spoken text; no lesson-only binding where entity ID exists |
| P0 | `AUD-PLAYBACK-V1` | Public approved pronunciation set | Variable after review | Representative details first, then all published entities | Only listener-approved clips copied public; hashes retained; working play/pause/rate/error states verified |
| P1 | `VIS-PROF-CROP-26` | Deterministic profession card derivatives | 26 cards | The 13 published masculine/feminine pairs only | Exact grid-cell mapping, consistent crop, 1:1 and 4:3 derivatives, no review-only profession leakage |
| P1 | `VIS-LEX-FAMILY-CORE` | Individual vocabulary context-card wave | 20–30 cards | Greetings, wellbeing, identity/origin, profile nouns, and non-profession high-frequency published lexemes | Each asset maps to one lexeme or explicit small synonym set; 1:1/4:3 crop safety; semantic text stays HTML |
| P1 | `INFO-PUBLISH-4` | Integrate existing semantic SVG families | 4 | Gender/article, person-form morphology, plural patterns/gaps, Lesson 1–2 learning map | Content authority review, SVG text/alt check, 390/768/1440 render pass |
| P1 | `INFO-PRONOUN-PERSON` | New code-native pronoun/person builder | 1 responsive component/diagram | `activity:lesson-01-pronoun-verb-builder` | Covers `ich/du/er-sie-es/wir/ihr/sie-Sie`; no rasterized essential text; keyboard and screen-reader equivalent |
| P1 | `INFO-NUMBERS-100` | Number-construction and telephone listening visual | 1–2 diagrams | `activity:lesson-02-numbers-0-100` | Correct German inversion/structure, responsive, listening answer leakage controlled |
| P2 | `VIS-VERB-3` | Original contextual verb scenes | 3 | Published `heißen`, `kommen`, `lernen` | Action/meaning unambiguous; does not imply review-only publication; responsive 3:2 and 1:1 crops |
| P2 | `INFO-AUS-COUNTRY` | Origin/preposition semantic diagram | 1 | `activity:lesson-01-origin-aus-contrast` | Only published countries/examples; accessible HTML alternative |
| P2 | `INFO-NICHT-PROFILE` | Profile negation contrast diagram | 1 | `activity:lesson-02-relationship-status` | Only taught statement patterns; inclusive examples; text alternative |
| P2 | `VIS-DIALOGUE-VARIANTS` | Distinct dialogue context scenes | 3 | Name dialogue, register Q&A, profession Q&A | Varied participants/register contexts; no embedded speech text; avoids one-scene repetition |
| P2 | `VIS-CHECKPOINT-MAPS` | Lesson checkpoint overview maps | 2 | Lesson 1 and Lesson 2 checkpoint routes | Represents the whole lesson rather than reusing one subtopic scene; labels remain HTML |
| P3 | `RESP-DERIVATIVES` | Responsive image build output | 9 current + all new assets | Public illustration corpus | AVIF/WebP sizes, intrinsic dimensions, focal metadata, payload budget and visual regression proof |

## Explicit exclusions

- Do not generate or expose visuals/audio for the review-only verb records `wohnen`, `leben`, `haben`, `arbeiten`, `machen`, or `studieren` as if they were published verb-detail content. They may appear only where an already-published activity explicitly teaches a sentence pattern.
- Do not include the teacher-professions deck or review-only profession collection in learner card generation.
- Do not publish source transcript text until redistribution authority is explicitly extended to transcripts.
- Do not treat technically valid TTS, file existence, or a clean hash as pronunciation approval.

## Evidence checked

- `platform/apps/web/generated/learner-projection.json`
- `platform/content/published/lesson-01.json`
- `platform/content/published/lesson-02.json`
- `platform/apps/web/generated/learner-details.json`
- `platform/apps/web/generated/learner-hubs.json`
- `platform/apps/web/generated/rapid-content/lesson-01-02.json`
- `platform/apps/web/lib/content/illustrations.ts`
- `platform/apps/web/lib/content/infographics.ts`
- `platform/apps/web/lib/audio/workbook-audio.ts`
- `platform/apps/web/components/media/RichLessonVisual.tsx`
- `platform/apps/web/components/media/InfographicPanel.tsx`
- `platform/apps/web/components/audio/PronunciationControl.tsx`
- `platform/apps/web/generated/audio/workbook-transcripts-lessons-01-02.json`
- Public illustration, infographic, and audio directories
- All JSON manifests under `media/manifests`
- Generated infographic, illustration, workbook-audio, and TTS inventories
- SHA-256 duplicate check across the public media bundle

## Evidence still missing

- Qualified German listening verdicts for the 54 rapid TTS candidates.
- Rendered responsive screenshots or browser traces at 1440/768/390 for every media family.
- Real-device network/performance measurements for the current 22 MB PNG corpus.
- Screen-reader and keyboard test evidence for the integrated media panels and audio player.
- Explicit transcript redistribution decision.

## Recommended immediate sequence

1. Run the 54-clip German listening gate and create a stable ID-binding decision file.
2. Publish only approved pronunciation clips and activate the three representative detail controls first.
3. Mechanically derive the 26 core profession cards from the reviewed pair sheet.
4. Review and integrate the four stranded semantic SVGs.
5. Add responsive image derivatives and run 1440/768/390 visual and performance gates before generating another broad hero wave.
