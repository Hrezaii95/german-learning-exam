"use client";

import { useMemo, useState } from "react";
import { LArticle, LAside, LButton, LDetails, LDiv, LH1, LH2, LH3, LHeader, LLi, LP, LSection, LSpan, LStrong, LSummary, LUl } from "@/components/i18n/LocalizedElements";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { translate } from "@/lib/i18n/catalog";
import { useStudyScope } from "@/components/study/StudyScope";
import { tagsForLesson } from "@/lib/study/scope";
import Link from "@/components/i18n/LocalizedLink";
import { BackLink } from "@/components/nav/BackLink";
import { appendNavigationContext, buildLessonNavigationContext, resolveBackHref, resolveOutboundNavigationContext, type NavigationContext } from "@/lib/content/navigation-context";
import { lessonLabel } from "@/lib/content/lesson-label";
import { activityCanonicalPath } from "@/lib/content/path-utils";
import { workbookAudioForActivity } from "@/lib/audio/workbook-audio";
import { WorkbookAudioPanel } from "@/components/audio/WorkbookAudioPanel";
import { getEnrichedActivity } from "@/lib/content/enrichment-client";
import { ActivityInteraction } from "@/components/activities";
import { activityLearnerTitle, buildActivityPracticePlan } from "@/components/activities/activity-content";
import type { LearnerActivity, LearnerLesson } from "@/lib/content/types";
import type { ActivityProgressRecord } from "@german-learning/learning";
import { activityDisplayStatus, completedActivityCount, nextIncompleteActivity, orderedLessonActivities } from "@/lib/learner-state/activity-progress";

export function LessonBrowser({ lessons }: { lessons: readonly LearnerLesson[] }) {
  const { matches } = useStudyScope();
  return <LDiv className="stack">
    <LHeader className="page-header">
      <LH1>Lessons</LH1>
      <LP className="lede">Start with the guided lessons, then continue with your interactive book.</LP>
    </LHeader>
    <LDiv className="card-grid lessons">
      {lessons.filter((lesson) => matches(tagsForLesson(Number(lesson.routeSegment)))).map((lesson) => <LArticle key={lesson.id} className="panel">
        <LP className="dense">{lessonLabel(lesson.routeSegment)}</LP>
        <LH2><LSpan className="german" lang="de">{lesson.titleDe}</LSpan></LH2>
        <LP>{lesson.titleEn}</LP>
        <LP className="dense">One short activity at a time. Your progress is saved on this device.</LP>
        <Link className="btn btn-primary" href={lesson.canonicalPath}>Open overview</Link>
      </LArticle>)}
    </LDiv>
  </LDiv>;
}

function lessonSegment(lesson: LearnerLesson): "01" | "02" {
  return lesson.routeSegment === "02" ? "02" : "01";
}

