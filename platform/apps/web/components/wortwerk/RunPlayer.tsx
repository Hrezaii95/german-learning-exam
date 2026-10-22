"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { createDailyRun, createFinisher, deriveRunResults, enqueueComeback, type LearningAnswer, type LearningSession, type RunTask } from "../../../../packages/learning/src/wortwerk/index.js";
import type { GradeResult, TaskAnswer } from "../../../../packages/wortwerk/src/tasks.js";
import type { PlayPack } from "@/lib/wortwerk/content.server";
import { decodeScope, encodeScope, ScopeLinkError, type PlayScope } from "@/lib/wortwerk/links";
import { materializeTask, playableCapabilities, templateFor } from "@/lib/wortwerk/runtime";
import { createUuidV7Factory, wortwerkStore } from "@/lib/wortwerk/store";
import { parseWortwerkEvidence, recordAnswer, recordAssignmentProgress, recordSession } from "@/lib/wortwerk/learning-state";
import { useWortwerkState } from "@/lib/wortwerk/use-wortwerk";
import { usePlayContent } from "./PlayProvider";
import { TaskRenderer } from "./TaskRenderer";

const newSessionId = createUuidV7Factory();
const dimensionKey = (task: RunTask) => JSON.stringify([task.packId, task.itemId, task.dimension]);
type RunState = {
  id: string; pack: PlayPack; scope: PlayScope; mode: LearningSession["mode"]; assignmentId?: string;
  startedAt: string; queue: RunTask[]; index: number; result: GradeResult | null;
  answers: LearningAnswer[]; history: LearningAnswer[]; unresolved: RunTask[]; scheduled: string[];
  skipped: number; finisher: boolean; finished: boolean;
};

export function RunPlayer() {
  const query = useSearchParams().toString();
  return <RunPractice key={query} query={query} />;
}

