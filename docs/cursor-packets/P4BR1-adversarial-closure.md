# P4BR1 — Conversation/recorder adversarial closure

Close every P2 in `research/cursor-execution/P4B-composer-review-result.json`:

1. Playback `play()` rejection and `audio.onerror` tests → stable `PlaybackError`, no throw.
2. Dispose during active recording, then stale `onstop`/data callbacks → no finalized/ready resurrection; track stopped.
3. Active playback + replace/retry/start-recording URL ownership: prove no premature revoke and eventual revoke after playback/cleanup. Correct implementation if test exposes a bug.
4. Guided recognition and substitution reveal/hint emit `partial`, never `correct`.
5. Correct submit without explicit Continue does not unlock next level.
6. Real `SpokenRolePlayLevel` behavior with mocked recorder state: no completion until record+playback+self-check; then exactly one schema-valid `recordingCycle`; repeated actions do not duplicate.
7. Bind detail-projection conversation level IDs/order to `assertExactConversationLevelIds` and the central ID constant.
8. Prevent the first-paint no-op microphone button: actions disabled until controller ready (with honest initializing status), or safely initialize synchronously. Test behavior.

Run all P4B gates and write `research/cursor-execution/P4BR1-worker-report.md`. Keep scope narrow. No plan/register/resources/archive/samples/media edits, invention, scoring, gate weakening, commit/push, or approval claim.
