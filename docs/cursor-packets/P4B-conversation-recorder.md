# P4B — Five-level conversation ladder and recorder lifecycle

## Objective

Implement the exact five-level progression for published `qa:profession-casual-main`, plus a reusable browser recorder with safe permission/race/cleanup semantics. Reuse the P3D canonical Q&A contract and `@german-learning/learning` event parser. This packet emits in-session events; P4C/P4D will persist/resume them.

## Exact ordered levels

1. `model`
2. `guided-recognition`
3. `substitution`
4. `independent-construction`
5. `spoken-role-play`

Runtime assert exact IDs/order; unknown/missing/duplicate fail closed. Use exact published informal question and exact three answer realizations. Do not invent accepted German or promote review-only content.

## Learning behavior

- Model: display/read the published exchange; pronunciation playback remains unavailable while TTS lacks listening approval. Text study must work.
- Guided recognition: choose an exact published answer matching the question; emit objective `multipleChoice` recognition event.
- Substitution: construct one of the published answer frames by choosing from canonical published fragments; deterministic grading, emit `formManipulation` form event.
- Independent construction: bounded text entry matched only against the exact three published realizations using the existing safe normalization; emit `productionTask` production event. Hints/reveal prevent `correct` strong evidence.
- Spoken role-play: show published prompt, record/play/retry/self-compare. Completion emits `recordingCycle` only after record + playback + explicit self-check. Self-rating is learner reflection only and must not become authoritative pronunciation accuracy.
- Progress forward only after the required meaningful action; back is allowed. Clearly label current level and `n/5`. In-session resume state is deterministic; persistence is explicitly pending the learner-state packet.

## Recorder state machine

Implement a reusable hook/controller/component covering:

- unsupported API / no device;
- idle and explicit permission request;
- permission pending;
- allowed/ready;
- denied (`NotAllowedError`/permission denial) with non-blocking retry guidance;
- no device (`NotFoundError`);
- start recording, recording, stop-request race, finalized recording;
- playback started/completed;
- retry/discard/replace;
- component unmount/route navigation/permission-resolves-after-unmount cleanup.

Requirements:

- stop every `MediaStreamTrack` exactly once or safely idempotently;
- revoke every created object URL on retry/replace/unmount; never revoke the currently playing URL prematurely;
- ignore stale permission and recorder callbacks using lifecycle/generation tokens;
- prevent double start/stop, overlapping recorders, stale chunks, duplicate completion events;
- handle `MediaRecorder.onerror`, empty blob, autoplay/playback error without crashing;
- no recording upload; blob stays local/in-memory and is not included in JSON export;
- recording is optional and never blocks earlier text learning;
- no transcript, confidence, score, AI badge, waveform-faked assessment, or “correct pronunciation” copy.

## Integration / routes

- Add canonical `/conversation` and/or embed ladder on Q&A detail; prefer `/conversation/qa%3Aprofession-casual-main` with exact encoded canonical route, raw-colon one redirect, unknown/wrong-kind/malformed/extra 404.
- Add a clear “Conversation practice” action from the Q&A detail and practice selector; preserve typed back context.
- Responsive at four target viewports, 44px controls, semantic progress/list/fieldset, live feedback without noisy duplicate announcements, visible focus.

## Tests/gates

- exact five-level diff/order;
- exact published German, no alternative invented strings/review/audio leaks;
- recognition/form/construction events accepted by `parseLearnerEvent` and family/dimension exact;
- hint/reveal anti-luck;
- recording event emitted only after record+playback+self-check, with no score fields;
- real component behavior for level navigation/locking and construction feedback;
- fully mocked MediaDevices/MediaRecorder/URL/audio lifecycle tests: allow, deny, unavailable, NotFound, empty/error, record/stop/playback, retry/replace, double actions, unmount, permission/navigation race, URL revocation, tracks stopped;
- live route smoke/canonical redirects/404;
- no prior P3/P4A regression.

Run `npm run check`, `npm run build:web`, `npm run audit:prod`, `npm run smoke:web-routes`, `npm run smoke:dev`. Write `research/cursor-execution/P4B-worker-report.md` with state/transition matrix, exact files, tests, commands, and gaps. No plan/register/resources/archive/samples/media edits, commit/push, or approval claim.
