"use client";

import { useMemo } from "react";
import {
  AUDIO_MATCH_UNAVAILABLE_REASON,
  buildAudioMatchPrompt,
} from "@/lib/games";
import { GameFeedback, type GameEventSink } from "./GameFeedback";

/**
 * Audio match renderer exists but is honestly unavailable until listening
 * approval + a safe public-media contract. Must not emit graded events.
 * Emit non-emission is covered by unit tests on `emitAudioMatchAttempt` —
 * do not call it during render (impure / Strict Mode double-invoke).
 */
export function AudioMatchGame({
  onEvent: _onEvent,
}: {
  sessionId: string;
  onEvent?: GameEventSink;
}) {
  const prompt = useMemo(() => buildAudioMatchPrompt(), []);

  return (
    <section className="panel game-panel" aria-labelledby="audio-match-heading">
      <h2 id="audio-match-heading">Audio match</h2>
      <p className="placeholder-banner" role="status" data-availability="unavailable">
        {prompt.unavailableReason}
      </p>
      <button
        type="button"
        className="btn btn-secondary"
        disabled
        aria-disabled="true"
        tabIndex={-1}
        // Visible label first, reason after: the accessible name has to contain
        // the words on the button (WCAG 2.5.3 Label in Name).
        aria-label={`Match audio (unavailable) — ${AUDIO_MATCH_UNAVAILABLE_REASON}`}
      >
        Match audio (unavailable)
      </button>
      <GameFeedback
        kind="unavailable"
        message={prompt.unavailableReason}
      />
    </section>
  );
}
