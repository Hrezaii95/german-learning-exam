"use client";

import { useState } from "react";
import type { LearnerVerbDetail } from "@/lib/content/detail-types";

/**
 * Optional self-check using only published person/form pairs.
 * Gives correctness feedback; does not persist or claim mastery.
 */
export function VerbSelfCheck({ detail }: { detail: LearnerVerbDetail }) {
  const [person, setPerson] = useState(detail.present[0]?.person ?? "ich");
  const [typed, setTyped] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const row = detail.present.find((item) => item.person === person);
  if (!row) return null;

  function check() {
    const expected = row!.form.normalize("NFC");
    const got = typed.normalize("NFC").trim();
    setRevealed(false);
    if (got === expected) {
      setFeedback("Correct — that is the right form.");
    } else {
      setFeedback("Not quite. Try again or reveal the form.");
    }
  }

  function reveal() {
    setRevealed(true);
    setFeedback(`Correct form: ${row!.form}`);
  }

  return (
    <section className="panel detail-selfcheck" aria-labelledby="verb-selfcheck-heading">
      <h2 id="verb-selfcheck-heading">Self-check</h2>
      <p className="muted">
        Practise the present forms. Feedback is instant and stays on this
        device.
      </p>
      <div className="detail-selfcheck__controls">
        <label className="hub-field" htmlFor="verb-selfcheck-person">
          <span className="hub-field__label">Person</span>
          <select
            id="verb-selfcheck-person"
            className="hub-input"
            value={person}
            onChange={(event) => {
              setPerson(event.target.value as typeof person);
              setTyped("");
              setFeedback(null);
              setRevealed(false);
            }}
          >
            {detail.present.map((item) => (
              <option key={item.person} value={item.person}>
                {item.personLabel}
              </option>
            ))}
          </select>
        </label>
        <label className="hub-field" htmlFor="verb-selfcheck-form">
          <span className="hub-field__label">Form</span>
          <input
            id="verb-selfcheck-form"
            className="hub-input"
            type="text"
            lang="de"
            autoComplete="off"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            aria-label={`Type the present form for ${row.personLabel}`}
          />
        </label>
      </div>
      <div className="detail-actions">
        <button type="button" className="btn btn-primary" onClick={check}>
          Check
        </button>
        <button type="button" className="btn btn-secondary" onClick={reveal}>
          Reveal
        </button>
      </div>
      {feedback ? (
        <p className="detail-feedback" role="status" data-revealed={revealed ? "true" : "false"}>
          {revealed ? (
            <>
              Correct form:{" "}
              <span className="german" lang="de">
                {row.form}
              </span>
            </>
          ) : (
            feedback
          )}
        </p>
      ) : null}
    </section>
  );
}
