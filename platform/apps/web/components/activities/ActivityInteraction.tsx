"use client";
import { LButton, LDiv, LFieldset, LForm, LH2, LH3, LInput, LLabel, LLegend, LP, LSection, LSpan, LStrong, LTextarea } from "@/components/i18n/LocalizedElements";


import { useRef, useState, type ReactNode } from "react";
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
import { useLocale } from "@/components/i18n/LocaleProvider";
import { translate, type Locale } from "@/lib/i18n/catalog";
import { germanStudyGloss, germanStudyQuestionCue } from "@/lib/i18n/german-study-glosses";
import { persistentConceptForActivityTarget } from "@/lib/learner-state/activity-evidence";
import type { EnrichedActivity } from "@/lib/content/enrichment-types";
import type { LearnerActivity } from "@/lib/content/types";
import { resolvePublishedPronunciationExact } from "@/lib/content/media-availability";
import {
  buildActivityPracticePlan,
  normalizeActivityAnswer,
  type ActivityQuestion,
} from "./activity-content";
import { ActivityAudio } from "./ActivityAudio";
import { SpeakingPractice } from "./SpeakingPractice";

function message(template: string, locale: Locale, values: Readonly<Record<string, string | number>> = {}): string {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), translate(template, locale));
}

function studyMeaning(meaning: string, locale: Locale, germanTarget?: string): string {
  return (locale === "de" ? germanStudyGloss(meaning, germanTarget) : null) ?? translate(meaning, locale);
}

function questionPrompt(question: ActivityQuestion, locale: Locale): string {
  if (locale === "de" && (question.prompt === "Build this phrase in the correct order." || question.prompt === "Choose “{word}” exactly as it is written.")) {
    const cue = germanStudyQuestionCue(question.targetId);
    if (cue) return cue;
  }
  const values = Object.fromEntries(Object.entries(question.promptValues ?? {}).map(([key, value]) => [key, key === "meaning" ? studyMeaning(value, locale, question.expected) : value]));
  return message(question.prompt, locale, values);
}

function cueWords(text: string): string {
  return text.normalize("NFC").toLocaleLowerCase("de-DE").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Newly published or untranslated cues must not turn copied text into evidence. */
function cueExposesAnswer(question: ActivityQuestion, locale: Locale): boolean {
  if (question.kind === "matching") {
    const meaning = cueWords(studyMeaning(question.expected, locale, question.spokenText));
    const stimulus = cueWords(question.spokenText);
    return meaning === stimulus || meaning === stimulus.replace(/^(der|die|das) /u, "");
  }
  const prompt = ` ${cueWords(questionPrompt(question, locale))} `;
  return [question.expected, ...(question.accepted ?? [])].some((answer) => {
    const words = cueWords(answer);
    return words.length > 0 && prompt.includes(` ${words} `);
  });
}

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
  hintsUsed: number;
}): LearnerEvent | null {
  const conceptId = persistentConceptForActivityTarget(input.activity.id, input.question.targetId);
  if (conceptId === null) return null;
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
    hintsUsed: input.hintsUsed,
    ...(input.correct ? { normalizedAnswer: normalizeActivityAnswer(input.question.expected) } : {}),
  };
  return event;
}

