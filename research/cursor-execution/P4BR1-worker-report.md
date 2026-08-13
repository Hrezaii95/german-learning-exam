# P4BR1 worker report — Conversation/recorder adversarial closure

Status: implementation evidence returned; **no approval claimed**  
Packet: `docs/cursor-packets/P4BR1-adversarial-closure.md`  
Prior review: `research/cursor-execution/P4B-composer-review-result.json` (not approved; eight P2 items)  
Model: `cursor-grok-4.5-high` (non-Fast)  
Date: 2026-08-13

## Exact changed paths

Write-scoped:

| Path | Change |
|---|---|
| `platform/apps/web/lib/recorder/createMediaRecorderController.ts` | Stop active playback before mid-playback replace/`startRecording`; `play()` reject / `audio.onerror` clean via `stopAudioElement` → stable `PlaybackError` |
| `platform/apps/web/components/conversation/SpokenRolePlayLevel.tsx` | Mic/recorder actions disabled until controller ready; honest initializing status (`data-recorder-initializing`) |
| `platform/apps/web/lib/content/detail-project.ts` | `conversationLevels` built from `CONVERSATION_LEVEL_IDS` + `assertExactConversationLevelIds` |
| `platform/tests/web/p4b-recorder-lifecycle-behavior.test.ts` | Adversarial: play reject, `onerror`, dispose+stale `onstop`/data, mid-playback start/retry URL ownership |
| `platform/tests/web/p4b-conversation.test.ts` | Guided/substitution reveal → `partial`; detail projection ID bind |
| `platform/tests/web/p4b-conversation-behavior.test.ts` | Correct submit without Continue keeps next level locked |
| `platform/tests/web/p4b-spoken-behavior.test.ts` | Mocked `useMediaRecorder`: incomplete gate, one `recordingCycle`, initializing disabled mic |
| `platform/tsconfig.json` | Exclude new spoken behavior test from root tsc |
| `research/cursor-execution/P4BR1-worker-report.md` | This report |

Not edited: plans, register, packet docs, content/learning package schemas, resources, archive, samples, media, governance.

## P2 closures (from P4B Composer review)

| # | Finding | Resolution |
|---|---|---|
| 1 | Playback `play()` reject / `audio.onerror` untested | Tests assert `phase === "error"`, `errorCode === "PlaybackError"`, no throw; cleanup uses `stopAudioElement` |
| 2 | Dispose during recording + stale `onstop`/data | Deferred-stop recorder; dispose then fire stale callbacks → no `finalized`/`ready`; tracks stopped |
| 3 | Active playback + replace URL ownership | Mid-playback `startRecording`/`retry` without prior `stopPlayback`: URL not revoked while playing; revoked after internal stop/replace |
| 4–5 | Guided/substitution reveal emit `partial` | Emit-layer tests: revealed+correct published answer → `graderOutcome === "partial"` |
| 6 | Submit without Continue unlock | After guided correct submit, `substitution` stays `disabled` until Continue |
| 7 | Spoken `recordingCycle` UI gate | Mocked lifecycle: no `onComplete` until record+playback+self-check; exactly one schema-valid `recordingCycle` |
| 8 | Detail projection ID drift | `buildQaConversationLevels()` maps `CONVERSATION_LEVEL_IDS` then `assertExactConversationLevelIds` |
| 9 | First-paint mic no-op | Actions disabled + “Initializing microphone controls…” until `controller != null` |

## Command results

From `platform/`:

| Command | Exit | Summary |
|---|---:|---|
| `npm run check` | 0 | typecheck + typecheck:web + typecheck:web-tests + test + validate:publication + test:web; **23** files / **437** tests; publication `VALIDATION_OK`; web **17** files / **149** tests |
| `npm run build:web` | 0 | Next 16.3.0 webpack; conversation selector ○ + **●** `/conversation/qa%3Aprofession-casual-main`; prior routes preserved |
| `npm run audit:prod` | 0 | **0** vulnerabilities |
| `npm run smoke:web-routes` | 0 | **45/45** checks PASS |
| `npm run smoke:dev` | 0 | **4/4** checks PASS (practice + conversation) |

## Remaining gaps (honest)

- Persistence / cross-session resume still pending P4C/P4D.
- Pronunciation TTS remains unavailable without listening approval.
- Self-rating stays learner reflection only — never authoritative pronunciation accuracy.
- Orchestrator owns approval / register closure; this report does not claim them.

## Honesty

No approval claim. No commit/push. No German invention, review-plural promotion, candidate-media exposure, resources/archive/samples/media edits, plans/register edits, or security/publication gate weakening. Gates were not weakened.
