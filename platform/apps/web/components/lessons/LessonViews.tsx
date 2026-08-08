import Link from "next/link";
import type { LearnerLesson, LearnerWebProjection } from "@/lib/content/types";

export function LessonCard({ lesson }: { lesson: LearnerLesson }) {
  return (
    <article className="panel">
      <p className="dense">Lesson {lesson.routeSegment}</p>
      <h2>
        <span className="german" lang="de">
          {lesson.titleDe}
        </span>
      </h2>
      <p className="muted">{lesson.titleEn}</p>
      <div className="meta-row" style={{ marginTop: "1rem" }}>
        <span className="meta-chip">{lesson.activityCount} activities</span>
        <span className="meta-chip">{lesson.estimatedMinutesTotal} min</span>
        <span className="meta-chip">{lesson.stages.length} stages</span>
      </div>
      <p style={{ marginTop: "1rem" }}>
        <Link className="btn btn-primary" href={lesson.canonicalPath}>
          Open lesson
        </Link>
      </p>
    </article>
  );
}

export function DashboardView({ projection }: { projection: LearnerWebProjection }) {
  const { zeroState, lessons, activityCount, lessonCount } = projection;

  return (
    <div className="stack">
      <header className="page-header">
        <p className="dense">Welcome back</p>
        <h1>Continue where the course begins</h1>
        <p className="lede">
          No learner progress is stored in this slice yet. Continuation and today’s
          mission reflect the published zero-state.
        </p>
      </header>

      <section className="panel" aria-labelledby="continue-heading">
        <h2 id="continue-heading">Continue</h2>
        <p className="muted">
          Next published activity: Start{" "}
          <span className="german" lang="de">
            {zeroState.continueLessonTitleDe}
          </span>
        </p>
        <p style={{ marginTop: "1rem" }}>
          <Link className="btn btn-primary" href={zeroState.continuePath}>
            Start learning
          </Link>
        </p>
      </section>

      <section className="panel" aria-labelledby="mission-heading">
        <h2 id="mission-heading">Today’s mission</h2>
        <p className="placeholder-banner">
          Placeholder from zero-state: open the first Lesson 1 activity. Review
          scheduling arrives in a later slice.
        </p>
        <p style={{ marginTop: "1rem" }}>
          <Link className="btn btn-secondary" href={zeroState.continuePath}>
            Begin mission
          </Link>
        </p>
      </section>

      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="dense">
          Compact metrics
        </h2>
        <div className="metrics">
          <div className="metric">
            <span className="metric__label">Published lessons</span>
            <span className="metric__value">{lessonCount}</span>
          </div>
          <div className="metric">
            <span className="metric__label">Published activities</span>
            <span className="metric__value">{activityCount}</span>
          </div>
          <div className="metric">
            <span className="metric__label">Learned concepts</span>
            <span className="metric__value">Not tracked yet</span>
          </div>
          <div className="metric">
            <span className="metric__label">Due / streak / XP</span>
            <span className="metric__value">Not tracked yet</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="lessons-heading">
        <h2 id="lessons-heading">Lessons</h2>
        <div className="card-grid lessons">
          {lessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      </section>

      <section aria-labelledby="hubs-heading">
        <h2 id="hubs-heading">Hubs</h2>
        <div className="hub-shortcuts">
          {(
            [
              ["Vocabulary", "/vocabulary"],
              ["Verbs", "/verbs"],
              ["Grammar", "/grammar"],
              ["Phrases & Q&A", "/phrases"],
              ["Listening", "/listening"],
              ["Concepts", "/concepts"],
            ] as const
          ).map(([label, href]) => (
            <Link
              key={href}
              className="hub-shortcut hub-shortcut--link"
              href={href}
            >
              <span>{label}</span>
              <span className="dense">Open</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
