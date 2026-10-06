"use client";
import { LDiv, LH1, LH2, LH3, LHeader, LInput, LLabel, LOption, LP, LSection, LSelect, LSpan } from "@/components/i18n/LocalizedElements";


import {useStudyScope} from "@/components/study/StudyScope";
import Link from "@/components/i18n/LocalizedLink";
import { useMemo, useRef, useState } from "react";
import type { LearnerEvent, MissionFilters, SelectedMissionCard } from "@german-learning/learning";
import { useLearnerState } from "@/components/learner-state/LearnerStateProvider";
import {
  buildDailyReviewMission,
  buildActivityReviewQueue,
  normalizeConversationEventForPersistence,
  normalizePracticeEventForPersistence,
  reviewTemplateForId,
  type ReviewGameId,
} from "@/lib/learner-state";
import { createPracticeUuid } from "@/lib/games";
import { PracticeGameBody } from "@/components/games/GameRenderer";
import {
  StatusMessage,
  useAnnouncement,
} from "@/components/a11y/StatusMessage";
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
  const {scope}=useStudyScope();
  const { snapshot } = useLearnerState();
  const [size, setSize] = useState<5 | 10 | 15>(10);
  const [lesson, setLesson] = useState<"all" | "lesson:01" | "lesson:02">("all");
  const [onlyDifficult, setOnlyDifficult] = useState(false);
  const [teacherAssignment, setTeacherAssignment] = useState(false);
  const hydration = snapshot.hydration;

  if (snapshot.status === "loading") return <LP role="status">Loading review state…</LP>;
  if (!hydration) return <LP className="placeholder-banner" role="alert">{snapshot.statusMessage}</LP>;

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
    studyScope:scope,
  });
  const activityRetries = buildActivityReviewQueue({ state: hydration.state, studyScope: scope });

  return (
    <LDiv className="stack">
      <LHeader className="page-header">
        <LP className="dense">Lesson practice</LP>
        <LH1>Review your mistakes</LH1>
        <LP className="lede">Return to a lesson question, read the explanation, and try again without a hint.</LP>
      </LHeader>
      <LDiv className="study-row review-paths"><Link className="study-secondary" href="/saved">My saved collection &amp; recall →</Link><Link href="/practice">Choose free practice →</Link></LDiv>
      <LSection className="panel" aria-labelledby="lesson-retries-heading">
        <LH2 id="lesson-retries-heading">Lesson practice</LH2>
        <LP className="dense">Correct answers after a hint stay here until you try again without help.</LP>
        {activityRetries.length > 0 ? (
          <LDiv className="stack">
            {activityRetries.map((item) => (
              <LDiv className="panel" key={item.id}>
                <LP className="dense">Lesson {item.lessonNumber}</LP>
                <LH3 lang="de">{item.conceptLabel}</LH3>
                <Link className="btn btn-secondary" href={item.href}>Practise this topic</Link>
              </LDiv>
            ))}
          </LDiv>
        ) : (
          <LDiv>
            <LP>No mistakes waiting for a retry.</LP>
            <Link className="btn btn-primary" href="/lessons/01">Start Lesson 1</Link>
          </LDiv>
        )}
      </LSection>
      <LSection className="panel" aria-labelledby="review-setup-heading">
        <LH2 id="review-setup-heading">Guided review cards</LH2>
        <LDiv className="hub-filter-grid">
          <LLabel className="hub-field">Mission size
            <LSelect className="hub-input" value={size} onChange={(e) => setSize(Number(e.target.value) as 5 | 10 | 15)}>
              <LOption value={5}>5 cards</LOption><LOption value={10}>10 cards</LOption><LOption value={15}>15 cards</LOption>
            </LSelect>
          </LLabel>
          <LLabel className="hub-field">Lesson
            <LSelect aria-label="Lesson" className="hub-input" value={lesson} onChange={(e) => setLesson(e.target.value as typeof lesson)}>
              <LOption value="all">Both available lessons</LOption><LOption value="lesson:01">Lesson 1</LOption><LOption value="lesson:02">Lesson 2</LOption>
            </LSelect>
          </LLabel>
          <LLabel className="qa-guided__option"><LInput type="checkbox" checked={onlyDifficult} onChange={(e) => setOnlyDifficult(e.target.checked)} /> Difficult or confusing only</LLabel>
          <LLabel className="qa-guided__option"><LInput type="checkbox" checked={teacherAssignment} onChange={(e) => setTeacherAssignment(e.target.checked)} /> Teacher-tagged only</LLabel>
        </LDiv>
      </LSection>
      <LSection className="panel" aria-labelledby="review-summary-heading">
        <LH2 id="review-summary-heading">Mission summary</LH2>
        <LP>{view.mission.reasonText}</LP>
        <LDiv className="meta-row">
          <LSpan className="meta-chip">{view.candidateCount} eligible</LSpan>
          <LSpan className="meta-chip">{view.dueCount} due</LSpan>
          <LSpan className="meta-chip">{view.newCount} new</LSpan>
          <LSpan className="meta-chip">{view.mission.selected.length} selected</LSpan>
        </LDiv>
        <LP className="dense">{view.availabilityNote}</LP>
        {view.mission.selected.length > 0 ? (
          <Link
            className="btn btn-primary"
            href="/review/session/today"
            onClick={() => window.sessionStorage.setItem(REVIEW_CONFIG_KEY, JSON.stringify({ size, lesson, onlyDifficult, teacherAssignment }))}
          >Start mission</Link>
        ) : (
          <LP className="placeholder-banner">No cards match. Add review cards from a detail page or clear filters.</LP>
        )}
      </LSection>
    </LDiv>
  );
}

