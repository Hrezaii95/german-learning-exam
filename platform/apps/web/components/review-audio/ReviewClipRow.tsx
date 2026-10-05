"use client";
import { LButton, LDetails, LDiv, LFieldset, LInput, LLabel, LLegend, LLi, LP, LSpan, LSummary, LTextarea, LUl } from "@/components/i18n/LocalizedElements";


import Link from "@/components/i18n/LocalizedLink";
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
    <LLi
      className="review-clip"
      data-clip-reference={clip.reference}
      data-verdict={chosen ?? "none"}
      data-reviewed={chosen === null ? "false" : "true"}
    >
      <LDiv className="review-clip__head">
        {/* The exact German the voice was given. Large, selectable, and marked
            as German so a screen reader switches voice for it. */}
        <LP className="review-clip__german" lang="de">
          {clip.spokenText}
        </LP>
        <LP className="review-clip__meta">
          <LSpan className="meta-chip">{seconds}</LSpan>
          <LSpan className="meta-chip">Clip {clip.reference}</LSpan>
          {tags.map((tag) => (
            <LSpan key={tag.id} className="meta-chip review-clip__tag">
              {tag.label}
            </LSpan>
          ))}
          {tags.length === 0 ? (
            <LSpan className="meta-chip">No sound flagged</LSpan>
          ) : null}
        </LP>
      </LDiv>

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

      <LFieldset className="review-clip__verdict">
        <LLegend>
          Your verdict on <LSpan lang="de">{clip.spokenText}</LSpan>
        </LLegend>
        <LDiv className="review-clip__choices">
          {REVIEW_VERDICTS.map((verdict) => (
            <LLabel
              key={verdict}
              className="review-clip__choice"
              data-choice={verdict}
              data-selected={chosen === verdict ? "true" : "false"}
            >
              <LInput
                type="radio"
                name={`verdict-${clip.reference}`}
                value={verdict}
                checked={chosen === verdict}
                onChange={() => onVerdict(clip, verdict)}
              />
              <LSpan className="review-clip__choice-label">
                {REVIEW_VERDICT_LABELS[verdict]}
              </LSpan>
              <LSpan className="review-audio__quiet">
                {" "}
                <LSpan lang="de">{clip.spokenText}</LSpan>.{" "}
                {REVIEW_VERDICT_HINTS[verdict]}
              </LSpan>
            </LLabel>
          ))}
          <LButton
            type="button"
            className="btn btn-secondary review-clip__clear"
            onClick={() => onClear(clip)}
            disabled={entry === null}
          >
            Clear
            <LSpan className="review-audio__quiet">
              {" "}
              <LSpan lang="de">{clip.spokenText}</LSpan>
            </LSpan>
          </LButton>
        </LDiv>
      </LFieldset>

      <LDiv className="review-clip__note">
        <LLabel htmlFor={noteId}>
          Note
          <LSpan className="review-audio__quiet">
            {" on "}
            <LSpan lang="de">{clip.spokenText}</LSpan>
          </LSpan>
        </LLabel>
        <LTextarea
          id={noteId}
          rows={2}
          value={entry?.note ?? ""}
          placeholder="What came out wrong — the vowel, the stress, the rhythm."
          onChange={(event) => onNote(clip, event.target.value)}
        />
      </LDiv>

      {clip.usages.length > 0 ? (
        <LDetails className="review-clip__usage">
          <LSummary>
            Heard on {clip.usages.length}{" "}
            {clip.usages.length === 1 ? "page" : "pages"}
          </LSummary>
          <LUl>
            {clip.usages.map((usage) => (
              <LLi key={usage.href}>
                <Link href={usage.href} target="_blank" rel="noopener noreferrer">
                  <LSpan lang={usage.language}>{usage.label}</LSpan>
                  <LSpan className="review-clip__usage-context">
                    {usage.context}
                  </LSpan>
                  <LSpan className="review-audio__quiet"> (opens a new tab)</LSpan>
                </Link>
              </LLi>
            ))}
          </LUl>
        </LDetails>
      ) : null}
    </LLi>
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