export function LessonOverview({
  lesson, activities, navigation = null, progress = [], progressState = "loading", recommendLessonOne = false,
}: {
  lesson: LearnerLesson;
  activities: readonly LearnerActivity[];
  navigation?: NavigationContext | null;
  progress?: readonly ActivityProgressRecord[];
  progressState?: "loading" | "ready" | "error";
  recommendLessonOne?: boolean;
}) {
  const { locale } = useLocale();
  const activitiesById = new Map(activities.map((activity) => [activity.id, activity] as const));
  const outbound = resolveOutboundNavigationContext(navigation, buildLessonNavigationContext(lessonSegment(lesson)));
  const backHref = navigation != null ? resolveBackHref(navigation, "lesson") : null;
  const orderedActivities = orderedLessonActivities(lesson, activities);
  const completedCount = completedActivityCount(orderedActivities, progress);
  const percent = orderedActivities.length === 0 ? 0 : Math.round((completedCount / orderedActivities.length) * 100);
  const nextActivity = nextIncompleteActivity(orderedActivities, progress);
  const nextPlan = nextActivity ? buildActivityPracticePlan(nextActivity, getEnrichedActivity(nextActivity.id)) : null;
  const progressLabel = translate("{completed} of {total} completed · {percent}%", locale)
    .replace("{completed}", String(completedCount)).replace("{total}", String(orderedActivities.length)).replace("{percent}", String(percent));

  return <LDiv className="stack">
    <LHeader className="page-header">
      {backHref ? <BackLink href={backHref} /> : null}
      <LP className="dense">{lessonLabel(lesson.routeSegment)}</LP>
      <LH1><LSpan className="german" lang="de">{lesson.titleDe}</LSpan></LH1>
      <LP className="lede">{lesson.titleEn}</LP>
      <LP>One short activity at a time. Your progress is saved on this device.</LP>
      {recommendLessonOne ? <LAside className="recommendation" aria-label="Lesson recommendation">
        We recommend completing Lesson 1 first. Lesson 2 remains available. <Link href="/lessons/01">Open Lesson 1</Link>
      </LAside> : null}
    </LHeader>

    <LSection className="panel" aria-labelledby="next-step-heading">
      <LP className="dense">Your next small step</LP>
      <LH2 id="next-step-heading">{nextActivity ? activityLearnerTitle(nextActivity) : "All activities in this lesson are completed."}</LH2>
      {nextPlan ? <LP>{nextPlan.instructions}</LP> : null}
      {nextActivity ? <LP className="dense">About 5 minutes</LP> : null}
      {progressState === "loading" ? <LP className="dense">Loading saved progress…</LP> : null}
      {progressState === "error" ? <LP role="alert">Saved progress is unavailable. No stored work was changed.</LP> : null}
      {progressState === "ready" && nextActivity ? <Link className="btn btn-primary" href={appendNavigationContext(nextActivity.canonicalPath, outbound)}>
        {activityDisplayStatus(nextActivity.id, progress) === "In progress" ? "Continue activity" : "Start next activity"}
      </Link> : null}
      <LDiv className="lesson-progress" aria-live="polite">
        <LStrong>{progressLabel}</LStrong>
        <progress value={completedCount} max={orderedActivities.length || 1} aria-label={`${lessonLabel(lesson.routeSegment)} progress`} />
      </LDiv>
    </LSection>

    <LDetails className="panel">
      <LSummary>Lesson outline and goals</LSummary>
      <LP className="dense">{lesson.estimatedMinutesTotal} minutes · {orderedActivities.length} activities</LP>
      <LH2>Communicative outcome</LH2>
      <LUl>{lesson.communicativeGoals.map((goal) => <LLi key={goal}>{goal}</LLi>)}</LUl>
      <LDiv className="stage-list">
        {lesson.stages.filter((stage) => stage.activityIds.length > 0).map((stage) => <LSection key={stage.id} className="stage-card">
          <LH3>{stage.titleEn}</LH3>
          <LUl className="activity-links">
            {stage.activityIds.map((activityId) => {
              const item = activitiesById.get(activityId);
              return <LLi key={activityId}>
                <Link href={appendNavigationContext(activityCanonicalPath(lesson.number, activityId), outbound)}>{item ? activityLearnerTitle(item) : activityId}</Link>
                <LSpan className="activity-status">{activityDisplayStatus(activityId, progress)}</LSpan>
              </LLi>;
            })}
          </LUl>
        </LSection>)}
      </LDiv>
    </LDetails>
    <LP><Link href="/review">Review what you learned</Link></LP>
  </LDiv>;
}

