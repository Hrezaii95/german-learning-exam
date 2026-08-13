"use client";

import { useEffect, useRef, useState } from "react";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import type { WorkbookAudioTrack } from "@/lib/audio/workbook-audio";
import { useOptionalLearnerState } from "@/components/learner-state/LearnerStateProvider";

export function WorkbookAudioPanel({ tracks }: { tracks: readonly WorkbookAudioTrack[] }) {
  const players = useRef(new Map<string, HTMLAudioElement>());
  const learnerState = useOptionalLearnerState();
  const preferredSpeed = learnerState?.snapshot.hydration?.state.settings.preferredAudioSpeed ?? 1;
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
    void audio.play();
  }

  return (
    <section className="panel workbook-audio" aria-labelledby="workbook-audio-heading">
      <div className="workbook-audio__heading">
        <div>
          <p className="dense">Original workbook audio</p>
          <h2 id="workbook-audio-heading">Listen, slow down, repeat</h2>
        </div>
        <span className="meta-chip">{tracks.length} approved track{tracks.length === 1 ? "" : "s"}</span>
      </div>
      <p className="muted">Official exercise recordings mapped to this lesson activity. Study speed preserves pitch.</p>
      <ol className="workbook-audio__list">
        {tracks.map((track) => (
          <li key={track.id} className="workbook-audio__track">
            <div>
              <strong>{track.exercise} · Track {track.id.replace("_", ".")}</strong>
              <p className="dense">{track.purpose} · {Math.round(track.durationSeconds)} sec</p>
            </div>
            {/* Authentic listening tasks intentionally omit captions because a
                caption would disclose the exercise answer. The adjacent label
                still identifies the source exercise and learning purpose. */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio
              ref={(node) => {
                if (node) players.current.set(track.id, node);
                else players.current.delete(track.id);
              }}
              controls
              preload="metadata"
              src={withPagesBaseAssetPath(`/audio/source-workbook-approved-v1/${track.filename}`)}
              aria-label={`${track.exercise}, ${track.purpose}`}
              onLoadedMetadata={(event) => {
                event.currentTarget.playbackRate = preferredSpeed;
                event.currentTarget.preservesPitch = true;
              }}
              onPlay={(event) => {
                for (const player of document.querySelectorAll<HTMLAudioElement>("audio")) {
                  if (player !== event.currentTarget) player.pause();
                }
              }}
            />
            <div className="workbook-audio__actions" role="group" aria-label={`Playback speed for ${track.id}`}>
              <button type="button" className="btn btn-secondary" aria-pressed={(selectedSpeeds[track.id] ?? preferredSpeed) === preferredSpeed} onClick={() => setSpeed(track.id, preferredSpeed)}>Preferred {preferredSpeed}×</button>
              <button type="button" className="btn btn-secondary" aria-pressed={selectedSpeeds[track.id] === 0.8} onClick={() => setSpeed(track.id, 0.8)}>Study 0.8×</button>
              <button type="button" className="btn btn-secondary" aria-pressed={selectedSpeeds[track.id] === 1} onClick={() => setSpeed(track.id, 1)}>Normal 1×</button>
              <button type="button" className="btn btn-secondary" onClick={() => replay(track.id)}>Repeat</button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
