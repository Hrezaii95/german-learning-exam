import Link from "next/link";
import type { LearnerLesson, LearnerWebProjection } from "@/lib/content/types";
import { LearnerDashboard } from "@/components/learner-state/LearnerDashboard";

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
  const { lessons, activityCount, lessonCount } = projection;

  return (
    <div className="stack">
      <header className="page-header">
        <p className="dense">Welcome back</p>
        <h1>Continue where the course begins</h1>
        <p className="lede">
          Lessons, hubs, practice and private progress work together on this device.
        </p>
      </header>
      <LearnerDashboard projection={projection} />

      <p className="dense">Published course scope: {lessonCount} lessons · {activityCount} activities.</p>

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
