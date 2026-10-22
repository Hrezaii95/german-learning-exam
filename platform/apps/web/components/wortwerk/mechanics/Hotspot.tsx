"use client";
import { useEffect, useRef, useState } from "react";
import type { GeneratedTask, GradeResult, TaskAnswer } from "../../../../../packages/wortwerk/src/tasks.js";
import { TaskFeedback } from "../TaskFeedback";
export type HotspotProps = {
    task: GeneratedTask;
    onAnswer: (answer: TaskAnswer) => void;
    result?: GradeResult | null;
    disabled?: boolean;
    onLearn?: (word: string) => void;
};
export function Hotspot(props: HotspotProps) { return <HotspotTask key={props.task.id} {...props}/>; }
function HotspotTask({ task, onAnswer, result, disabled = false, onLearn }: HotspotProps) {
    const heading = useRef<HTMLHeadingElement>(null);
    useEffect(() => { heading.current?.focus(); }, []);
    const [saved, setSaved] = useState<string[]>([]);
    const [submitted, setSubmitted] = useState(false);
    const guard = useRef(false);
    const locked = disabled || submitted || !!result;
    const tap = task.templateId === "read.tap";
    function submit(answer: TaskAnswer) { if (locked || guard.current)
        return; guard.current = true; setSubmitted(true); onAnswer(answer); }
    function learn(word: string) { if (locked || !onLearn || saved.includes(word))
        return; onLearn(word); setSaved(values => [...values, word]); }
    return <section className="ww-hotspot"><h2 ref={heading} tabIndex={-1}>{task.question.instruction}</h2>{tap && !onLearn && <p>Saving words is unavailable in this view.</p>}
 <div lang={task.question.lang} style={{ overflowWrap: "break-word", hyphens: "auto", lineHeight: 2.5 }}>{tap ? (task.question.passage ?? "").split(/(\s+)/u).map((word, index) => /\S/u.test(word) ? <button key={index} className="ww-button" type="button" aria-pressed={saved.includes(word)} disabled={locked || !onLearn} style={{ minHeight: 44, minWidth: 44, maxWidth: "100%", whiteSpace: "normal" }} onClick={() => learn(word)}>{word}</button> : word) : <p style={{ whiteSpace: "pre-wrap" }}>{task.question.passage}</p>}</div>
 {task.question.text && <p lang={task.question.lang}>{task.question.text}</p>}
 <div role="group" aria-label="Answer choices">{task.question.options.map(option => <button className="ww-button" key={option.id} type="button" disabled={locked} onClick={() => submit(option.id)}>{option.text}</button>)}</div>
 {tap && <button className="ww-button" type="button" disabled={locked} onClick={() => submit(["self:complete"])}>Finished reading</button>}
 <p role="status" aria-live="polite">{saved.length ? `${saved.length} words added to your deck.` : submitted ? "Answer recorded." : ""}</p>{result && <TaskFeedback feedback={task.feedback} result={result} lang={task.question.lang}/>}</section>;
}
