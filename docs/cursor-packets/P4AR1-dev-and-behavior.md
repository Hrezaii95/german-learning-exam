# P4AR1 — Dev parity and behavioral game tests

Remediate the two P2 findings in `research/cursor-execution/P4A-composer-review-result.json`, plus the safe P3 hygiene if naturally adjacent.

1. Align default local dev with the production module resolver. Prefer `next dev --webpack` because production is explicitly webpack. Add a bounded executable dev smoke that starts the default dev script on a controlled port, requests `/practice`, one enabled game, and the audio unavailable game, asserts HTTP/content, then reliably terminates only its child process. Wire it into a named gate; do not leave zombie processes.
2. Add genuine component/interaction behavior tests for selection, submit, reveal/hint, feedback, event emission, retry/reset, and audio/empty non-emission. Use React Testing Library + jsdom if needed, or extract and test actual component controllers only if the same controller is directly used by the components. Static markup/string grep alone is not sufficient.
3. Preserve keyboard/a11y semantics. Add behavioral keyboard activation where applicable.
4. Remove the impure render-time `emitAudioMatchAttempt` call. Centralize canonical route paths on `PRACTICE_GAME_IDS` and make renderer dispatch exhaustive if possible.

Run `npm run check`, production build/audit/smoke, and the new dev smoke. Write `research/cursor-execution/P4AR1-worker-report.md`. No plan/register/resources/archive/samples/media edits, German invention, gate weakening, commit/push, or approval claim.
