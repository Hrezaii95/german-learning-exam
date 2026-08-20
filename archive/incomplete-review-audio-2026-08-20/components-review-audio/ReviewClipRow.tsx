"use client";

import Link from "next/link";
import { memo } from "react";
import type {
  PronunciationReviewClip,
  SoundClass,
} from "@/lib/audio/pronunciation-review";
import {
  REVIEW_VERDICT_CHOICES,
  REVIEW_VERDICT_LABELS,
  type ReviewVerdictChoice,
  type ReviewVerdictEntry,
} from "@/lib/audio/review-verdicts";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";

/**
 * One clip, one decision.
 *
 * The card carries only what changes from clip to clip. The sentence
 * explaining what each sound class means is printed once for the whole page —
 * repeating it on 110 cards would bury the German it is meant to help with.
 */
function ReviewClipRowInner({
  clip,
  classes,
  verdict,
  onChoice,
  onNote,
  onClear,
}: {
  clip: PronunciationReviewClip;
  /** Sound classes on this clip, already ordered hardest first. */
  classes: readonly SoundClass[];
  verdict: ReviewVerdictEntry | null;
  onChoice: (clip: PronunciationReviewClip, choice: ReviewVerdictChoice) => void;
  onNote: (clip: PronunciationReviewClip, note: string) => void;
  onClear: (clip: PronunciationReviewClip) => void;
}) {
  const noteId = `note-${clip.reference}`;
  const seconds = `${clip.durationSeconds.toFixed(1)} seconds`;
  const decided = verdict?.choice ?? null;

  return (
    <li
      className="review-clip"
      data-clip-id={clip.id}
      data-clip-reference={clip.reference}
      data-decided={decided ?? "none"}
    >
      <div className="review-clip__head">
        {/* The exact German the voice was given. Large, selectable, and marked
            as German so a screen reader switches voice for it. */}
        <p className="review-clip__german" lang="de">
          {clip.spokenText}
        </p>
        <p className="review-clip__meta">
          <span className="meta-chip">{seconds}</span>
          <span className="meta-chip">Clip {clip.reference}</span>
          {classes.map((soundClass) => (
            <span key={soundClass.id} className="meta-chip review-clip__class">
              {soundClass.label}
            </span>
          ))}
          {classes.length === 0 ? (
            <span className="meta-chip">No sound class noted</span>
          ) : null}
        </p>
      </div>

      {/* The exact spoken German is printed directly above the player, so a
          separate caption track would repeat it word for word. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        className="review-clip__audio"
        data-review-audio="true"
        controls
        preload="metadata"
        src={withPagesBaseAssetPath(clip.publicPath)}
        aria-label={`${clip.spokenText}, computer voice, ${seconds}`}
        onPlay={(event) => {
          // Working down a long list means starting clips in quick succession;
          // two voices at once tells you nothing about either of them.
          for (const other of document.querySelectorAll<HTMLAudioElement>(
            "audio[data-review-audio]",
          )) {
            if (other !== event.currentTarget) other.pause();
          }
        }}
      />

      <fieldset className="review-clip__verdict">
        <legend>
          Verdict for <span lang="de">{clip.spokenText}</span>
        </legend>
        <div className="review-clip__choices">
          {REVIEW_VERDICT_CHOICES.map((choice) => (
            <label
              key={choice}
              className="review-clip__choice"
              data-choice={choice}
              data-selected={decided === choice ? "true" : "false"}
            >
              <input
                type="radio"
                name={`verdict-${clip.reference}`}
                value={choice}
                checked={decided === choice}
                onChange={() => onChoice(clip, choice)}
              />
              <span>{REVIEW_VERDICT_LABELS[choice]}</span>
            </label>
          ))}
          <button
            type="button"
            className="btn btn-secondary review-clip__clear"
            onClick={() => onClear(clip)}
            disabled={verdict === null}
          >
            Undo
          </button>
        </div>
      </fieldset>

      <div className="review-clip__note">
        <label htmlFor={noteId}>What did you hear?</label>
        <textarea
          id={noteId}
          rows={2}
          value={verdict?.note ?? ""}
          placeholder="Optional — the sound that came out wrong, the stress, the vowel."
          onChange={(event) => onNote(clip, event.target.value)}
        />
      </div>

      {clip.usages.length > 0 ? (
        <details className="review-clip__usage">
          <summary>
            Heard on {clip.usages.length}{" "}
            {clip.usages.length === 1 ? "page" : "pages"}
          </summary>
          <ul>
            {clip.usages.map((usage) => (
              <li key={usage.href}>
                <Link href={usage.href} target="_blank" rel="noopener noreferrer">
                  <span lang={usage.language}>{usage.label}</span>
                  <span className="review-clip__usage-context">
                    {usage.context}
                  </span>
                  <span className="review-audio__sr-only"> (opens a new tab)</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </li>
  );
}

/**
 * Memoised on purpose. The board holds every verdict in one object, so a single
 * keystroke in one note produces a new book; without this, all 110 cards — and
 * their media elements — would re-render on every character typed. The props
 * that matter are all stable identities (`clip` and `classes` are frozen and
 * built once, `verdict` changes only for the card it belongs to, the handlers
 * are `useCallback`-stable), so the default shallow comparison is exactly right.
 */
export const ReviewClipRow = memo(ReviewClipRowInner);
