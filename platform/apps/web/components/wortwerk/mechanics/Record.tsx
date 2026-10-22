"use client";
import { useEffect, useRef, useState } from "react";
import type { GeneratedTask, GradeResult, TaskAnswer } from "../../../../../packages/wortwerk/src/tasks.js";
import { createMediaRecorderController } from "@/lib/recorder/createMediaRecorderController";
import type { RecorderController, RecorderSnapshot } from "@/lib/recorder/recorder-types";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import { QuestionAudio } from "../QuestionAudio";
import { TaskFeedback } from "../TaskFeedback";
export type RecordProps = {
    task: GeneratedTask;
    onAnswer: (answer: TaskAnswer) => void;
    result?: GradeResult | null;
    disabled?: boolean;
};
export function Record(props: RecordProps) { return <RecordTask key={props.task.id} {...props}/>; }
function RecordTask({ task, onAnswer, result, disabled = false }: RecordProps) {
    const controller = useRef<RecorderController | null>(null);
    const [snapshot, setSnapshot] = useState<RecorderSnapshot | null>(null);
    const [alternative, setAlternative] = useState("");
    const [compared, setCompared] = useState(false);
    const [checked, setChecked] = useState<string[]>([]);
    const [submitted, setSubmitted] = useState(false);
    const guard = useRef(false);
    const heading = useRef<HTMLHeadingElement>(null);
    useEffect(() => { heading.current?.focus(); const recorder = createMediaRecorderController({ onChange: value => setSnapshot(value) }); controller.current = recorder; return () => { recorder.dispose(); controller.current = null; }; }, []);
    const locked = disabled || submitted || !!result;
    const recording = snapshot?.phase === "recording";
    const busy = snapshot?.phase === "permission-pending" || snapshot?.phase === "stop-pending" || snapshot?.phase === "playback";
    const unsupported = snapshot?.phase === "unsupported" || snapshot?.phase === "denied" || snapshot?.phase === "no-device" || snapshot?.phase === "error";
    const checklist = task.question.checklist?.length ? task.question.checklist : ["I compared my response with the model."];
    function submit(complete: boolean) { if (guard.current || locked)
        return; guard.current = true; setSubmitted(true); controller.current?.stopPlayback(); onAnswer([complete ? "self:complete" : "self:practise", alternative]); }
    return <section className="ww-record"><h2 ref={heading} tabIndex={-1}>{task.question.instruction}</h2><p>Your recording stays on this device. Self-checking does not score pronunciation.</p>
 {task.question.passage && <p lang={task.question.lang} style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word", hyphens: "auto" }}>{task.question.passage}</p>}
 {task.question.audio && <QuestionAudio audio={task.question.audio}/>}
 {task.question.options.filter(option => option.image).map((option, index) => <img key={option.id} src={withPagesBaseAssetPath(option.image!)} alt={`Scene ${index + 1}`} width={240} height={180} style={{ maxWidth: "100%", objectFit: "contain" }}/>)}
 <div role="group" aria-label="Recording controls">
 <button className="ww-button" type="button" disabled={locked || compared || busy || recording || unsupported || !snapshot} onClick={() => { void controller.current?.startRecording(); }}>Start recording</button>
 <button className="ww-button" type="button" disabled={locked || !recording} onClick={() => { void controller.current?.stopRecording(); }}>Stop recording</button>
 <button className="ww-button" type="button" disabled={locked || busy || recording || !snapshot?.hasRecording} onClick={() => { void controller.current?.playRecording(); }}>Play my recording</button>
 {snapshot?.phase === "playback" && <button className="ww-button" type="button" onClick={() => controller.current?.stopPlayback()}>Stop playback</button>}
 <button className="ww-button" type="button" disabled={locked || recording || busy} onClick={() => { controller.current?.retry(); setCompared(false); setChecked([]); }}>Try recording again</button></div>
 <p role="status" aria-live="polite">{snapshot?.guidance ?? "Preparing recording controls."}</p>
 {unsupported && <p>Recording is unavailable. You can use the written response below and still practise.</p>}
 <label>Written response alternative<textarea value={alternative} rows={3} lang={task.question.lang} disabled={locked || compared} onChange={event => setAlternative(event.target.value)} style={{ width: "100%", boxSizing: "border-box", minHeight: 88 }}/></label>
 {!compared && <button className="ww-button" type="button" disabled={locked || recording || busy || (!snapshot?.playbackCompleted && !alternative.trim())} onClick={() => setCompared(true)}>Compare and self-check</button>}
 {compared && <section aria-label="Self-check"><h3>Compare with the model</h3>{task.feedback.modelAnswers?.map((answer, index) => <p key={index} lang={task.question.lang}>{answer}</p>)}{!task.feedback.modelAnswers?.length && task.feedback.answer !== "Your response" && <p lang={task.question.lang}>{task.feedback.answer}</p>}
 {checklist.map((label, index) => <label key={index} style={{ display: "block", minHeight: 44 }}><input type="checkbox" disabled={locked} checked={checked.includes(String(index))} onChange={event => setChecked(values => event.target.checked ? [...values, String(index)] : values.filter(value => value !== String(index)))}/>{label}</label>)}
 <button className="ww-button" type="button" disabled={locked || checked.length !== checklist.length} onClick={() => submit(true)}>I covered these points</button><button className="ww-button" type="button" disabled={locked} onClick={() => submit(false)}>Practise this again</button></section>}
 {result && <TaskFeedback feedback={task.feedback} result={result} lang={task.question.lang}/>}</section>;
}
