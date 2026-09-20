"use client";
import { useEffect, useRef, useState } from "react";
import type { StudyUnit } from "@/lib/study/course-lessons";
import type { LessonSession } from "@/lib/study/types";
import { useStudy } from "./StudyProvider";

const tabs: LessonSession["tab"][] = ["Words", "Grammar", "Verbs", "Phrases", "Practice"];

export function useLessonSession(unit: Pick<StudyUnit, "number" | "quiz">, defaultTab: LessonSession["tab"] = "Grammar") {
  const study = useStudy();
  const quizKey = JSON.stringify(unit.quiz);
  const initial: LessonSession = { tab: defaultTab, position: 0, answers: [], quizKey };
  const [local, setLocal] = useState(initial);
  const stored = study?.state.lessonSessions?.[unit.number];
  const candidate = study ? stored : local;
  const session = candidate?.quizKey === quizKey && candidate.position <= unit.quiz.length ? candidate : initial;
  const latest = useRef(session);
  latest.current = session;
  const update = study?.update;
  const ready = !study || study.ready;

  function persist(next: LessonSession) {
    if (update && !update(old => ({ ...old, lessonSessions: { ...old.lessonSessions, [unit.number]: next } }))) return false;
    setLocal(next);
    return true;
  }

  useEffect(() => {
    if (!ready) return;
    const restoreHash = () => {
      const tab = tabs.find(value => value.toLowerCase() === window.location.hash.slice(1));
      if (!tab || latest.current.tab === tab) return;
      const next = { ...latest.current, tab };
      if (update && !update(old => ({ ...old, lessonSessions: { ...old.lessonSessions, [unit.number]: next } }))) return;
      setLocal(next);
    };
    restoreHash();
    window.addEventListener("hashchange", restoreHash);
    return () => window.removeEventListener("hashchange", restoreHash);
  }, [ready, update, unit.number]);

  return {
    ...session, ready,
    answer: session.answers[session.position] ?? null,
    score: session.answers.filter((answer, index) => answer === unit.quiz[index]?.answer).length,
    chooseTab(tab: LessonSession["tab"]) {
      if (persist({ ...session, tab })) window.history.replaceState(window.history.state, "", `#${tab.toLowerCase()}`);
    },
    chooseAnswer(answer: string) {
      if (session.answers[session.position] !== undefined || !unit.quiz[session.position]?.options.includes(answer)) return;
      persist({ ...session, answers: [...session.answers.slice(0, session.position), answer] });
    },
    next() { persist({ ...session, position: Math.min(unit.quiz.length, session.position + 1) }); },
    restart() { persist({ ...initial, tab: "Practice" }); },
  };
}
