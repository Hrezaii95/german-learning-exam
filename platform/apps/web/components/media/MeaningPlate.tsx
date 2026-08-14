"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { LearnerGender } from "@/lib/content/detail-types";
import { GenderBadge } from "@/components/details/GenderBadge";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";

/**
 * Meaning plate — the permanent media treatment for a learning object that has
 * no approved illustration (chosen-direction-contract.yaml `fallback_media_state`).
 *
 * It is not scaffolding and never apologises for a missing picture: it is a
 * quiet, readable meaning surface built from published HTML. An approved
 * illustration replaces only the media treatment; the semantic anatomy below
 * stays authoritative, which is why the same component also renders the
 * companion `body` variant beside a real image.
 *
 * Contract constraints encoded here and in `.meaning-plate` CSS:
 *  - reserved media geometry: 1:1 in hub grids, 4:3 on detail pages, a 96px
 *    semantic slot in compact lists;
 *  - one surface, one border, no nested shadow, no gradient, no imitation art;
 *  - German lemma/article dominant, English gloss secondary;
 *  - gender is always colour + shape + label, carried by the shared GenderBadge;
 *  - exactly one concise morphology preview and at most one 44px audio control;
 *  - every string is selectable HTML — German is never baked into an image.
 */
export type MeaningPlateVariant = "card" | "detail" | "compact" | "body";

export type MeaningPlateAudio = Readonly<{
  /** Root-relative deployable path; the Pages base is applied here. */
  publicPath: string;
  /** Exact German the clip speaks — used for the control's accessible name. */
  spokenText: string;
}>;

export type MeaningPlateProps = Readonly<{
  /** Canonical German lemma without its article. */
  lemma: string;
  /** Published article, when the item carries one. */
  article?: string | null;
  /** English gloss. Rendered secondary, never dominant. */
  gloss?: string | null;
  gender?: LearnerGender | null;
  /** Learner-language name for the single morphology preview, e.g. "Plural". */
  morphologyLabel?: string | null;
  /** The one morphology preview value, e.g. "die Ärztinnen". */
  morphology?: string | null;
  audio?: MeaningPlateAudio | null;
  variant: MeaningPlateVariant;
  /** When set, the dominant lemma is the learning object's own link. */
  href?: string | null;
  /** Heading level for the lemma; `null` renders a paragraph instead. */
  headingLevel?: 2 | 3 | null;
}>;

/**
 * One 44px control. Rendered only when a real clip exists for this exact text,
 * so a card never shows a play button it cannot honour. Exported because the
 * per-type hub card anatomies (verbs, grammar, phrases) need the same single
 * control without the rest of the plate.
 */
export function LemmaAudioButton({
  audio,
  label,
}: {
  audio: MeaningPlateAudio;
  label: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  function toggle() {
    const element = audioRef.current;
    if (!element) return;
    if (!element.paused) {
      element.pause();
      return;
    }
    for (const other of document.querySelectorAll<HTMLAudioElement>("audio")) {
      if (other !== element) other.pause();
    }
    if (element.ended) element.currentTime = 0;
    void element.play().catch(() => setIsPlaying(false));
  }

  return (
    <div className="meaning-plate__audio">
      {/* A short pronunciation model, not a timed passage: the exact spoken
          German is already visible and selectable on the plate itself. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        data-meaning-plate-audio="true"
        preload="none"
        src={withPagesBaseAssetPath(audio.publicPath)}
        aria-label={`${audio.spokenText}, synthesized German pronunciation`}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <button
        type="button"
        className="meaning-plate__audio-btn"
        data-audio-state={isPlaying ? "playing" : "idle"}
        onClick={toggle}
        aria-label={`${isPlaying ? "Pause" : "Play"} ${label} pronunciation`}
      >
        <span className="meaning-plate__audio-glyph" aria-hidden="true">
          {isPlaying ? "❚❚" : "▶"}
        </span>
        <span className="meaning-plate__audio-text">
          {isPlaying ? "Pause" : "Listen"}
        </span>
      </button>
    </div>
  );
}

export function MeaningPlate({
  lemma,
  article = null,
  gloss = null,
  gender = null,
  morphologyLabel = null,
  morphology = null,
  audio = null,
  variant,
  href = null,
  headingLevel = null,
}: MeaningPlateProps) {
  const spokenLemma = article ? `${article} ${lemma}` : lemma;
  const lemmaText = (
    <span className="german meaning-plate__lemma-text" lang="de">
      {article ? (
        <span className="meaning-plate__article">{article} </span>
      ) : null}
      {lemma}
    </span>
  );
  const lemmaBody = href ? (
    <Link className="meaning-plate__link" href={href}>
      {lemmaText}
    </Link>
  ) : (
    lemmaText
  );
  const LemmaTag = headingLevel === 2 ? "h2" : headingLevel === 3 ? "h3" : "p";

  return (
    <div
      className={`meaning-plate meaning-plate--${variant}`}
      data-meaning-plate={variant}
      data-gender={gender ?? "none"}
    >
      <LemmaTag className="meaning-plate__lemma">{lemmaBody}</LemmaTag>
      {gloss ? <p className="meaning-plate__gloss">{gloss}</p> : null}
      {gender ? (
        <p className="meaning-plate__cue">
          <GenderBadge gender={gender} />
        </p>
      ) : null}
      {morphology ? (
        <p className="meaning-plate__morph">
          {morphologyLabel ? (
            <span className="meaning-plate__morph-label">
              {morphologyLabel}
            </span>
          ) : null}
          <span className="german" lang="de">
            {morphology}
          </span>
        </p>
      ) : null}
      {audio ? <LemmaAudioButton audio={audio} label={spokenLemma} /> : null}
    </div>
  );
}
