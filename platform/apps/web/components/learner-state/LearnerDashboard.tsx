"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ActivityProgressRecord } from "@german-learning/learning";
import type {
  LearnerActivity,
  LearnerLesson,
  LearnerWebProjection,
} from "@/lib/content/types";
import {
  illustrationForActivity,
  illustrationForLesson,
  type LearnerIllustration,
} from "@/lib/content/illustrations";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import { useOptionalLearnerState } from "./LearnerStateProvider";
import { buildDailyReviewMission } from "@/lib/learner-state";
import {
  completedActivityCount,
  orderedLessonActivities,
} from "@/lib/learner-state/activity-progress";

const BADGE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  "first-meaningful-attempt": "First meaningful attempt",
  "three-dimensions-practised": "Three skills practised",
  "same-concept-two-days": "Returned on another day",
  "spoken-recording-cycle": "Spoken self-check",
  "seven-day-streak": "Seven-day streak",
});

/** How much of the learner's own saved work we are allowed to show right now. */
type StudioMode = "device-only" | "loading" | "ready";

/**
 * Media slot for the studio board. Reuses the approved illustration set; when a
 * scene is not mapped, the reserved geometry is kept by a permanent HTML meaning
 * plate rather than an empty box or a stand-in image.
 */
function StudioMedia({
  illustration,
  titleDe,
}: {
  illustration: LearnerIllustration | null;
  titleDe: string;
}) {
  if (!illustration) {
    return (
      <div className="studio-media studio-media--plate">
        <span className="studio-media__word german" lang="de">
          {titleDe}
        </span>
        <span className="studio-media__note">Illustration not available</span>
      </div>
    );
  }
  return (
    <div className="studio-media">
      <img
        className="studio-media__image"
        src={withPagesBaseAssetPath(`/illustrations/${illustration.filename}`)}
        alt={illustration.alt}
        width={illustration.width}
        height={illustration.height}
        style={{ objectPosition: illustration.objectPosition }}
        loading="eager"
        decoding="async"
      />
    </div>
  );
}

function ContinueCard({
  eyebrow,
  titleDe,
  nextStep,
  chips,
  href,
  actionLabel,
  illustration,
}: {
  eyebrow: string;
  titleDe: string;
  nextStep: string;
  chips: readonly string[];
  href: string;
  actionLabel: string;
  illustration: LearnerIllustration | null;
}) {
  return (
    <section
      className="panel studio-card studio-card--continue"
      aria-labelledby="continue-heading"
    >
      <StudioMedia illustration={illustration} titleDe={titleDe} />
      <div className="studio-card__body">
        <p className="studio-card__eyebrow">{eyebrow}</p>
        <h2 id="continue-heading" className="studio-card__title">
          <span className="german" lang="de">
            {titleDe}
          </span>
        </h2>
        <p className="studio-card__next">{nextStep}</p>
        {chips.length > 0 ? (
          <div className="meta-row">
            {chips.map((chip) => (
              <span key={chip} className="meta-chip">
                {chip}
              </span>
            ))}
          </div>
        ) : null}
        <p className="studio-card__action">
          <Link className="btn btn-primary" href={href}>
            {actionLabel}
          </Link>
        </p>
      </div>
    </section>
  );
}

function MissionCard({
  status,
  children,
}: {
  status?: "status";
  children: ReactNode;
}) {
  return (
    <section
      className="panel studio-card studio-card--mission"
      aria-labelledby="mission-heading"
      {...(status ? { role: "status" } : {})}
    >
      <h2 id="mission-heading" className="studio-card__title">
        Today’s mission
      </h2>
      {children}
    </section>
  );
}

/** Due/new mix. Text carries the facts; the bar is decoration for sighted scanning. */
function MissionMix({ due, next }: { due: number; next: number }) {
  const total = due + next;
  if (total === 0) return null;
  const duePercent = Math.round((due / total) * 100);
  return (
    <div className="mission-mix" aria-hidden="true">
      <span
        className="mission-mix__segment mission-mix__segment--due"
        style={{ width: `${duePercent}%` }}
      />
      <span
        className="mission-mix__segment mission-mix__segment--new"
        style={{ width: `${100 - duePercent}%` }}
      />
    </div>
  );
}

type EvidenceItem = Readonly<{
  id: string;
  label: string;
  value: string;
  /** Only set when a real denominator exists; otherwise no progress mark is drawn. */
  mark?: Readonly<{ value: number; total: number; text: string }>;
}>;

