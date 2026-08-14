"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { LearnerEvent, MissionFilters, SelectedMissionCard } from "@german-learning/learning";
import { useLearnerState } from "@/components/learner-state/LearnerStateProvider";
import {
  buildDailyReviewMission,
  normalizeConversationEventForPersistence,
  normalizePracticeEventForPersistence,
  reviewTemplateForId,
  type ReviewGameId,
} from "@/lib/learner-state";
import { createPracticeUuid } from "@/lib/games";
import { PracticeGameBody } from "@/components/games/GameRenderer";
import { IndependentConstructionLevel } from "@/components/conversation/IndependentConstructionLevel";

const REVIEW_CONFIG_KEY = "german-learning-os:review-config:v1";

type ReviewConfig = Readonly<{
  size: 5 | 10 | 15;
  lesson: "all" | "lesson:01" | "lesson:02";
  onlyDifficult: boolean;
  teacherAssignment: boolean;
}>;

function readReviewConfig(): ReviewConfig {
  if (typeof window === "undefined") return { size: 10, lesson: "all", onlyDifficult: false, teacherAssignment: false };
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(REVIEW_CONFIG_KEY) ?? "null") as Partial<ReviewConfig> | null;
    return {
      size: parsed?.size === 5 || parsed?.size === 15 ? parsed.size : 10,
      lesson: parsed?.lesson === "lesson:01" || parsed?.lesson === "lesson:02" ? parsed.lesson : "all",
      onlyDifficult: parsed?.onlyDifficult === true,
      teacherAssignment: parsed?.teacherAssignment === true,
    };
  } catch {
    return { size: 10, lesson: "all", onlyDifficult: false, teacherAssignment: false };
  }
}

export function ReviewSetup() {
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
  });

  return (
    <div className="stack">
      <header className="page-header">
        <p className="dense">Spaced review</p>
        <h1>Today’s mission</h1>
        <p className="lede">A deterministic mix of due, difficult, form, recall and production cards.</p>
      </header>
      <section className="panel" aria-labelledby="review-setup-heading">
        <h2 id="review-setup-heading">Build mission</h2>
        <div className="hub-filter-grid">
          <label className="hub-field">Mission size
            <select className="hub-input" value={size} onChange={(e) => setSize(Number(e.target.value) as 5 | 10 | 15)}>
              <option value={5}>5 cards</option><option value={10}>10 cards</option><option value={15}>15 cards</option>
            </select>
          </label>
          <label className="hub-field">Lesson
            <select className="hub-input" value={lesson} onChange={(e) => setLesson(e.target.value as typeof lesson)}>
              <option value="all">All lessons</option><option value="lesson:01">Lesson 1</option><option value="lesson:02">Lesson 2</option>
            </select>
          </label>
          <label className="qa-guided__option"><input type="checkbox" checked={onlyDifficult} onChange={(e) => setOnlyDifficult(e.target.checked)} /> Difficult or confusing only</label>
          <label className="qa-guided__option"><input type="checkbox" checked={teacherAssignment} onChange={(e) => setTeacherAssignment(e.target.checked)} /> Teacher-tagged only</label>
        </div>
      </section>
      <section className="panel" aria-labelledby="review-summary-heading">
        <h2 id="review-summary-heading">Mission summary</h2>
        <p>{view.mission.reasonText}</p>
        <div className="meta-row">
          <span className="meta-chip">{view.candidateCount} eligible</span>
          <span className="meta-chip">{view.dueCount} due</span>
          <span className="meta-chip">{view.newCount} new</span>
          <span className="meta-chip">{view.mission.selected.length} selected</span>
        </div>
        <p className="dense">{view.availabilityNote}</p>
        {view.mission.selected.length > 0 ? (
          <Link
            className="btn btn-primary"
            href="/review/session/today"
            onClick={() => window.sessionStorage.setItem(REVIEW_CONFIG_KEY, JSON.stringify({ size, lesson, onlyDifficult, teacherAssignment }))}
          >Start mission</Link>
        ) : (
          <p className="placeholder-banner">No cards match. Add review cards from a detail page or clear filters.</p>
        )}
      </section>
    </div>
  );
}

export function ReviewSession() {
  const { snapshot, controller } = useLearnerState();
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const handled = useRef(new Set<string>());
  const missionRows = useRef<readonly SelectedMissionCard[] | null>(null);
  const config = useRef<ReviewConfig | null>(null);
  const sessionId = useMemo(() => createPracticeUuid(), []);
  const hydration = snapshot.hydration;

  if (snapshot.status === "loading") return <p role="status">Loading today’s mission…</p>;
  if (!hydration || !controller) return <p className="placeholder-banner" role="alert">{snapshot.statusMessage}</p>;

  if (config.current === null) config.current = readReviewConfig();
  const filters: MissionFilters = {
    ...(config.current.lesson === "all" ? {} : { lessonId: config.current.lesson }),
    ...(config.current.onlyDifficult ? { onlyDifficult: true } : {}),
    ...(config.current.teacherAssignment ? { teacherAssignment: true } : {}),
  };
  const view = buildDailyReviewMission({
    state: hydration.state,
    masteryByConcept: hydration.masteryByConcept,
    now: new Date(),
    dailyCardLimit: config.current.size,
    targetCount: config.current.size,
    filters,
  });
  if (missionRows.current === null) missionRows.current = Object.freeze([...view.mission.selected]);
  const selected = missionRows.current;
  const row = selected[index];
  if (!row) {
    return (
      <div className="stack">
        <header className="page-header"><p className="dense">Review complete</p><h1>Mission finished</h1><p className="lede">Your progress and next review dates are saved on this device.</p></header>
        <Link className="btn btn-primary" href="/review">Back to review</Link>
        <Link className="btn btn-secondary" href="/">Dashboard</Link>
      </div>
    );
  }
  const template = reviewTemplateForId(row.candidate.templateId);
  if (!template) return <p role="alert">This review card is no longer available.</p>;

  async function persist(event: LearnerEvent) {
    if (saving || handled.current.has(event.eventId)) return;
    handled.current.add(event.eventId);
    setSaving(true);
    try {
      const review = { cardId: row!.candidate.cardId, templateId: template!.id };
      const normalized = template!.gameId
        ? normalizePracticeEventForPersistence({ event, gameId: template!.gameId, review })
        : normalizeConversationEventForPersistence({ event, levelId: "independent-construction", review });
      await controller!.appendMissionEvent(normalized);
      setMessage("Saved. Loading the next card…");
      setIndex((value) => value + 1);
    } catch {
      handled.current.delete(event.eventId);
      setMessage("This attempt was not saved. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack review-session">
      <header className="page-header">
        <p className="dense">Today’s mission · {index + 1}/{selected.length}</p>
        <h1>{row.candidate.conceptLabel}</h1>
        <div className="meta-row"><span className="meta-chip">{row.category}</span><span className="meta-chip">{row.candidate.modality}</span></div>
      </header>
      {template.gameId ? (
        <PracticeGameBody gameId={template.gameId as ReviewGameId} sessionId={sessionId} onEvent={(event) => void persist(event)} />
      ) : (
        <IndependentConstructionLevel sessionId={sessionId} onEvent={(event) => void persist(event)} onComplete={() => undefined} />
      )}
      {saving ? <p role="status">Saving attempt…</p> : null}
      {message ? <p className="detail-feedback" role="status">{message}</p> : null}
      <Link className="btn btn-secondary" href="/review">Exit mission</Link>
    </div>
  );
}
