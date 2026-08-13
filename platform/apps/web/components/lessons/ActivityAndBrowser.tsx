import Link from "next/link";
import { BackLink } from "@/components/nav/BackLink";
import {
  appendNavigationContext,
  buildLessonNavigationContext,
  resolveBackHref,
  resolveOutboundNavigationContext,
  type NavigationContext,
} from "@/lib/content/navigation-context";
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
  return (
    <div className="stack">
      <header className="page-header">
        <h1>Lessons</h1>
        <p className="lede">
          {lessons.length} validated Alpha lessons from the publication bundle.
          Titles, goals, and counts come from the learner projection.
        </p>
      </header>
      <div className="card-grid lessons">
        {lessons.map((lesson) => (
          <article key={lesson.id} className="panel">
            <p className="dense">Lesson {lesson.routeSegment}</p>
            <h2>
              <span className="german" lang="de">
                {lesson.titleDe}
              </span>
            </h2>
            <p className="muted">{lesson.titleEn}</p>
            <ul className="dense">
              {lesson.communicativeGoals.slice(0, 3).map((goal) => (
                <li key={goal}>{goal}</li>
              ))}
            </ul>
            <div className="meta-row" style={{ marginTop: "1rem" }}>
              <span className="meta-chip">{lesson.activityCount} activities</span>
              <span className="meta-chip">{lesson.estimatedMinutesTotal} min</span>
            </div>
            <p style={{ marginTop: "1rem" }}>
              <Link className="btn btn-primary" href={lesson.canonicalPath}>
                Open overview
              </Link>
            </p>
          </article>
        ))}
      </div>
    </div>
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

  return (
    <div className="stack">
      <header className="page-header">
        {backHref ? <BackLink href={backHref} /> : null}
        <p className="dense">Lesson {lesson.routeSegment}</p>
        <h1>
          <span className="german" lang="de">
            {lesson.titleDe}
          </span>
        </h1>
        <p className="lede">{lesson.titleEn}</p>
        <div className="meta-row">
          <span className="meta-chip">{lesson.estimatedMinutesTotal} minutes</span>
          <span className="meta-chip">{lesson.activityCount} activities</span>
        </div>
        <div className="lesson-progress" aria-live="polite">
          <strong>{completedCount} of {orderedActivities.length} completed · {percent}%</strong>
          <progress value={completedCount} max={orderedActivities.length || 1} aria-label={`Lesson ${lesson.routeSegment} progress`} />
          {progressState === "loading" ? <span className="dense">Loading saved progress…</span> : null}
          {progressState === "error" ? <span role="alert">Saved progress is unavailable. No stored work was changed.</span> : null}
        </div>
        {recommendLessonOne ? (
          <aside className="recommendation" aria-label="Lesson recommendation">
            We recommend completing Lesson 01 first. Lesson 02 remains available.
            {" "}<Link href="/lessons/01">Open Lesson 01</Link>
          </aside>
        ) : null}
        {progressState === "ready" ? (
          <p>
            {nextActivity ? (
              <Link className="btn btn-primary" href={appendNavigationContext(nextActivity.canonicalPath, outbound)}>
                {activityDisplayStatus(nextActivity.id, progress) === "In progress" ? "Continue activity" : "Start next activity"}
              </Link>
            ) : <strong>All published activities in this lesson are completed.</strong>}
          </p>
        ) : null}
      </header>

      {lessonIllustration ? <RichLessonVisual illustration={lessonIllustration} /> : null}
      <LessonJourneyVisual lesson={lesson} />

      <section className="panel" aria-labelledby="goals-heading">
        <h2 id="goals-heading">Communicative outcome</h2>
        <ul>
          {lesson.communicativeGoals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="stages-heading">
        <h2 id="stages-heading">Stages</h2>
        <div className="stage-list">
          {lesson.stages.map((stage) => (
            <article key={stage.id} className="stage-card">
              <h3>{stage.titleEn}</h3>
              <p className="dense">
                {stage.activityIds.filter((id) => activityDisplayStatus(id, progress) === "Completed").length} of {stage.activityIds.length} completed
              </p>
              <div className="meta-row">
                <span className="meta-chip">{stage.estimatedMinutes} min</span>
                <span className="meta-chip">
                  {stage.required ? "Required" : "Optional"}
                </span>
                {stage.skillTargets.map((skill) => (
                  <span key={skill} className="meta-chip">
                    {skill}
                  </span>
                ))}
              </div>
              {stage.activityIds.length > 0 ? (
                <ul className="activity-links">
                  {stage.activityIds.map((activityId) => {
                    const target = activityCanonicalPath(lesson.number, activityId);
                    return (
                      <li key={activityId}>
                        <Link
                          href={appendNavigationContext(target, outbound)}
                        >
                          {activityLabel(activityId, activitiesById)}
                        </Link>
                        <span className="activity-status">{activityDisplayStatus(activityId, progress)}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="dense" style={{ marginTop: "0.75rem" }}>
                  No activities in this stage.
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
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
  const workbookAudio = workbookAudioForActivity(activity.id);
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
    <div className="stack">
      <header className="page-header">
        <BackLink href={backHref} />
        <p className="dense">
          <Link href={lessonHref}>Lesson {lesson.routeSegment}</Link>
          {" · "}
          {activity.stageTitleEn}
        </p>
        <p className="dense">Activity {position + 1} of {orderedActivities.length}</p>
        <h1>{activity.promptPlainText}</h1>
        <p className="lede">Learn from validated course content, then practise through the matching interactive tools.</p>
        <div className="journey-status" aria-live="polite">
          <strong>Status: {status}</strong>
          {progressState === "loading" ? <span>Loading saved progress…</span> : null}
          {progressState === "error" ? <span role="alert">Saved progress is unavailable. Controls are disabled.</span> : null}
        </div>
        {recommendLessonOne ? (
          <aside className="recommendation" aria-label="Lesson recommendation">
            We recommend completing Lesson 01 first. Lesson 02 remains available.
          </aside>
        ) : null}
        <div className="journey-actions">
          {status === "Not started" ? <button className="btn btn-primary" type="button" onClick={onStart} disabled={busy || progressState !== "ready"}>Start activity</button> : null}
          {status === "In progress" ? <button className="btn btn-primary" type="button" disabled aria-describedby="practice-completion-note">Complete activity</button> : null}
          {previous ? <Link className="btn btn-secondary" href={appendNavigationContext(previous.canonicalPath, outbound)}>Previous activity</Link> : null}
          {next ? <Link className="btn btn-secondary" href={appendNavigationContext(next.canonicalPath, outbound)}>Next activity</Link> : null}
          <Link className="btn btn-secondary" href={lessonHref}>Return to lesson</Link>
        </div>
        {status === "Completed" && showRapidPractice ? (
          <div className="checkpoint-handoff">
            <strong>Checkpoint recorded.</strong> Continue with <Link href="/review">Review</Link> or <Link href={lessonHref}>the lesson overview</Link>. Review is a separate stage.
          </div>
        ) : null}
      </header>

      {illustration ? <RichLessonVisual illustration={illustration} /> : null}
      <ActivityConceptVisual activityId={activity.id} />
      <p className="dense" id="practice-completion-note">Complete the interactive practice below to finish this activity.</p>
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

      <section className="panel" aria-labelledby="prompt-heading">
        <h2 id="prompt-heading">Validated prompt</h2>
        <p>
          {activity.prompt.instruction.tokens.map((token, index) => {
            if (token.type === "gap") {
              return <span key={`${token.label}-${index}`}>[{token.label}]</span>;
            }
            return <span key={`${token.text}-${index}`}>{token.text}</span>;
          })}
        </p>
      </section>

      {enrichment ? (
        <section className="panel" aria-labelledby="activity-content-heading">
          <div className="workbook-audio__heading">
            <div>
              <p className="dense">Published learning set</p>
              <h2 id="activity-content-heading">Words and patterns in this activity</h2>
            </div>
            <span className="meta-chip">{enrichment.contentTargets.length} items</span>
          </div>
          {enrichment.contentTargets.length > 0 ? (
            <ul className="activity-content-grid">
              {enrichment.contentTargets.map((target) => (
                <li key={target.id} className="activity-content-card">
                  <strong className="german" lang="de">{target.displayTextDe}</strong>
                  <span className="dense">{target.glossEn ?? target.kind}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="placeholder-banner">This listening-led activity has no separate learner-published word list yet.</p>
          )}
        </section>
      ) : null}

      {infographic ? <InfographicPanel infographic={infographic} /> : null}

      {workbookAudio.length > 0 ? <WorkbookAudioPanel tracks={workbookAudio} /> : null}

      <section className="panel" aria-labelledby="meta-heading">
        <h2 id="meta-heading">Stage, skills, evidence</h2>
        <div className="meta-row">
          <span className="meta-chip">Stage: {activity.stageTitleEn}</span>
          <span className="meta-chip">Practice type: {activity.mode}</span>
          <span className="meta-chip">
            Status: {activity.evidence.publicationStatus}
          </span>
          <span className="meta-chip">
            Prompt published: {activity.evidence.promptPublished ? "yes" : "no"}
          </span>
          {activity.skillDimensions.map((skill) => (
            <span key={skill} className="meta-chip">
              {skill}
            </span>
          ))}
        </div>
      </section>

      {enrichment ? (
        <section className="panel" aria-labelledby="activity-tools-heading">
          <h2 id="activity-tools-heading">Practice readiness</h2>
          <div className="meta-row">
            {enrichment.gameEligibility.map((game) => (
              <span className="meta-chip" key={game.gameId}>{game.gameId}: {game.state}</span>
            ))}
          </div>
          {enrichment.gaps.length > 0 ? (
            <ul className="gap-list">
              {enrichment.gaps
                .filter((gap) => !(infographic && gap.field === "mediaSlots.infographic"))
                .map((gap) => <li key={`${gap.code}-${gap.field}`}>{gap.learnerMessage}</li>)}
            </ul>
          ) : null}
          <p style={{ marginTop: "1rem" }}><Link className="btn btn-primary" href="/practice">Open practice games</Link></p>
        </section>
      ) : null}
    </div>
  );
}
