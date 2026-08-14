"use client";

import Link from "next/link";
import type { LearnerWebProjection } from "@/lib/content/types";
import { useOptionalLearnerState } from "./LearnerStateProvider";
import { buildDailyReviewMission } from "@/lib/learner-state";

const BADGE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  "first-meaningful-attempt": "First meaningful attempt",
  "three-dimensions-practised": "Three skills practised",
  "same-concept-two-days": "Returned on another day",
  "spoken-recording-cycle": "Spoken self-check",
  "seven-day-streak": "Seven-day streak",
});

export function LearnerDashboard({ projection }: { projection: LearnerWebProjection }) {
  const learnerState = useOptionalLearnerState();
  if (!learnerState) {
    return (
      <div className="stack">
        <section className="panel" aria-labelledby="continue-heading">
          <h2 id="continue-heading">Continue</h2>
          <p className="muted">Start with the first Lesson 1 activity.</p>
          <p style={{ marginTop: "1rem" }}>
            <Link className="btn btn-primary" href={projection.zeroState.continuePath}>Start learning</Link>
          </p>
        </section>
        <section className="panel" aria-labelledby="mission-heading">
          <h2 id="mission-heading">Today’s mission</h2>
          <p>Local progress and review cards load in the browser.</p>
          <Link className="btn btn-secondary" href="/hubs">Browse learning hubs</Link>
        </section>
      </div>
    );
  }
  const { snapshot, rewards } = learnerState;
  const hydration = snapshot.hydration;

  if (snapshot.status === "loading") {
    return <section className="panel" role="status"><h2>My progress</h2><p>Loading local progress…</p></section>;
  }
  if (!hydration) {
    return (
      <section className="panel" role="alert">
        <h2>Local progress needs attention</h2>
        <p>{snapshot.statusMessage}</p>
        <Link className="btn btn-secondary" href="/settings">Open recovery settings</Link>
      </section>
    );
  }

  const { state, masteryByConcept } = hydration;
  const resumeActivity = state.resume
    ? projection.activities.find((row) => row.id === state.resume!.activityId)
    : null;
  const continuePath = resumeActivity?.canonicalPath ?? projection.zeroState.continuePath;
  const statuses = [...masteryByConcept.values()];
  const strong = statuses.filter((row) => row.status === "strong").length;
  const mastered = statuses.filter((row) => row.status === "mastered").length;
  let mission = null;
  try {
    mission = buildDailyReviewMission({ state, masteryByConcept, now: new Date() });
  } catch {
    mission = null;
  }

  return (
    <div className="stack">
      <section className="panel" aria-labelledby="continue-heading">
        <h2 id="continue-heading">Continue</h2>
        <p className="muted">
          {resumeActivity ? resumeActivity.promptPlainText : "Start with the first Lesson 1 activity."}
        </p>
        <p style={{ marginTop: "1rem" }}>
          <Link className="btn btn-primary" href={continuePath}>
            {resumeActivity ? "Continue learning" : "Start learning"}
          </Link>
        </p>
      </section>

      <section className="panel" aria-labelledby="mission-heading">
        <h2 id="mission-heading">Today’s mission</h2>
        {mission && mission.candidateCount > 0 ? (
          <>
            <p>{mission.mission.reasonText}</p>
            <div className="meta-row">
              <span className="meta-chip">{mission.dueCount} due</span>
              <span className="meta-chip">{mission.newCount} new</span>
              <span className="meta-chip">{mission.mission.selected.length} selected</span>
            </div>
            <p className="dense">{mission.availabilityNote}</p>
            <Link className="btn btn-primary" href="/review">Open review</Link>
          </>
        ) : (
          <>
            <p>Add review cards from the vocabulary, verb, or Q&amp;A detail pages.</p>
            <Link className="btn btn-secondary" href="/hubs">Browse learning hubs</Link>
          </>
        )}
      </section>

      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="dense">My progress</h2>
        <div className="metrics">
          <div className="metric"><span className="metric__label">Meaningful attempts</span><span className="metric__value">{rewards?.meaningfulEventCount ?? 0}</span></div>
          <div className="metric"><span className="metric__label">Strong / mastered</span><span className="metric__value">{strong} / {mastered}</span></div>
          <div className="metric"><span className="metric__label">XP</span><span className="metric__value">{rewards?.totalXp ?? 0}</span></div>
          <div className="metric"><span className="metric__label">Current streak</span><span className="metric__value">{rewards?.currentStreak ?? 0} days</span></div>
        </div>
      </section>

      {rewards ? (
        <section className="panel" aria-labelledby="badges-heading">
          <h2 id="badges-heading">Badges</h2>
          <ul className="badge-grid">
            {rewards.badges.map((badge) => (
              <li key={badge.id} className="badge-card" data-earned={badge.earned ? "true" : "false"}>
                <strong>{BADGE_LABELS[badge.id] ?? badge.id}</strong>
                <span className="dense">{badge.earned ? `Earned ${badge.earnedLocalDate}` : `${badge.evidenceCount}/${badge.targetCount}`}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
