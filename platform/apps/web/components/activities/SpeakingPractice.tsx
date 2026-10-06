"use client";

import { useEffect, useRef, useState } from "react";
import { LButton, LDiv, LH3, LInput, LLabel, LP, LSpan } from "@/components/i18n/LocalizedElements";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { translate } from "@/lib/i18n/catalog";

const REFLECTIONS = [
  "I greeted someone and introduced myself.",
  "I said where I come from and how I am.",
  "I listened to myself and tried again where needed.",
] as const;

/** Optional local recording supports reflection; it never claims speech assessment. */
export function SpeakingPractice({ onFinish }: { onFinish: () => void }) {
  const { locale } = useLocale();
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const objectUrl = useRef<string | null>(null);
  const mounted = useRef(true);
  const [recording, setRecording] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [clip, setClip] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  async function startRecording() {
    setMessage("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Recording is unavailable here. Say the introduction aloud and use the self-review below.");
      return;
    }
    setRequesting(true);
    let input: MediaStream | null = null;
    try {
      input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { input.getTracks().forEach((track) => track.stop()); return; }
      stream.current = input;
      const next = new MediaRecorder(input);
      const chunks: BlobPart[] = [];
      next.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      next.onstop = () => {
        input?.getTracks().forEach((track) => track.stop());
        if (!mounted.current) return;
        setRecording(false);
        if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
        objectUrl.current = URL.createObjectURL(new Blob(chunks, { type: next.mimeType }));
        setClip(objectUrl.current);
      };
      recorder.current = next;
      next.start();
      setRecording(true);
    } catch {
      input?.getTracks().forEach((track) => track.stop());
      if (mounted.current) setMessage("Recording is unavailable here. Say the introduction aloud and use the self-review below.");
    } finally {
      if (mounted.current) setRequesting(false);
    }
  }

  return <LDiv className="stack">
    <LP>Say these sentences aloud using your own details.</LP>
    <LP className="german" lang="de">Hallo! Ich heiße … Ich komme aus … Mir geht es …</LP>
    <LP>Spell your own name, then ask the other person their name.</LP>
    <LP className="german" lang="de">Wie heißt du? / Wie heißen Sie?</LP>
    <LDiv className="journey-actions">
      <LButton type="button" className="btn btn-secondary" disabled={requesting} onClick={() => {
        if (recording) recorder.current?.stop();
        else void startRecording();
      }}>{recording ? "Stop recording" : clip ? "Record again" : "Record my introduction"}</LButton>
    </LDiv>
    <LP className="dense">Your recording stays on this page and is removed when you leave. It is not uploaded or scored.</LP>
    {clip ? <>
      <LP>Listen back, then review your introduction.</LP>
      {/* This is the learner's own unscripted recording, not published lesson media. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio controls src={clip} aria-label={translate("My introduction recording", locale)} style={{ width: "100%", maxWidth: "28rem" }} />
    </> : null}
    <LP className="dense" role="status">{message}</LP>
    <LH3>Review your speaking</LH3>
    <LP>Speaking practice is not automatically assessed. You can use your device recorder to listen back.</LP>
    {REFLECTIONS.map((item) => <LLabel className="activity-choice" key={item}>
      <LInput type="checkbox" checked={checked.includes(item)} onChange={(event) => {
        const selected = event.currentTarget.checked;
        setChecked((current) => selected ? [...current, item] : current.filter((value) => value !== item));
      }} />
      <LSpan>{item}</LSpan>
    </LLabel>)}
    <LButton type="button" className="btn btn-primary" disabled={recording || requesting} onClick={() => {
      if (checked.length !== REFLECTIONS.length) { setMessage("Complete each self-review step before finishing."); return; }
      onFinish();
    }}>Finish speaking practice</LButton>
  </LDiv>;
}
