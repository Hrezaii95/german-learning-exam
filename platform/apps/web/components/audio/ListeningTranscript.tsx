"use client";

import { useState } from "react";
import type { ListeningTranscript as Transcript } from "@/lib/study/types";
import { GermanText, MeaningButton, SaveButton, useStudy } from "@/components/study/StudyProvider";
import { LineAudio } from "@/components/study/StudyAudio";
import { tagsForLesson } from "@/lib/study/scope";

export function ListeningTranscript({
  transcript,
  href,
  lesson,
}: {
  transcript: Transcript | undefined;
  href?: string;
  lesson?: number;
}) {
  const study = useStudy();
  const [open, setOpen] = useState(false);
  if (!transcript) return null;
  const song=transcript.sourceTitle.includes("song text");
  return (
    <details
      className="listening-transcript"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        {song?(open?"Hide song text":"Show song text"):(open ? "Hide transcript" : "Show transcript")}
        <span>Read along</span>
      </summary>
      <div className="listening-transcript-body">
        <p className="listening-transcript-hint">
          {song?"Song text from the book, completed with the official answer key. Shown in book order; the recording may repeat verses.":"Listen first, then read along. Tap a word or highlight a phrase for its meaning."}
        </p>
        <p className="muted">Line pronunciation is generated speech. Listen to the original recording above for the dialogue. For a line without a local translation, use Meaning and add your translation as a note in My review.</p>
        <div className="listening-transcript-lines">
          {open && transcript.lines.map((line, index) => {
            const entry = study?.dictionary.find(item => item.de === line.text);
            return (
            <p key={index}>
              {line.speaker && <strong lang="de">{line.speaker}</strong>}
              <GermanText text={line.text} />
              <span className="study-row transcript-line-actions" role="group" aria-label={`Actions for transcript line ${index + 1}`}>
                <LineAudio text={line.text} src={entry?.audio} compact/>
                <MeaningButton text={line.text} />
                <SaveButton item={{
                  id: entry ? entry.saveId ?? `card-${entry.id}` : `transcript-${encodeURIComponent(transcript.sourceTitle)}-${transcript.sourceTrack}-${index}`,
                  title: line.text,
                  meaning: entry?.en ?? "Translation not saved yet. Open this line for its meaning or add your own note.",
                  kind: entry ? entry.kind === "phrase" ? "phrase" : entry.kind === "sentence" ? "line" : "word" : "line",
                  href: entry?.href ?? href ?? `/listening?q=${encodeURIComponent(line.text)}`,
                  audio: entry?.audio ?? null,
                  ...(entry?.studyTags ? { studyTags: entry.studyTags } : lesson ? { studyTags: tagsForLesson(lesson) } : {}),
                }}/>
              </span>
            </p>
          ); })}
        </div>
        <p className="listening-transcript-credit">
          {transcript.credit} · {transcript.sourceTitle}, p.{" "}
          {transcript.sourcePages.join(", ")} · Track {transcript.sourceTrack}
        </p>
      </div>
    </details>
  );
}
