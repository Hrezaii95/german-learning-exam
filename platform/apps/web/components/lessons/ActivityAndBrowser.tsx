"use client";
import { LArticle, LAside, LButton, LDiv, LH1, LH2, LH3, LHeader, LLi, LP, LSection, LSpan, LStrong, LUl } from "@/components/i18n/LocalizedElements";

import {useStudyScope} from "@/components/study/StudyScope";
import {LessonLearningPath} from "@/components/study/LessonLearningPath";
import {tagsForLesson} from "@/lib/study/scope";
import { useMemo } from "react";
import Link from "@/components/i18n/LocalizedLink";
import { BackLink } from "@/components/nav/BackLink";
import {
  appendNavigationContext,
  buildLessonNavigationContext,
  resolveBackHref,
  resolveOutboundNavigationContext,
  type NavigationContext,
} from "@/lib/content/navigation-context";
import { lessonLabel } from "@/lib/content/lesson-label";
import { activityCanonicalPath } from "@/lib/content/path-utils";
import { workbookAudioForActivity } from "@/lib/audio/workbook-audio";
import { WorkbookAudioPanel } from "@/components/audio/WorkbookAudioPanel";
import { infographicForActivity } from "@/lib/content/infographics";
import { InfographicPanel } from "@/components/media/InfographicPanel";
import { RichLessonVisual } from "@/components/media/RichLessonVisual";
import {
  illustrationForActivity,
  illustrationForLesson,
} from "@/lib/content/illustrations";
import {
  ActivityConceptVisual,
  LessonJourneyVisual,
} from "@/components/media/InstructionalVisuals";
import { getEnrichedActivity } from "@/lib/content/enrichment-client";
import {
  isPracticeGameId,
  practiceCanonicalPath,
  type PracticeGameId,
} from "@/lib/games";
import { gameTitle } from "@/components/games/GameSelector";
import { ActivityInteraction } from "@/components/activities";
import {
  RapidGreetingsSection,
  RapidPracticeSection,
  RapidProfessionMorphologySection,
  RapidQaSection,
  RapidVerbSection,
} from "@/components/content/rapid-learning-sections";
import type { LearnerActivity, LearnerLesson } from "@/lib/content/types";
import type { ActivityProgressRecord } from "@german-learning/learning";
import {
  activityDisplayStatus,
  completedActivityCount,
  nextIncompleteActivity,
  orderedLessonActivities,
} from "@/lib/learner-state/activity-progress";

export function LessonBrowser({ lessons }: { lessons: readonly LearnerLesson[] }) {
  const {matches}=useStudyScope();
  return (
    <LDiv className="stack">
      <LHeader className="page-header">
        <LH1>Lessons</LH1>
        <LP className="lede">
          Start with the guided lessons, then continue with your interactive book.
        </LP>
      </LHeader>
      <LDiv className="card-grid lessons">
        {lessons.filter(l=>matches(tagsForLesson(Number(l.routeSegment)))).map((lesson) => (
          <LArticle key={lesson.id} className="panel">
            <LP className="dense">{lessonLabel(lesson.routeSegment)}</LP>
            <LH2>
              <LSpan className="german" lang="de">
                {lesson.titleDe}
              </LSpan>
            </LH2>
            <LP className="muted">{lesson.titleEn}</LP>
            <LUl className="dense">
              {lesson.communicativeGoals.slice(0, 3).map((goal) => (
                <LLi key={goal}>{goal}</LLi>
              ))}
            </LUl>
            <LDiv className="meta-row" style={{ marginTop: "1rem" }}>
              <LSpan className="meta-chip">{lesson.activityCount} activities</LSpan>
              <LSpan className="meta-chip">{lesson.estimatedMinutesTotal} min</LSpan>
            </LDiv>
            <LP style={{ marginTop: "1rem" }}>
              <Link className="btn btn-primary" href={lesson.canonicalPath}>
                Open overview
              </Link>
            </LP>
          </LArticle>
        ))}
      </LDiv>
    </LDiv>
  );
}

function activityLabel(
  activityId: string,
  activitiesById: ReadonlyMap<string, LearnerActivity>,
): string {
  return activitiesById.get(activityId)?.promptPlainText ?? activityId;
}

function lessonSegment(lesson: LearnerLesson): "01" | "02" {
  return lesson.routeSegment === "02" ? "02" : "01";
}

