"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { GeneratedTask, GradeResult, TaskAnswer } from "../../../../../packages/wortwerk/src/tasks.js";
import { TaskFeedback } from "../TaskFeedback";
export type MatchProps = {
    task: GeneratedTask;
    onAnswer: (answer: TaskAnswer) => void;
    result?: GradeResult | null;
    disabled?: boolean;
};
export function Match(props: MatchProps) { return <MatchTask key={props.task.id} {...props}/>; }
function MatchTask({ task, onAnswer, result, disabled = false }: MatchProps) {
    const heading = useRef<HTMLHeadingElement>(null);
    useEffect(() => { heading.current?.focus(); }, []);
    const [selected, setSelected] = useState<string | null>(null);
    const [pairs, setPairs] = useState<{
        [key: string]: string;
    }>({});
    const [submitted, setSubmitted] = useState(false);
    const guard = useRef(false);
    const drag = useRef<string | null>(null);
    const targets = useRef<{
        [key: string]: HTMLButtonElement | null;
    }>({});
    const locked = disabled || submitted || !!result;
    const left = task.question.tokens ?? [];
    function pair(id: string, target: string) { if (locked)
        return; setPairs(values => { const next = { ...values }; for (const [key, value] of Object.entries(next))
        if (value === target)
            delete next[key]; next[id] = target; return next; }); setSelected(null); }
    function drop(event: PointerEvent<HTMLButtonElement>) { const start = drag.current; drag.current = null; if (!start || locked)
        return; const element = event.currentTarget.ownerDocument.elementFromPoint?.(event.clientX, event.clientY); const target = Object.entries(targets.current).find(([, button]) => button === element || !!element && !!button?.contains(element))?.[0]; if (target)
        pair(start, target); }
    function submit() { if (locked || guard.current || left.some(option => !pairs[option.id]))
        return; guard.current = true; setSubmitted(true); onAnswer(left.map(option => pairs[option.id]!)); }
    return <section className="ww-match"><h2 ref={heading} tabIndex={-1}>{task.question.instruction}</h2><p>Select a left card, then its partner. You can also drag a left card onto a right card. Select a paired card again to change it.</p>
 <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
 <div role="group" aria-label="Left cards">{left.map((option, index) => <button key={option.id} type="button" className="ww-button" disabled={locked} aria-pressed={selected === option.id} style={{ display: "block", width: "100%", minHeight: 44, overflowWrap: "break-word" }} onClick={() => setSelected(option.id)} onPointerDown={event => { if (!locked && event.button === 0) {
        drag.current = option.id;
        event.currentTarget.setPointerCapture?.(event.pointerId);
    } }} onPointerUp={drop} onPointerCancel={() => { drag.current = null; }}><span lang={task.question.lang}>{option.text}</span>{pairs[option.id] && <span> · paired with {task.question.options.findIndex(value => value.id === pairs[option.id]) + 1}</span>}<span className="ww-muted"> · {index + 1}</span></button>)}</div>
 <div role="group" aria-label="Right cards">{task.question.options.map((option, index) => <button key={option.id} type="button" className="ww-button" ref={node => { targets.current[option.id] = node; }} disabled={locked || !selected} style={{ display: "block", width: "100%", minHeight: 44, overflowWrap: "break-word" }} onClick={() => { if (selected)
        pair(selected, option.id); }}><span>{index + 1}. </span><span lang={task.question.lang}>{option.text}</span></button>)}</div></div>
 <button className="ww-button" type="button" disabled={locked || left.some(option => !pairs[option.id])} onClick={submit}>Check pairs</button><p role="status" aria-live="polite">{submitted ? "Pairs recorded." : selected ? "Choose the matching right card." : `${Object.keys(pairs).length} of ${left.length} pairs chosen.`}</p>
 {result && <TaskFeedback feedback={task.feedback} result={result} lang={task.question.lang}/>}</section>;
}
