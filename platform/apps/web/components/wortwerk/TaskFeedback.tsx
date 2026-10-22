"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import type { GradeResult, TaskFeedback as Feedback } from "../../../../packages/wortwerk/src/tasks.js";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import { QuestionAudio } from "./QuestionAudio";

export type TaskFeedbackProps = { feedback: Feedback; result: GradeResult; lang: string };

function feedbackTone(token: string | undefined): CSSProperties | undefined {
  return token && /^--[a-z][a-z0-9-]*$/u.test(token)
    ? { color: `var(${token}, var(--ink, #203536))` }
    : undefined;
}

/** Mount only after the answer: this projection may disclose every tested field. */
export function TaskFeedback({ feedback, result, lang }: TaskFeedbackProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const outcome = result.assessment === "self" ? "Self-check recorded" : result.outcome === "correct" ? "Correct" : result.outcome === "almost" ? "Almost — check the form" : "Let's practise this again";
  const sourceHref = feedback.sourceHref && /^\/(?!\/)[^\\\s]*$/u.test(feedback.sourceHref) ? feedback.sourceHref : undefined;

  return (
    <section className="ww-feedback" aria-label="Answer feedback">
      <h3 ref={heading} tabIndex={-1}>{outcome}</h3>
      <p className="ww-feedback__answer" lang={lang} style={feedbackTone(feedback.toneToken)}>{feedback.answer}</p>
      <p>{feedback.summary}</p>
      {feedback.modelAnswers?.length ? <div aria-label="Source models"><h4>Model responses</h4>{feedback.modelAnswers.map((model, index) => <p key={index} lang={lang}>{model}</p>)}</div> : null}
      {feedback.meaning ? <p>{feedback.meaning}</p> : null}
      {feedback.forms?.length ? <p lang={lang}>{feedback.forms.join(" · ")}</p> : null}
      {feedback.image ? <img className="ww-feedback__image" src={withPagesBaseAssetPath(feedback.image)} alt={feedback.answer} width={144} height={144} /> : null}
      {feedback.audio?.text && feedback.audio.text !== feedback.answer && !feedback.forms?.includes(feedback.audio.text) ? <p lang={lang}>{feedback.audio.text}</p> : null}
      {feedback.audio ? <QuestionAudio key={feedback.audio.src} audio={feedback.audio} /> : null}
      {sourceHref ? <Link className="ww-button" href={sourceHref}>Open the source card</Link> : null}
    </section>
  );
}
