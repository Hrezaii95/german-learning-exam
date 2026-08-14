"use client";

import { useState } from "react";
import type { LearnerQaDetail } from "@/lib/content/detail-types";
import { matchPublishedQaPattern } from "@/lib/content/qa-normalize";

export function QaConstruction({ detail }: { detail: LearnerQaDetail }) {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const answerPatterns = detail.answers.map((a) => a.realization);

  function onCheck() {
    const ok = matchPublishedQaPattern(value, answerPatterns);
    if (ok) {
      setMessage("Matches an accepted answer pattern.");
    } else {
      setMessage(
        "Not one of the accepted answer patterns. Type the pattern exactly as you learned it.",
      );
    }
  }

  return (
    <section className="panel" aria-labelledby="qa-construction-heading">
      <h2 id="qa-construction-heading">Construction</h2>
      <p className="muted">
        Type one of the answer patterns exactly as you learned it (the ellipsis
        is fine to keep).
      </p>
      <label className="hub-field" htmlFor="qa-construction-input">
        <span className="hub-field__label">Your answer pattern</span>
        <input
          id="qa-construction-input"
          className="hub-input"
          type="text"
          lang="de"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="Type an answer pattern"
        />
      </label>
      <div className="detail-actions">
        <button type="button" className="btn btn-primary" onClick={onCheck}>
          Check pattern
        </button>
      </div>
      {message ? (
        <p className="detail-feedback" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}

export function QaGuidedChoice({ detail }: { detail: LearnerQaDetail }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="panel" aria-labelledby="qa-guided-heading">
      <h2 id="qa-guided-heading">Guided choice</h2>
      <p className="muted">Choose one of the answer patterns.</p>
      <fieldset className="qa-guided">
        <legend className="hub-field__label">Answer choices</legend>
        {detail.answers.map((answer) => (
          <label key={answer.id} className="qa-guided__option">
            <input
              type="radio"
              name="qa-guided-answer"
              value={answer.id}
              checked={selected === answer.id}
              onChange={() => {
                setSelected(answer.id);
                setMessage(null);
              }}
            />
            <span className="german" lang="de">
              {answer.realization}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="detail-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            if (!selected) {
              setMessage("Select an answer pattern first.");
              return;
            }
            setMessage("Good choice — that is one of the accepted answer patterns.");
          }}
        >
          Confirm choice
        </button>
      </div>
      {message ? (
        <p className="detail-feedback" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
