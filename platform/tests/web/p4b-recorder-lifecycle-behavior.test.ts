/**
 * @vitest-environment jsdom
 *
 * Fully mocked MediaDevices / MediaRecorder / URL / Audio lifecycle tests.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMediaRecorderController } from "../../apps/web/lib/recorder/createMediaRecorderController.js";
import type { RecorderSnapshot } from "../../apps/web/lib/recorder/recorder-types.js";

type Track = {
  stop: ReturnType<typeof vi.fn>;
};

function makeTrack(): Track {
  return { stop: vi.fn() };
}

function makeStream(tracks: Track[]) {
  return {
    getTracks: () => tracks as unknown as MediaStreamTrack[],
  } as unknown as MediaStream;
}

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  state: "inactive" | "recording" = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((ev: { data: Blob }) => void) | null = null;
  onerror: (() => void) | null = null;
  onstop: (() => void) | null = null;
  stream: MediaStream;

  constructor(stream: MediaStream) {
    this.stream = stream;
    FakeMediaRecorder.instances.push(this);
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["x"], { type: "audio/webm" }) });
    this.onstop?.();
  }
}

class EmptyBlobMediaRecorder extends FakeMediaRecorder {
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob([], { type: "audio/webm" }) });
    this.onstop?.();
  }
}

class ErrorMediaRecorder extends FakeMediaRecorder {
  start() {
    this.state = "recording";
    queueMicrotask(() => this.onerror?.());
  }
}

function installUrlMocks() {
  const created: string[] = [];
  const revoked: string[] = [];
  let n = 0;
  const createObjectURL = vi.fn((_blob: Blob) => {
    const url = `blob:test-${++n}`;
    created.push(url);
    return url;
  });
  const revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url);
  });
  return { createObjectURL, revokeObjectURL, created, revoked };
}

function FakeAudio(this: {
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
  removeAttribute: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
  onerror: (() => void) | null;
}) {
  this.play = vi.fn(async () => {
    queueMicrotask(() => this.onended?.());
  });
  this.pause = vi.fn();
  this.load = vi.fn();
  this.removeAttribute = vi.fn();
  this.onended = null;
  this.onerror = null;
}

afterEach(() => {
  FakeMediaRecorder.instances = [];
  vi.restoreAllMocks();
});

describe("P4B recorder lifecycle", () => {
  it("allow → ready → record → stop → finalized → playback", async () => {
    const track = makeTrack();
    const stream = makeStream([track]);
    const urls = installUrlMocks();
    const snapshots: RecorderSnapshot[] = [];
    const getUserMedia = vi.fn(async () => stream);

    const controller = createMediaRecorderController({
      onChange: (s) => snapshots.push(s),
      getUserMedia,
      MediaRecorderImpl: FakeMediaRecorder as unknown as typeof MediaRecorder,
      createObjectURL: urls.createObjectURL,
      revokeObjectURL: urls.revokeObjectURL,
      AudioCtor: FakeAudio as unknown as typeof Audio,
    });

    await controller.requestPermission();
    expect(controller.snapshot.phase).toBe("ready");

    await controller.startRecording();
    expect(controller.snapshot.phase).toBe("recording");
    expect(FakeMediaRecorder.instances).toHaveLength(1);

    await controller.stopRecording();
    expect(controller.snapshot.phase).toBe("finalized");
    expect(controller.snapshot.recordCompleted).toBe(true);
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(urls.created).toHaveLength(1);

    await controller.playRecording();
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.snapshot.playbackCompleted).toBe(true);
    expect(controller.snapshot.phase).toBe("finalized");

    controller.dispose();
    expect(urls.revoked).toContain(urls.created[0]);
  });

  it("deny permission with NotAllowedError guidance", async () => {
    const getUserMedia = vi.fn(async () => {
      const err = new Error("denied");
      err.name = "NotAllowedError";
      throw err;
    });
    const controller = createMediaRecorderController({ getUserMedia });
    await controller.requestPermission();
    expect(controller.snapshot.phase).toBe("denied");
    expect(controller.snapshot.errorCode).toBe("NotAllowedError");
    expect(controller.snapshot.guidance).toMatch(/denied/i);
    controller.dispose();
  });

  it("NotFoundError → no-device", async () => {
    const getUserMedia = vi.fn(async () => {
      const err = new Error("missing");
      err.name = "NotFoundError";
      throw err;
    });
    const controller = createMediaRecorderController({ getUserMedia });
    await controller.requestPermission();
    expect(controller.snapshot.phase).toBe("no-device");
    expect(controller.snapshot.errorCode).toBe("NotFoundError");
    controller.dispose();
  });

  it("empty blob → error without crash", async () => {
    const track = makeTrack();
    const stream = makeStream([track]);
    const urls = installUrlMocks();
    const controller = createMediaRecorderController({
      getUserMedia: async () => stream,
      MediaRecorderImpl: EmptyBlobMediaRecorder as unknown as typeof MediaRecorder,
      createObjectURL: urls.createObjectURL,
      revokeObjectURL: urls.revokeObjectURL,
    });
    await controller.requestPermission();
    await controller.startRecording();
    await controller.stopRecording();
    expect(controller.snapshot.phase).toBe("error");
    expect(controller.snapshot.errorCode).toBe("EmptyBlob");
    expect(urls.created).toHaveLength(0);
    controller.dispose();
  });

  it("MediaRecorder.onerror → error state", async () => {
    const track = makeTrack();
    const stream = makeStream([track]);
    const controller = createMediaRecorderController({
      getUserMedia: async () => stream,
      MediaRecorderImpl: ErrorMediaRecorder as unknown as typeof MediaRecorder,
      createObjectURL: () => "blob:x",
      revokeObjectURL: () => undefined,
    });
    await controller.requestPermission();
    await controller.startRecording();
    await Promise.resolve();
    expect(controller.snapshot.phase).toBe("error");
    expect(controller.snapshot.errorCode).toBe("RecorderError");
    controller.dispose();
  });

  it("retry/replace revokes prior URL and stops tracks idempotently", async () => {
    const track = makeTrack();
    const stream = makeStream([track]);
    const urls = installUrlMocks();
    const getUserMedia = vi.fn(async () => makeStream([makeTrack()]));
    // First permission uses `stream`; later starts request new streams.
    getUserMedia.mockResolvedValueOnce(stream);

    const controller = createMediaRecorderController({
      getUserMedia,
      MediaRecorderImpl: FakeMediaRecorder as unknown as typeof MediaRecorder,
      createObjectURL: urls.createObjectURL,
      revokeObjectURL: urls.revokeObjectURL,
    });
    await controller.requestPermission();
    await controller.startRecording();
    await controller.stopRecording();
    const firstUrl = controller.snapshot.objectUrl;
    expect(firstUrl).toBeTruthy();

    controller.retry();
    expect(urls.revoked).toContain(firstUrl);
    expect(controller.snapshot.hasRecording).toBe(false);
    expect(track.stop.mock.calls.length).toBeGreaterThanOrEqual(1);

    // Idempotent second stop on same tracks should not throw.
    track.stop();
    controller.dispose();
  });

  it("double start/stop is ignored safely", async () => {
    const stream = makeStream([makeTrack()]);
    const urls = installUrlMocks();
    const controller = createMediaRecorderController({
      getUserMedia: async () => stream,
      MediaRecorderImpl: FakeMediaRecorder as unknown as typeof MediaRecorder,
      createObjectURL: urls.createObjectURL,
      revokeObjectURL: urls.revokeObjectURL,
    });
    await controller.requestPermission();
    await controller.startRecording();
    await controller.startRecording(); // no-op while recording
    expect(FakeMediaRecorder.instances).toHaveLength(1);
    await controller.stopRecording();
    await controller.stopRecording(); // no-op after stop
    expect(controller.snapshot.phase).toBe("finalized");
    controller.dispose();
  });

  it("permission resolves after unmount/dispose is ignored", async () => {
    let resolvePerm!: (stream: MediaStream) => void;
    const pending = new Promise<MediaStream>((resolve) => {
      resolvePerm = resolve;
    });
    const track = makeTrack();
    const snapshots: RecorderSnapshot[] = [];
    const controller = createMediaRecorderController({
      onChange: (s) => snapshots.push(s),
      getUserMedia: () => pending,
    });
    const req = controller.requestPermission();
    expect(controller.snapshot.phase).toBe("permission-pending");
    controller.dispose();
    resolvePerm(makeStream([track]));
    await req;
    expect(track.stop).toHaveBeenCalled();
    // After dispose, phase resets; stale ready must not stick.
    expect(snapshots.some((s) => s.phase === "ready")).toBe(false);
  });

  it("does not revoke currently playing URL prematurely on clear", async () => {
    const stream = makeStream([makeTrack()]);
    const urls = installUrlMocks();
    let holdEnded: (() => void) | undefined;

    class HoldingAudio {
      play = vi.fn(async () => {
        // do not end immediately
      });
      pause = vi.fn();
      load = vi.fn();
      removeAttribute = vi.fn();
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        holdEnded = () => this.onended?.();
      }
    }

    const controller = createMediaRecorderController({
      getUserMedia: async () => stream,
      MediaRecorderImpl: FakeMediaRecorder as unknown as typeof MediaRecorder,
      createObjectURL: urls.createObjectURL,
      revokeObjectURL: urls.revokeObjectURL,
      AudioCtor: HoldingAudio as unknown as typeof Audio,
    });
    await controller.requestPermission();
    await controller.startRecording();
    await controller.stopRecording();
    const url = controller.snapshot.objectUrl!;
    await controller.playRecording();
    expect(controller.snapshot.phase).toBe("playback");
    controller.stopPlayback();
    holdEnded?.();
    controller.retry();
    expect(urls.revoked).toContain(url);
    controller.dispose();
  });

  it("play() rejection yields PlaybackError without throw", async () => {
    const stream = makeStream([makeTrack()]);
    const urls = installUrlMocks();

    function RejectingAudio(this: {
      play: ReturnType<typeof vi.fn>;
      pause: ReturnType<typeof vi.fn>;
      load: ReturnType<typeof vi.fn>;
      removeAttribute: ReturnType<typeof vi.fn>;
      onended: (() => void) | null;
      onerror: (() => void) | null;
    }) {
      this.play = vi.fn(async () => {
        throw new Error("NotAllowedError: play blocked");
      });
      this.pause = vi.fn();
      this.load = vi.fn();
      this.removeAttribute = vi.fn();
      this.onended = null;
      this.onerror = null;
    }

    const controller = createMediaRecorderController({
      getUserMedia: async () => stream,
      MediaRecorderImpl: FakeMediaRecorder as unknown as typeof MediaRecorder,
      createObjectURL: urls.createObjectURL,
      revokeObjectURL: urls.revokeObjectURL,
      AudioCtor: RejectingAudio as unknown as typeof Audio,
    });
    await controller.requestPermission();
    await controller.startRecording();
    await controller.stopRecording();

    await expect(controller.playRecording()).resolves.toBeUndefined();
    expect(controller.snapshot.phase).toBe("error");
    expect(controller.snapshot.errorCode).toBe("PlaybackError");
    expect(controller.snapshot.guidance).toMatch(/playback failed/i);
    controller.dispose();
  });

  it("audio.onerror yields PlaybackError without throw", async () => {
    const stream = makeStream([makeTrack()]);
    const urls = installUrlMocks();

    function ErroringAudio(this: {
      play: ReturnType<typeof vi.fn>;
      pause: ReturnType<typeof vi.fn>;
      load: ReturnType<typeof vi.fn>;
      removeAttribute: ReturnType<typeof vi.fn>;
      onended: (() => void) | null;
      onerror: (() => void) | null;
    }) {
      this.play = vi.fn(async () => {
        queueMicrotask(() => this.onerror?.());
      });
      this.pause = vi.fn();
      this.load = vi.fn();
      this.removeAttribute = vi.fn();
      this.onended = null;
      this.onerror = null;
    }

    const controller = createMediaRecorderController({
      getUserMedia: async () => stream,
      MediaRecorderImpl: FakeMediaRecorder as unknown as typeof MediaRecorder,
      createObjectURL: urls.createObjectURL,
      revokeObjectURL: urls.revokeObjectURL,
      AudioCtor: ErroringAudio as unknown as typeof Audio,
    });
    await controller.requestPermission();
    await controller.startRecording();
    await controller.stopRecording();

    await expect(controller.playRecording()).resolves.toBeUndefined();
    await Promise.resolve();
    await Promise.resolve();
    expect(controller.snapshot.phase).toBe("error");
    expect(controller.snapshot.errorCode).toBe("PlaybackError");
    controller.dispose();
  });

  it("dispose during recording ignores stale onstop/data; tracks stopped", async () => {
    const track = makeTrack();
    const stream = makeStream([track]);
    const urls = installUrlMocks();
    const snapshots: RecorderSnapshot[] = [];

    class DeferredStopMediaRecorder extends FakeMediaRecorder {
      stop() {
        this.state = "inactive";
        // Do not fire onstop synchronously — caller fires stale callbacks later.
      }
    }

    const controller = createMediaRecorderController({
      onChange: (s) => snapshots.push(s),
      getUserMedia: async () => stream,
      MediaRecorderImpl: DeferredStopMediaRecorder as unknown as typeof MediaRecorder,
      createObjectURL: urls.createObjectURL,
      revokeObjectURL: urls.revokeObjectURL,
    });
    await controller.requestPermission();
    await controller.startRecording();
    expect(controller.snapshot.phase).toBe("recording");

    const recorder = FakeMediaRecorder.instances[0]!;
    const staleOnStop = recorder.onstop;
    const staleOnData = recorder.ondataavailable;
    expect(staleOnStop).toBeTypeOf("function");

    controller.dispose();
    expect(track.stop).toHaveBeenCalled();

    // Stale callbacks must not resurrect finalized/ready.
    staleOnData?.({ data: new Blob(["late"], { type: "audio/webm" }) });
    staleOnStop?.();

    expect(controller.snapshot.phase).toBe("idle");
    expect(controller.snapshot.hasRecording).toBe(false);
    expect(urls.created).toHaveLength(0);
    const afterDispose = snapshots.slice(
      snapshots.findIndex((s) => s.phase === "recording") + 1,
    );
    expect(afterDispose.some((s) => s.phase === "finalized")).toBe(false);
    expect(afterDispose.some((s) => s.phase === "ready")).toBe(false);
  });

  it("active playback + startRecording/retry: no premature revoke; eventual revoke after stop", async () => {
    const streamA = makeStream([makeTrack()]);
    const urls = installUrlMocks();
    const getUserMedia = vi.fn(async () => makeStream([makeTrack()]));
    getUserMedia.mockResolvedValueOnce(streamA);

    class HoldingAudio {
      play = vi.fn(async () => {
        // keep playing until controller stops
      });
      pause = vi.fn();
      load = vi.fn();
      removeAttribute = vi.fn();
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
    }

    const controller = createMediaRecorderController({
      getUserMedia,
      MediaRecorderImpl: FakeMediaRecorder as unknown as typeof MediaRecorder,
      createObjectURL: urls.createObjectURL,
      revokeObjectURL: urls.revokeObjectURL,
      AudioCtor: HoldingAudio as unknown as typeof Audio,
    });
    await controller.requestPermission();
    await controller.startRecording();
    await controller.stopRecording();
    const firstUrl = controller.snapshot.objectUrl!;
    expect(firstUrl).toBeTruthy();

    await controller.playRecording();
    expect(controller.snapshot.phase).toBe("playback");
    // Still playing — must not have revoked yet.
    expect(urls.revoked).not.toContain(firstUrl);

    // Replace mid-playback without an explicit stopPlayback() call.
    await controller.startRecording();
    expect(urls.revoked).toContain(firstUrl);
    expect(controller.snapshot.phase).toBe("recording");

    await controller.stopRecording();
    const secondUrl = controller.snapshot.objectUrl!;
    await controller.playRecording();
    expect(controller.snapshot.phase).toBe("playback");
    expect(urls.revoked).not.toContain(secondUrl);

    // Retry mid-playback without stopPlayback — stops then revokes.
    controller.retry();
    expect(urls.revoked).toContain(secondUrl);
    expect(controller.snapshot.hasRecording).toBe(false);
    expect(controller.snapshot.phase).toBe("idle");
    controller.dispose();
  });

  it("unsupported API reports unsupported without crashing", async () => {
    const controller = createMediaRecorderController({
      getUserMedia: null,
    });
    await controller.requestPermission();
    expect(controller.snapshot.phase).toBe("unsupported");
    controller.dispose();
  });
});