export function ReviewSession() {
  const {scope}=useStudyScope();
  const { snapshot, controller } = useLearnerState();
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savingAnnouncement, announceSaving] = useAnnouncement();
  const [message, setMessage] = useAnnouncement();
  const handled = useRef(new Set<string>());
  const missionRows = useRef<readonly SelectedMissionCard[] | null>(null);
  const config = useRef<ReviewConfig | null>(null);
  const sessionId = useMemo(() => createPracticeUuid(), []);
  const hydration = snapshot.hydration;

  if (snapshot.status === "loading") return <LP role="status">Loading today’s mission…</LP>;
  if (!hydration || !controller) return <LP className="placeholder-banner" role="alert">{snapshot.statusMessage}</LP>;

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
    studyScope:scope,
  });
  if (missionRows.current === null) missionRows.current = Object.freeze([...view.mission.selected]);
  const selected = missionRows.current;
  const row = selected[index];
  if (!row) {
    return (
      <LDiv className="stack">
        <LHeader className="page-header"><LP className="dense">Review complete</LP><LH1>Mission finished</LH1><LP className="lede">Your progress and next review dates are saved on this device.</LP></LHeader>
        <Link className="btn btn-primary" href="/review">Back to review</Link>
        <Link className="btn btn-secondary" href="/">Dashboard</Link>
      </LDiv>
    );
  }
  const template = reviewTemplateForId(row.candidate.templateId);
  if (!template) return <LP role="alert">This review card is no longer available.</LP>;

  async function persist(event: LearnerEvent) {
    if (saving || handled.current.has(event.eventId)) return;
    handled.current.add(event.eventId);
    setSaving(true);
    announceSaving("Saving attempt…");
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
      announceSaving(null);
    }
  }

  return (
    <LDiv className="stack review-session">
      <LHeader className="page-header">
        <LP className="dense">Today’s mission · {index + 1}/{selected.length}</LP>
        <LH1>{row.candidate.conceptLabel}</LH1>
        <LDiv className="meta-row"><LSpan className="meta-chip">{row.category}</LSpan><LSpan className="meta-chip">{row.candidate.modality}</LSpan></LDiv>
      </LHeader>
      {template.gameId ? (
        <PracticeGameBody gameId={template.gameId as ReviewGameId} sessionId={sessionId} onEvent={(event) => void persist(event)} />
      ) : (
        <IndependentConstructionLevel sessionId={sessionId} onEvent={(event) => void persist(event)} onComplete={() => undefined} />
      )}
      <StatusMessage announcement={savingAnnouncement} />
      <StatusMessage announcement={message} className="detail-feedback" />
      <Link className="btn btn-secondary" href="/review">Exit mission</Link>
    </LDiv>
  );
}
