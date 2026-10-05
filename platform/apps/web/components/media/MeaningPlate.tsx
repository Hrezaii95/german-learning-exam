"use client";
import { LButton, LDiv, LP, LSpan } from "@/components/i18n/LocalizedElements";


import { useEffect, useRef, useState } from "react";
import Link from "@/components/i18n/LocalizedLink";
import type { LearnerGender } from "@/lib/content/detail-types";
import { GenderBadge } from "@/components/details/GenderBadge";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import { stopStudyAudio } from "@/components/study/StudyAudio";
import { usePreferredAudioSpeed } from "@/components/audio/AudioSpeedControl";

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
  const [failed, setFailed] = useState(false);
  const rate = usePreferredAudioSpeed();
  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = rate; }, [rate]);

  function toggle() {
    const element = audioRef.current;
    if (!element) return;
    if (!element.paused) {
      element.pause();
      return;
    }
    stopStudyAudio();
    if (failed) element.load();
    setFailed(false);
    element.playbackRate = rate;
    element.preservesPitch = true;
    if (element.ended) element.currentTime = 0;
    void element.play().catch(error => {
      setIsPlaying(false);
      if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
    });
  }

  return (
    <LDiv className="meaning-plate__audio">
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
        onError={() => { setFailed(true); setIsPlaying(false); }}
      />
      <LButton
        type="button"
        className="meaning-plate__audio-btn"
        data-audio-state={isPlaying ? "playing" : "idle"}
        onClick={toggle}
        // The accessible name must START with the words the learner can see
        // ("Listen" / "Pause"), or speech control — Dragon, Voice Control,
        // Voice Access — cannot match "click Listen" (WCAG 2.5.3 Label in
        // Name). The lemma follows so the name still says which word it plays.
        aria-label={`${isPlaying ? "Pause" : "Listen"} — ${label} pronunciation`}
      >
        <LSpan className="meaning-plate__audio-glyph" aria-hidden="true">
          {isPlaying ? "❚❚" : "▶"}
        </LSpan>
        <LSpan className="meaning-plate__audio-text">
          {isPlaying ? "Pause" : "Listen"}
        </LSpan>
      </LButton>
      {failed && <LSpan role="status">Audio could not play. Press Listen to retry.</LSpan>}
    </LDiv>
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
    <LSpan className="german meaning-plate__lemma-text" lang="de">
      {article ? (
        <LSpan className="meaning-plate__article">{article} </LSpan>
      ) : null}
      {lemma}
    </LSpan>
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
    <LDiv
      className={`meaning-plate meaning-plate--${variant}`}
      data-meaning-plate={variant}
      data-gender={gender ?? "none"}
    >
      <LemmaTag className="meaning-plate__lemma">{lemmaBody}</LemmaTag>
      {gloss ? <LP className="meaning-plate__gloss">{gloss}</LP> : null}
      {gender ? (
        <LP className="meaning-plate__cue">
          <GenderBadge gender={gender} />
        </LP>
      ) : null}
      {morphology ? (
        <LP className="meaning-plate__morph">
          {morphologyLabel ? (
            <LSpan className="meaning-plate__morph-label">
              {morphologyLabel}
            </LSpan>
          ) : null}
          <LSpan className="german" lang="de">
            {morphology}
          </LSpan>
        </LP>
      ) : null}
      {audio ? <LemmaAudioButton audio={audio} label={spokenLemma} /> : null}
    </LDiv>
  );
}