function EvidenceStrip({
  items,
  note,
}: {
  items: readonly EvidenceItem[];
  note: string | null;
}) {
  return (
    <section className="evidence-strip" aria-labelledby="evidence-heading">
      <h2 id="evidence-heading" className="evidence-strip__heading">
        My progress
      </h2>
      {note ? (
        <p className="evidence-strip__note" role="status">
          {note}
        </p>
      ) : (
        <ul className="evidence-strip__list">
          {items.map((item) => (
            <li key={item.id} className="evidence-item">
              <span className="evidence-item__label">{item.label}</span>
              <span className="evidence-item__value">{item.value}</span>
              {item.mark ? (
                <span
                  className="evidence-item__mark"
                  role="img"
                  aria-label={item.mark.text}
                >
                  <span
                    className="evidence-item__mark-fill"
                    style={{
                      width: `${
                        item.mark.total === 0
                          ? 0
                          : Math.round((item.mark.value / item.mark.total) * 100)
                      }%`,
                    }}
                  />
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CourseCard({
  lesson,
  activities,
  progress,
  mode,
}: {
  lesson: LearnerLesson;
  activities: readonly LearnerActivity[];
  progress: readonly ActivityProgressRecord[];
  mode: StudioMode;
}) {
  const ordered = orderedLessonActivities(lesson, activities);
  const completed = completedActivityCount(ordered, progress);
  const percent =
    ordered.length === 0 ? 0 : Math.round((completed / ordered.length) * 100);
  const illustration = illustrationForLesson(lesson.id);

  return (
    <article className="panel course-card">
      <StudioMedia illustration={illustration} titleDe={lesson.titleDe} />
      <div className="course-card__body">
        <p className="studio-card__eyebrow">Lesson {lesson.routeSegment}</p>
        <h3 className="course-card__title">
          <span className="german" lang="de">
            {lesson.titleDe}
          </span>
        </h3>
        <p className="muted">{lesson.titleEn}</p>
        <div className="meta-row">
          <span className="meta-chip">{lesson.activityCount} activities</span>
          <span className="meta-chip">{lesson.estimatedMinutesTotal} min</span>
        </div>
        {mode === "ready" ? (
          <div className="course-card__progress">
            <strong>
              {completed} of {ordered.length} done · {percent}%
            </strong>
            <progress
              value={completed}
              max={ordered.length || 1}
              aria-label={`Lesson ${lesson.routeSegment} progress`}
            />
          </div>
        ) : (
          <p className="dense course-card__progress-note">
            {mode === "loading"
              ? "Loading saved progress…"
              : "Your saved progress loads in this browser."}
          </p>
        )}
        <p className="studio-card__action">
          <Link className="btn btn-secondary" href={lesson.canonicalPath}>
            Open lesson {lesson.routeSegment}
          </Link>
        </p>
      </div>
    </article>
  );
}

function CourseCards({
  lessons,
  activities,
  progress,
  mode,
}: {
  lessons: readonly LearnerLesson[];
  activities: readonly LearnerActivity[];
  progress: readonly ActivityProgressRecord[];
  mode: StudioMode;
}) {
  return (
    <section aria-labelledby="lessons-heading">
      <h2 id="lessons-heading">Your lessons</h2>
      <div className="course-cards">
        {lessons.map((lesson) => (
          <CourseCard
            key={lesson.id}
            lesson={lesson}
            activities={activities}
            progress={progress}
            mode={mode}
          />
        ))}
      </div>
    </section>
  );
}

export function LearnerDashboard({
  projection,
}: {
  projection: LearnerWebProjection;
}) {
  const learnerState = useOptionalLearnerState();
  const snapshot = learnerState?.snapshot ?? null;
  const hydration = snapshot?.hydration ?? null;

  // Storage exists but could not be read — never guess at progress here.
  if (snapshot && snapshot.status !== "loading" && !hydration) {
    return (
      <section className="panel" role="alert">
        <h2>Local progress needs attention</h2>
        <p>{snapshot.statusMessage}</p>
        <Link className="btn btn-secondary" href="/settings">
          Open recovery settings
        </Link>
      </section>
    );
  }

  const mode: StudioMode =
    learnerState == null
      ? "device-only"
      : snapshot?.status === "ready" && hydration
        ? "ready"
        : "loading";

  const state = hydration?.state ?? null;
  const progress = state?.activityProgress ?? [];
  const resumeActivity =
    mode === "ready" && state?.resume
      ? (projection.activities.find(
          (row) => row.id === state.resume!.activityId,
        ) ?? null)
      : null;

  const continueLessonId =
    resumeActivity?.lessonId ?? projection.zeroState.continueLessonId;
  const continueLesson =
    projection.lessons.find((lesson) => lesson.id === continueLessonId) ?? null;
  const continueTitleDe =
    continueLesson?.titleDe ?? projection.zeroState.continueLessonTitleDe;
  const continuePath =
    resumeActivity?.canonicalPath ?? projection.zeroState.continuePath;
  const continueIllustration =
    (resumeActivity ? illustrationForActivity(resumeActivity.id) : null) ??
    illustrationForLesson(continueLessonId);
  const continueChips = resumeActivity
    ? [`Lesson ${resumeActivity.lessonRouteSegment}`, resumeActivity.stageTitleEn]
    : continueLesson
      ? [`Lesson ${continueLesson.routeSegment}`, "First activity"]
      : [];

  let mission = null;
  if (mode === "ready" && state && hydration) {
    try {
      mission = buildDailyReviewMission({
        state,
        masteryByConcept: hydration.masteryByConcept,
        now: new Date(),
      });
    } catch {
      mission = null;
    }
  }

  const rewards = learnerState?.rewards ?? null;
  const statuses = hydration ? [...hydration.masteryByConcept.values()] : [];
  const strong = statuses.filter((row) => row.status === "strong").length;
  const mastered = statuses.filter((row) => row.status === "mastered").length;

  const evidenceItems: readonly EvidenceItem[] =
    mode === "ready"
      ? [
          {
            id: "attempts",
            label: "Meaningful attempts",
            value: String(rewards?.meaningfulEventCount ?? 0),
          },
          {
            id: "concepts",
            label: "Strong or mastered",
            value: `${strong + mastered} of ${statuses.length}`,
            ...(statuses.length > 0
              ? {
                  mark: {
                    value: strong + mastered,
                    total: statuses.length,
                    text: `${strong + mastered} of ${statuses.length} practised concepts are strong or mastered`,
                  },
                }
              : {}),
          },
          { id: "xp", label: "XP", value: String(rewards?.totalXp ?? 0) },
          {
            id: "streak",
            label: "Current streak",
            value: `${rewards?.currentStreak ?? 0} days`,
          },
        ]
      : [];

  return (
    <div className="stack">
      <div className="studio-board">
        <ContinueCard
          eyebrow={resumeActivity ? "Continue" : "Start here"}
          titleDe={continueTitleDe}
          nextStep={
            resumeActivity
              ? resumeActivity.promptPlainText
              : "Begin with the first Lesson 1 activity."
          }
          chips={continueChips}
          href={continuePath}
          actionLabel={resumeActivity ? "Continue learning" : "Start learning"}
          illustration={continueIllustration}
        />

        {mode === "ready" && mission && mission.candidateCount > 0 ? (
          <MissionCard>
            <p className="studio-card__next">{mission.mission.reasonText}</p>
            <MissionMix due={mission.dueCount} next={mission.newCount} />
            <div className="meta-row">
              <span className="meta-chip">{mission.dueCount} due</span>
              <span className="meta-chip">{mission.newCount} new</span>
              <span className="meta-chip">
                {mission.mission.selected.length} in today’s set
              </span>
            </div>
            <p className="dense">{mission.availabilityNote}</p>
            <p className="studio-card__action">
              <Link className="btn btn-primary" href="/review">
                Start today’s mission
              </Link>
            </p>
          </MissionCard>
        ) : mode === "ready" ? (
          <MissionCard>
            <p className="studio-card__next">
              You have no review cards yet. Add one from a vocabulary, verb or
              Q&amp;A page and it will appear here tomorrow.
            </p>
            <p className="studio-card__action">
              <Link className="btn btn-secondary" href="/hubs">
                Browse learning hubs
              </Link>
            </p>
          </MissionCard>
        ) : (
          <MissionCard status="status">
            <p className="studio-card__next">
              {mode === "loading"
                ? "Loading local progress…"
                : "Your review mission is stored on this device and loads in the browser."}
            </p>
            <p className="studio-card__action">
              <Link className="btn btn-secondary" href="/hubs">
                Browse learning hubs
              </Link>
            </p>
          </MissionCard>
        )}
      </div>

      <EvidenceStrip
        items={evidenceItems}
        note={
          mode === "ready"
            ? null
            : mode === "loading"
              ? "Loading local progress…"
              : "Your progress is stored on this device and loads in the browser."
        }
      />

      <CourseCards
        lessons={projection.lessons}
        activities={projection.activities}
        progress={progress}
        mode={mode}
      />

      {mode === "ready" && rewards ? (
        <section className="panel" aria-labelledby="badges-heading">
          <h2 id="badges-heading">Badges</h2>
          <ul className="badge-grid">
            {rewards.badges.map((badge) => (
              <li
                key={badge.id}
                className="badge-card"
                data-earned={badge.earned ? "true" : "false"}
              >
                <strong>{BADGE_LABELS[badge.id] ?? badge.id}</strong>
                <span className="dense">
                  {badge.earned
                    ? `Earned ${badge.earnedLocalDate}`
                    : `${badge.evidenceCount}/${badge.targetCount}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
