# Content Model and Schemas

## Design goals

- Encode each concept once and render it in lessons, hubs, search, games and review.
- Preserve multiple source assertions without duplicating the concept.
- Add teacher/personal material without migrations.
- Keep learning content separate from learner state.
- Make all relationships inspectable and validateable.

## Canonical entities

### `Lesson`

```ts
type Lesson = {
  id: `lesson:${string}`;
  number: number;
  titleDe: string;
  titleEn: string;
  cefr: "A1";
  communicativeGoals: string[];
  prerequisiteLessonIds: string[];
  stages: LessonStage[];
  collections: LessonCollectionLink[];
  summaryInfographicId: string;
};
```

`LessonStage` contains stable activity IDs, estimated minutes, skill targets, required/optional status and completion rule. It references content; it does not copy content fields.

### `Lexeme`

```ts
type Lexeme = {
  id: `lex:${string}`;
  lemma: string;
  partOfSpeech: string;
  noun?: {
    gender: "masculine" | "feminine" | "neuter";
    article: "der" | "die" | "das";
    singular: string;
    plurals: Array<{ form: string; patternIds: string[] }>;
    personFormGroupId?: string;
  };
  meanings: Meaning[];
  pronunciation: PronunciationRef;
  exampleIds: string[];
  relationIds: string[];
  sourceAssertionIds: string[];
  mediaIds: string[];
  cardTemplateIds: string[];
  publication: PublicationState;
};
```

Profession forms are independent lexemes linked by `person-form-of`. `der Koch` and `die Köchin` do not share one plural field.

### `Verb`

Contains infinitive, separability/reflexivity, meanings/uses, present forms by person, stem/morphology segments, example IDs, grammar links, collocations, audio and source assertions. A conjugated form is addressable for audio/review but belongs to one verb entity.

### `GrammarConcept`

Contains learner-facing title, prerequisites, notice target, structured rule steps, examples, common error tags, infographic, activity templates and source assertions. Grammar stores only the taught scope; it does not become a full reference grammar accidentally.

### `PhrasePattern` and `QAPair`

`PhrasePattern` stores a communicative intent, register, fixed tokens, slots and accepted realizations. `QAPair` links a question pattern to one or more answer patterns and provides substitution sets, dialogue roles, audio and grammar links.

```ts
type Slot = {
  id: string;
  role: "person" | "name" | "country" | "city" | "profession" | "age" | "status" | "free-text";
  acceptsConceptIds?: string[];
  required: boolean;
};
```

### `Dialogue` / `ListeningAsset`

A dialogue has turns with speaker, German text, translation, audio segment, linked concepts and task prompts. `ListeningAsset` links a media item to transcript segments and exercise/source evidence. Whole source tracks and derived time segments remain distinct.

### `Collection`

A named set such as `Lesson 2 core professions`, `Teacher professions`, `Countries with articles` or `Difficult this week`. Static collections list concept IDs; dynamic collections store a query. A collection has lesson links and source priority.

### `LearningActivity`

```ts
type LearningActivity = {
  id: `activity:${string}`;
  lessonId?: string;
  mode: "see" | "hear" | "notice" | "repeat" | "recall" | "use" | "check" | "review";
  renderer: string;
  conceptIds: string[];
  prompt: StructuredPrompt;
  answerSpec?: AnswerSpec;
  skillDimensions: SkillDimension[];
  completionRule: CompletionRule;
};
```

### `Source`, `SourceLocation`, `SourceAssertion`

```ts
type SourceAssertion = {
  id: `assert:${string}`;
  sourceId: string;
  location: { page?: number; printedPage?: number; exercise?: string; track?: string; time?: [number, number]; noteRow?: number; region?: string };
  subjectId: string;
  field: string;
  value: unknown;
  extraction: "manual" | "pdf-text" | "ocr" | "filename" | "transcript-align" | "generated";
  confidence: number;
  status: "candidate" | "verified" | "rejected" | "superseded";
  reviewer?: string;
  reviewedAt?: string;
};
```

The published object records which assertion supplied each source-controlled field.

### `MediaAsset`

Stores kind, paths/variants, checksum, locale, transcript/spoken text, speaker/voice, origin (`publisher`, `generated`, `recorded-user`), parent track, timing, speed, license/use basis, review status and concept links.

### Learner-state entities

- `ExposureEvent`
- `AttemptEvent`
- `AudioEvent`
- `RecordingEvent` (metadata only by default; recordings may remain local)
- `ReviewEvent`
- `ConceptState` (derived snapshot/cache)
- `ReviewCardState`
- `TagAssignment`
- `PersonalNote`
- `LessonResumeState`
- `Settings`

Events are append-only. Derived mastery/status may be rebuilt.

## Relationship vocabulary

Required edge types:

`introduced-in`, `practised-in`, `source-of`, `person-form-of`, `plural-of`, `conjugation-of`, `uses-grammar`, `answer-to`, `slot-accepts`, `example-of`, `appears-in-dialogue`, `appears-in-audio`, `related-concept`, `prerequisite-of`, `member-of-collection`, `review-card-for`, `infographic-for`.

Edges may carry source assertion, lesson context, order, strength and note. The initial implementation can use indexed adjacency data; a graph database is unnecessary for Lessons 1–2.

## Source priorities

```ts
type SourcePriority = 1 | 2 | 3 | 4;
// 1 official glossary/core; 2 course/workbook context;
// 3 teacher assigned; 4 personal enrichment
```

Priority controls learning filters/obligation, not correctness. Validation status is separate.

## Publication state

An object is publishable only if:

- required schema fields exist;
- all source-controlled values have verified assertions;
- scope firewall passes;
- canonical German and meaning are reviewed;
- required relationships resolve;
- required media and infographic exist, or approved exceptions are documented;
- no duplicate canonical ID/form conflict remains.

## File layout

```text
content/
  schema/
  sources/
  lessons/lesson-01.json
  lessons/lesson-02.json
  lexemes/
  verbs/
  grammar/
  phrases/
  dialogues/
  collections/
  activities/
  assertions/
  manifests/content-manifest.json
media/
  manifests/media-manifest.json
  aligned/
  generated/
```

For Alpha, entities may be grouped into a few human-reviewable JSON files rather than one file per item, as long as IDs and validation remain stable.
