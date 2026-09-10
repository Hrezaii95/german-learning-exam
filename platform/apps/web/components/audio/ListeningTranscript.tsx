"use client";

import { useState } from "react";
import type { ListeningTranscript as Transcript } from "@/lib/study/types";
import { GermanText, MeaningButton } from "@/components/study/StudyProvider";

export function ListeningTranscript({
  transcript,
}: {
  transcript: Transcript | undefined;
}) {
  const [open, setOpen] = useState(false);
  if (!transcript) return null;
  return (
    <details
      className="listening-transcript"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        {open ? "Hide transcript" : "Show transcript"}
        <span>Read along</span>
      </summary>
      <div className="listening-transcript-body">
        <p className="listening-transcript-hint">
          Listen first, then read along. Tap a word or highlight a phrase for its meaning.
        </p>
        <div className="listening-transcript-lines">
          {transcript.lines.map((line, index) => (
            <p key={index}>
              {line.speaker && <strong lang="de">{line.speaker}</strong>}
              <GermanText text={line.text} />
              <MeaningButton text={line.text} />
            </p>
          ))}
        </div>
        <p className="listening-transcript-credit">
          {transcript.credit} · {transcript.sourceTitle}, p.{" "}
          {transcript.sourcePages.join(", ")} · Track {transcript.sourceTrack}
        </p>
      </div>
    </details>
  );
}
