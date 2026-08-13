# P3DR1 — Detail artifact integrity and audio-affordance honesty

## Scope

Remediate only the two P2 findings in `research/cursor-execution/P3D-composer-review-result.json`. Preserve all P3D behavior and prior P3A/P3B/P3C gates.

## Required fixes

1. Make runtime loading of `learner-details.json` fail closed on canonical content tampering, not only structure/counts.
   - Pin exact vocabulary representative fields for `lex:architekt`, including `der Architekt`, related `die Architektin`, published stem/suffix relationship, and empty plural arrays with the approved gap state/copy.
   - Pin the exact seven `(person, form)` pairs for `verb:sein` in canonical order.
   - Pin the exact informal Q&A question and three answer realizations for `qa:profession-casual-main`.
   - Also validate every representative ID/kind/canonical path and exact representative set.
   - Prefer a small centralized canonical contract derived from validated publication/projection constants; no review source values or paths may enter the client artifact.
   - Assert the generated projection before writing it.
   - Add adversarial tests that independently mutate each content family and prove rejection with no leaked value in error messages.

2. Never render a fake enabled pronunciation control.
   - Until a safe public approved-audio URL contract and working playback exist, every state must remain disabled/non-interactive with honest status copy.
   - The current `pending-review` copy/semantics must remain exact.
   - Add behavior tests proving even a synthetic `approved` state cannot render an enabled nonfunctional Play button.

## Gates

- `npm run check`
- `npm run build:web`
- `npm run audit:prod`
- `npm run smoke:web-routes`
- Write `research/cursor-execution/P3DR1-worker-report.md` with exact files, adversarial tests, commands, and gaps. Do not claim approval.

## Boundaries

No plan/register edits, no resources/archive/samples/media writes, no invention of German, no TTS promotion, no commit/push, no gate weakening.
