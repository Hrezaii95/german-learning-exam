"use client";

import { useEffect, useState } from "react";
import {
  LDetails, LDiv, LH2, LLi, LP, LSection, LSpan, LStrong, LSummary, LUl,
} from "@/components/i18n/LocalizedElements";
import Link from "@/components/i18n/LocalizedLink";
import { useStudyScope } from "@/components/study/StudyScope";
import { useStudy } from "@/components/study/StudyProvider";
import { tagsForLesson } from "@/lib/study/scope";
import { courseChapters } from "@/lib/study/lesson-four";
import { savedStudyTags } from "@/lib/study/saved-tags";
import type { LearnerWebProjection } from "@/lib/content/types";
import { lessonLabel } from "@/lib/content/lesson-label";
import { useOptionalLearnerState } from "./LearnerStateProvider";
import { buildActivityReviewQueue, buildDailyReviewMission } from "@/lib/learner-state";
import { completedActivityCount, orderedLessonActivities } from "@/lib/learner-state/activity-progress";

/** Saved work is shown only after this browser's state has loaded. */
type DashboardMode = "device-only" | "loading" | "ready";
type ProgressItem = Readonly<{ id: string; label: string; value: string }>;

function ContinueCard({
  eyebrow, titleDe, nextStep, chips, href, actionLabel,
}: {
  eyebrow: string;
  titleDe: string;
  nextStep: string;
  chips: readonly string[];
  href: string;
  actionLabel: string;
}) {
  return (
    <LSection className="panel studio-card studio-card--continue" aria-labelledby="continue-heading">
      <LP className="studio-card__eyebrow">{eyebrow}</LP>
      <LH2 id="continue-heading" className="studio-card__title">
        <LSpan className="german" lang="de">{titleDe}</LSpan>
      </LH2>
      <LP className="studio-card__next">{nextStep}</LP>
      {chips.length > 0 && (
        <LDiv className="meta-row">
          {chips.map(chip => <LSpan key={chip} className="meta-chip">{chip}</LSpan>)}
        </LDiv>
      )}
      <LP className="studio-card__action">
        <Link className="btn btn-primary" href={href}>{actionLabel}</Link>
      </LP>
    </LSection>
  );
}

function ProgressSummary({ items, note }: { items: readonly ProgressItem[]; note: string | null }) {
  return (
    <LDetails className="dashboard-progress">
      <LSummary>A1 practice progress</LSummary>
      <LSection className="evidence-strip" aria-labelledby="evidence-heading">
        <LH2 id="evidence-heading" className="evidence-strip__heading">My progress</LH2>
        {note ? <LP className="evidence-strip__note" role="status">{note}</LP> : (
          <LUl className="evidence-strip__list">
            {items.map(item => (
              <LLi key={item.id} className="evidence-item">
                <LSpan className="evidence-item__label">{item.label}</LSpan>
                <LSpan className="evidence-item__value">{item.value}</LSpan>
              </LLi>
            ))}
          </LUl>
        )}
        <LP className="dense">Completion records work finished. Checked answers and self-review are counted separately.</LP>
        <LP className="dense">These practice records do not establish a language level.</LP>
      </LSection>
    </LDetails>
  );
}

