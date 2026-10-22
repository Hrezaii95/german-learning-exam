"use client";
import { useEffect, useRef, useState } from "react";
import type { GeneratedTask, GradeResult, TaskAnswer } from "../../../../../packages/wortwerk/src/tasks.js";
import { QuestionAudio } from "../QuestionAudio";
import { TaskFeedback } from "../TaskFeedback";
export type WriteProps = {
    task: GeneratedTask;
    onAnswer: (answer: TaskAnswer) => void;
    result?: GradeResult | null;
    disabled?: boolean;
};
export function Write(props: WriteProps) { return <WriteTask key={props.task.id} {...props}/>; }
function WriteTask({ task, onAnswer, result, disabled = false }: WriteProps) {
    const [draft, setDraft] = useState("");
    const [compared, setCompared] = useState(false);
    const [checked, setChecked] = useState<string[]>([]);
    const [submitted, setSubmitted] = useState(false);
    const guard = useRef(false);
    const input = useRef<HTMLTextAreaElement>(null);
    useEffect(() => { input.current?.focus(); }, []);
    const self = !!task.solution.selfCheck;
    const locked = disabled || submitted || !!result;
    const checklist = task.question.checklist?.length ? task.question.checklist : ["I checked my response against the model."];
    function submit(value: TaskAnswer) { if (guard.current || locked)
        return; guard.current = true; setSubmitted(true); onAnswer(value); }
    return <section className="ww-write"><h2>{task.question.instruction}</h2>{task.question.text && <p lang={task.question.lang}>{task.question.text}</p>}{task.question.passage && <p lang={task.question.lang}>{task.question.passage}</p>}{task.question.audio && <QuestionAudio audio={task.question.audio}/>}
 <form onSubmit={event => { event.preventDefault(); if (!draft.trim() || locked)
        return; if (self)
        setCompared(true);
    else
        submit(draft); }}>
 <label>Your response<textarea ref={input} rows={5} lang={task.question.lang} value={draft} onChange={event => setDraft(event.target.value)} disabled={locked || compared} autoComplete="off" spellCheck={false} style={{ width: "100%", boxSizing: "border-box", minHeight: 88 }}/></label>
 <div role="group" aria-label="Character keys">{task.question.helperKeys.map(key => <button type="button" className="ww-button" key={key} disabled={locked || compared} onClick={() => { setDraft(value => value + key); input.current?.focus(); }}>{key}</button>)}</div>
 {!compared && <button className="ww-button" type="submit" disabled={locked || !draft.trim()}>{self ? "Compare with the model" : "Check answer"}</button>}</form>
 {compared && <section aria-label="Self-check"><h3>Compare and self-check</h3><p>This is your own assessment.</p>{task.feedback.modelAnswers?.map((model, index) => <p key={index} lang={task.question.lang}>{model}</p>)}
 {checklist.map((label, index) => <label key={index} style={{ display: "block", minHeight: 44 }}><input type="checkbox" disabled={locked} checked={checked.includes(String(index))} onChange={event => setChecked(values => event.target.checked ? [...values, String(index)] : values.filter(value => value !== String(index)))}/>{label}</label>)}
 <button className="ww-button" type="button" disabled={locked || checked.length !== checklist.length} onClick={() => submit(["self:complete", draft])}>I covered these points</button><button className="ww-button" type="button" disabled={locked} onClick={() => submit(["self:practise", draft])}>Practise this again</button></section>}
 <p role="status" aria-live="polite">{submitted && !result ? "Response recorded." : ""}</p>{result && <TaskFeedback feedback={task.feedback} result={result} lang={task.question.lang}/>}</section>;
}
