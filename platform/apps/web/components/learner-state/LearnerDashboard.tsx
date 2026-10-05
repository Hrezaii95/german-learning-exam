"use client";
import { LArticle, LDetails, LDiv, LH2, LH3, LLi, LP, LSection, LSpan, LStrong, LSummary, LUl } from "@/components/i18n/LocalizedElements";


import {useStudyScope} from "@/components/study/StudyScope";
import {tagsForLesson} from "@/lib/study/scope";
import Link from "@/components/i18n/LocalizedLink";
import {useEffect, useState, type ReactNode} from "react";
import {useStudy} from "@/components/study/StudyProvider";
import {courseChapters} from "@/lib/study/lesson-four";
import {savedStudyTags} from "@/lib/study/saved-tags";
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
import { lessonLabel } from "@/lib/content/lesson-label";
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
      <LDiv className="studio-media studio-media--plate">
        <LSpan className="studio-media__word german" lang="de">
          {titleDe}
        </LSpan>
        <LSpan className="studio-media__note">Learn · listen · practise</LSpan>
      </LDiv>
    );
  }
  return (
    <LDiv className="studio-media">
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
    </LDiv>
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
    <LSection
      className="panel studio-card studio-card--continue"
      aria-labelledby="continue-heading"
    >
      {illustration && <StudioMedia illustration={illustration} titleDe={titleDe} />}
      <LDiv className="studio-card__body">
        <LP className="studio-card__eyebrow">{eyebrow}</LP>
        <LH2 id="continue-heading" className="studio-card__title">
          <LSpan className="german" lang="de">
            {titleDe}
          </LSpan>
        </LH2>
        <LP className="studio-card__next">{nextStep}</LP>
        {chips.length > 0 ? (
          <LDiv className="meta-row">
            {chips.map((chip) => (
              <LSpan key={chip} className="meta-chip">
                {chip}
              </LSpan>
            ))}
          </LDiv>
        ) : null}
        <LP className="studio-card__action">
          <Link className="btn btn-primary" href={href}>
            {actionLabel}
          </Link>
        </LP>
      </LDiv>
    </LSection>
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
    <LSection
      className="panel studio-card studio-card--mission"
      aria-labelledby="mission-heading"
      {...(status ? { role: "status" } : {})}
    >
      <LH2 id="mission-heading" className="studio-card__title">
        Today’s mission
      </LH2>
      {children}
    </LSection>
  );
}

/** Due/new mix. Text carries the facts; the bar is decoration for sighted scanning. */
function MissionMix({ due, next }: { due: number; next: number }) {
  const total = due + next;
  if (total === 0) return null;
  const duePercent = Math.round((due / total) * 100);
  return (
    <LDiv className="mission-mix" aria-hidden="true">
      <LSpan
        className="mission-mix__segment mission-mix__segment--due"
        style={{ width: `${duePercent}%` }}
      />
      <LSpan
        className="mission-mix__segment mission-mix__segment--new"
        style={{ width: `${100 - duePercent}%` }}
      />
    </LDiv>
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
    <LSection className="evidence-strip" aria-labelledby="evidence-heading">
      <LH2 id="evidence-heading" className="evidence-strip__heading">
        My progress
      </LH2>
      {note ? (
        <LP className="evidence-strip__note" role="status">
          {note}
        </LP>
      ) : (
        <LUl className="evidence-strip__list">
          {items.map((item) => (
            <LLi key={item.id} className="evidence-item">
              <LSpan className="evidence-item__label">{item.label}</LSpan>
              <LSpan className="evidence-item__value">{item.value}</LSpan>
              {item.mark ? (
                <LSpan
                  className="evidence-item__mark"
                  role="img"
                  aria-label={item.mark.text}
                >
                  <LSpan
                    className="evidence-item__mark-fill"
                    style={{
                      width: `${
                        item.mark.total === 0
                          ? 0
                          : Math.round((item.mark.value / item.mark.total) * 100)
                      }%`,
                    }}
                  />
                </LSpan>
              ) : null}
            </LLi>
          ))}
        </LUl>
      )}
    </LSection>
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
    <LArticle className="panel course-card">
      <StudioMedia illustration={illustration} titleDe={lesson.titleDe} />
      <LDiv className="course-card__body">
        <LP className="studio-card__eyebrow">{lessonLabel(lesson.routeSegment)}</LP>
        <LH3 className="course-card__title">
          <LSpan className="german" lang="de">
            {lesson.titleDe}
          </LSpan>
        </LH3>
        <LP className="muted">{lesson.titleEn}</LP>
        <LDiv className="meta-row">
          <LSpan className="meta-chip">{lesson.activityCount} activities</LSpan>
          <LSpan className="meta-chip">{lesson.estimatedMinutesTotal} min</LSpan>
        </LDiv>
        {mode === "ready" ? (
          <LDiv className="course-card__progress">
            <LStrong>
              {completed} of {ordered.length} done · {percent}%
            </LStrong>
            <progress
              value={completed}
              max={ordered.length || 1}
              aria-label={`${lessonLabel(lesson.routeSegment)} progress`}
            />
          </LDiv>
        ) : (
          <LP className="dense course-card__progress-note">
            {mode === "loading"
              ? "Loading saved progress…"
              : "Your saved progress loads in this browser."}
          </LP>
        )}
        <LP className="studio-card__action">
          <Link className="btn btn-secondary" href={lesson.canonicalPath}>
            Open lesson {lesson.routeSegment}
          </Link>
        </LP>
      </LDiv>
    </LArticle>
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
    <LSection aria-labelledby="lessons-heading">
      <LH2 id="lessons-heading">Your lessons</LH2>
      <LDiv className="course-cards">
        {lessons.map((lesson) => (
          <CourseCard
            key={lesson.id}
            lesson={lesson}
            activities={activities}
            progress={progress}
            mode={mode}
          />
        ))}
      </LDiv>
    </LSection>
  );
}

