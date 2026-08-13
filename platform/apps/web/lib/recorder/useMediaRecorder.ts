"use client";

import { useEffect, useState } from "react";
import { createMediaRecorderController } from "./createMediaRecorderController";
import type { RecorderController, RecorderSnapshot } from "./recorder-types";

const INITIAL: RecorderSnapshot = Object.freeze({
  phase: "idle",
  errorCode: null,
  guidance: null,
  objectUrl: null,
  hasRecording: false,
  recordCompleted: false,
  playbackCompleted: false,
});

/**
 * React binding for the race-safe recorder controller.
 * Disposes on unmount (route navigation) and ignores stale async work.
 */
export function useMediaRecorder(): {
  snapshot: RecorderSnapshot;
  controller: RecorderController | null;
} {
  const [snapshot, setSnapshot] = useState<RecorderSnapshot>(INITIAL);
  const [controller, setController] = useState<RecorderController | null>(null);

  useEffect(() => {
    const next = createMediaRecorderController({
      onChange: setSnapshot,
    });
    setController(next);
    setSnapshot(next.snapshot);
    return () => {
      next.dispose();
      setController(null);
    };
  }, []);

  return { snapshot, controller };
}