export function LessonOverview({
  lesson,
  activities,
  navigation = null,
  progress = [],
  progressState = "loading",
  recommendLessonOne = false,
}: {
  lesson: LearnerLesson;
  /** Projection activities for this lesson — labels resolve from prompts, not raw IDs. */
  activities: readonly LearnerActivity[];
  navigation?: NavigationContext | null;
  progress?: readonly ActivityProgressRecord[];
  progressState?: "loading" | "ready" | "error";
  recommendLessonOne?: boolean;
}) {
  const activitiesById = new Map(
    activities.map((activity) => [activity.id, activity] as const),
  );
  const currentContext = buildLessonNavigationContext(lessonSegment(lesson));
  const outbound = resolveOutboundNavigationContext(navigation, currentContext);
  const backHref =
    navigation != null ? resolveBackHref(navigation, "lesson") : null;
  const orderedActivities = orderedLessonActivities(lesson, activities);
  const completedCount = completedActivityCount(orderedActivities, progress);
  const percent = orderedActivities.length === 0 ? 0 : Math.round((completedCount / orderedActivities.length) * 100);
  const nextActivity = nextIncompleteActivity(orderedActivities, progress);
  const lessonIllustration = illustrationForLesson(lesson.id);
  const firstActivity=orderedActivities[0];
  const practiceActivity=orderedActivities.find(activity=>activity.mode==="check")??orderedActivities.find(activity=>activity.mode==="recall");

  return (
    <LDiv className="stack">
      <LHeader className="page-header">
        {backHref ? <BackLink href={backHref} /> : null}
        <LP className="dense">{lessonLabel(lesson.routeSegment)}</LP>
        <LH1>
          <LSpan className="german" lang="de">
            {lesson.titleDe}
          </LSpan>
        </LH1>
        <LP className="lede">{lesson.titleEn}</LP>
        <LDiv className="meta-row">
          <LSpan className="meta-chip">{lesson.estimatedMinutesTotal} minutes</LSpan>
          <LSpan className="meta-chip">{lesson.activityCount} activities</LSpan>
        </LDiv>
        <LDiv className="lesson-progress" aria-live="polite">
          <LStrong>{completedCount} of {orderedActivities.length} completed · {percent}%</LStrong>
          <progress value={completedCount} max={orderedActivities.length || 1} aria-label={`${lessonLabel(lesson.routeSegment)} progress`} />
          {progressState === "loading" ? <LSpan className="dense">Loading saved progress…</LSpan> : null}
          {progressState === "error" ? <LSpan role="alert">Saved progress is unavailable. No stored work was changed.</LSpan> : null}
        </LDiv>
        {recommendLessonOne ? (
          <LAside className="recommendation" aria-label="Lesson recommendation">
            We recommend completing Lesson 1 first. Lesson 2 remains available.
            {" "}<Link href="/lessons/01">Open Lesson 1</Link>
          </LAside>
        ) : null}
        {progressState === "ready" ? (
          <LP>
            {nextActivity ? (
              <Link className="btn btn-primary" href={appendNavigationContext(nextActivity.canonicalPath, outbound)}>
                {activityDisplayStatus(nextActivity.id, progress) === "In progress" ? "Continue activity" : "Start next activity"}
              </Link>
            ) : <LStrong>All activities in this lesson are completed.</LStrong>}
          </LP>
        ) : null}
      </LHeader>

      <LessonLearningPath lesson={Number(lesson.routeSegment)} checkpoint={lesson.communicativeGoals[0]??lesson.titleEn} learnHref={firstActivity?appendNavigationContext(firstActivity.canonicalPath,outbound):"#stages-heading"} practiceHref={practiceActivity?appendNavigationContext(practiceActivity.canonicalPath,outbound):"#stages-heading"}/>
      {lessonIllustration ? <RichLessonVisual illustration={lessonIllustration} /> : null}
      <LessonJourneyVisual lesson={lesson} />

      <LSection className="panel" aria-labelledby="goals-heading">
        <LH2 id="goals-heading">Communicative outcome</LH2>
        <LUl>
          {lesson.communicativeGoals.map((goal) => (
            <LLi key={goal}>{goal}</LLi>
          ))}
        </LUl>
      </LSection>

      <LSection aria-labelledby="stages-heading">
        <LH2 id="stages-heading">Stages</LH2>
        <LDiv className="stage-list">
          {lesson.stages.map((stage) => (
            <LArticle key={stage.id} className="stage-card">
              <LH3>{stage.titleEn}</LH3>
              <LP className="dense">
                {stage.activityIds.filter((id) => activityDisplayStatus(id, progress) === "Completed").length} of {stage.activityIds.length} completed
              </LP>
              <LDiv className="meta-row">
                <LSpan className="meta-chip">{stage.estimatedMinutes} min</LSpan>
                <LSpan className="meta-chip">
                  {stage.required ? "Required" : "Optional"}
                </LSpan>
                {stage.skillTargets.map((skill) => (
                  <LSpan key={skill} className="meta-chip">
                    {skill}
                  </LSpan>
                ))}
              </LDiv>
              {stage.activityIds.length > 0 ? (
                <LUl className="activity-links">
                  {stage.activityIds.map((activityId) => {
                    const target = activityCanonicalPath(lesson.number, activityId);
                    return (
                      <LLi key={activityId}>
                        <Link
                          href={appendNavigationContext(target, outbound)}
                        >
                          {activityLabel(activityId, activitiesById)}
                        </Link>
                        <LSpan className="activity-status">{activityDisplayStatus(activityId, progress)}</LSpan>
                      </LLi>
                    );
                  })}
                </LUl>
              ) : (
                <LP className="dense" style={{ marginTop: "0.75rem" }}>
                  No activities in this stage.
                </LP>
              )}
            </LArticle>
          ))}
        </LDiv>
      </LSection>
    </LDiv>
  );
}

