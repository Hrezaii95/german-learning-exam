/**
 * Shared pronunciation / audio-control contract (AUD-002 scaffolding).
 * Approved manifests can activate playback later without redesign.
 * This slice never fakes playback or serves candidate paths.
 * Until a safe public approved-audio URL contract and working playback exist,
 * every media state remains disabled / non-interactive.
 */
import type { LearnerMediaAvailability } from "@/lib/content/detail-types";
import {
  PRONUNCIATION_APPROVED_PENDING_ACTIVATION_EXPLANATION,
  PRONUNCIATION_MISSING_EXPLANATION,
  PRONUNCIATION_PENDING_EXPLANATION,
} from "@/lib/content/media-copy";

export type AudioControlState =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "unavailable"
  | "error";

export type AudioControlContract = {
  readonly state: AudioControlState;
  readonly canPlay: boolean;
  readonly rate: 1 | 0.8;
  readonly media: LearnerMediaAvailability;
  readonly explanation: string | null;
};

/**
 * Resolve control state. Playback is not wired yet — `canPlay` is always false,
 * including synthetic `approved` rows, so UI cannot show a fake enabled Play.
 */
export function resolveAudioControl(
  media: LearnerMediaAvailability,
): AudioControlContract {
  if (media.state === "pending-review") {
    return Object.freeze({
      state: "unavailable" as const,
      canPlay: false,
      rate: 1 as const,
      media,
      explanation: PRONUNCIATION_PENDING_EXPLANATION,
    });
  }
  if (media.state === "approved") {
    return Object.freeze({
      state: "unavailable" as const,
      canPlay: false,
      rate: 1 as const,
      media,
      explanation: PRONUNCIATION_APPROVED_PENDING_ACTIVATION_EXPLANATION,
    });
  }
  return Object.freeze({
    state: "unavailable" as const,
    canPlay: false,
    rate: 1 as const,
    media,
    explanation: PRONUNCIATION_MISSING_EXPLANATION,
  });
}

export function PronunciationControl({
  media,
  label = "Pronunciation",
}: {
  media: LearnerMediaAvailability;
  label?: string;
}) {
  const control = resolveAudioControl(media);

  return (
    <div className="audio-control" data-audio-state={control.state}>
      <button
        type="button"
        className="btn btn-secondary audio-control__btn"
        disabled
        aria-disabled="true"
        tabIndex={-1}
        aria-label={`${label} unavailable`}
      >
        Pronunciation unavailable
      </button>
      {control.explanation ? (
        <p className="dense audio-control__note" role="status">
          {control.explanation}
        </p>
      ) : null}
    </div>
  );
}