function RunPractice({ query }: { query: string }) {
  const content = usePlayContent();
  const params = useMemo(() => new URLSearchParams(query), [query]);
  const parsed = useMemo<{ scope: PlayScope; error: string | null }>(() => {
    try {
      const encoded = params.get("scope");
      const scope = encoded ? decodeScope(encoded) : content?.scope ?? { v: 1 as const };
      const item = params.get("item");
      return { scope: item && !encoded ? { ...scope, items: [item] } : scope, error: null };
    } catch (error) {
      return { scope: { v: 1 as const }, error: error instanceof ScopeLinkError ? error.message : "This practice link is invalid. Choose a scope to start again." };
    }
  }, [params, content?.scope]);
  const requestedPack = params.get("pack");
  const selected = requestedPack ? content?.enabledPacks.find(pack => pack.pack.id === requestedPack) : content?.selectedPack;
  const [session, setSession] = useState<RunState | null>(null);
  const activePack = session?.pack ?? selected;
  const activeScope = session?.scope ?? parsed.scope;
  const capabilities = useMemo(() => activePack ? playableCapabilities(activePack.pack, activePack.language, activePack.difficulty, activeScope) : [], [activePack, activeScope]);
  const state = useWortwerkState({ capabilities });
  const mode = params.get("mode") === "quick" ? "quick" : params.get("mode") === "free" ? "free" : "run";
  const plan = createDailyRun({ capabilities, answers: state.answers, now: state.now, count: mode === "quick" ? 5 : parsed.scope.count ?? 20, mode });
  const handled = useRef<string | null>(null);
  const completed = useRef(new Set<string>());
  const stepStarted = useRef(0);
  const currentRunTask = session?.queue[session.index];
  const sessionId = session?.id;
  const sessionIndex = session?.index;
  const sessionPack = session?.pack;
  const task = useMemo(() => {
    if (!sessionPack || !currentRunTask || sessionId === undefined || sessionIndex === undefined) return null;
    const generated = materializeTask(currentRunTask, sessionPack.pack, sessionPack.language, sessionPack.difficulty, `${sessionId}:${sessionIndex}`);
    return generated ? { ...generated, id: `${sessionId}:${sessionIndex}` } : null;
  }, [sessionId, sessionIndex, sessionPack, currentRunTask]);

  function begin(queue: RunTask[] = plan.tasks, finisher = false) {
    const pack = finisher ? session?.pack : selected;
    if (!pack || !queue.length) return;
    const startedAt = new Date().toISOString();
    const id = newSessionId();
    const assignment = finisher ? undefined : params.get("assignment")?.trim();
    const next: RunState = {
      id, pack, scope: activeScope, mode: finisher ? "free" : mode, startedAt, queue: [...queue], index: 0,
      result: null, answers: [], history: parseWortwerkEvidence(wortwerkStore.getSnapshot().events).answers,
      unresolved: finisher ? [...(session?.unresolved ?? [])] : [], scheduled: [], skipped: 0, finisher, finished: false,
      ...(assignment ? { assignmentId: assignment } : {}),
    };
    recordSession({ sessionId: id, mode: next.mode, startedAt, completedAt: startedAt, answered: 0, correct: 0, completed: false, scopeKey: encodeScope(next.scope), difficultyId: pack.difficulty.id }, { timeZone: state.timeZone });
    handled.current = null;
    stepStarted.current = Date.now();
    setSession(next);
  }

  function finish(next: RunState) {
    if (!completed.current.has(next.id)) {
      completed.current.add(next.id);
      const results = deriveRunResults(next.answers, next.history);
      recordSession({ sessionId: next.id, mode: next.mode, startedAt: next.startedAt, answered: results.answered, correct: results.correct, completed: next.skipped === 0, scopeKey: encodeScope(next.scope), difficultyId: next.pack.difficulty.id }, { timeZone: state.timeZone });
      if (next.assignmentId) recordAssignmentProgress(next.assignmentId, { answered: results.answered, correct: results.correct, bySkill: results.bySkill, completed: next.skipped === 0 });
    }
    setSession({ ...next, finished: true });
  }

  function answer(raw: TaskAnswer) {
    if (!session || !task || !currentRunTask || session.result || session.finished) return;
    const key = `${session.id}:${session.index}`;
    if (handled.current === key) return;
    const template = templateFor(task.templateId);
    if (!template) return;
    handled.current = key;
    const result = template.grade(task, raw, session.pack.language);
    const missedKey = dimensionKey(currentRunTask);
    const corrected = result.correct && !result.hinted && session.unresolved.some(miss => dimensionKey(miss) === missedKey);
    const event = recordAnswer(task, result, { sessionId: session.id, corrected, latencyMs: Math.max(0, Date.now() - stepStarted.current), timeZone: state.timeZone });
    const evidence = parseWortwerkEvidence([event]).answers[0];
    if (!evidence) throw new Error("Saved answer could not be rebuilt");
    let queue = session.queue;
    let unresolved = session.unresolved.filter(miss => dimensionKey(miss) !== missedKey);
    const scheduled = [...session.scheduled];
    if (!result.correct || result.hinted) {
      unresolved = [...unresolved, currentRunTask];
      if (!session.finisher && !scheduled.includes(missedKey)) {
        queue = enqueueComeback(queue, session.index, currentRunTask, capabilities, `${session.id}:${session.index}`).tasks;
        scheduled.push(missedKey);
      }
    }
    const answers = [...session.answers, evidence];
    const next = { ...session, queue, unresolved, scheduled, answers, result };
    const totals = deriveRunResults(answers, next.history);
    // Persist meaningful effort immediately: leaving after five actual answers
    // keeps the streak, while only an unskipped finished Run fills the goal.
    recordSession({ sessionId: next.id, mode: next.mode, startedAt: next.startedAt, answered: totals.answered, correct: totals.correct, completed: false, scopeKey: encodeScope(next.scope), difficultyId: next.pack.difficulty.id }, { timeZone: state.timeZone });
    if (next.assignmentId) {
      recordAssignmentProgress(next.assignmentId, { answered: totals.answered, correct: totals.correct, bySkill: totals.bySkill, completed: false });
    }
    setSession(next);
  }

  function advance(skip = false) {
    if (!session || session.finished || (!skip && !session.result)) return;
    const key = `${session.id}:${session.index}`;
    if (skip && handled.current === key) return;
    if (skip) handled.current = key;
    const next = { ...session, skipped: session.skipped + Number(skip), result: null, index: session.index + 1 };
    if (next.index >= next.queue.length) finish(next);
    else { handled.current = null; stepStarted.current = Date.now(); setSession(next); }
  }

  if (parsed.error) return <div className="ww-page"><section className="ww-panel"><h1>Practice link</h1><p role="alert">{parsed.error}</p><Link className="ww-button" href="/play">Choose a new practice</Link></section></div>;
  if (!activePack) return <div className="ww-page"><section className="ww-panel"><h1>Choose a content pack</h1><p>{requestedPack ? "This pack is unavailable or disabled. Enable it explicitly before starting." : "No content pack is enabled yet. Reviewed content will appear when available; test fixtures need an explicit choice."}</p><Link className="ww-button ww-button--primary" href="/play/packs">Open content packs</Link></section></div>;
  if (!session) return <div className="ww-page"><section className="ww-panel"><p className="ww-eyebrow">{mode === "quick" ? "One-minute practice" : mode === "free" ? "Free practice" : "Your Daily Run"}</p><h1>Your practice preview</h1><p>{plan.reasonText}</p><p>{plan.tasks.length} eligible task{plan.tasks.length === 1 ? "" : "s"} · about {Math.max(1, Math.ceil(plan.tasks.length / 4))} min</p><p className="ww-muted">{plan.tasks.length < (mode === "quick" ? 5 : parsed.scope.count ?? 20) ? "This scope has fewer eligible items, so this is a shorter run. " : ""}The weakest or most overdue dimension chooses each task. Missed forms can return in a different format after a few other cards.</p>{mode === "quick" ? <p>Answer at least five tasks to keep your streak. Your full Run goal stays separate.</p> : null}{activePack.fixture || activePack.pack.review.status !== "reviewed" ? <p className="ww-muted">Explicitly enabled test content · pending German review.</p> : null}<div className="ww-actions"><button type="button" className="ww-button ww-button--primary" disabled={!plan.tasks.length || !state.hydrated} onClick={() => begin()}>Start {mode === "quick" ? "Quick review" : mode === "free" ? "practice" : "Daily Run"}</button><Link className="ww-button" href="/play">Back to Today</Link></div></section></div>;
  if (session.finished) {
    const results = deriveRunResults(session.answers, session.history);
    const finisher = session.finisher ? [] : createFinisher(session.unresolved, capabilities);
    const names = results.corrected.map(id => session.pack.pack.items.find(item => item.id === id)).map(item => item?.type === "lexeme" ? item.lemma : "a form");
    return <div className="ww-page"><section className="ww-panel"><p className="ww-eyebrow">Personal change</p><h1>{session.skipped > 0 ? "Practice finished with skips" : session.finisher ? "Finisher complete" : session.mode === "quick" ? "Quick review complete" : session.mode === "free" ? "Practice complete" : "Daily Run complete"}</h1><p>You remembered {results.rememberedFromLastWeek} dimension{results.rememberedFromLastWeek === 1 ? "" : "s"} from last week.</p><p>{names.length ? <>You fixed <span lang={session.pack.language.locale}>{names.join(" · ")}</span>.</> : "Every answer gives the next run a better starting point."}</p><p>{results.correct} correct from {results.answered} answers{session.skipped ? ` · ${session.skipped} skipped without a grade` : ""}.</p>{session.skipped > 0 ? <p>Your answers are saved. Skipped tasks keep this session from completing your Run goal.</p> : null}{session.mode === "run" && results.answered < 5 ? <p>This short practice is saved. A meaningful streak session needs at least five answers; your Run goal stays open.</p> : null}{session.mode === "quick" ? <p>{results.answered >= 5 ? "This meaningful review keeps your streak. The full Run goal is still separate." : "A streak session needs at least five answers. This shorter practice is still saved."}</p> : null}<div className="ww-actions"><Link className="ww-button ww-button--primary" href="/play">Back to Today</Link>{finisher.length ? <button type="button" className="ww-button" onClick={() => begin(finisher, true)}>Fix these {finisher.length} words · optional</button> : null}</div>{session.unresolved.length && !finisher.length ? <p className="ww-muted">Unresolved forms stay in your review history for another day.</p> : null}</section></div>;
  }
  return <div className="ww-page"><header className="ww-page-heading"><div className="ww-run-progress"><span>{session.finisher ? "Optional finisher" : session.mode === "quick" ? "Quick review" : session.mode === "free" ? "Free practice" : "Daily Run"}</span><span>{session.index + 1} / {session.queue.length}</span><progress aria-label="Practice progress" value={session.index} max={session.queue.length} /></div>{currentRunTask?.reason === "comeback" ? <p className="ww-muted">A different way to recall the same dimension.</p> : null}</header>{task ? <TaskRenderer key={task.id} task={task} onAnswer={answer} result={session.result} /> : <section className="ww-panel"><p>This task is unavailable with the current source content.</p></section>}<div className="ww-run-next">{session.result ? <><p className="ww-muted" role="status">{session.result.correct && session.answers.at(-1)?.corrected ? "You fixed this ✓" : "Your answer is saved."}</p><button type="button" className="ww-button ww-button--primary" onClick={() => advance()}>{session.index + 1 >= session.queue.length ? "See results" : "Next task"}</button></> : !task || task.question.audio || task.question.audioSequence?.length ? <button type="button" className="ww-button" onClick={() => advance(true)}>{task ? "Audio won't play? Skip this task" : "Skip unavailable task"}</button> : null}</div></div>;
}
