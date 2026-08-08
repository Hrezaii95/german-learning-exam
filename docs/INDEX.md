# German Learning OS — Documentation Index

Status: implementation authority for Lessons 1–2  
Last updated: 2026-08-07

## Read order

Cursor or any implementation agent must read these documents in order. A later document may narrow an earlier one, but it may not silently contradict it.

| Order | Document | Purpose | Exit condition |
|---:|---|---|---|
| 1 | `00-project-brief.md` | Mission, scope, immutable principles, exclusions | Agent can state what Alpha is and is not |
| 2 | `00-session-decision-ledger.md` | Trace every requirement back to the 77-message ChatGPT session and later user decisions | No session requirement is treated as an optional guess |
| 3 | `01-agent-handbook.md` | Operating rules for Cursor/Codex and ownership split | Agent knows what it may implement and what media work must return to Codex |
| 4 | `02-product-requirements.md` | Testable product requirements | Every feature has an ID and acceptance statement |
| 5 | `03-learning-journey-and-mastery.md` | End-to-end learning loop, mastery model, unlocks, review | Progress is skill evidence, not page completion |
| 6 | `04-information-architecture-and-ux.md` | Navigation, hubs, routes, cross-linking, responsive behavior | Every object has a lesson path and a hub path |
| 7 | `05-screen-and-interaction-spec.md` | Required views, components, states, interactions | Cursor can implement screens without inventing UX |
| 8 | `06-design-and-infographic-system.md` | Tokens, grammar colors, infographic families, responsive exports | Visual grammar remains coherent across the app |
| 9 | `07-content-model-and-schemas.md` | Canonical entities, IDs, relationships, progress events | Content can be encoded once and rendered many ways |
| 10 | `08-source-ingestion-and-provenance.md` | Book/workbook/glossary/teacher/audio pipeline | Every published field is traceable and scoped |
| 11 | `09-audio-and-pronunciation.md` | Source audio, generated TTS, playback, recording, future scoring | Pronunciation cannot regress into device-dependent robotic speech |
| 12 | `10-review-and-gamification.md` | Hubs, card generation, games, scheduling, rewards | Review serves mastery rather than empty XP |
| 13 | `11-lessons-01-02-content-spec.md` | Exact Lesson 1–2 and teacher-extra coverage | Scope is reconciled to official sources |
| 14 | `12-technical-architecture.md` | Application boundaries, persistence, offline behavior, contracts | Implementation has explicit component and data boundaries |
| 15 | `13-quality-and-acceptance.md` | Content, UI, audio, accessibility and release gates | “Done” means all gates pass |
| 16 | `14-cursor-execution-plan.md` | Short, ordered coding packets for Cursor | Cursor can execute without redesigning or fabricating media |
| 17 | `15-roadmap-and-backlog.md` | Alpha sequence and deliberately postponed work | Future work cannot leak into Alpha claims |
| 18 | `16-tts-provider-operations.md` | Provider selection, secrets, smoke-test findings and resilient generation policy | Voice remains consistent without exposing keys or evading quotas |
| 19 | `17-current-state-and-completion-matrix.md` | Requirement-by-requirement implementation evidence and gaps | The showcase cannot be mistaken for the completed Alpha |
| 20 | `18-requirement-traceability.md` | Every MUST mapped to UX, data/engine contracts and stable acceptance evidence | Cursor packets cannot silently omit a requirement |
| 21 | `DECISIONS.md` | Accepted architectural and product decisions | Changes require a superseding decision record |
| 22 | `REFERENCES.md` | Internal evidence and external standards | Claims and implementation choices have inspectable sources |

## Authority order

1. User’s latest explicit instruction.
2. Official Momente glossary for core vocabulary and first-occurrence lesson assignment.
3. Coursebook and workbook for learning sequence, context, and exercises.
4. Official transcript and correctly matched German workbook audio.
5. Teacher handout and learner notes for required enrichment.
6. The approved functional sample and refined UI render for interaction/design direction.
7. Picture dictionary and generated enrichment only when labeled as such.

The archived Cursor demo is never an authority. It may be inspected only as failure evidence.

## Working artifacts

- Immutable inputs: `../resources/original/`
- Original conversation and UI evidence: `../resources/project-context/`
- Failed implementation quarantine: `../archive/cursor-demo-2026-07-30/`
- Approved interaction baseline: `../samples/german-learning-ui-samples/`
- Clean implementation: `../platform/` once created
- Canonical encoded content: `../content/`
- Generated media: `../media/generated/`
- Source-aligned derivatives: `../media/aligned/`

## Change rule

Any change that affects the learning loop, scope, content authority, gender system, audio authority, mastery, routing, or agent ownership requires an entry in `DECISIONS.md` before code changes.
