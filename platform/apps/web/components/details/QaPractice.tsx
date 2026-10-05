"use client";
import { LButton, LDiv, LFieldset, LH2, LInput, LLabel, LLegend, LP, LSection, LSpan } from "@/components/i18n/LocalizedElements";


import { useState } from "react";
import {
  StatusMessage,
  useAnnouncement,
} from "@/components/a11y/StatusMessage";
import type { LearnerQaDetail } from "@/lib/content/detail-types";
import { matchPublishedQaPattern } from "@/lib/content/qa-normalize";

export function QaConstruction({ detail }: { detail: LearnerQaDetail }) {
  const [value, setValue] = useState("");
  const [message, setMessage] = useAnnouncement();
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
    <LSection className="panel" aria-labelledby="qa-construction-heading">
      <LH2 id="qa-construction-heading">Construction</LH2>
      <LP className="muted">
        Type one of the answer patterns exactly as you learned it (the ellipsis
        is fine to keep).
      </LP>
      <LLabel className="hub-field" htmlFor="qa-construction-input">
        <LSpan className="hub-field__label">Your answer pattern</LSpan>
        <LInput
          id="qa-construction-input"
          className="hub-input"
          type="text"
          lang="de"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          // No aria-label: the <label for> above already reads "Your answer
          // pattern", and a competing aria-label would replace that visible
          // wording in the accessible name (WCAG 2.5.3 Label in Name), so
          // "click Your answer pattern" would match nothing by voice.
        />
      </LLabel>
      <LDiv className="detail-actions">
        <LButton type="button" className="btn btn-primary" onClick={onCheck}>
          Check pattern
        </LButton>
      </LDiv>
      <StatusMessage announcement={message} className="detail-feedback" />
    </LSection>
  );
}

export function QaGuidedChoice({ detail }: { detail: LearnerQaDetail }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useAnnouncement();

  return (
    <LSection className="panel" aria-labelledby="qa-guided-heading">
      <LH2 id="qa-guided-heading">Guided choice</LH2>
      <LP className="muted">Choose one of the answer patterns.</LP>
      <LFieldset className="qa-guided">
        <LLegend className="hub-field__label">Answer choices</LLegend>
        {detail.answers.map((answer) => (
          <LLabel key={answer.id} className="qa-guided__option">
            <LInput
              type="radio"
              name="qa-guided-answer"
              value={answer.id}
              checked={selected === answer.id}
              onChange={() => {
                setSelected(answer.id);
                setMessage(null);
              }}
            />
            <LSpan className="german" lang="de">
              {answer.realization}
            </LSpan>
          </LLabel>
        ))}
      </LFieldset>
      <LDiv className="detail-actions">
        <LButton
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
        </LButton>
      </LDiv>
      <StatusMessage announcement={message} className="detail-feedback" />
    </LSection>
  );
}