function QuestionControl({
  question,
  questions,
  value,
  onChange,
}: {
  question: ActivityQuestion;
  questions: readonly ActivityQuestion[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { locale } = useLocale();
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
      <LLegend>{question.kind === "matching" ? "Meaning" : "German item"}</LLegend>
      {question.choices.map((choice) => (
        <LLabel key={choice} className="activity-choice">
          <LInput
            type="radio"
            name={question.id}
            value={choice}
            checked={value === choice}
            onChange={(event) => onChange(event.currentTarget.value)}
          />
          <LSpan lang={question.kind === "matching" ? locale : "de"} translate="no">{question.kind === "matching"
            ? studyMeaning(choice, locale, questions.find((item) => item.expected === choice)?.spokenText)
            : choice}</LSpan>
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
  completionActions,
  reviewTarget = null,
  reviewFamily = null,
  helpUsed = false,
}: {
  activity: LearnerActivity;
  enrichment: EnrichedActivity | null;
  onAttempt?: (() => void) | undefined;
  onSolved?: (() => void) | undefined;
  completionActions?: ReactNode;
  reviewTarget?: string | null;
  reviewFamily?: string | null;
  helpUsed?: boolean;
}) {
  const { locale } = useLocale();
  const basePlan = buildActivityPracticePlan(activity, enrichment);
  const reviewQuestions = reviewTarget ? basePlan.questions.filter((question) => question.targetId === reviewTarget && (!reviewFamily || evidenceShape(question).family === reviewFamily)) : [];
  const plan = reviewQuestions.length ? { ...basePlan, questions: reviewQuestions } : basePlan;
  const learnerState = useOptionalLearnerState();
  const sessionId = useRef(uuid());
  const questionStartedAt = useRef(Date.now());
  const attempted = useRef(false);
  const solved = useRef(false);
  const hintsUsed = useRef(0);
  const [finished, setFinished] = useState(false);
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
    setFinished(true);
    onSolved?.();
  };

  if (finished) return (
    <LSection className="panel activity-practice" aria-labelledby="activity-practice-heading">
      <LH2 id="activity-practice-heading" tabIndex={-1}>{reviewTarget ? "Review complete" : "Activity complete"}</LH2>
      <StatusMessage announcement={feedback} className="activity-feedback" />
      <StatusMessage announcement={saveMessage} className="dense" />
      <LP>You can continue now or come back later.</LP>
      {completionActions}
    </LSection>
  );

  if (plan.mechanic === "speaking-review") return (
    <LSection className="panel activity-practice" aria-labelledby="activity-practice-heading">
      <LP className="dense">Interactive activity</LP>
      <LH2 id="activity-practice-heading" tabIndex={-1}>{plan.title}</LH2>
      <SpeakingPractice onFinish={() => {
        noteAttempt();
        setFeedback("Speaking practice complete. This is your own review, not a pronunciation score.");
        finish();
      }} />
    </LSection>
  );

  if (plan.mechanic === "listening-notes") {
    return (
      <LSection className="panel activity-practice" aria-labelledby="activity-practice-heading">
        <LP className="dense">Interactive activity · ungraded</LP>
        <LH2 id="activity-practice-heading" tabIndex={-1}>{plan.title}</LH2>
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
        <LH2 id="activity-practice-heading" tabIndex={-1}>Practice unavailable</LH2>
        <LP role="status">This activity has no practice questions yet.</LP>
      </LSection>
    );
  }
  // Hearing a retrieval answer is help, not unaided recall. Only recognition
  // tasks with an already-visible German stimulus expose its pronunciation.
  const pronunciation = question.kind === "matching" ? resolvePublishedPronunciationExact(question.spokenText) : null;

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
      hintsUsed: Math.max(hintsUsed.current, helpUsed || cueExposesAnswer(question, locale) || (activity.mode === "notice" && !reviewTarget) ? 1 : 0),
    });
    if (persistable && learnerState?.controller && learnerState.snapshot.status === "ready") {
      setSaveMessage("Saving attempt…");
      void learnerState.controller.appendEvent(persistable).then(
        () => setSaveMessage("Attempt saved on this device."),
        () => setSaveMessage("Feedback is shown, but this attempt could not be saved."),
      );
    }
    if (!correct) {
      hintsUsed.current += 1;
      const correction = question.kind === "matching"
        ? message("“{word}” means “{meaning}”. Try again.", locale, { word: question.spokenText, meaning: studyMeaning(question.expected, locale, question.spokenText) })
        : message("Use this German model: {answer}. Try again.", locale, { answer: question.expected });
      const confused = question.kind === "matching" ? plan.questions.find((item) => item.expected === answer && item.id !== question.id) : null;
      const contrast = confused
        ? message("“{word}” means “{meaning}”.", locale, { word: confused.spokenText, meaning: studyMeaning(confused.expected, locale, confused.spokenText) })
        : question.hint ? translate(question.hint, locale) : "";
      setFeedback([correction, contrast].filter(Boolean).join(" "));
      return;
    }
    if (questionIndex + 1 >= plan.questions.length) {
      setFeedback(message("Correct. You completed {count} questions.", locale, { count: plan.questions.length }));
      finish();
      return;
    }
    setFeedback("Correct. Continue to the next item.");
    setQuestionIndex((current) => current + 1);
    setAnswer("");
    hintsUsed.current = 0;
    questionStartedAt.current = Date.now();
  };

  return (
    <LSection className="panel activity-practice" aria-labelledby="activity-practice-heading">
      <LDiv className="workbook-audio__heading">
        <LDiv>
          <LP className="dense">Interactive activity</LP>
          <LH2 id="activity-practice-heading" tabIndex={-1}>{plan.title}</LH2>
        </LDiv>
        <LSpan className="meta-chip">{questionIndex + 1} / {plan.questions.length}</LSpan>
      </LDiv>
      <LP>{reviewTarget ? "Recall from memory" : plan.instructions}</LP>
      <LForm
        className="activity-question"
        onSubmit={(event) => {
          event.preventDefault();
          checkAnswer();
        }}
      >
        <LH3>{questionPrompt(question, locale)}</LH3>
        {pronunciation?.state === "preview" ? <ActivityAudio media={pronunciation} /> : null}
        <QuestionControl
          key={question.id}
          question={question}
          questions={plan.questions}
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