export function ActivityScreen({
  lesson, activity, navigation = null, activities = [activity], status = "Not started", progressState = "loading", busy = false, recommendLessonOne = false, onStart, onComplete, saveError = "", reviewTarget = null, reviewFamily = null,
}: {
  lesson: LearnerLesson;
  activity: LearnerActivity;
  navigation?: NavigationContext | null;
  activities?: readonly LearnerActivity[];
  status?: "Not started" | "In progress" | "Completed";
  progressState?: "loading" | "ready" | "error";
  busy?: boolean;
  recommendLessonOne?: boolean;
  onStart?: () => void;
  onComplete?: () => void;
  saveError?: string;
  reviewTarget?: string | null;
  reviewFamily?: string | null;
}) {
  const { locale } = useLocale();
  const [reviewing, setReviewing] = useState(reviewTarget !== null);
  const [helpUsed, setHelpUsed] = useState(false);
  const outbound = resolveOutboundNavigationContext(navigation, buildLessonNavigationContext(lessonSegment(lesson), activity.id));
  const backHref = resolveBackHref(outbound, "lesson");
  const lessonHref = appendNavigationContext(lesson.canonicalPath, outbound);
  const workbookAudio = useMemo(() => workbookAudioForActivity(activity.id), [activity.id]);
  const enrichment = getEnrichedActivity(activity.id);
  const plan = buildActivityPracticePlan(activity, enrichment);
  const orderedActivities = orderedLessonActivities(lesson, activities);
  const position = orderedActivities.findIndex((item) => item.id === activity.id);
  const previous = position > 0 ? orderedActivities[position - 1] ?? null : null;
  const next = position >= 0 ? orderedActivities[position + 1] ?? null : null;
  const complete = status === "Completed" && !reviewing;
  const nextActions = <LDiv className="journey-actions">
    {next ? <Link className="btn btn-primary" href={appendNavigationContext(next.canonicalPath, outbound)}>Next activity</Link>
      : <Link className="btn btn-primary" href="/review">Review what you learned</Link>}
    <Link className="btn btn-secondary" href={lessonHref}>Return to lesson</Link>
  </LDiv>;

  function focusPractice() {
    if (status === "Not started" && !reviewTarget) onStart?.();
    const heading = document.getElementById("activity-practice-heading");
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: "start", behavior: "auto" });
  }

  return <LDiv className="stack activity-screen">
    <LHeader className="page-header">
      <BackLink href={backHref} />
      <LP className="dense"><Link href={lessonHref}>{lessonLabel(lesson.routeSegment)}</Link>{" · "}{translate("Activity {current} of {total}", locale).replace("{current}", String(position + 1)).replace("{total}", String(orderedActivities.length))}</LP>
      <LH1>{activityLearnerTitle(activity)}</LH1>
      <LDiv className="journey-status" aria-live="polite"><LStrong>Status: {status}</LStrong>
        {progressState === "loading" ? <LSpan>Loading saved progress…</LSpan> : null}
        {progressState === "error" ? <LSpan role="alert">Saved progress is unavailable. Controls are disabled.</LSpan> : null}
      </LDiv>
      {saveError ? <LP role="alert">{saveError}</LP> : null}
      {recommendLessonOne ? <LAside className="recommendation" aria-label="Lesson recommendation">We recommend completing Lesson 1 first. Lesson 2 remains available.</LAside> : null}
      {!complete ? <LButton className="btn btn-primary" type="button" onClick={focusPractice} disabled={busy || progressState !== "ready"}>{status === "Not started" ? "Start activity" : "Practice now"}</LButton> : null}
    </LHeader>

    {complete ? <LSection className="panel activity-practice" aria-labelledby="activity-practice-heading">
      <LH2 id="activity-practice-heading" tabIndex={-1}>Activity complete</LH2>
      <LP>You can continue now or come back later.</LP>
      {nextActions}
      <LP><LButton type="button" className="btn btn-secondary" onClick={() => setReviewing(true)}>Review this activity</LButton></LP>
    </LSection> : <>
      {activity.id === "activity:lesson-01-heissen-sein-notice" && !reviewTarget ? <LSection className="panel" aria-labelledby="pattern-heading">
        <LH2 id="pattern-heading">Learn the pattern</LH2>
        <LP className="german" lang="de">Ich heiße Anna. / Ich bin Anna.<br />Wie heißt du? / Wie heißen Sie?</LP>
      </LSection> : null}
      {plan.mechanic === "listening-notes" && workbookAudio.length > 0 ? <WorkbookAudioPanel tracks={workbookAudio} /> : null}
      <ActivityInteraction key={activity.id} activity={activity} enrichment={enrichment}
        onAttempt={status === "Not started" && !reviewTarget ? onStart : undefined}
        onSolved={status === "Completed" || reviewTarget ? undefined : onComplete}
        reviewTarget={reviewTarget}
        reviewFamily={reviewFamily}
        helpUsed={helpUsed}
        completionActions={nextActions}
      />
    </>}

    {(enrichment?.contentTargets.length || (workbookAudio.length > 0 && plan.mechanic !== "listening-notes")) ? <LDetails className="panel" onToggle={(event) => { if (event.currentTarget.open) setHelpUsed(true); }}>
      <LSummary>Words and examples</LSummary>
      {enrichment?.contentTargets.length ? <LUl className="activity-content-grid">
        {enrichment.contentTargets.map((target) => <LLi key={target.id} className="activity-content-card">
          <LStrong className="german" lang="de">{target.displayTextDe}</LStrong>
          {target.glossEn ? <LSpan className="dense">{target.glossEn}</LSpan> : null}
        </LLi>)}
      </LUl> : null}
      {workbookAudio.length > 0 && plan.mechanic !== "listening-notes" ? <WorkbookAudioPanel tracks={workbookAudio} /> : null}
    </LDetails> : null}
    <LDiv className="journey-actions">
      {previous ? <Link href={appendNavigationContext(previous.canonicalPath, outbound)}>Previous activity</Link> : null}
      {!complete && next ? <Link href={appendNavigationContext(next.canonicalPath, outbound)}>Skip for now</Link> : null}
      <Link href={lessonHref}>See the lesson plan</Link>
    </LDiv>
  </LDiv>;
}