export function LearnerDashboard({ projection }: { projection: LearnerWebProjection }) {
  const { scope, matches } = useStudyScope();
  const study = useStudy();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedChapters = courseChapters.filter(chapter => matches(tagsForLesson(chapter.number)));
  const lastChapter = selectedChapters.find(chapter => chapter.number === study?.state.lastLesson);
  const saved = Object.values(study?.state.saved ?? {}).filter(item => matches(savedStudyTags(item, study?.dictionary)));
  const due = saved.filter(item => !item.due || Date.parse(item.due) <= now);
  const selectedLessons = projection.lessons.filter(lesson => matches(tagsForLesson(Number(lesson.routeSegment))));
  const selectedActivities = projection.activities.filter(activity => selectedLessons.some(lesson => lesson.id === activity.lessonId));
  const learnerState = useOptionalLearnerState();
  const snapshot = learnerState?.snapshot ?? null;
  const hydration = snapshot?.hydration ?? null;

  // An unreadable saved state must not appear as an empty history.
  if (snapshot && snapshot.status !== "loading" && !hydration) {
    return (
      <LSection className="panel" role="alert">
        <LH2>Local progress needs attention</LH2>
        <LP>{snapshot.statusMessage}</LP>
        <Link className="btn btn-secondary" href="/settings">Open recovery settings</Link>
      </LSection>
    );
  }

  const mode: DashboardMode = learnerState == null
    ? "device-only"
    : snapshot?.status === "ready" && hydration ? "ready" : "loading";
  const state = hydration?.state ?? null;
  const progress = state?.activityProgress ?? [];
  const resumeActivity = mode === "ready" && state?.resume
    ? selectedActivities.find(activity =>
      activity.id === state.resume!.activityId && (!lastChapter || Number(activity.lessonRouteSegment) === lastChapter.number),
    ) ?? null
    : null;

  const continueLessonId = resumeActivity?.lessonId
    ?? selectedLessons.find(lesson => Number(lesson.routeSegment) === lastChapter?.number)?.id
    ?? selectedLessons[0]?.id
    ?? projection.zeroState.continueLessonId;
  const continueLesson = selectedLessons.find(lesson => lesson.id === continueLessonId) ?? null;
  const continueTitleDe = continueLesson?.titleDe ?? projection.zeroState.continueLessonTitleDe;
  const continuePath = resumeActivity?.canonicalPath
    ?? (continueLesson ? orderedLessonActivities(continueLesson, selectedActivities)[0]?.canonicalPath : undefined)
    ?? continueLesson?.canonicalPath
    ?? projection.zeroState.continuePath;
  const continueChips = resumeActivity
    ? [lessonLabel(resumeActivity.lessonRouteSegment), resumeActivity.stageTitleEn]
    : continueLesson ? [lessonLabel(continueLesson.routeSegment), "First activity"] : [];
  const studyChapter = lastChapter && lastChapter.number > 2
    ? lastChapter : selectedLessons.length ? undefined : selectedChapters[0];
  const studySession = studyChapter ? study?.state.lessonSessions?.[studyChapter.number] : undefined;
  const canContinue = Boolean(resumeActivity || (studyChapter && (study?.state.lastLesson === studyChapter.number || studySession)));

  const mistakes = mode === "ready" && state
    ? buildActivityReviewQueue({ state, studyScope: scope })
    : [];
  let mission = null;
  if (mode === "ready" && state && hydration) {
    try {
      mission = buildDailyReviewMission({
        state, masteryByConcept: hydration.masteryByConcept, now: new Date(now), studyScope: scope,
      });
    } catch {
      mission = null;
    }
  }

  // These counts describe separate kinds of saved practice, never a combined level.
  const selectedActivityIds = new Set<string>(selectedActivities.map(activity => activity.id));
  const events = state?.events.filter(event => event.activityId && selectedActivityIds.has(event.activityId)) ?? [];
  const correctWithoutHints = events.filter(event =>
    (event.kind === "objectiveAttempt" || (event.kind === "audioInteraction" && event.hasLinkedTask))
    && event.graderOutcome === "correct" && event.hintsUsed === 0,
  ).length;
  const selfChecks = events.filter(event =>
    event.kind === "selfRatedAttempt" || (event.kind === "recordingCycle" && event.selfCheckCompleted),
  ).length;
  const progressItems: readonly ProgressItem[] = mode === "ready" ? [
    { id: "completed", label: "Activities completed", value: `${completedActivityCount(selectedActivities, progress)} / ${selectedActivities.length}` },
    { id: "checked", label: "Answers correct without hints", value: String(correctWithoutHints) },
    { id: "self-checks", label: "Self-checks completed", value: String(selfChecks) },
    { id: "mistakes", label: "Mistakes to revisit", value: String(mistakes.length) },
  ] : [];

  return (
    <LDiv className="stack">
      <LDiv className="studio-board">
        {(selectedLessons.length > 0 || studyChapter) && (
          <ContinueCard
            eyebrow={canContinue ? "Continue" : "Start here"}
            titleDe={studyChapter?.title ?? continueTitleDe}
            nextStep={studyChapter ? studyChapter.topic : resumeActivity
              ? resumeActivity.promptPlainText
              : `Begin the guided activities in Lesson ${continueLesson?.routeSegment.replace(/^0/, "") ?? "1"}.`}
            chips={studyChapter ? [`Lesson ${studyChapter.number}`, studySession?.tab ?? "Learn"] : continueChips}
            href={studyChapter
              ? `/lessons/${String(studyChapter.number).padStart(2, "0")}${studySession ? `#${studySession.tab.toLowerCase()}` : ""}`
              : continuePath}
            actionLabel={canContinue ? "Continue learning" : "Start learning"}
          />
        )}
        <LSection className="panel studio-card studio-card--mission" aria-labelledby="mission-heading">
          <LH2 id="mission-heading" className="studio-card__title">Review mistakes</LH2>
          {mode === "ready" ? <>
            {mistakes.length > 0 ? <>
              <LP className="studio-card__next"><LSpan>Mistakes to revisit</LSpan>: <LStrong>{mistakes.length}</LStrong></LP>
              <LP>Try the original question again, then check your answer.</LP>
            </> : <LP className="studio-card__next">No lesson mistakes to revisit in this selection.</LP>}
            {mission && mission.candidateCount > 0 && (
              <LDiv className="meta-row">
                <LSpan className="meta-chip"><LSpan>Due questions</LSpan>: {mission.dueCount}</LSpan>
                <LSpan className="meta-chip"><LSpan>New questions</LSpan>: {mission.newCount}</LSpan>
              </LDiv>
            )}
          </> : (
            <LP className="studio-card__next" role="status">
              {mode === "loading" ? "Loading local progress…" : "Your review mission is stored on this device and loads in the browser."}
            </LP>
          )}
          <LP className="studio-card__action">
            <Link className="btn btn-secondary" href="/review">Review mistakes</Link>
          </LP>
          {study?.ready && saved.length > 0 && (
            <LDiv>
              <LP className="dense"><LSpan>Saved items ready</LSpan>: <LStrong>{due.length}</LStrong></LP>
              <Link href={due.length ? "/saved?due=1" : "/saved"}>{due.length ? "Review saved items" : "Open my collection"}</Link>
            </LDiv>
          )}
        </LSection>
      </LDiv>
      <ProgressSummary items={progressItems} note={mode === "ready" ? null : mode === "loading"
        ? "Loading local progress…" : "Your progress is stored on this device and loads in the browser."} />
    </LDiv>
  );
}