export function LearnerDashboard({
  projection,
}: {
  projection: LearnerWebProjection;
}) {
  const {scope,matches}=useStudyScope();
  const study=useStudy();
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),60000);return()=>window.clearInterval(timer);},[]);
  const selectedChapters=courseChapters.filter(chapter=>matches(tagsForLesson(chapter.number)));
  const lastChapter=selectedChapters.find(chapter=>chapter.number===study?.state.lastLesson);
  const saved=Object.values(study?.state.saved??{}).filter(item=>matches(savedStudyTags(item,study?.dictionary)));
  const due=saved.filter(item=>!item.due||Date.parse(item.due)<=now);
  const selectedLessons=projection.lessons.filter(l=>matches(tagsForLesson(Number(l.routeSegment))));
  const selectedActivities=projection.activities.filter(a=>selectedLessons.some(l=>l.id===a.lessonId));
  const learnerState = useOptionalLearnerState();
  const snapshot = learnerState?.snapshot ?? null;
  const hydration = snapshot?.hydration ?? null;

  // Storage exists but could not be read — never guess at progress here.
  if (snapshot && snapshot.status !== "loading" && !hydration) {
    return (
      <LSection className="panel" role="alert">
        <LH2>Local progress needs attention</LH2>
        <LP>{snapshot.statusMessage}</LP>
        <Link className="btn btn-secondary" href="/settings">
          Open recovery settings
        </Link>
      </LSection>
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
      ? (selectedActivities.find(
          (row) => row.id === state.resume!.activityId && (!lastChapter || Number(row.lessonRouteSegment)===lastChapter.number),
        ) ?? null)
      : null;

  const continueLessonId =
    resumeActivity?.lessonId ?? selectedLessons.find(lesson=>Number(lesson.routeSegment)===lastChapter?.number)?.id ?? selectedLessons[0]?.id ?? projection.zeroState.continueLessonId;
  const continueLesson =
    selectedLessons.find((lesson) => lesson.id === continueLessonId) ?? null;
  const continueTitleDe =
    continueLesson?.titleDe ?? projection.zeroState.continueLessonTitleDe;
  const continuePath =
    resumeActivity?.canonicalPath ?? (continueLesson?orderedLessonActivities(continueLesson,selectedActivities)[0]?.canonicalPath:undefined) ?? continueLesson?.canonicalPath ?? projection.zeroState.continuePath;
  const continueIllustration =
    (resumeActivity ? illustrationForActivity(resumeActivity.id) : null) ??
    illustrationForLesson(continueLessonId);
  const continueChips = resumeActivity
    ? [lessonLabel(resumeActivity.lessonRouteSegment), resumeActivity.stageTitleEn]
    : continueLesson
      ? [lessonLabel(continueLesson.routeSegment), "First activity"]
      : [];
  const studyChapter=lastChapter && lastChapter.number>2 ? lastChapter : selectedLessons.length ? undefined : selectedChapters[0];
  const studySession=studyChapter ? study?.state.lessonSessions?.[studyChapter.number] : undefined;
  const canContinue=Boolean(resumeActivity || (studyChapter && (study?.state.lastLesson===studyChapter.number || studySession)));

  let mission = null;
  if (mode === "ready" && state && hydration) {
    try {
      mission = buildDailyReviewMission({
        state,
        masteryByConcept: hydration.masteryByConcept,
        now: new Date(),
        studyScope:scope,
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
    <LDiv className="stack">
      <LDiv className="studio-board">
        {(selectedLessons.length>0||studyChapter)&&<ContinueCard
          eyebrow={canContinue ? "Continue" : "Start here"}
          titleDe={studyChapter?.title??continueTitleDe}
          nextStep={
            studyChapter ? studyChapter.topic : resumeActivity
              ? resumeActivity.promptPlainText
              : `Begin the guided activities in Lesson ${continueLesson?.routeSegment.replace(/^0/,"")??"1"}.`
          }
          chips={studyChapter ? [`Lesson ${studyChapter.number}`, studySession?.tab??"Learn"] : continueChips}
          href={studyChapter ? `/lessons/${String(studyChapter.number).padStart(2,"0")}${studySession?`#${studySession.tab.toLowerCase()}`:""}` : continuePath}
          actionLabel={canContinue ? "Continue learning" : "Start learning"}
          illustration={studyChapter ? illustrationForLesson(`lesson:${String(studyChapter.number).padStart(2,"0")}`) : continueIllustration}
        />}

        {study?.ready && saved.length>0 ? (
          <MissionCard>
            <LP className="studio-card__next"><LStrong>{due.length} ready to review</LStrong> from {saved.length} saved items in your study selection.</LP>
            <LP>Recall the meaning, then rate how well you remembered it. Your rating sets the next review date.</LP>
            <LP className="studio-card__action"><Link className="btn btn-primary" href={due.length?"/saved?due=1":"/saved"}>{due.length?"Review due items":"Open my collection"}</Link></LP>
            <Link href="/review">Guided exercises{mission ? ` · ${mission.dueCount} due, ${mission.newCount} new` : ""} →</Link>
          </MissionCard>
        ) : mode === "ready" && mission && mission.candidateCount > 0 ? (
          <MissionCard>
            <LP className="studio-card__next">{mission.mission.reasonText}</LP>
            <MissionMix due={mission.dueCount} next={mission.newCount} />
            <LDiv className="meta-row">
              <LSpan className="meta-chip">{mission.dueCount} due</LSpan>
              <LSpan className="meta-chip">{mission.newCount} new</LSpan>
              <LSpan className="meta-chip">
                {mission.mission.selected.length} in today’s set
              </LSpan>
            </LDiv>
            <LP className="dense">{mission.availabilityNote}</LP>
            <LP className="studio-card__action">
              <Link className="btn btn-primary" href="/review">
                Start today’s mission
              </Link>
            </LP>
          </MissionCard>
        ) : mode === "ready" ? (
          <MissionCard>
            <LP className="studio-card__next">
              You have no review cards yet. Save words, phrases or concepts to
              build your collection, or choose a guided exercise.
            </LP>
            <LP className="studio-card__action">
              <Link className="btn btn-secondary" href="/hubs">
                Browse learning hubs
              </Link>
            </LP>
          </MissionCard>
        ) : (
          <MissionCard status="status">
            <LP className="studio-card__next">
              {mode === "loading"
                ? "Loading local progress…"
                : "Your review mission is stored on this device and loads in the browser."}
            </LP>
            <LP className="studio-card__action">
              <Link className="btn btn-secondary" href="/hubs">
                Browse learning hubs
              </Link>
            </LP>
          </MissionCard>
        )}
      </LDiv>

      <LDiv role="group" className="study-row dashboard-shortcuts" aria-label="Other ways to study">
        <Link href={study?.state.resume?`/book?page=${study.state.resume}`:"/book"}>{study?.state.resume?"Resume book":"Open book"}</Link>
        <Link href="/saved">My saved collection</Link>
        <Link href="/practice">Free practice</Link>
      </LDiv>

      <LDetails className="dashboard-progress">
      <LSummary>Progress &amp; guided activities</LSummary>
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
        lessons={selectedLessons}
        activities={selectedActivities}
        progress={progress}
        mode={mode}
      />

      {mode === "ready" && rewards ? (
        <LSection className="panel" aria-labelledby="badges-heading">
          <LH2 id="badges-heading">Badges</LH2>
          <LUl className="badge-grid">
            {rewards.badges.map((badge) => (
              <LLi
                key={badge.id}
                className="badge-card"
                data-earned={badge.earned ? "true" : "false"}
              >
                <LStrong>{BADGE_LABELS[badge.id] ?? badge.id}</LStrong>
                <LSpan className="dense">
                  {badge.earned
                    ? `Earned ${badge.earnedLocalDate}`
                    : `${badge.evidenceCount}/${badge.targetCount}`}
                </LSpan>
              </LLi>
            ))}
          </LUl>
        </LSection>
      ) : null}
      </LDetails>
    </LDiv>
  );
}
