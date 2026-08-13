/**
 * Browser MediaRecorder lifecycle types — permission, record, playback, cleanup.
 * Blobs stay local/in-memory; never uploaded or JSON-exported.
 */

export type RecorderPhase =
  | "unsupported"
  | "no-device"
  | "idle"
  | "permission-pending"
  | "ready"
  | "denied"
  | "recording"
  | "stop-pending"
  | "finalized"
  | "playback"
  | "error";

export type RecorderErrorCode =
  | "NotAllowedError"
  | "NotFoundError"
  | "UnsupportedError"
  | "RecorderError"
  | "EmptyBlob"
  | "PlaybackError"
  | "AbortError";

export type RecorderSnapshot = {
  readonly phase: RecorderPhase;
  readonly errorCode: RecorderErrorCode | null;
  readonly guidance: string | null;
  readonly objectUrl: string | null;
  readonly hasRecording: boolean;
  readonly recordCompleted: boolean;
  readonly playbackCompleted: boolean;
};

export type RecorderController = {
  readonly snapshot: RecorderSnapshot;
  requestPermission: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  playRecording: () => Promise<void>;
  stopPlayback: () => void;
  retry: () => void;
  discard: () => void;
  /** Test / integration hook — dispose streams, revoke URLs, invalidate gens. */
  dispose: () => void;
};

export const RECORDER_GUIDANCE = Object.freeze({
  unsupported:
    "This browser does not support microphone recording. Text conversation levels still work.",
  noDevice:
    "No microphone was found. You can retry when a device is available. Text levels are not blocked.",
  denied:
    "Microphone permission was denied. You can retry later. Earlier text levels stay available.",
  permissionPending: "Waiting for microphone permission…",
  ready: "Microphone ready. Start recording when you are prepared.",
  recording: "Recording… Stop when you finish speaking.",
  stopPending: "Finalizing recording…",
  finalized: "Recording saved locally on this device. Play it back, then self-check.",
  playback: "Playing your recording…",
  emptyBlob: "Recording produced no audio. Discard and try again.",
  recorderError: "Recording failed. Discard and retry. Text learning is unaffected.",
  playbackError: "Playback failed. You can retry play or re-record.",
} as const);
