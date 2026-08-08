# Quality and Acceptance Gates

## Gate 1 — source/content

- [ ] Every Alpha object has stable ID, type, scope and source priority.
- [ ] Required fields resolve to verified assertions.
- [ ] Coursebook/workbook/glossary page and exercise references are present.
- [ ] Teacher 48-job rows reconcile to the note and image.
- [ ] Alternative job terms are separate linked concepts.
- [ ] German spelling, capitalization, articles, plurals and conjugations pass human review.
- [ ] Lesson 3+/A1.2/localized audio scope firewall passes.
- [ ] Referential integrity, duplicate and unresolved-gap validators pass.

## Gate 2 — media

- [ ] Every core form/model sentence has approved audio or documented blocking gap.
- [ ] Generated audio text, voice, rate, checksum and review status are in the manifest.
- [ ] `node tools/audit-alpha-tts.mjs` passes with identical manifest/disk sets and zero technical failures; its human-listening gate is closed separately.
- [ ] Normal and study-speed playback are intelligible and pitch-safe.
- [ ] Workbook audio is matched by filename + transcript + exercise.
- [ ] Source and generated audio are not mislabeled.
- [ ] Infographic/image variants exist for desktop/mobile and have alt descriptions.
- [ ] No textbook/teacher art is accidentally published as original platform art.

## Gate 3 — learning behavior

- [ ] Lesson stages follow the mandatory loop and resume correctly.
- [ ] Lessons and hubs expose the same canonical objects without drift.
- [ ] Recognition, recall, listening, form and production attempts emit correct events.
- [ ] Page views/MCQ alone cannot produce Mastered.
- [ ] Difficult/tagged/failed items enter an appropriate review mission.
- [ ] Review scheduling persists across reload/export/import.
- [ ] Games explain errors and preserve German orthography.

## Gate 4 — functional journeys

Required E2E scenarios:

1. new learner onboarding → audio test → Lesson 1 start;
2. Lesson 1 greeting visual → name Q&A → recording → checkpoint → hub backlink;
3. direct Lesson 2 selection → prerequisite recommendation → continue;
4. profession card masculine/feminine/plural/audio/tag/review;
5. number listening and answer;
6. occupation Q&A casual/formal builder and recording;
7. teacher-professions collection filter → game → review deck;
8. vocabulary/verb/grammar/phrase/listening hubs learned/all filters;
9. review session pause/reload/resume;
10. offline core lesson and cached audio;
11. microphone permission denied and navigation during permission/recording;
12. invalid/missing media fails honestly.

## Gate 5 — accessibility

- [ ] Automated checks have no serious/critical violations.
- [ ] Full primary journeys work with keyboard only.
- [ ] Focus order, dialogs/drawers, tabs and pressed states are correct.
- [ ] Semantic colors also have label/shape/text.
- [ ] Contrast meets WCAG 2.2 AA target.
- [ ] 200% zoom and 360px reflow do not lose content/actions.
- [ ] Reduced motion disables nonessential animation.
- [ ] Audio controls and transcript reveal are screen-reader understandable.
- [ ] Touch targets are suitable and bottom navigation does not obscure controls.

## Gate 6 — responsive/visual

Visual baselines at minimum:

- desktop 1440×1000;
- tablet 820×1080;
- mobile 390×844 and 360×800.

Check dashboard, lesson overview, one learning activity, vocabulary, verb, Q&A, hub, game and review at each relevant size. No unexpected horizontal page overflow. Dense infographics must reflow or pan within a labelled region.

## Gate 7 — engineering

- [ ] Typecheck, lint, unit, schema, content and production build pass.
- [ ] Tests are portable; no developer-specific absolute imports or browser paths.
- [ ] No console errors, hydration mismatch or unhandled promise rejection.
- [ ] Media/player/recorder clean up on unmount and navigation.
- [ ] Metadata uses a validated canonical origin.
- [ ] Git worktree is clean after committed release artifacts.
- [ ] Independent code review has no unresolved high-severity finding.

## Pronunciation acceptance

At least two listening passes are required for each generated batch: a text/form accuracy pass and a naturalness/consistency pass. High-risk items include umlauts, `ch`, `r`, final consonants, `-in/-innen`, plural stem changes, profession stress, names/countries and connected-speech questions.

## Release evidence bundle

- validated content/media manifests and gap report;
- test outputs;
- viewport screenshots;
- audio QA summary;
- source coverage matrix;
- known limitations;
- deployed private URL and version/commit.
