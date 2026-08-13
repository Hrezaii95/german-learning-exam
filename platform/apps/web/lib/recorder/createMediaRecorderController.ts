/**
 * Race-safe MediaRecorder controller.
 *
 * Guarantees:
 * - generation tokens ignore stale permission / recorder / playback callbacks
 * - every MediaStreamTrack stopped exactly once (idempotent)
 * - every created object URL revoked on retry/replace/unmount — never while playing
 * - no double start/stop, no overlapping recorders, no stale chunks, no duplicate finals
 * - MediaRecorder.onerror, empty blob, autoplay/playback errors handled without crash
 * - no upload; blob stays local; never included in JSON export
 */

import {
  RECORDER_GUIDANCE,
  type RecorderController,
  type RecorderErrorCode,
  type RecorderPhase,
  type RecorderSnapshot,
} from "./recorder-types";

export type RecorderListener = (snapshot: RecorderSnapshot) => void;

type InternalState = {
  phase: RecorderPhase;
  errorCode: RecorderErrorCode | null;
  guidance: string | null;
  objectUrl: string | null;
  blob: Blob | null;
  recordCompleted: boolean;
  playbackCompleted: boolean;
};

function supportsRecordingApi(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined" &&
    typeof URL !== "undefined" &&
    typeof URL.createObjectURL === "function"
  );
}

function mapPermissionError(err: unknown): {
  code: RecorderErrorCode;
  phase: RecorderPhase;
  guidance: string;
} {
  const name =
    err && typeof err === "object" && "name" in err
      ? String((err as { name: unknown }).name)
      : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return {
      code: "NotAllowedError",
      phase: "denied",
      guidance: RECORDER_GUIDANCE.denied,
    };
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return {
      code: "NotFoundError",
      phase: "no-device",
      guidance: RECORDER_GUIDANCE.noDevice,
    };
  }
  if (name === "AbortError") {
    return {
      code: "AbortError",
      phase: "idle",
      guidance: RECORDER_GUIDANCE.denied,
    };
  }
  return {
    code: "RecorderError",
    phase: "error",
    guidance: RECORDER_GUIDANCE.recorderError,
  };
}

function stopTrackOnce(track: MediaStreamTrack, stopped: WeakSet<MediaStreamTrack>) {
  if (stopped.has(track)) return;
  stopped.add(track);
  try {
    track.stop();
  } catch {
    // already stopped / inert
  }
}

function stopStreamTracks(
  stream: MediaStream | null,
  stopped: WeakSet<MediaStreamTrack>,
) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    stopTrackOnce(track, stopped);
  }
}

