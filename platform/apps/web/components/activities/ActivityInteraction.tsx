"use client";

import { useRef, useState } from "react";
import type {
  LearnerEvent,
  MasteryDimension,
  ObjectiveTaskFamily,
} from "@german-learning/learning";
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
      <div className="activity-builder">
        <p className="activity-builder__answer" aria-live="polite">
          <span className="dense">Your phrase</span>
          <strong lang="de">{builtValue || "—"}</strong>
        </p>
        <div className="activity-token-bank" aria-label="Available words">
          {question.tokens.map((token, index) => (
            <button
              className="activity-token"
              type="button"
              key={`${token}-${index}`}
              onClick={() => {
                const next = [...builtTokens, token];
                setBuiltTokens(next);
                onChange(next.join(" "));
              }}
            >
              {token}
            </button>
          ))}
        </div>
        <div className="activity-inline-actions">
          <button
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
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={builtTokens.length === 0}
            onClick={() => {
              setBuiltTokens([]);
              onChange("");
            }}
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  if (question.kind === "typing") {
    return (
      <label className="activity-input-label">
        <span>Your German answer</span>
        <input
          className="activity-text-input"
          type="text"
          value={value}
          maxLength={160}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      </label>
    );
  }

  return (
    <fieldset className="activity-choice-list">
      <legend>{question.kind === "matching" ? "English meaning" : "German item"}</legend>
      {question.choices.map((choice) => (
        <label key={choice} className="activity-choice">
          <input
            type="radio"
            name={question.id}
            value={choice}
            checked={value === choice}
            onChange={(event) => onChange(event.currentTarget.value)}
          />
          <span>{choice}</span>
        </label>
      ))}
    </fieldset>
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
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
      <section className="panel activity-practice" aria-labelledby="activity-practice-heading">
        <p className="dense">Interactive activity · ungraded</p>
        <h2 id="activity-practice-heading">{plan.title}</h2>
        <p>{plan.instructions}</p>
        <p className="activity-source-note">{plan.missingReason}</p>
        <form
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
          <label className="activity-input-label">
            <span>What did you hear or practise?</span>
            <textarea
              value={listeningNotes}
              maxLength={500}
              rows={4}
              onChange={(event) => setListeningNotes(event.currentTarget.value)}
            />
          </label>
          <label className="activity-confirmation">
            <input
              type="checkbox"
              checked={listeningConfirmed}
              onChange={(event) => setListeningConfirmed(event.currentTarget.checked)}
            />
            <span>I used the linked lesson audio or listening material.</span>
          </label>
          <button className="btn btn-primary" type="submit">Finish listening check</button>
        </form>
        {feedback ? <p className="activity-feedback" role="status">{feedback}</p> : null}
      </section>
    );
  }

  const question = plan.questions[questionIndex];
  if (!question) {
    return (
      <section className="panel activity-practice" aria-labelledby="activity-practice-heading">
        <h2 id="activity-practice-heading">Practice unavailable</h2>
        <p role="status">No source-backed question can be built from the published activity data.</p>
      </section>
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
      setFeedback("Not yet. Check the published words and try again.");
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
    <section className="panel activity-practice" aria-labelledby="activity-practice-heading">
      <div className="workbook-audio__heading">
        <div>
          <p className="dense">Interactive activity · source-backed</p>
          <h2 id="activity-practice-heading">{plan.title}</h2>
        </div>
        <span className="meta-chip">{questionIndex + 1} / {plan.questions.length}</span>
      </div>
      <p>{plan.instructions}</p>
      <form
        className="activity-question"
        onSubmit={(event) => {
          event.preventDefault();
          checkAnswer();
        }}
      >
        <h3>{question.prompt}</h3>
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
        <button className="btn btn-primary" type="submit">Check answer</button>
      </form>
      {feedback ? <p className="activity-feedback" role="status" aria-live="polite">{feedback}</p> : null}
      {saveMessage ? <p className="dense" role="status">{saveMessage}</p> : null}
    </section>
  );
}
