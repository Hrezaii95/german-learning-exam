# P4B worker report — Five-level conversation ladder and recorder lifecycle

Status: implementation evidence returned; **no approval claimed**  
Packet: `docs/cursor-packets/P4B-conversation-recorder.md`  
Model: `cursor-grok-4.5-high` (non-Fast)  
Date: 2026-08-13

## Exact changed paths

Write-scoped:

| Path | Change |
|---|---|
| `platform/apps/web/lib/conversation/*` | Exact five level IDs/order; content pins from P3D Q&A; grading via `qa-normalize`; events via `parseLearnerEvent`; paths; in-session progress |
| `platform/apps/web/lib/recorder/*` | Race-safe MediaRecorder controller + React hook (generation tokens, track stop, URL revoke) |
| `platform/apps/web/components/conversation/*` | Ladder UI, five level views, ConversationLink, nav wrappers |
| `platform/apps/web/app/conversation/page.tsx` | Conversation selector |
| `platform/apps/web/app/conversation/[entityId]/page.tsx` | Exact SSG ladder for `qa:profession-casual-main` |
| `platform/apps/web/lib/content/routes.ts` | Fail-closed conversation resolve; raw-colon 308; unknown/wrong-kind/extra 404 |
| `platform/apps/web/lib/content/navigation-context.ts` | Allowlist `/conversation` + encoded Q&A path |
| `platform/apps/web/lib/content/detail-project.ts` | Conversation level IDs aligned to exact P4B five |
| `platform/apps/web/components/details/DetailViews.tsx` | Conversation practice CTA; available five-level list; spoken entry |
| `platform/apps/web/components/games/GameSelector.tsx` | Conversation practice entry on practice selector |
| `platform/apps/web/proxy.ts` | Matcher includes `/conversation` |
| `platform/apps/web/app/globals.css` | Conversation progress / recorder / feedback styles (44px) |
| `platform/apps/web/scripts/smoke-canonical-routes.mjs` | Conversation 200/308/404 checks |
| `platform/apps/web/scripts/smoke-dev-practice.mjs` | Dev smoke hits conversation route |
| `platform/apps/web/generated/learner-details.json` | Regenerated (level IDs available) |
| `platform/tsconfig.json` | Exclude recorder lib + new UI/behavior tests from root tsc |
| `platform/tests/web/p4b-conversation.test.ts` | IDs/order, pins, parseLearnerEvent, progress, routes |
| `platform/tests/web/p4b-conversation-ui.test.ts` | SSR ladder / selector |
| `platform/tests/web/p4b-conversation-behavior.test.ts` | Level lock + construction/hint behavior |
| `platform/tests/web/p4b-recorder-lifecycle-behavior.test.ts` | Fully mocked MediaDevices/MediaRecorder/URL/Audio races |
| `platform/tests/web/p3d-details-ui.test.ts` | Expect conversation practice (no Pending P4 / disabled recorder) |
| `research/cursor-execution/P4B-worker-report.md` | This report |

Not edited: plans, register, packet docs, content package schemas, learning mastery semantics, resources, archive, samples, media, governance.

## Exact five levels (ordered)

| # | Level ID | Meaningful action | Event |
|---|---|---|---|
| 1 | `model` | Mark studied / continue | `exposure` (`page`) |
| 2 | `guided-recognition` | Choose published answer + Submit (+ Continue) | `objectiveAttempt` / `multipleChoice` / `recognition` |
| 3 | `substitution` | Assemble published fragments + Submit (+ Continue) | `objectiveAttempt` / `formManipulation` / `form` |
| 4 | `independent-construction` | Type published pattern; hint/reveal → `partial` never `correct` | `objectiveAttempt` / `productionTask` / `production` |
| 5 | `spoken-role-play` | Review prompt + record + playback + self-check | `recordingCycle` only when record+playback+self-check complete |

Published German (P3D pins only):

- Question: `Was bist du von Beruf?`
- Answers: `Ich bin … von Beruf.` · `Ich bin …` · `Ich arbeite als …`

Runtime `assertExactConversationLevelIds` / `conversationLevelIdDiff` fail closed on unknown/missing/duplicate/wrong-order.

## Recorder state / transition matrix

| Phase | Entered when | Exit / next |
|---|---|---|
| `unsupported` | No getUserMedia / forced `null` inject | Stay (text levels still work) |
| `idle` | API available / after retry | → `permission-pending` |
| `permission-pending` | `requestPermission()` | → `ready` / `denied` / `no-device` / stale ignore on dispose |
| `ready` | Permission granted | → `recording` |
| `denied` | `NotAllowedError` | Retry via `requestPermission` (non-blocking guidance) |
| `no-device` | `NotFoundError` | Retry when device available |
| `recording` | `startRecording()` | → `stop-pending` |
| `stop-pending` | `stopRecording()` | → `finalized` / `error` (empty blob / onerror) |
| `finalized` | Non-empty blob + object URL | → `playback` / `idle` (retry) |
| `playback` | `playRecording()` | → `finalized` (ended) / `error` (autoplay/playback) |
| `error` | Empty blob / recorder / playback failure | Retry / discard |

Race / cleanup guarantees tested:

- generation tokens ignore stale permission and recorder callbacks
- tracks stopped once (idempotent WeakSet)
- object URLs revoked on retry/replace/dispose; not while actively playing (stopPlayback first)
- double start/stop ignored; no overlapping recorders
- dispose during pending permission stops late-arriving streams
- no upload; blob local only; no pronunciation score fields on `recordingCycle`

## Routes

- `/conversation` selector
- Canonical `/conversation/qa%3Aprofession-casual-main` (SSG)
- Raw-colon `/conversation/qa:profession-casual-main` → 308
- Unknown / wrong-kind (`lex:…`, formal Q&A) / malformed / extra → 404
- Conversation practice from Q&A detail + practice selector; typed back context preserved

## Command results

From `platform/`:

| Command | Exit | Summary |
|---|---:|---|
| `npm run check` | 0 | typecheck + typecheck:web + typecheck:web-tests + test + validate:publication + test:web; **22** files / **427** tests; publication `VALIDATION_OK`; web **16** files / **139** tests |
| `npm run build:web` | 0 | Next 16.3.0 webpack; conversation selector ○ + **●** `/conversation/qa%3Aprofession-casual-main`; prior lessons/activities/details/practice preserved |
| `npm run audit:prod` | 0 | **0** vulnerabilities |
| `npm run smoke:web-routes` | 0 | **45/45** checks PASS (prior + conversation 200/308/404) |
| `npm run smoke:dev` | 0 | **4/4** checks PASS (practice + conversation) |

## Remaining gaps (honest)

- **Persistence / cross-session resume:** explicitly pending P4C/P4D — in-session progress only (“not persisted yet”).
- **Pronunciation TTS playback:** remains unavailable without listening approval; model/spoken use text study + `listenCompleted` via explicit prompt review.
- **Self-rating** on spoken level is learner reflection only — never authoritative pronunciation accuracy.
- **Recording optional:** earlier text levels never blocked by mic denial/unsupported.
- Orchestrator owns approval / register closure; this report does not claim them.

## Honesty

No approval claim. No commit/push. No German invention, review-plural promotion, candidate-media exposure, resources/archive/samples/media edits, plans/register edits, or security/publication gate weakening. Events exclusively via `parseLearnerEvent` from `@german-learning/learning`. Local feedback is not mastery.
