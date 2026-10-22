"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PackExamTask } from "../../../../packages/content/src/types/packs.js";
import type { GeneratedTask, GradeResult, TaskAnswer } from "../../../../packages/wortwerk/src/tasks.js";
import type { RunTask } from "../../../../packages/learning/src/wortwerk/types.js";
import type { PlayPack } from "@/lib/wortwerk/content.server";
import { examItemRefs, parseExamResource } from "@/lib/wortwerk/resources";
import { materializeTask, playableCapabilities, templateFor } from "@/lib/wortwerk/runtime";
import { recordAnswer, recordSession } from "@/lib/wortwerk/learning-state";
import { createUuidV7Factory, wortwerkStore } from "@/lib/wortwerk/store";
import { useWortwerkState } from "@/lib/wortwerk/use-wortwerk";
import { usePlayContent } from "./PlayProvider";
import { TaskRenderer } from "./TaskRenderer";

const newId = createUuidV7Factory();
type ExamResult = {
  taskId: string; section: string; answered: number; correct: number; objectiveAnswered: number;
  objectiveCorrect: number; selfChecks: number; available: number; objectiveAvailable: number;
  points: number; maxPoints: number; expired: boolean;
};
type Section = { definition: PackExamTask; tasks: GeneratedTask[]; missing: number };
type ExamState = {
  id: string; startedAt: string; sections: Section[]; sectionIndex: number; taskIndex: number;
  deadlineAt: number; phase: "active" | "section-results" | "complete";
  result: GradeResult | null; rows: { correct: boolean; hinted: boolean; selfCheck: boolean }[]; results: ExamResult[];
};
function sectionQueue(selected: PlayPack, definition: PackExamTask, sessionId: string): Section {
  const refs = examItemRefs(selected.pack, definition.id);
  const capabilities = playableCapabilities(selected.pack, selected.language, selected.difficulty, { v: 1, items: refs });
  const tasks = refs.flatMap((id, index) => {
    const capability = capabilities.find(capability => capability.itemId === id);
    if (!capability) return [];
    const candidates = [...capability.templates].sort((a, b) => Number(b.skill === definition.section) - Number(a.skill === definition.section)
      || Number(b.format === "recognition") - Number(a.format === "recognition") || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const template = candidates[0];
    if (!template) return [];
    const descriptor: RunTask = { packId: selected.pack.id, itemId: id, dimension: template.dimension, templateId: template.id, skill: template.skill, format: template.format, reason: "maintenance" };
    const task = materializeTask(descriptor, selected.pack, selected.language, selected.difficulty, `${sessionId}:${definition.id}:${index}`);
    return task ? [{ ...task, id: `${sessionId}:${definition.id}:${index}` }] : [];
  });
  return { definition, tasks, missing: refs.length - tasks.length };
}
function isSelfCheck(task: GeneratedTask): boolean { return task.solution.selfCheck === true; }
export function ExamPanel() {
  const content = usePlayContent();
  return content?.selectedPack ? <ExamContent key={content.selectedPack.pack.id} selected={content.selectedPack} /> : <div className="ww-page"><section className="ww-panel"><h1>Exam simulation</h1><p>Choose a content pack with an authored exam definition.</p><Link href="/play/packs">Choose a pack</Link></section></div>;
}
function ExamContent({ selected }: { selected: PlayPack }) {
  const state = useWortwerkState();
  const parsed = selected.resources.exam === undefined ? null : parseExamResource(selected.resources.exam, selected.pack);
  const definitions = parsed?.value?.taskRefs.flatMap(id => { const item = selected.pack.items.find(item => item.id === id); return item?.type === "examTask" ? [item] : []; }) ?? [];
  const [exam, setExam] = useState<ExamState | null>(null);
  const active = useRef<ExamState | null>(null);
  const [clock, setClock] = useState(0);
  const handled = useRef(new Set<string>());
  const finalized = useRef(new Set<string>());
  const stepStarted = useRef(0);
  const timeZone = state.timeZone;
  const update = useCallback((next: ExamState) => { active.current = next; setExam(next); }, []);
  const finishSection = useCallback((current: ExamState, expired: boolean) => {
    const key = `${current.id}:${current.sectionIndex}`;
    if (current.phase !== "active" || finalized.current.has(key)) return;
    finalized.current.add(key);
    const section = current.sections[current.sectionIndex]!;
    const objective = current.rows.filter(row => !row.selfCheck);
    const objectiveAvailable = section.tasks.filter(task => !isSelfCheck(task)).length;
    const weight = section.definition.scoring?.pointsPerItem ?? 1;
    const maxPoints = Math.min(section.definition.scoring?.maxScore ?? Infinity, objectiveAvailable * weight);
    const result: ExamResult = { taskId: section.definition.id, section: section.definition.section,
      answered: current.rows.length, correct: current.rows.filter(row => row.correct).length,
      objectiveAnswered: objective.length, objectiveCorrect: objective.filter(row => row.correct && !row.hinted).length,
      selfChecks: current.rows.filter(row => row.selfCheck).length, available: section.tasks.length + section.missing,
      objectiveAvailable, points: Math.min(maxPoints, objective.filter(row => row.correct && !row.hinted).length * weight), maxPoints, expired };
    wortwerkStore.appendEvent("exam.section", { examSessionId: current.id, packId: selected.pack.id, ...result });
    update({ ...current, phase: "section-results", result: null, results: [...current.results, result] });
  }, [selected.pack.id, update]);

  useEffect(() => {
    if (exam?.phase !== "active") return;
    const timer = setInterval(() => {
      const current = active.current;
      if (current?.phase !== "active") return;
      const now = Date.now();
      setClock(now);
      if (now >= current.deadlineAt) finishSection(current, true);
    }, 250);
    return () => clearInterval(timer);
  }, [exam?.phase, exam?.deadlineAt, finishSection]);

  function begin() {
    if (!definitions.length || active.current) return;
    const id = newId();
    const now = Date.now();
    const startedAt = new Date(now).toISOString();
    const sections = definitions.map(definition => sectionQueue(selected, definition, id));
    recordSession({ sessionId: id, mode: "free", startedAt, completedAt: startedAt, answered: 0, correct: 0, completed: false, scopeKey: `${selected.pack.id}:exam`, difficultyId: selected.difficulty.id }, { timeZone });
    wortwerkStore.appendEvent("exam.started", { examSessionId: id, packId: selected.pack.id, taskRefs: definitions.map(definition => definition.id) });
    stepStarted.current = now; setClock(now);
    update({ id, startedAt, sections, sectionIndex: 0, taskIndex: 0, deadlineAt: now + sections[0]!.definition.timing * 1000, phase: "active", result: null, rows: [], results: [] });
  }
  function answer(raw: TaskAnswer) {
    const current = active.current;
    if (!current || current.phase !== "active" || current.result) return;
    if (Date.now() >= current.deadlineAt) { finishSection(current, true); return; }
    const task = current.sections[current.sectionIndex]?.tasks[current.taskIndex];
    if (!task || handled.current.has(task.id)) return;
    const template = templateFor(task.templateId);
    if (!template) return;
    handled.current.add(task.id);
    const result = template.grade(task, raw, selected.language);
    const selfCheck = isSelfCheck(task) || result.assessment === "self";
    recordAnswer(task, result, { sessionId: current.id, timeZone, selfAssessed: selfCheck, latencyMs: Math.max(0, Date.now() - stepStarted.current) });
    update({ ...current, result, rows: [...current.rows, { correct: result.correct, hinted: result.hinted, selfCheck }] });
  }
  function nextTask() {
    const current = active.current;
    if (!current || current.phase !== "active" || !current.result) return;
    if (Date.now() >= current.deadlineAt) { finishSection(current, true); return; }
    if (current.taskIndex + 1 >= current.sections[current.sectionIndex]!.tasks.length) { finishSection(current, false); return; }
    stepStarted.current = Date.now();
    update({ ...current, taskIndex: current.taskIndex + 1, result: null });
  }
  function nextSection() {
    const current = active.current;
    if (!current || current.phase !== "section-results") return;
    if (current.sectionIndex + 1 >= current.sections.length) {
      const answered = current.results.reduce((sum, result) => sum + result.answered, 0);
      const correct = current.results.reduce((sum, result) => sum + result.correct, 0);
      const completed = current.results.every(result => !result.expired && result.answered === result.available);
      recordSession({ sessionId: current.id, mode: "free", startedAt: current.startedAt, answered, correct, completed, scopeKey: `${selected.pack.id}:exam`, difficultyId: selected.difficulty.id }, { timeZone });
      wortwerkStore.appendEvent("exam.completed", { examSessionId: current.id, packId: selected.pack.id, completed, sections: current.results });
      update({ ...current, phase: "complete" });
      return;
    }
    const sectionIndex = current.sectionIndex + 1;
    const now = Date.now(); setClock(now); stepStarted.current = now;
    update({ ...current, sectionIndex, taskIndex: 0, deadlineAt: now + current.sections[sectionIndex]!.definition.timing * 1000, phase: "active", rows: [], result: null });
  }
  const section = exam?.sections[exam.sectionIndex];
  const task = section?.tasks[exam?.taskIndex ?? 0];
  const remaining = exam ? Math.max(0, Math.ceil((exam.deadlineAt - clock) / 1000)) : 0;
  const summary = exam?.results.at(-1);
  return <div className="ww-page"><header className="ww-page-heading"><p className="ww-eyebrow">{selected.pack.title}</p><h1>{parsed?.value?.title ?? "Exam simulation"}</h1><Link className="ww-button" href="/play/progress">Readiness and goals</Link></header>
    {!parsed ? <section className="ww-panel"><p>No exam has been authored for this pack yet.</p></section> : !parsed.value ? <section className="ww-panel"><p>This exam needs an authoring fix before a simulation can start.</p></section> : !exam ? <section className="ww-panel"><h2>Timed sections</h2><ol>{definitions.map(definition => <li key={definition.id}>{definition.section} · {definition.timing} seconds · {examItemRefs(selected.pack, definition.id).length} source items</li>)}</ol><p>Each section uses its authored time limit. Background time counts. Open speaking and writing responses use a separate self-check with no objective score. Exact source-backed writing tasks can be checked objectively.</p><button type="button" className="ww-button ww-button--primary" disabled={!state.hydrated || !definitions.length} onClick={begin}>Start exam simulation</button></section> : exam.phase === "complete" ? <section className="ww-panel"><h2>Exam practice finished</h2>{exam.results.map(result => <SectionResult key={result.taskId} result={result} />)}<p className="ww-muted">This is practice evidence from the authored tasks, not a certified exam result.</p><Link className="ww-button" href="/play/map">Back to map</Link></section> : exam.phase === "section-results" && summary ? <section className="ww-panel"><h2>Section finished</h2><SectionResult result={summary} /><button className="ww-button ww-button--primary" type="button" onClick={nextSection}>{exam.sectionIndex + 1 < exam.sections.length ? "Start next section" : "Finish exam practice"}</button></section> : <>
      <section className="ww-panel"><h2>{section?.definition.section}</h2><div className="ww-run-progress"><p>Section {exam.sectionIndex + 1} / {exam.sections.length} · task {Math.min(exam.taskIndex + 1, section?.tasks.length ?? 0)} / {section?.tasks.length ?? 0}</p><p role="timer" aria-label="Section time remaining">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p></div>{section?.definition.instructions ? <p>{section.definition.instructions}</p> : null}{section?.missing ? <p>{section.missing} source item{section.missing === 1 ? " is" : "s are"} unavailable for practice. The results will show this.</p> : null}</section>
      {task ? <TaskRenderer task={task} allowHints={false} onAnswer={answer} result={exam.result} disabled={remaining === 0} /> : <section className="ww-panel"><p>No playable task is available for this authored section.</p></section>}
      <div className="ww-actions">{exam.result ? <button className="ww-button ww-button--primary" type="button" onClick={nextTask}>Continue</button> : null}<button className="ww-button" type="button" onClick={() => finishSection(exam, Date.now() >= exam.deadlineAt)}>Finish this section</button></div>
    </>}
  </div>;
}
function SectionResult({ result }: { result: ExamResult }) {
  return <section><h3>{result.section}</h3><p>{result.expired ? "Time finished. " : ""}{result.answered} / {result.available} source tasks answered.</p>{result.objectiveAvailable ? <p>Objective answers: {result.objectiveCorrect} / {result.objectiveAvailable} · points {result.points} / {result.maxPoints}.</p> : <p>{result.selfChecks ? "Production self-checks receive no objective score." : "No objective score is available for this section."}</p>}{result.selfChecks ? <p>{result.selfChecks} production self-check{result.selfChecks === 1 ? "" : "s"} recorded separately.</p> : null}</section>;
}
