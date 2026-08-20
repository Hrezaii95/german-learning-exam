"use client";

import Link from "next/link";
import { memo } from "react";
import type {
  PronunciationReviewClip,
  PronunciationRiskTag,
} from "@/lib/audio/pronunciation-review";
import {
  REVIEW_VERDICTS,
  REVIEW_VERDICT_HINTS,
  REVIEW_VERDICT_LABELS,
  type ReviewVerdict,
  type ReviewVerdictEntry,
} from "@/lib/audio/review-verdicts";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";

/**
 * One clip, one decision.
 *
 * The card carries only what changes from clip to clip. The sentence
 * explaining what each sound means is printed once for the whole page —
 * repeating it on 110 cards would bury the German it is meant to help with.
 *
 * Every control's accessible name starts with its own visible words and then
 * adds the German, so voice control still works ("click Approve") while a
 * screen reader user moving control-to-control can still tell 110 otherwise
 * identical buttons apart.
 */
function ReviewClipRowInner({
  clip,
  tags,
  entry,
  onVerdict,
  onNote,
  onClear,
}: {
  clip: PronunciationReviewClip;
  /** Risk tags on this clip, already ordered hardest first. */
  tags: readonly PronunciationRiskTag[];
  entry: ReviewVerdictEntry | null;
  onVerdict: (clip: PronunciationReviewClip, verdict: ReviewVerdict) => void;
  onNote: (clip: PronunciationReviewClip, note: string) => void;
  onClear: (clip: PronunciationReviewClip) => void;
}) {
  const noteId = `note-${clip.reference}`;
  const seconds = `${clip.durationSeconds.toFixed(1)} seconds`;
  const chosen = entry?.verdict ?? null;

  return (
    <li
      className="review-clip"
      data-clip-reference={clip.reference}
      data-verdict={chosen ?? "none"}
      data-reviewed={chosen === null ? "false" : "true"}
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
          {tags.map((tag) => (
            <span key={tag.id} className="meta-chip review-clip__tag">
              {tag.label}
            </span>
          ))}
          {tags.length === 0 ? (
            <span className="meta-chip">No sound flagged</span>
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
        aria-label={`Play ${clip.spokenText}, computer voice, ${seconds}`}
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
          Your verdict on <span lang="de">{clip.spokenText}</span>
        </legend>
        <div className="review-clip__choices">
          {REVIEW_VERDICTS.map((verdict) => (
            <label
              key={verdict}
              className="review-clip__choice"
              data-choice={verdict}
              data-selected={chosen === verdict ? "true" : "false"}
            >
              <input
                type="radio"
                name={`verdict-${clip.reference}`}
                value={verdict}
                checked={chosen === verdict}
                onChange={() => onVerdict(clip, verdict)}
              />
              <span className="review-clip__choice-label">
                {REVIEW_VERDICT_LABELS[verdict]}
              </span>
              <span className="review-audio__quiet">
                {" "}
                <span lang="de">{clip.spokenText}</span>.{" "}
                {REVIEW_VERDICT_HINTS[verdict]}
              </span>
            </label>
          ))}
          <button
            type="button"
            className="btn btn-secondary review-clip__clear"
            onClick={() => onClear(clip)}
            disabled={entry === null}
          >
            Clear
            <span className="review-audio__quiet">
              {" "}
              <span lang="de">{clip.spokenText}</span>
            </span>
          </button>
        </div>
      </fieldset>

      <div className="review-clip__note">
        <label htmlFor={noteId}>
          Note
          <span className="review-audio__quiet">
            {" on "}
            <span lang="de">{clip.spokenText}</span>
          </span>
        </label>
        <textarea
          id={noteId}
          rows={2}
          value={entry?.note ?? ""}
          placeholder="What came out wrong — the vowel, the stress, the rhythm."
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
                  <span className="review-audio__quiet"> (opens a new tab)</span>
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
 * their media elements — would re-render on every character typed, which
 * restarts nothing but does drop frames badly enough to feel broken. The props
 * that matter are all stable identities (`clip` and `tags` are frozen and built
 * once, `entry` changes only for the card it belongs to, the handlers are
 * `useCallback`-stable), so the default shallow comparison is exactly right.
 */
export const ReviewClipRow = memo(ReviewClipRowInner);
