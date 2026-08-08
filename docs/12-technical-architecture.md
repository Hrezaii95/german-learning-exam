# Technical Architecture

## Alpha architecture

Use a responsive TypeScript/React application generated through the Sites project foundation, with a local-first content bundle and progress persistence. Lessons 1–2 do not require a graph database, search service or online TTS endpoint.

```text
Validated JSON content + media manifest
                 ↓
        content repository layer
                 ↓
 lesson engine / hub queries / card factory
                 ↓
 React route + component renderers
                 ↓
 local learner event store → derived mastery → review scheduler
```

## Boundaries

### Content package

Pure JSON plus schemas and deterministic validators. No React, no learner data. Exports typed accessors, indexes and scope-filtered manifests.

### Media package

Static files plus manifest. The app resolves IDs to URLs and can prefetch/cache; UI never constructs media filenames from German text.

### Learning engine

- resolves lesson stages and activities;
- generates eligible card instances from templates;
- grades normalized objective answers;
- emits typed attempt/exposure/audio/recording events;
- derives completion and mastery snapshots;
- requests scheduling decisions through an interface.

### UI

Renderers receive structured content and callbacks. Vocabulary/verb/Q&A screens cannot contain a second copy of course content. Shared primitives include AudioButton, Recorder, Morphology, RelationDrawer, TagControl, Feedback, ProgressBySkill and responsive shell.

### Persistence

Alpha stores settings, resume state, tags, notes, events, review state and optional recording blobs locally (IndexedDB preferred). A storage adapter allows later remote sync. Export/import is versioned JSON.

## Suggested project layout

```text
platform/
  app/
    routes-or-app-router/
    components/
      shell/
      learning/
      games/
      media/
      feedback/
    features/
      dashboard/
      lessons/
      hubs/
      review/
      progress/
    lib/
      content/
      learning-engine/
      review/
      persistence/
      audio/
      accessibility/
  content/ -> canonical content package or copied build artifact
  public/media/ -> generated/aligned publish bundle
  tests/
    content/
    unit/
    integration/
    e2e/
```

Adapt this to the Sites starter’s required folders; preserve boundaries even if exact directories differ.

## Content loading

Build-time validation produces compact indexes:

- by ID/type;
- by lesson and source priority;
- by collection/category;
- by relationship;
- normalized search terms;
- eligible activity/card templates;
- media lookup.

Do not ship raw PDFs, raw extraction text, rejected assertions or the full 387-track archive. Ship only the approved Alpha bundle.

## State and events

Use a single event schema with UUID, timestamp, session, activity, object/card IDs, skill dimensions, result, latency, hints, audio speed and version. Derived state is cached with a reducer version. Migrations preserve old events.

## Review scheduler

Wrap FSRS behind:

```ts
interface ReviewScheduler {
  preview(card: ReviewCardState, now: Date): RatingOptions;
  review(card: ReviewCardState, rating: ReviewRating, now: Date): ReviewResult;
}
```

No UI component imports FSRS directly.

## Offline and caching

- precache shell, content manifest, Lessons 1–2 core imagery/audio and current lesson assets within reasonable size;
- lazy-cache teacher profession media by collection with optional Download all;
- cache source listening tracks when the activity is opened/downloaded;
- progress writes locally without network;
- service-worker update is versioned and does not strand an active review session.

## Security/privacy

- no secrets in client code;
- microphone is gesture-gated;
- recordings remain local by default;
- HTML from content is not trusted; render structured tokens;
- import validation limits size/types and rejects unknown schema versions;
- canonical metadata origin is configured, not derived from attacker-controlled host headers;
- no analytics or third-party requests in the private Alpha unless explicitly approved.

## Performance budgets

- initial dashboard should not download all teacher audio/images;
- current activity audio is prefetched;
- route chunks and images are lazy where useful;
- responsive images use modern formats and explicit dimensions;
- avoid layout shift in heroes/cards;
- core interaction remains usable on a mid-range mobile connection after shell load.

## Future adapters

Keep interfaces for remote sync, AI pronunciation assessment, open conversation, content authoring and graph exploration. Do not build the services during Alpha and do not expose empty fake screens.
