"use client";

import { useEffect, useRef } from "react";
import { AudioSpeedControl, useAudioSpeed } from "@/components/audio/AudioSpeedControl";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { LDiv, LP } from "@/components/i18n/LocalizedElements";
import { stopStudyAudio } from "@/components/study/StudyAudio";
import type { LearnerMediaAvailability } from "@/lib/content/detail-types";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import { translate } from "@/lib/i18n/catalog";

/** A pronunciation model for a phrase already visible in a recognition task. */
export function ActivityAudio({ media }: { media: LearnerMediaAvailability }) {
  const { locale } = useLocale();
  const audio = useRef<HTMLAudioElement>(null);
  const speed = useAudioSpeed();
  useEffect(() => {
    if (audio.current) audio.current.playbackRate = speed.speed;
  }, [speed.speed]);
  if (media.state !== "preview") return null;
  return <LDiv className="activity-audio">
    <LP className="dense">Listen to the German phrase</LP>
    {/* The matching prompt is the transcript; retrieval tasks never render this player. */}
    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
    <audio
      key={media.publicPath}
      ref={audio}
      controls
      preload="none"
      style={{ width: "100%", maxWidth: "28rem" }}
      aria-label={translate("Listen to the German phrase", locale)}
      src={withPagesBaseAssetPath(media.publicPath)}
      onPlay={(event) => { stopStudyAudio(event.currentTarget); event.currentTarget.playbackRate = speed.speed; }}
    />
    <AudioSpeedControl control={speed} />
  </LDiv>;
}
