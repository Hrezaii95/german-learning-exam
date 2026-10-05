"use client";
import { LButton, LDiv, LFieldset, LForm, LH2, LH3, LInput, LLabel, LLegend, LP, LSection, LSpan, LStrong, LTextarea } from "@/components/i18n/LocalizedElements";


import { useRef, useState } from "react";
import type {
  LearnerEvent,
  MasteryDimension,
  ObjectiveTaskFamily,
} from "@german-learning/learning";
import {
  StatusMessage,
  useAnnouncement,
} from "@/components/a11y/StatusMessage";
import { useOptionalLearnerState } from "@/components/learner-state/LearnerStateProvider";
import { PronunciationControl } from "@/components/audio/PronunciationControl";
import type { EnrichedActivity } from "@/lib/content/enrichment-types";
import type { LearnerActivity } from "@/lib/content/types";
import { resolvePublishedPronunciationExact } from "@/lib/content/media-availability";
import {
  buildActivityPracticePlan,
  normalizeActivityAnswer,
  persistedConceptForActivity,
  type ActivityQuestion,
} from "./activity-content";

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const seed = `${Date.now().toString(16)}${Math.floor(Math.random() * 0xffffffffffff).toString(16)}`
    .padEnd(32, "0")
    .slice(0, 32);
  return `${seed.slice(0, 8)}-${seed.slice(8, 12)}-4${seed.slice(13, 16)}-a${seed.slice(17, 20)}-${seed.slice(20)}`;
}

function evidenceShape(question: ActivityQuestion): Readonly<{
  dimension: MasteryDimension;
  family: ObjectiveTaskFamily;
}> {
  if (question.kind === "matching" || question.kind === "selection") {
    return { dimension: "recognition", family: "multipleChoice" };
  }
  if (question.kind === "builder") {
    return { dimension: "form", family: "formManipulation" };
  }
  return { dimension: "recall", family: "typedRecall" };
}

function buildAttemptEvent(input: {
  activity: LearnerActivity;
  question: ActivityQuestion;
  sessionId: string;
  correct: boolean;
  latencyMs: number;
}): LearnerEvent | null {
  const conceptId = persistedConceptForActivity(input.activity.id);
  if (conceptId === null || input.question.targetId === null || conceptId !== input.question.targetId) return null;
  const shape = evidenceShape(input.question);
  const event: LearnerEvent = {
    schemaVersion: "1.0.0",
    kind: "objectiveAttempt",
    eventId: uuid(),
    sessionId: input.sessionId,
    timestamp: new Date().toISOString(),
    conceptId,
    activityId: input.activity.id,
    sourceActivityMode: input.activity.mode,
    measuredDimensions: [shape.dimension],
    taskFamily: shape.family,
    graderOutcome: input.correct ? "correct" : "incorrect",
    latencyMs: Math.max(0, Math.round(input.latencyMs)),
    hintsUsed: 0,
    ...(input.correct ? { normalizedAnswer: normalizeActivityAnswer(input.question.expected) } : {}),
  };
  return event;
}

