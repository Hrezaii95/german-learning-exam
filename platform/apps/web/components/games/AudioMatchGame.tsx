"use client";
import { LButton, LH2, LP, LSection } from "@/components/i18n/LocalizedElements";


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
    <LSection className="panel game-panel" aria-labelledby="audio-match-heading">
      <LH2 id="audio-match-heading">Audio match</LH2>
      <LP className="placeholder-banner" role="status" data-availability="unavailable">
        {prompt.unavailableReason}
      </LP>
      <LButton
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
      </LButton>
      <GameFeedback
        kind="unavailable"
        message={prompt.unavailableReason}
      />
    </LSection>
  );
}
