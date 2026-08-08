# Design and Infographic System

## Visual character

Premium, calm, highly legible and illustration-led. Use the refined mockup’s dark indigo shell, warm off-white workspace, generous white cards and restrained purple brand accent. Avoid childish confetti, excessive gradients, glass effects, stock-photo inconsistency and dense textbook tables.

## Semantic color tokens

Exact values may be tuned for contrast, but semantic roles never swap.

| Meaning | Token | Default | Required secondary cue |
|---|---|---:|---|
| Brand/action | `--brand` | violet `#6946E8` | action label/icon |
| Masculine singular | `--gender-m` | blue `#246BFD` | `M`, square badge, `der` |
| Feminine singular | `--gender-f` | pink-red `#E64C86` | `F`, round badge, `die` |
| Neuter singular | `--gender-n` | green `#2E9D68` | `N`, diamond badge, `das` |
| Plural | `--gender-pl` | violet `#7957D5` | `PL`, stacked badge, `die` |
| Regular morphology | `--rule-regular` | teal | `REG` / check |
| Spelling adjustment | `--rule-special` | amber | `SPELL` / exclamation |
| Irregular form | `--rule-irregular` | magenta-red | `IRR` / star |
| Correct | `--feedback-correct` | green | check + explanation |
| Incorrect | `--feedback-incorrect` | red | cross + explanation |

Gender colors are not generic card-decoration colors. Brand violet must be visually distinguishable from plural violet through context, label and shape.

## Typography and layout

- Sans-serif with strong German diacritic support; Inter or a metrically compatible local/system font.
- Minimum default body 16px desktop and mobile; dense metadata may use 13–14px with sufficient contrast.
- German target text is visually dominant; English support is secondary.
- Reading content max width approximately 72 characters.
- Spacing follows a 4px base; common gaps 8, 12, 16, 24, 32, 48.
- Cards use 16–24px radius and subtle elevation; nested cards use borders rather than stacked shadows.

## Infographic grammar

Every visual teaching object must answer:

1. What is the whole concept?
2. Which part should the learner notice?
3. What changed from one form to another?
4. How can the learner hear it?
5. Where can the learner practise it?

Annotations use stable shapes:

- underline = article or finite verb position;
- colored suffix capsule = added ending;
- outlined stem = unchanged base;
- amber bridge = inserted sound/letter;
- star = lexical irregularity;
- arrow = transformation, not simple association;
- dotted line = semantic relation;
- solid line = form/grammar dependency.

## Required infographic families for Lessons 1–2

| ID | Infographic | Required variants |
|---|---|---|
| `info:l1-greetings-day` | greetings by time/context and farewell | desktop, tablet, mobile, text alternative, audio hotspots |
| `info:l1-alphabet-sounds` | German alphabet plus Ä Ö Ü ß | responsive grid, per-letter audio |
| `info:l1-introduction-flow` | name/origin/wellbeing conversation tree | casual/formal, desktop/mobile |
| `info:l1-pronouns-roles` | ich/du/er/sie/Sie with people/context | non-color labels |
| `info:l1-singular-verbs` | heißen/sein/kommen/lernen form comparison | regular vs irregular emphasis |
| `info:l1-question-order` | W-word → verb → person → complement | statement contrast |
| `info:l1-countries-aus` | no-article vs article-bearing countries | aus / aus der / aus den |
| `info:l2-profile` | age, origin, residence, status, job | interactive profile fields |
| `info:l2-numbers-0-100` | number-building system | 0–20, tens, inversion pattern |
| `info:l2-core-professions` | official Lesson 2 profession set | semantic grouping and hotspots |
| `info:l2-teacher-professions` | all 48 handout professions | categorized overview plus collection covers |
| `info:l2-person-forms` | masculine→feminine patterns | regular `-in`, umlaut/stem change, lexical pair |
| `info:l2-profession-plurals` | plural pattern families | unchanged, `-e`, umlaut+`-e`, `-en`, lexical plural |
| `info:l2-full-conjugation` | wohnen/leben/haben/sein/arbeiten | six persons and pattern comparison |
| `info:l2-arbeiten-spelling` | arbeit- + e + st/t | approved sample behavior |
| `info:l2-work-prepositions` | `als`, `bei`, `in` and zero article after `sein` | examples and contrast |
| `info:l2-negation-nicht` | positive→negative profile facts | placement for taught patterns only |
| `info:l2-occupation-qa` | casual/formal job Q&A and alternatives | approved sample behavior |
| `info:l1-2-cheatsheets` | two-minute lesson summaries | print, desktop and mobile |

## Vocabulary illustration system

- Original, consistent character/scene style; no reuse of textbook art in the hosted build.
- Jobs share camera angle, lighting, proportion and background system so gender/person variants feel related.
- Do not encode profession stereotypes only through skin color, age or gender. Masculine/feminine grammatical forms may show different people, but the role’s tools/context remain stable.
- Each illustration has a transparent or quiet-background master, 1:1 card crop, 4:3 hero crop, thumbnail and alt description.
- Decorative visual detail must not obscure the tool/role that anchors meaning.

## Media-generation manifest

Codex produces each asset with:

```yaml
id: img:job:koch:v1
conceptIds: [lex:koch, lex:koechin]
promptVersion: 1
styleId: german-os-illustration-v1
formats: [webp, png]
ratios: [1:1, 4:3]
alt: "A cook in a professional kitchen holding a wooden spoon"
status: approved
reviewedAt: 2026-08-02
```

Cursor consumes the manifest; it does not alter prompts, recolor semantic regions or fabricate missing variants.

## Motion

Motion explains state or structure: active syllable, transformation arrow, answer placement, audio state and progress. Default 120–240ms. Autoplay teaching animations have pause/replay and are removed/reduced under `prefers-reduced-motion`.

## Accessibility

- WCAG 2.2 AA contrast target.
- Text/shape duplicates every color cue.
- Infographics have concise alt text plus a structured text equivalent for all teachable relationships.
- Zoom/reflow preserves labels at 200%.
- Hotspots have meaningful accessible names and visible focus.
- Audio-dependent activities have text alternatives; listening tests may intentionally hide transcript until answer but provide it afterward.
