"use client";
import { LButton, LDiv, LH2, LLi, LOl, LP, LSection, LSpan, LStrong } from "@/components/i18n/LocalizedElements";


import { useEffect, useRef, useState } from "react";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import type { WorkbookAudioTrack } from "@/lib/audio/workbook-audio";
import { AudioSpeedControl, useAudioSpeed } from "./AudioSpeedControl";
import { stopStudyAudio } from "@/components/study/StudyAudio";
import { ListeningTranscript } from "./ListeningTranscript";
import { workbookTranscript } from "@/lib/audio/listening-transcripts";

export function WorkbookAudioPanel({ tracks }: { tracks: readonly WorkbookAudioTrack[] }) {
  const players = useRef(new Map<string, HTMLAudioElement>());
  const audioSpeed = useAudioSpeed();
  const preferredSpeed = audioSpeed.speed;
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [selectedSpeeds, setSelectedSpeeds] = useState<Readonly<Record<string, number>>>({});

  useEffect(() => {
    for (const audio of players.current.values()) {
      audio.playbackRate = preferredSpeed;
      audio.preservesPitch = true;
    }
    // Per-track selections fall back to preferredSpeed, so clearing the
    // overrides both seeds new tracks and applies a changed preferred speed.
    // Depending on `tracks` here would reset learner choices whenever a
    // parent re-render produced a new array identity.
    setSelectedSpeeds({});
  }, [preferredSpeed]);

  function setSpeed(id: string, speed: number) {
    const audio = players.current.get(id);
    if (!audio) return;
    audio.playbackRate = speed;
    audio.preservesPitch = true;
    setSelectedSpeeds((current) => ({ ...current, [id]: speed }));
  }

  function replay(id: string) {
    const audio = players.current.get(id);
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => setErrors(current => ({ ...current, [id]: true })));
  }

  return (
    <LSection className="panel workbook-audio" aria-labelledby="workbook-audio-heading">
      <LDiv className="workbook-audio__heading">
        <LDiv>
          <LP className="dense">Original workbook audio</LP>
          <LH2 id="workbook-audio-heading">Listen, slow down, repeat</LH2>
        </LDiv>
        <LSpan className="meta-chip">{tracks.length} approved track{tracks.length === 1 ? "" : "s"}</LSpan>
      </LDiv>
      {/* ADR-016 asks for the source credit to travel with the media itself,
          not only with a page elsewhere in the app. */}
      <LP className="muted">
        Original exercise recordings from the <LSpan lang="de">Momente</LSpan> A1.1{" "}
        <LSpan lang="de">Arbeitsbuch</LSpan> CD (Hueber Verlag), mapped to this
        lesson activity. Study speed preserves pitch.
      </LP>
      <AudioSpeedControl control={audioSpeed}/>
      <LOl className="workbook-audio__list">
        {tracks.map((track) => (
          <LLi key={track.id} className="workbook-audio__track">
            <LDiv>
              <LStrong>{track.exercise} · Track {track.id.replace("_", ".")}</LStrong>
              <LP className="dense">{track.purpose} · {Math.round(track.durationSeconds)} sec</LP>
            </LDiv>
            {/* Learners choose when to reveal the transcript. */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio
              ref={(node) => {
                if (node) players.current.set(track.id, node);
                else players.current.delete(track.id);
              }}
              controls
              preload="none"
              src={withPagesBaseAssetPath(`/audio/source-workbook-approved-v1/${track.filename}`)}
              aria-label={`${track.exercise}, ${track.purpose}`}
              onLoadedMetadata={(event) => {
                event.currentTarget.playbackRate = selectedSpeeds[track.id] ?? preferredSpeed;
                event.currentTarget.preservesPitch = true;
              }}
              onPlay={(event) => {
                stopStudyAudio(event.currentTarget);
                setErrors(current => ({ ...current, [track.id]: false }));
              }}
              onError={() => setErrors(current => ({ ...current, [track.id]: true }))}
            />
            {errors[track.id] && <LP role="alert">Recording could not play. <LButton type="button" className="btn btn-secondary" onClick={() => { players.current.get(track.id)?.load(); replay(track.id); }}>Retry audio</LButton></LP>}
            <ListeningTranscript transcript={workbookTranscript(track.id)} />
            <LDiv className="workbook-audio__actions" role="group" aria-label={`Playback speed for ${track.id}`}>
              <LButton type="button" className="btn btn-secondary" aria-pressed={(selectedSpeeds[track.id] ?? preferredSpeed) === preferredSpeed} onClick={() => setSpeed(track.id, preferredSpeed)}>Preferred {preferredSpeed}×</LButton>
              <LButton type="button" className="btn btn-secondary" aria-pressed={selectedSpeeds[track.id] === 0.8} onClick={() => setSpeed(track.id, 0.8)}>Study 0.8×</LButton>
              <LButton type="button" className="btn btn-secondary" aria-pressed={selectedSpeeds[track.id] === 1} onClick={() => setSpeed(track.id, 1)}>Normal 1×</LButton>
              <LButton type="button" className="btn btn-secondary" onClick={() => replay(track.id)}>Repeat</LButton>
            </LDiv>
          </LLi>
        ))}
      </LOl>
    </LSection>
  );
}
