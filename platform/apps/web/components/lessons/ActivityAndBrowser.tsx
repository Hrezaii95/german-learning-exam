import Link from "next/link";
import { BackLink } from "@/components/nav/BackLink";
import {
  appendNavigationContext,
  buildLessonNavigationContext,
  resolveBackHref,
  resolveOutboundNavigationContext,
  type NavigationContext,
} from "@/lib/content/navigation-context";
import type { LearnerActivity, LearnerLesson } from "@/lib/content/types";

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
}: {
  lesson: LearnerLesson;
  /** Projection activities for this lesson — labels resolve from prompts, not raw IDs. */
  activities: readonly LearnerActivity[];
  navigation?: NavigationContext | null;
}) {
  const activitiesById = new Map(
    activities.map((activity) => [activity.id, activity] as const),
  );
  const currentContext = buildLessonNavigationContext(lessonSegment(lesson));
  const outbound = resolveOutboundNavigationContext(navigation, currentContext);
  const backHref =
    navigation != null ? resolveBackHref(navigation, "lesson") : null;

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
      </header>

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
                    const target = `/lessons/${lesson.routeSegment}/activity/${encodeURIComponent(activityId)}`;
                    return (
                      <li key={activityId}>
                        <Link
                          href={appendNavigationContext(target, outbound)}
                        >
                          {activityLabel(activityId, activitiesById)}
                        </Link>
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
}: {
  lesson: LearnerLesson;
  activity: LearnerActivity;
  navigation?: NavigationContext | null;
}) {
  const lessonContext = buildLessonNavigationContext(
    lessonSegment(lesson),
    activity.id,
  );
  const outbound = resolveOutboundNavigationContext(navigation, lessonContext);
  const backHref = resolveBackHref(outbound, "lesson");
  const lessonHref = appendNavigationContext(lesson.canonicalPath, outbound);

  return (
    <div className="stack">
      <header className="page-header">
        <BackLink href={backHref} />
        <p className="dense">
          <Link href={lessonHref}>Lesson {lesson.routeSegment}</Link>
          {" · "}
          {activity.stageTitleEn}
        </p>
        <h1>{activity.promptPlainText}</h1>
        <p className="lede">
          Generic activity screen for this slice. Interaction arrives next; no fake
          completion or scores.
        </p>
      </header>

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

      <section className="placeholder-banner" aria-labelledby="next-slice-heading">
        <h2 id="next-slice-heading" style={{ marginTop: 0 }}>
          Activity interaction arrives in the next slice
        </h2>
        <p className="muted" style={{ marginBottom: 0 }}>
          This screen presents validated metadata only. There is no completion
          button and no score in P3A.
        </p>
      </section>
    </div>
  );
}