export function ActivityScreen({
  lesson,
  activity,
  navigation = null,
  activities = [activity],
  status = "Not started",
  progressState = "loading",
  busy = false,
  recommendLessonOne = false,
  onStart,
  onComplete,
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
}) {
  const lessonContext = buildLessonNavigationContext(
    lessonSegment(lesson),
    activity.id,
  );
  const outbound = resolveOutboundNavigationContext(navigation, lessonContext);
  const backHref = resolveBackHref(outbound, "lesson");
  const lessonHref = appendNavigationContext(lesson.canonicalPath, outbound);
  // Stable identity across re-renders so audio panels keep per-track state.
  // (`useMemo` is available in the react-server subset, so the server-rendered
  // Suspense fallback stays valid.)
  const workbookAudio = useMemo(() => workbookAudioForActivity(activity.id), [activity.id]);
  const infographic = infographicForActivity(activity.id);
  const illustration = illustrationForActivity(activity.id);
  const enrichment = getEnrichedActivity(activity.id);
  const showGreetings = ["activity:lesson-01-greetings-by-context", "activity:lesson-01-greeting-farewell-match"].includes(activity.id);
  const showQa = ["activity:lesson-01-register-qa-builder", "activity:lesson-01-name-model-dialogue", "activity:lesson-01-origin-aus-contrast", "activity:lesson-01-wellbeing-scale", "activity:lesson-02-profession-qa-builder"].includes(activity.id);
  const showVerbs = ["activity:lesson-01-heissen-sein-notice", "activity:lesson-01-pronoun-verb-builder", "activity:lesson-02-full-person-conjugation", "activity:lesson-02-sein-arbeiten-contrast"].includes(activity.id);
  const showProfessions = ["activity:lesson-02-core-professions", "activity:lesson-02-person-form-morphology", "activity:lesson-02-profession-qa-builder"].includes(activity.id);
  const showRapidPractice = activity.id.endsWith("checkpoint-summary");
  const orderedActivities = orderedLessonActivities(lesson, activities);
  const position = orderedActivities.findIndex((item) => item.id === activity.id);
  const previous = position > 0 ? orderedActivities[position - 1] ?? null : null;
  const next = position >= 0 ? orderedActivities[position + 1] ?? null : null;

  return (
    <LDiv className="stack">
      <LHeader className="page-header">
        <BackLink href={backHref} />
        <LP className="dense">
          <Link href={lessonHref}>{lessonLabel(lesson.routeSegment)}</Link>
          {" · "}
          {activity.stageTitleEn}
        </LP>
        <LP className="dense">Activity {position + 1} of {orderedActivities.length}</LP>
        <LH1>{activity.promptPlainText}</LH1>
        <LP className="lede">Learn the new material, then practise it with the matching interactive tools.</LP>
        <LDiv className="journey-status" aria-live="polite">
          <LStrong>Status: {status}</LStrong>
          {progressState === "loading" ? <LSpan>Loading saved progress…</LSpan> : null}
          {progressState === "error" ? <LSpan role="alert">Saved progress is unavailable. Controls are disabled.</LSpan> : null}
        </LDiv>
        {recommendLessonOne ? (
          <LAside className="recommendation" aria-label="Lesson recommendation">
            We recommend completing Lesson 1 first. Lesson 2 remains available.
          </LAside>
        ) : null}
        <LDiv className="journey-actions">
          {status === "Not started" ? <LButton className="btn btn-primary" type="button" onClick={onStart} disabled={busy || progressState !== "ready"}>Start activity</LButton> : null}
          {status === "In progress" ? <LButton className="btn btn-primary" type="button" disabled aria-describedby="practice-completion-note">Complete activity</LButton> : null}
          {previous ? <Link className="btn btn-secondary" href={appendNavigationContext(previous.canonicalPath, outbound)}>Previous activity</Link> : null}
          {next ? <Link className="btn btn-secondary" href={appendNavigationContext(next.canonicalPath, outbound)}>Next activity</Link> : null}
          <Link className="btn btn-secondary" href={lessonHref}>Return to lesson</Link>
        </LDiv>
        {status === "Completed" && showRapidPractice ? (
          <LDiv className="checkpoint-handoff">
            <LStrong>Checkpoint recorded.</LStrong> Continue with <Link href="/review">Review</Link> or <Link href={lessonHref}>the lesson overview</Link>. Review is a separate stage.
          </LDiv>
        ) : null}
      </LHeader>

      {illustration ? <RichLessonVisual illustration={illustration} /> : null}
      <ActivityConceptVisual activityId={activity.id} />
      <LP className="dense" id="practice-completion-note">Complete the interactive practice below to finish this activity.</LP>
      <ActivityInteraction
        activity={activity}
        enrichment={enrichment}
        onAttempt={status === "Not started" ? onStart : undefined}
        onSolved={status === "Completed" ? undefined : onComplete}
      />
      {showGreetings ? <RapidGreetingsSection /> : null}
      {showQa ? <RapidQaSection /> : null}
      {showVerbs ? <RapidVerbSection /> : null}
      {showProfessions ? <RapidProfessionMorphologySection /> : null}
      {showRapidPractice ? <RapidPracticeSection /> : null}

      <LSection className="panel" aria-labelledby="prompt-heading">
        <LH2 id="prompt-heading">Your task</LH2>
        <LP>
          {activity.prompt.instruction.tokens.map((token, index) => {
            if (token.type === "gap") {
              return <LSpan key={`${token.label}-${index}`}>[{token.label}]</LSpan>;
            }
            return <LSpan key={`${token.text}-${index}`}>{token.text}</LSpan>;
          })}
        </LP>
      </LSection>

      {enrichment ? (
        <LSection className="panel" aria-labelledby="activity-content-heading">
          <LDiv className="workbook-audio__heading">
            <LDiv>
              <LP className="dense">From this lesson</LP>
              <LH2 id="activity-content-heading">Words and patterns in this activity</LH2>
            </LDiv>
            <LSpan className="meta-chip">{enrichment.contentTargets.length} items</LSpan>
          </LDiv>
          {enrichment.contentTargets.length > 0 ? (
            <LUl className="activity-content-grid">
              {enrichment.contentTargets.map((target) => (
                <LLi key={target.id} className="activity-content-card">
                  <LStrong className="german" lang="de">{target.displayTextDe}</LStrong>
                  <LSpan className="dense">{target.glossEn ?? target.kind}</LSpan>
                </LLi>
              ))}
            </LUl>
          ) : (
            <LP className="placeholder-banner">This listening activity has no separate word list — focus on the audio.</LP>
          )}
        </LSection>
      ) : null}

      {infographic ? <InfographicPanel infographic={infographic} /> : null}

      {workbookAudio.length > 0 ? <WorkbookAudioPanel tracks={workbookAudio} /> : null}

      <LSection className="panel" aria-labelledby="meta-heading">
        <LH2 id="meta-heading">About this activity</LH2>
        <LDiv className="meta-row">
          <LSpan className="meta-chip">Stage: {activity.stageTitleEn}</LSpan>
          <LSpan className="meta-chip">Practice type: {activity.mode}</LSpan>
          {activity.skillDimensions.map((skill) => (
            <LSpan key={skill} className="meta-chip">
              {skill}
            </LSpan>
          ))}
        </LDiv>
      </LSection>

      {enrichment ? (
        <LSection className="panel" aria-labelledby="activity-tools-heading">
          <LH2 id="activity-tools-heading">More practice</LH2>
          {(() => {
            const practiceLinks = enrichment.gameEligibility.filter(
              (game) =>
                isPracticeGameId(game.gameId) &&
                (game.state === "ready" || game.state === "partial"),
            );
            return practiceLinks.length > 0 ? (
              <LDiv className="meta-row">
                {practiceLinks.map((game) => (
                  <Link
                    key={game.gameId}
                    className="btn btn-secondary"
                    href={practiceCanonicalPath(game.gameId as PracticeGameId)}
                  >
                    {gameTitle(game.gameId as PracticeGameId)}
                  </Link>
                ))}
              </LDiv>
            ) : null;
          })()}
          <LP style={{ marginTop: "1rem" }}><Link className="btn btn-primary" href="/practice">Open practice games</Link></LP>
        </LSection>
      ) : null}
    </LDiv>
  );
}
