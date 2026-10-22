"use client";

import Link from "next/link";
import { useState } from "react";
import type { MissionFilters } from "@german-learning/learning";
import { useLearnerState } from "@/components/learner-state/LearnerStateProvider";
import { buildDailyReviewMission } from "@/lib/learner-state";
import { useStudyScope } from "./StudyScope";

// The existing /review/session/today runner reads this per-tab configuration.
const REVIEW_CONFIG_KEY = "german-learning-os:review-config:v1";

/** Compose the public mission builder with saved recall without changing its scheduler. */
export function GuidedReviewPanel() {
  const { scope } = useStudyScope();
  const { snapshot } = useLearnerState();
  const [size, setSize] = useState<5 | 10 | 15>(10);
  const [lesson, setLesson] = useState<"all" | "lesson:01" | "lesson:02">("all");
  const [onlyDifficult, setOnlyDifficult] = useState(false);
  const [teacherAssignment, setTeacherAssignment] = useState(false);
  const hydration = snapshot.hydration;

  if (snapshot.status === "loading") return <p role="status">Loading review state…</p>;
  if (!hydration) return <p className="placeholder-banner" role="alert">{snapshot.statusMessage}</p>;

  const filters: MissionFilters = {
    ...(lesson === "all" ? {} : { lessonId: lesson }),
    ...(onlyDifficult ? { onlyDifficult: true } : {}),
    ...(teacherAssignment ? { teacherAssignment: true } : {}),
  };
  const view = buildDailyReviewMission({
    state: hydration.state,
    masteryByConcept: hydration.masteryByConcept,
    now: new Date(),
    dailyCardLimit: size,
    targetCount: size,
    filters,
    studyScope: scope,
  });

  return <div className="stack">
    <header className="page-header">
      <p className="dense">Guided review · Lessons 1–2</p>
      <h2>Today’s mission</h2>
      <p className="lede">Build a short session of checked exercises from Lessons 1–2. Your saved collection above keeps words, phrases, concepts and book lines from all lessons for self-rated recall.</p>
    </header>
    <div className="study-row review-paths">
      <Link className="study-secondary" href="#saved-collection">My saved collection &amp; recall →</Link>
      <Link href="/practice">Choose free practice →</Link>
    </div>
    <section className="panel" aria-labelledby="review-setup-heading">
      <h3 id="review-setup-heading">Build mission</h3>
      <div className="hub-filter-grid">
        <label className="hub-field">Mission size
          <select className="hub-input" value={size} onChange={event => setSize(Number(event.target.value) as 5 | 10 | 15)}>
            <option value={5}>5 cards</option><option value={10}>10 cards</option><option value={15}>15 cards</option>
          </select>
        </label>
        <label className="hub-field">Lesson
          <select aria-label="Lesson" className="hub-input" value={lesson} onChange={event => setLesson(event.target.value as typeof lesson)}>
            <option value="all">Both available lessons</option><option value="lesson:01">Lesson 1</option><option value="lesson:02">Lesson 2</option>
          </select>
        </label>
        <label className="qa-guided__option"><input type="checkbox" checked={onlyDifficult} onChange={event => setOnlyDifficult(event.target.checked)}/> Difficult or confusing only</label>
        <label className="qa-guided__option"><input type="checkbox" checked={teacherAssignment} onChange={event => setTeacherAssignment(event.target.checked)}/> Teacher-tagged only</label>
      </div>
    </section>
    <section className="panel" aria-labelledby="review-summary-heading">
      <h3 id="review-summary-heading">Mission summary</h3>
      <p>{view.mission.reasonText}</p>
      <div className="meta-row">
        <span className="meta-chip">{view.candidateCount} eligible</span>
        <span className="meta-chip">{view.dueCount} due</span>
        <span className="meta-chip">{view.newCount} new</span>
        <span className="meta-chip">{view.mission.selected.length} selected</span>
      </div>
      <p className="dense">{view.availabilityNote}</p>
      {view.mission.selected.length > 0 ? <Link className="btn btn-primary" href="/review/session/today" onClick={() => window.sessionStorage.setItem(REVIEW_CONFIG_KEY, JSON.stringify({ size, lesson, onlyDifficult, teacherAssignment }))}>Start mission</Link> : <p className="placeholder-banner">No cards match. Add review cards from a detail page or clear filters.</p>}
    </section>
  </div>;
}
