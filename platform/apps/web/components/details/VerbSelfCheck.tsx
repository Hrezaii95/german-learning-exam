"use client";
import { LButton, LDiv, LH2, LInput, LLabel, LOption, LP, LSection, LSelect, LSpan } from "@/components/i18n/LocalizedElements";


import { useState } from "react";
import {
  StatusMessage,
  useAnnouncement,
} from "@/components/a11y/StatusMessage";
import type { LearnerVerbDetail } from "@/lib/content/detail-types";

/**
 * Optional self-check using only published person/form pairs.
 * Gives correctness feedback; does not persist or claim mastery.
 */
export function VerbSelfCheck({ detail }: { detail: LearnerVerbDetail }) {
  const [person, setPerson] = useState(detail.present[0]?.person ?? "ich");
  const [typed, setTyped] = useState("");
  const [revealed, setRevealed] = useState(false);
  // "Not quite. Try again…" is the same words on every wrong attempt, so the
  // announcement carries a counter instead of relying on the text changing.
  const [feedback, setFeedback] = useAnnouncement();

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
    <LSection className="panel detail-selfcheck" aria-labelledby="verb-selfcheck-heading">
      <LH2 id="verb-selfcheck-heading">Self-check</LH2>
      <LP className="muted">
        Practise the present forms. Feedback is instant and stays on this
        device.
      </LP>
      <LDiv className="detail-selfcheck__controls">
        <LLabel className="hub-field" htmlFor="verb-selfcheck-person">
          <LSpan className="hub-field__label">Person</LSpan>
          <LSelect
            id="verb-selfcheck-person"
            className="hub-input"
            // The options ARE the German pronouns being taught; the options
            // inherit this, so a screen reader stops reading "ihr" as "ear"
            // (WCAG 3.1.2 Language of Parts).
            lang="de"
            value={person}
            onChange={(event) => {
              setPerson(event.target.value as typeof person);
              setTyped("");
              setFeedback(null);
              setRevealed(false);
            }}
          >
            {detail.present.map((item) => (
              <LOption key={item.person} value={item.person}>
                {item.personLabel}
              </LOption>
            ))}
          </LSelect>
        </LLabel>
        <LLabel className="hub-field" htmlFor="verb-selfcheck-form">
          <LSpan className="hub-field__label">Form</LSpan>
          <LInput
            id="verb-selfcheck-form"
            className="hub-input"
            type="text"
            lang="de"
            autoComplete="off"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            aria-label={`Type the present form for ${row.personLabel}`}
          />
        </LLabel>
      </LDiv>
      <LDiv className="detail-actions">
        <LButton type="button" className="btn btn-primary" onClick={check}>
          Check
        </LButton>
        <LButton type="button" className="btn btn-secondary" onClick={reveal}>
          Reveal
        </LButton>
      </LDiv>
      <StatusMessage announcement={feedback} className="detail-feedback">
        {revealed ? (
          <>
            Correct form:{" "}
            <LSpan className="german" lang="de">
              {row.form}
            </LSpan>
          </>
        ) : (
          feedback.text
        )}
      </StatusMessage>
    </LSection>
  );
}
