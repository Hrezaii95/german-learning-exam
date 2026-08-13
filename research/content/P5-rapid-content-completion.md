# P5 rapid content completion

## Delivered

- One learner-safe JSON projection for Lessons 1–2.
- Reusable server-renderable sections for greetings, Q&A, published verb paradigms, article/gender/person-form learning, practice prompts, and honest gap states.
- Seven published greetings/farewells, eleven published Q&A groups, three published verb paradigms, and all thirteen published core profession pairs (26 singular lexemes).
- A stable visual grammar using the product tokens: masculine blue/square, feminine pink/circle, neuter green/diamond, plural purple/double marker. Color is always backed by article text, gender text, and shape.
- Six retrieval prompts whose target strings are already published learner fields.

## Source mapping

| Rapid section | Learner-safe authority | Included |
|---|---|---|
| Greetings | Published Lesson 1 lexemes | 7 greeting/farewell cards |
| Introductions and Q&A | Published Lesson 1 and 2 phrase patterns/Q&A pairs | name, origin, wellbeing, profession, work, residence |
| Verbs | Published Lesson 1 verb fields | `sein`, `heißen`, `kommen` and their published forms |
| Profession system | Published Lesson 2 lexemes and person-form relations | 13 masculine/feminine core pairs |
| Practice | Derived only from the same published strings | choice, build, and response prompts |

## Enforced boundaries

- Lesson 2 verb records for `wohnen` and `arbeiten` remain in review, so their paradigms are not copied into learner content. Their separately published sentence patterns are available in Q&A, and a learner-facing gap explains that two requested paradigms are awaiting publication.
- Profession plural fields are absent from the published learner graph. The UI shows a missing state and does not infer plural rules.
- The review-only teacher profession deck is excluded entirely.
- No original resource paths, audio filenames, hashes, assertions, private identifiers, or HTML are present in the rapid artifact.
- Profession pronunciation remains explicitly pending human listening approval.

## Integration

Import `RapidContentSections` from `components/content/rapid-learning-sections.tsx` for a complete batch, or import its named sections individually. No route, page, stylesheet, or existing component was changed by this slice.