export function createMediaRecorderController(
  options: {
    readonly onChange?: RecorderListener;
    /** Injected for tests. Pass `null` to force unsupported. */
    readonly getUserMedia?:
      | typeof navigator.mediaDevices.getUserMedia
      | null;
    readonly MediaRecorderImpl?: typeof MediaRecorder;
    readonly createObjectURL?: typeof URL.createObjectURL;
    readonly revokeObjectURL?: typeof URL.revokeObjectURL;
    readonly AudioCtor?: typeof Audio;
  } = {},
): RecorderController {
  let generation = 0;
  let disposed = false;
  let stream: MediaStream | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let chunks: BlobPart[] = [];
  let audioEl: HTMLAudioElement | null = null;
  let playingUrl: string | null = null;
  const stoppedTracks = new WeakSet<MediaStreamTrack>();
  /** URLs we own; revoke when safe (not currently playing). */
  const ownedUrls = new Set<string>();

  const injectedGum = options.getUserMedia;
  const getUserMedia =
    injectedGum === null
      ? undefined
      : injectedGum ??
        (typeof navigator !== "undefined"
          ? navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices)
          : undefined);
  const MediaRecorderImpl =
    options.MediaRecorderImpl ??
    (typeof MediaRecorder !== "undefined" ? MediaRecorder : undefined);
  const createObjectURL =
    options.createObjectURL ??
    (typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
      ? URL.createObjectURL.bind(URL)
      : undefined);
  const revokeObjectURL =
    options.revokeObjectURL ??
    (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function"
      ? URL.revokeObjectURL.bind(URL)
      : undefined);
  const AudioCtor =
    options.AudioCtor ?? (typeof Audio !== "undefined" ? Audio : undefined);

  const canRequestPermission =
    injectedGum !== null && typeof getUserMedia === "function";

  let state: InternalState = canRequestPermission
    ? {
        phase: "idle",
        errorCode: null,
        guidance: null,
        objectUrl: null,
        blob: null,
        recordCompleted: false,
        playbackCompleted: false,
      }
    : {
        phase: "unsupported",
        errorCode: "UnsupportedError",
        guidance: RECORDER_GUIDANCE.unsupported,
        objectUrl: null,
        blob: null,
        recordCompleted: false,
        playbackCompleted: false,
      };

  function snapshot(): RecorderSnapshot {
    return Object.freeze({
      phase: state.phase,
      errorCode: state.errorCode,
      guidance: state.guidance,
      objectUrl: state.objectUrl,
      hasRecording: state.blob != null || state.objectUrl != null,
      recordCompleted: state.recordCompleted,
      playbackCompleted: state.playbackCompleted,
    });
  }

  function emit() {
    options.onChange?.(snapshot());
  }

  function setState(patch: Partial<InternalState>) {
    state = { ...state, ...patch };
    emit();
  }

  function revokeUrl(url: string | null, { force = false } = {}) {
    if (!url) return;
    if (!force && playingUrl === url) return;
    if (!ownedUrls.has(url)) return;
    ownedUrls.delete(url);
    if (!revokeObjectURL) return;
    try {
      revokeObjectURL(url);
    } catch {
      // ignore
    }
  }

  function clearRecordingAssets({ keepPlaying = false } = {}) {
    const current = state.objectUrl;
    if (!keepPlaying || current !== playingUrl) {
      revokeUrl(current, { force: !keepPlaying });
    }
    chunks = [];
    setState({
      objectUrl: keepPlaying ? state.objectUrl : null,
      blob: keepPlaying ? state.blob : null,
      recordCompleted: keepPlaying ? state.recordCompleted : false,
      playbackCompleted: keepPlaying ? state.playbackCompleted : false,
    });
  }

  function teardownRecorder() {
    if (mediaRecorder) {
      try {
        mediaRecorder.ondataavailable = null;
        mediaRecorder.onerror = null;
        mediaRecorder.onstop = null;
        if (mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
      } catch {
        // ignore
      }
    }
    mediaRecorder = null;
    stopStreamTracks(stream, stoppedTracks);
    stream = null;
  }

  function stopAudioElement() {
    if (!audioEl) return;
    try {
      audioEl.onended = null;
      audioEl.onerror = null;
      audioEl.pause();
      audioEl.removeAttribute("src");
      audioEl.load();
    } catch {
      // ignore
    }
    audioEl = null;
    playingUrl = null;
  }

  function dispose() {
    disposed = true;
    generation += 1;
    stopAudioElement();
    teardownRecorder();
    for (const url of [...ownedUrls]) {
      revokeUrl(url, { force: true });
    }
    ownedUrls.clear();
    chunks = [];
    state = {
      phase: "idle",
      errorCode: null,
      guidance: null,
      objectUrl: null,
      blob: null,
      recordCompleted: false,
      playbackCompleted: false,
    };
  }

  async function requestPermission(): Promise<void> {
    if (disposed) return;
    if (state.phase === "unsupported") return;
    if (
      state.phase === "permission-pending" ||
      state.phase === "recording" ||
      state.phase === "stop-pending"
    ) {
      return;
    }
    if (!getUserMedia) {
      setState({
        phase: "unsupported",
        errorCode: "UnsupportedError",
        guidance: RECORDER_GUIDANCE.unsupported,
      });
      return;
    }

    const token = ++generation;
    setState({
      phase: "permission-pending",
      errorCode: null,
      guidance: RECORDER_GUIDANCE.permissionPending,
    });

    try {
      const nextStream = await getUserMedia({ audio: true });
      if (disposed || token !== generation) {
        stopStreamTracks(nextStream, stoppedTracks);
        return;
      }
      // Replace any prior stream.
      stopStreamTracks(stream, stoppedTracks);
      stream = nextStream;
      setState({
        phase: "ready",
        errorCode: null,
        guidance: RECORDER_GUIDANCE.ready,
      });
    } catch (err) {
      if (disposed || token !== generation) return;
      const mapped = mapPermissionError(err);
      setState({
        phase: mapped.phase,
        errorCode: mapped.code,
        guidance: mapped.guidance,
      });
    }
  }

  async function startRecording(): Promise<void> {
    if (disposed) return;
    if (
      state.phase === "recording" ||
      state.phase === "stop-pending" ||
      state.phase === "unsupported"
    ) {
      return;
    }

    // Stop active playback before permission/replace so stale onended cannot
    // race a bumped generation and so URL ownership is released only after stop.
    if (state.phase === "playback" || audioEl != null) {
      stopAudioElement();
      if (state.phase === "playback") {
        setState({
          phase: state.objectUrl ? "finalized" : "idle",
          guidance: state.objectUrl ? RECORDER_GUIDANCE.finalized : null,
        });
      }
    }

    if (state.phase !== "ready" || !stream) {
      await requestPermission();
      if (disposed || state.phase !== "ready" || !stream) return;
    }

    const token = ++generation;
    // Discard prior recording before starting a new one.
    stopAudioElement();
    clearRecordingAssets();

    chunks = [];
    if (!MediaRecorderImpl || !createObjectURL || !revokeObjectURL) {
      setState({
        phase: "unsupported",
        errorCode: "UnsupportedError",
        guidance: RECORDER_GUIDANCE.unsupported,
      });
      return;
    }
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorderImpl(stream);
    } catch {
      if (disposed || token !== generation) return;
      setState({
        phase: "error",
        errorCode: "RecorderError",
        guidance: RECORDER_GUIDANCE.recorderError,
      });
      return;
    }

    mediaRecorder = recorder;

    recorder.ondataavailable = (event: BlobEvent) => {
      if (disposed || token !== generation) return;
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onerror = () => {
      if (disposed || token !== generation) return;
      teardownRecorder();
      setState({
        phase: "error",
        errorCode: "RecorderError",
        guidance: RECORDER_GUIDANCE.recorderError,
      });
    };

    recorder.onstop = () => {
      if (disposed || token !== generation) return;
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      chunks = [];
      stopStreamTracks(stream, stoppedTracks);
      // Keep stream null until next permission/start; tracks already stopped.
      stream = null;
      mediaRecorder = null;

      if (blob.size === 0) {
        setState({
          phase: "error",
          errorCode: "EmptyBlob",
          guidance: RECORDER_GUIDANCE.emptyBlob,
          objectUrl: null,
          blob: null,
          recordCompleted: false,
          playbackCompleted: false,
        });
        return;
      }

      const url = createObjectURL(blob);
      ownedUrls.add(url);
      setState({
        phase: "finalized",
        errorCode: null,
        guidance: RECORDER_GUIDANCE.finalized,
        objectUrl: url,
        blob,
        recordCompleted: true,
        playbackCompleted: false,
      });
    };

    try {
      recorder.start();
    } catch {
      if (disposed || token !== generation) return;
      teardownRecorder();
      setState({
        phase: "error",
        errorCode: "RecorderError",
        guidance: RECORDER_GUIDANCE.recorderError,
      });
      return;
    }

    if (disposed || token !== generation) {
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch {
        // ignore
      }
      return;
    }

    setState({
      phase: "recording",
      errorCode: null,
      guidance: RECORDER_GUIDANCE.recording,
      playbackCompleted: false,
    });
  }

  async function stopRecording(): Promise<void> {
    if (disposed) return;
    if (state.phase !== "recording" || !mediaRecorder) return;
    if (mediaRecorder.state === "inactive") return;

    const token = generation;
    setState({
      phase: "stop-pending",
      guidance: RECORDER_GUIDANCE.stopPending,
    });

    try {
      mediaRecorder.stop();
    } catch {
      if (disposed || token !== generation) return;
      teardownRecorder();
      setState({
        phase: "error",
        errorCode: "RecorderError",
        guidance: RECORDER_GUIDANCE.recorderError,
      });
    }
  }

  async function playRecording(): Promise<void> {
    if (disposed) return;
    if (!state.objectUrl || !state.blob) return;
    if (state.phase === "playback") return;
    if (!AudioCtor) {
      setState({
        phase: "error",
        errorCode: "PlaybackError",
        guidance: RECORDER_GUIDANCE.playbackError,
      });
      return;
    }

    const token = generation;
    const url = state.objectUrl;
    stopAudioElement();

    const audio = new AudioCtor(url);
    audioEl = audio;
    playingUrl = url;

    audio.onended = () => {
      if (disposed || token !== generation) return;
      playingUrl = null;
      audioEl = null;
      setState({
        phase: "finalized",
        guidance: RECORDER_GUIDANCE.finalized,
        playbackCompleted: true,
      });
    };

    audio.onerror = () => {
      if (disposed || token !== generation) return;
      stopAudioElement();
      setState({
        phase: "error",
        errorCode: "PlaybackError",
        guidance: RECORDER_GUIDANCE.playbackError,
      });
    };

    setState({
      phase: "playback",
      errorCode: null,
      guidance: RECORDER_GUIDANCE.playback,
    });

    try {
      await audio.play();
    } catch {
      if (disposed || token !== generation) return;
      stopAudioElement();
      setState({
        phase: "error",
        errorCode: "PlaybackError",
        guidance: RECORDER_GUIDANCE.playbackError,
      });
    }
  }

  function stopPlayback() {
    if (disposed) return;
    if (state.phase !== "playback") return;
    stopAudioElement();
    setState({
      phase: "finalized",
      guidance: RECORDER_GUIDANCE.finalized,
    });
  }

  function retry() {
    if (disposed) return;
    if (state.phase === "recording" || state.phase === "stop-pending") return;
    generation += 1;
    stopAudioElement();
    teardownRecorder();
    clearRecordingAssets();
    setState({
      phase: "idle",
      errorCode: null,
      guidance: null,
      recordCompleted: false,
      playbackCompleted: false,
    });
  }

  function discard() {
    retry();
  }

  // Expose a controller that always reads latest snapshot.
  const controller: RecorderController = {
    get snapshot() {
      return snapshot();
    },
    requestPermission,
    startRecording,
    stopRecording,
    playRecording,
    stopPlayback,
    retry,
    discard,
    dispose,
  };

  emit();
  return controller;
}
