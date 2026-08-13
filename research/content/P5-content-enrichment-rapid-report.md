# P5 Rapid Learner-Content Enrichment Report

## Outcome

The generated learner-safe enrichment projection is ready at:

`platform/apps/web/generated/enrichment/learner-content-enrichment.json`

It is an integration artifact for page/card enrichment, not a claim that all curriculum media or source fields are complete. It projects only validated `published` objects and deliberately excludes the review-only teacher collection.

## Exact projected coverage

| Surface | Count | State |
|---|---:|---|
| Lessons | 2 | published learner scope |
| Learner activities | 23 | every currently routeable Lesson 1–2 activity mapped |
| Published core profession cards | 26 | 13 masculine/feminine pairs |
| Core profession pairs | 13 | linked by published `person-form-of` relationships |
| Teacher source rows excluded | 48 | review-only |
| Teacher lexemes excluded | 86 | review-only |

Every mapped activity includes lesson/stage/mode placement, published content targets where resolvable, relationship IDs, skill dimensions, practice eligibility, section slots, media slots, and explicit gap states. Every core profession card includes source-backed German display form and English gloss, article, gender, singular, person-form relation, plural state, lesson/activity links, game/review capability states, and media/infographic slots.

## Honest gaps

| Gap | Count | Consequence |
|---|---:|---|
| Core profession plurals absent from the published Lesson 2 lexemes | 26 | plural forms are empty and `plural-forge` is disabled |
| Core profession pronunciation candidates awaiting human listening review | 26 | audio/spoken-repeat remain pending-review |
| Core profession illustrations absent | 26 | picture-match remains disabled |
| Activities with no publishable content target IDs | 4 | alphabet, both workbook-listening activities, and numbers remain explicit content-link gaps |
| Published activities with source `conceptIds` | 0 | mappings are conservatively derived from the approved activity contract plus published lesson membership and identified as such |
| Published profession card templates | 0 | cards are concept-eligible, but scheduler readiness remains false |
| Published grammar concepts | 0 | no grammar concept is invented for enrichment |

The review-only teacher deck is not silently promoted. Some teacher-source labels overlap core published Lesson 2 concepts; those concepts appear only through their independent core publication evidence. Teacher row/group identifiers and teacher collection membership never enter the artifact.

## Safety and provenance boundary

The artifact contains no assertion values/IDs, source paths, private paths, checksums, raw media paths, rights-gated URIs, HTML, secrets, or credentials. Source evidence is reduced to learner-safe priority, published-field status, and lesson IDs. Audio exposure is only a capability state; no candidate asset ID or file path is emitted.

## Executable verification

`platform/tests/web/p5-content-enrichment.test.ts` proves:

- exact activity/profession/pair/exclusion/gap counts;
- byte-for-byte deterministic generated output;
- every target and relationship resolves to the published learner graph;
- every person-form relation is bidirectional and source-backed;
- absent plural/media/template data remains unavailable;
- private/source/audio/HTML/review-only leak patterns are rejected;
- tampered counts and duplicated array/index data fail closed.

## Next integration step

UI work may consume this projection to replace shell placeholders with structured sections and disabled/pending states. It must not convert pending or missing states to available. Content owners can later close the gaps by publishing verified plurals, attaching approved image/infographic assets, approving pronunciation audio, and publishing explicit activity concept/card-template relationships; regeneration will then expose the resulting capabilities without changing page code.
