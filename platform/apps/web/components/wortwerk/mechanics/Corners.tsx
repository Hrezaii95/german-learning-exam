"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { GeneratedTask, GradeResult, TaskAnswer } from "../../../../../packages/wortwerk/src/tasks.js";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import { QuestionAudio } from "../QuestionAudio";
import { TaskFeedback } from "../TaskFeedback";

export type CornersProps = {
  task: GeneratedTask;
  onAnswer: (answer: TaskAnswer) => void;
  result?: GradeResult | null;
  disabled?: boolean;
};

/** Tap, keyboard and pointer drop all use the same single-submission path. */
export function Corners(props: CornersProps) {
  return <CornersTask key={props.task.id} {...props} />;
}

function CornersTask({ task, onAnswer, result, disabled = false }: CornersProps) {
  const instructionId = useId();
  const helpId = useId();
  const prompt = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const options = useRef<Array<HTMLButtonElement | null>>([]);
  const submitted = useRef(false);
  const pointerStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const [answer, setAnswer] = useState("");
  const [waiting, setWaiting] = useState(false);
  const locked = disabled || waiting || !!result;
  const question = task.question;

  useEffect(() => {
    if (question.input === "text") input.current?.focus();
    else prompt.current?.focus();
  }, [question.input]);

  function submit(value: TaskAnswer) {
    if (submitted.current || locked) return;
    if (typeof value === "string" && !value.trim()) return;
    submitted.current = true;
    setWaiting(true);
    onAnswer(value);
  }

  function focusOption(index: number) {
    const count = question.options.length;
    if (count) options.current[(index + count) % count]?.focus();
  }

  function optionKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (locked) return;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusOption(index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(index - 1);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      focusOption(event.key === "Home" ? 0 : question.options.length - 1);
    }
  }

  function beginDrag(event: PointerEvent<HTMLButtonElement>) {
    if (locked || event.button !== 0) return;
    pointerStart.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || start.id !== event.pointerId || locked) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 12) return;
    const target = event.currentTarget.ownerDocument.elementFromPoint?.(event.clientX, event.clientY);
    const index = options.current.findIndex(option => !!target && (option === target || !!option?.contains(target)));
    const choice = question.options[index];
    if (choice) submit(choice.id);
  }

  const message = result
    ? result.outcome === "correct" ? "Correct." : result.outcome === "almost" ? "Almost. Check the revealed form." : "Answer recorded. Review the revealed form."
    : waiting ? "Answer recorded." : "";

  return (
    <section className="ww-corners" aria-labelledby={instructionId}>
      <h2 id={instructionId} className="ww-task__instruction">{question.instruction}</h2>
      {question.input === "choice" ? (
        <>
          <p id={helpId} className="ww-muted">Choose an answer, or drag the card to a choice. Use Tab or the arrow keys to move between choices.</p>
          <button
            ref={prompt}
            type="button"
            className="ww-corners__prompt"
            aria-describedby={helpId}
            disabled={locked}
            onClick={() => focusOption(0)}
            onKeyDown={event => optionKeys(event, -1)}
            onPointerDown={beginDrag}
            onPointerUp={endDrag}
            onPointerCancel={() => { pointerStart.current = null; }}
          >
            <span className="ww-task__text" lang={question.lang}>{question.text || "Listen, then choose"}</span>
          </button>
          {question.audio ? <QuestionAudio key={question.audio.src} audio={question.audio} /> : null}
          <div className="ww-corners__options" role="group" aria-label="Answer choices">
            {question.options.map((option, index) => (
              <button
                key={option.id}
                ref={element => { options.current[index] = element; }}
                type="button"
                className="ww-corners__option"
                aria-label={option.image ? `Option ${index + 1}` : undefined}
                disabled={locked}
                onClick={() => submit(option.id)}
                onKeyDown={event => optionKeys(event, index)}
              >
                {option.image ? <img src={withPagesBaseAssetPath(option.image)} alt="" width={112} height={112} draggable={false} /> : <span lang={question.lang}>{option.text}</span>}
              </button>
            ))}
          </div>
        </>
      ) : (
        <form className="ww-recall" onSubmit={event => { event.preventDefault(); submit(answer); }}>
          {question.text ? <p className="ww-task__text" lang={question.lang}>{question.text}</p> : null}
          {question.audio ? <QuestionAudio key={question.audio.src} audio={question.audio} /> : null}
          <label className="ww-recall__label">Your answer
            <input ref={input} lang={question.lang} value={answer} onChange={event => setAnswer(event.target.value)} disabled={locked} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
          </label>
          {question.helperKeys.length ? (
            <div className="ww-helper-keys" role="group" aria-label="Character keys">
              {question.helperKeys.map(key => <button key={key} type="button" className="ww-button" disabled={locked} onClick={() => { setAnswer(value => value + key); input.current?.focus(); }}>{key}</button>)}
            </div>
          ) : null}
          <button className="ww-button ww-button--primary" type="submit" disabled={locked || !answer.trim()}>Check answer</button>
        </form>
      )}
      <p className="ww-live" role="status" aria-live="polite" aria-atomic="true">{message}</p>
      {result ? <TaskFeedback feedback={task.feedback} result={result} lang={question.lang} /> : null}
    </section>
  );
}