function QuestionControl({
  question,
  value,
  onChange,
}: {
  question: ActivityQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  const [builtTokens, setBuiltTokens] = useState<string[]>([]);
  const builtValue = builtTokens.join(" ");

  if (question.kind === "builder") {
    return (
      <LDiv className="activity-builder">
        <LP className="activity-builder__answer" aria-live="polite">
          <LSpan className="dense">Your phrase</LSpan>
          <LStrong lang="de">{builtValue || "—"}</LStrong>
        </LP>
        <LDiv className="activity-token-bank" aria-label="Available words">
          {question.tokens.map((token, index) => (
            <LButton
              className="activity-token"
              type="button"
              // The token IS the German being taught: without `lang` a screen
              // reader speaks "ihr" with English phonics (WCAG 3.1.2).
              lang="de"
              key={`${token}-${index}`}
              onClick={() => {
                const next = [...builtTokens, token];
                setBuiltTokens(next);
                onChange(next.join(" "));
              }}
            >
              {token}
            </LButton>
          ))}
        </LDiv>
        <LDiv className="activity-inline-actions">
          <LButton
            className="btn btn-secondary"
            type="button"
            disabled={builtTokens.length === 0}
            onClick={() => {
              const next = builtTokens.slice(0, -1);
              setBuiltTokens(next);
              onChange(next.join(" "));
            }}
          >
            Undo last word
          </LButton>
          <LButton
            className="btn btn-secondary"
            type="button"
            disabled={builtTokens.length === 0}
            onClick={() => {
              setBuiltTokens([]);
              onChange("");
            }}
          >
            Clear
          </LButton>
        </LDiv>
      </LDiv>
    );
  }

  if (question.kind === "typing") {
    return (
      <LLabel className="activity-input-label">
        <LSpan>Your German answer</LSpan>
        <LInput
          className="activity-text-input"
          type="text"
          // What the learner types here is German, as in QaPractice.
          lang="de"
          value={value}
          maxLength={160}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      </LLabel>
    );
  }

  return (
    <LFieldset className="activity-choice-list">
      <LLegend>{question.kind === "matching" ? "English meaning" : "German item"}</LLegend>
      {question.choices.map((choice) => (
        <LLabel key={choice} className="activity-choice">
          <LInput
            type="radio"
            name={question.id}
            value={choice}
            checked={value === choice}
            onChange={(event) => onChange(event.currentTarget.value)}
          />
          <LSpan lang={question.kind === "matching" ? undefined : "de"}>{choice}</LSpan>
        </LLabel>
      ))}
    </LFieldset>
  );
}

export function ActivityInteraction({
  activity,
  enrichment,
  onAttempt,
  onSolved,
}: {
  activity: LearnerActivity;
  enrichment: EnrichedActivity | null;
  onAttempt?: (() => void) | undefined;
  onSolved?: (() => void) | undefined;
}) {
  const plan = buildActivityPracticePlan(activity, enrichment);
  const learnerState = useOptionalLearnerState();
  const sessionId = useRef(uuid());
  const questionStartedAt = useRef(Date.now());
  const attempted = useRef(false);
  const solved = useRef(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  // Both regions are announcements, not strings: "Not yet…" is the same words
  // on every wrong answer, so only a bumped counter can make the repeat audible.
  const [feedback, setFeedback] = useAnnouncement();
  const [saveMessage, setSaveMessage] = useAnnouncement();
  const [listeningNotes, setListeningNotes] = useState("");
  const [listeningConfirmed, setListeningConfirmed] = useState(false);

  const noteAttempt = () => {
    if (attempted.current) return;
    attempted.current = true;
    onAttempt?.();
  };

  const finish = () => {
    if (solved.current) return;
    solved.current = true;
    onSolved?.();
  };

  if (plan.mechanic === "listening-notes") {
    return (
      <LSection className="panel activity-practice" aria-labelledby="activity-practice-heading">
        <LP className="dense">Interactive activity · ungraded</LP>
        <LH2 id="activity-practice-heading">{plan.title}</LH2>
        <LP>{plan.instructions}</LP>
        <LP className="activity-source-note">{plan.missingReason}</LP>
        <LForm
          className="activity-listening-form"
          onSubmit={(event) => {
            event.preventDefault();
            noteAttempt();
            if (listeningNotes.trim().length < 2 || !listeningConfirmed) {
              setFeedback("Add a short listening note and confirm that you used the linked media.");
              return;
            }
            setFeedback("Listening pass complete. These notes remain on this page only and are not graded.");
            finish();
          }}
        >
          <LLabel className="activity-input-label">
            <LSpan>What did you hear or practise?</LSpan>
            <LTextarea
              value={listeningNotes}
              maxLength={500}
              rows={4}
              onChange={(event) => setListeningNotes(event.currentTarget.value)}
            />
          </LLabel>
          <LLabel className="activity-confirmation">
            <LInput
              type="checkbox"
              checked={listeningConfirmed}
              onChange={(event) => setListeningConfirmed(event.currentTarget.checked)}
            />
            <LSpan>I used the linked lesson audio or listening material.</LSpan>
          </LLabel>
          <LButton className="btn btn-primary" type="submit">Finish listening check</LButton>
        </LForm>
        <StatusMessage announcement={feedback} className="activity-feedback" />
      </LSection>
    );
  }

  const question = plan.questions[questionIndex];
  if (!question) {
    return (
      <LSection className="panel activity-practice" aria-labelledby="activity-practice-heading">
        <LH2 id="activity-practice-heading">Practice unavailable</LH2>
        <LP role="status">This activity has no practice questions yet.</LP>
      </LSection>
    );
  }
  const pronunciation = resolvePublishedPronunciationExact(question.spokenText);

  const checkAnswer = () => {
    noteAttempt();
    if (answer.trim().length === 0) {
      setFeedback("Choose or enter an answer before checking.");
      return;
    }
    const acceptedAnswers = [question.expected, ...(question.accepted ?? [])];
    const correct = acceptedAnswers.some(
      (candidate) => normalizeActivityAnswer(answer) === normalizeActivityAnswer(candidate),
    );
    const persistable = buildAttemptEvent({
      activity,
      question,
      sessionId: sessionId.current,
      correct,
      latencyMs: Date.now() - questionStartedAt.current,
    });
    if (persistable && learnerState?.controller && learnerState.snapshot.status === "ready") {
      setSaveMessage("Saving attempt…");
      void learnerState.controller.appendEvent(persistable).then(
        () => setSaveMessage("Attempt saved on this device."),
        () => setSaveMessage("Feedback is shown, but this attempt could not be saved."),
      );
    }
    if (!correct) {
      setFeedback("Not yet. Check the words from this lesson and try again.");
      return;
    }
    if (questionIndex + 1 >= plan.questions.length) {
      setFeedback(`Correct. You completed all ${plan.questions.length} source-backed question${plan.questions.length === 1 ? "" : "s"}.`);
      finish();
      return;
    }
    setFeedback("Correct. Continue to the next item.");
    setQuestionIndex((current) => current + 1);
    setAnswer("");
    questionStartedAt.current = Date.now();
  };

  return (
    <LSection className="panel activity-practice" aria-labelledby="activity-practice-heading">
      <LDiv className="workbook-audio__heading">
        <LDiv>
          <LP className="dense">Interactive activity · source-backed</LP>
          <LH2 id="activity-practice-heading">{plan.title}</LH2>
        </LDiv>
        <LSpan className="meta-chip">{questionIndex + 1} / {plan.questions.length}</LSpan>
      </LDiv>
      <LP>{plan.instructions}</LP>
      <LForm
        className="activity-question"
        onSubmit={(event) => {
          event.preventDefault();
          checkAnswer();
        }}
      >
        <LH3>{question.prompt}</LH3>
        {pronunciation.state === "preview" ? (
          <PronunciationControl
            media={pronunciation}
            label={question.spokenText}
          />
        ) : null}
        <QuestionControl
          key={question.id}
          question={question}
          value={answer}
          onChange={setAnswer}
        />
        <LButton className="btn btn-primary" type="submit">Check answer</LButton>
      </LForm>
      <StatusMessage announcement={feedback} className="activity-feedback" />
      <StatusMessage announcement={saveMessage} className="dense" />
    </LSection>
  );
}
