"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDailyRun, createFinisher, deriveRunResults, enqueueComeback, calendarDate, type DailyRunPlan, type LearningCapability, type LearningAnswer, type LearningSession, type RunTask } from "../../../../packages/learning/src/wortwerk/index.js";
import { createChallenge, advanceChallenge, answerChallenge, challengeRemainingSeconds, derivePersonalBest, selectDailyPuzzle, boundedRunBonus, type ChallengeState, type PersonalBest, type PuzzleOutcome } from "../../../../packages/learning/src/wortwerk/challenges.js";
import { seededRng } from "../../../../packages/wortwerk/src/random.js";
import type { GradeResult, TaskAnswer } from "../../../../packages/wortwerk/src/tasks.js";
import type { PlayPack } from "@/lib/wortwerk/content.server";
import { decodeScope, encodeScope, ScopeLinkError, type PlayScope } from "@/lib/wortwerk/links";
import { materializeTask, playableCapabilities, templateFor } from "@/lib/wortwerk/runtime";
import { createUuidV7Factory, wortwerkStore } from "@/lib/wortwerk/store";
import { parseWortwerkEvidence, recordAnswer, recordAssignmentProgress, recordSession } from "@/lib/wortwerk/learning-state";
import { useWortwerkState } from "@/lib/wortwerk/use-wortwerk";
import { usePlayContent } from "./PlayProvider";
import { TaskRenderer, type TaskAnswerEvidence } from "./TaskRenderer";
import { TaskFeedback } from "./TaskFeedback";
import { PuzzleShare } from "./ChallengeLinks";

const newSessionId = createUuidV7Factory();
const dimensionKey = (task: RunTask) => JSON.stringify([task.packId, task.itemId, task.dimension]);
type RunKind = "run" | "quick" | "free" | "blitz" | "boss" | "puzzle";
export type RunPlayerProps = { modeOverride?: "blitz" | "puzzle" };
const WHOLE_PACK_SCOPE: PlayScope = { v: 1 };
const scopeKey = (packId: string, scope: PlayScope) => `${packId}:${encodeScope(scope)}`;
const runName = (kind: RunKind) => kind === "blitz" ? "Blitz" : kind === "boss" ? "Boss" : kind === "puzzle" ? "Daily puzzle" : kind === "quick" ? "Quick review" : kind === "free" ? "Free practice" : "Daily Run";

function puzzlePlan(capabilities: readonly LearningCapability[], packId: string, date: string): DailyRunPlan {
  const eligible = capabilities.map(capability => ({ ...capability, templates: capability.templates.filter(template => template.assessment !== "self") })).filter(capability => capability.templates.length);
  const ids = selectDailyPuzzle(packId, eligible.map(capability => capability.itemId), date);
  const tasks: RunTask[] = ids.flatMap(itemId => {
    const capability = eligible.find(candidate => candidate.itemId === itemId)!;
    const recognition = capability.templates.filter(template => template.format === "recognition");
    const templates = [...(recognition.length ? recognition : capability.templates)].sort((a, b) => a.id.localeCompare(b.id, "en"));
    const chosen = templates[Math.floor(seededRng(`${packId}:${date}:${itemId}`)() * templates.length)];
    return chosen ? [{ packId, itemId, dimension: chosen.dimension, templateId: chosen.id, skill: chosen.skill, format: chosen.format, reason: "new" as const }] : [];
  });
  return { tasks, preview: { new: tasks.length, reviews: 0, tricky: 0, byDimension: {} }, reasonText: tasks.length === 6 ? "The same six items for everyone using this pack today" : "This pack needs six eligible objective tasks for the daily puzzle" };
}

function boundedBlitzQueue(tasks: readonly RunTask[]): RunTask[] {
  if (!tasks.length) return [];
  const queue: RunTask[] = [];
  for (let index = 0; index < 200; index++) {
    const previous = queue.slice(-2);
    const blocked = previous.length === 2 && previous[0]?.templateId === previous[1]?.templateId ? previous[0]!.templateId : null;
    const candidate = Array.from({ length: tasks.length }, (_, offset) => tasks[(index + offset) % tasks.length]!).find(task => task.templateId !== blocked);
    if (!candidate) break;
    queue.push(candidate);
  }
  return queue;
}

type RunState = {
  id: string; kind: RunKind; challenge: ChallengeState | null; ghost: PersonalBest | null; puzzleDate: string | null; puzzleOutcomes: PuzzleOutcome[]; pack: PlayPack; scope: PlayScope; mode: LearningSession["mode"]; assignmentId?: string;
  startedAt: string; queue: RunTask[]; index: number; result: GradeResult | null;
  answers: LearningAnswer[]; history: LearningAnswer[]; unresolved: RunTask[]; scheduled: string[];
  skipped: number; finisher: boolean; finished: boolean; bonusOf?: string;
};

export function RunPlayer({ modeOverride }: RunPlayerProps = {}) {
  const query = useSearchParams().toString();
  return <RunPractice key={`${modeOverride ?? "query"}:${query}`} query={query} modeOverride={modeOverride} />;
}

function RunPractice({ query, modeOverride }: { query: string; modeOverride: "blitz" | "puzzle" | undefined }) {
  const content = usePlayContent();
  const params = useMemo(() => new URLSearchParams(query), [query]);
  const requestedMode = params.get("mode");
  const kind: RunKind = modeOverride ?? (requestedMode === "boss" || requestedMode === "blitz" || requestedMode === "puzzle" || requestedMode === "quick" || requestedMode === "free" ? requestedMode : "run");
  const mode: LearningSession["mode"] = kind === "puzzle" ? "free" : kind;
  const unitId = kind === "boss" ? params.get("unit") : null;
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
  const liveSession = useRef<RunState | null>(null);
  const [timerInstant, setTimerInstant] = useState(0);
  const saveSession = useCallback((next: RunState) => { liveSession.current = next; setSession(next); }, []);
  const activePack = session?.pack ?? selected;
  const chosenScope = useMemo<PlayScope>(() => {
    if (kind === "puzzle") return WHOLE_PACK_SCOPE;
    if (!unitId || !activePack) return parsed.scope;
    const ids = activePack.pack.items.filter(item => item.unitId === unitId && (!parsed.scope.items || parsed.scope.items.includes(item.id))).map(item => item.id);
    return { ...parsed.scope, items: ids };
  }, [kind, unitId, activePack, parsed.scope]);
  const activeScope = session?.scope ?? chosenScope;
  const capabilities = useMemo(() => activePack ? playableCapabilities(activePack.pack, activePack.language, activePack.difficulty, activeScope).filter(capability => !unitId || activePack.pack.items.some(item => item.id === capability.itemId && item.unitId === unitId)) : [], [activePack, activeScope, unitId]);
  const state = useWortwerkState({ capabilities });
  const date = calendarDate(state.now, state.timeZone);
  const count = mode === "quick" ? 5 : parsed.scope.count ?? 20;
  const plan = useMemo(() => kind === "puzzle" ? puzzlePlan(capabilities, activePack?.pack.id ?? "unavailable", date) : createDailyRun({ capabilities, answers: state.answers, now: state.now, count, mode }), [kind, capabilities, activePack?.pack.id, date, state.answers, state.now, count, mode]);
  const ghost = activePack && (kind === "blitz" || kind === "boss") ? derivePersonalBest(state.sessions, { mode: kind, scopeKey: scopeKey(activePack.pack.id, activeScope), difficultyId: activePack.difficulty.id, now: state.now }) : null;
  const unit = activePack?.pack.units.find(candidate => candidate.id === unitId);
  const handled = useRef<string | null>(null);
  const completed = useRef(new Set<string>());
  const stepStarted = useRef(0);
  const currentRunTask = session?.queue[session.index];
  const sessionId = session?.id;
  const sessionIndex = session?.index;
  const sessionPack = session?.pack;
  const task = useMemo(() => {
    if (!sessionPack || !currentRunTask || sessionId === undefined || sessionIndex === undefined) return null;
    const seed = session?.kind === "puzzle" ? `${sessionPack.pack.id}:${session.puzzleDate}:${sessionIndex}` : `${sessionId}:${sessionIndex}`;
    const generated = materializeTask(currentRunTask, sessionPack.pack, sessionPack.language, sessionPack.difficulty, seed);
    return generated ? { ...generated, id: `${sessionId}:${sessionIndex}` } : null;
  }, [sessionId, sessionIndex, sessionPack, session?.kind, session?.puzzleDate, currentRunTask]);

  function begin(queue: RunTask[] = plan.tasks, finisher = false, bonusOf?: string) {
    const extra = finisher || bonusOf !== undefined;
    const pack = extra ? session?.pack : selected;
    if (!pack || !queue.length) return;
    const started = new Date();
    const startedAt = started.toISOString();
    const puzzleStartedDate = !extra && kind === "puzzle" ? calendarDate(started, state.timeZone) : null;
    const actualQueue = puzzleStartedDate ? puzzlePlan(capabilities, pack.pack.id, puzzleStartedDate).tasks : !extra && kind === "blitz" ? boundedBlitzQueue(queue) : queue;
    if (!actualQueue.length) return;
    const id = newSessionId();
    const assignment = extra ? undefined : params.get("assignment")?.trim();
    const next: RunState = {
      id, kind: extra ? "free" : kind, challenge: !extra && (kind === "blitz" || kind === "boss") ? createChallenge({ mode: kind, now: started, total: actualQueue.length }) : null, ghost: extra ? null : ghost, puzzleDate: puzzleStartedDate, puzzleOutcomes: Array.from({ length: 6 }, () => "unanswered"), pack, scope: activeScope, mode: extra ? "free" : mode, startedAt, queue: [...actualQueue], index: 0,
      result: null, answers: [], history: parseWortwerkEvidence(wortwerkStore.getSnapshot().events).answers,
      unresolved: finisher ? [...(session?.unresolved ?? [])] : [], scheduled: [], skipped: 0, finisher, finished: false,
      ...(assignment ? { assignmentId: assignment } : {}),
      ...(bonusOf ? { bonusOf } : {}),
    };
    recordSession({ sessionId: id, mode: next.mode, startedAt, completedAt: startedAt, answered: 0, correct: 0, completed: false, scopeKey: scopeKey(next.pack.pack.id, next.scope), difficultyId: pack.difficulty.id, ...(bonusOf ? { bonusOf } : {}) }, { timeZone: state.timeZone });
    handled.current = null;
    stepStarted.current = Date.now();
    setTimerInstant(started.getTime());
    saveSession(next);
  }

  const finish = useCallback((next: RunState) => {
    if (!completed.current.has(next.id)) {
      completed.current.add(next.id);
      const results = deriveRunResults(next.answers, next.history);
      const complete = next.challenge ? next.challenge.mode === "blitz" || (next.challenge.endReason === "complete" && next.skipped === 0) : next.skipped === 0;
      recordSession({ sessionId: next.id, mode: next.mode, startedAt: next.startedAt, answered: results.answered, correct: results.correct, completed: complete, scopeKey: scopeKey(next.pack.pack.id, next.scope), difficultyId: next.pack.difficulty.id, ...(next.bonusOf ? { bonusOf: next.bonusOf } : {}) }, { timeZone: state.timeZone });
      if (next.assignmentId) recordAssignmentProgress(next.assignmentId, { answered: results.answered, correct: results.correct, bySkill: results.bySkill, completed: complete && next.skipped === 0 && results.answered >= next.queue.length });
      if (next.kind === "blitz" || next.kind === "boss" || next.kind === "puzzle") wortwerkStore.appendEvent("challenge.completed", { sessionId: next.id, kind: next.kind, scopeKey: scopeKey(next.pack.pack.id, next.scope), difficultyId: next.pack.difficulty.id, endReason: next.challenge?.endReason ?? "complete", strikes: next.challenge?.strikes ?? 0, puzzleDate: next.puzzleDate, outcomes: next.kind === "puzzle" ? next.puzzleOutcomes : [], completed: complete });
    }
    saveSession({ ...next, finished: true });
  }, [state.timeZone, saveSession]);

  useEffect(() => {
    if (session?.challenge?.mode !== "blitz" || session.finished) return;
    const tick = () => {
      const current = liveSession.current;
      if (!current?.challenge || current.finished) return;
      const challenge = advanceChallenge(current.challenge, new Date());
      liveSession.current = { ...current, challenge };
      setTimerInstant(Date.parse(challenge.lastObservedAt));
      if (challenge.status === "finished") finish({ ...current, challenge });
    };
    const timer = window.setInterval(tick, 250);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    tick();
    return () => { window.clearInterval(timer); window.removeEventListener("focus", tick); document.removeEventListener("visibilitychange", tick); };
  }, [session?.id, session?.challenge?.mode, session?.finished, finish]);

  function answer(raw: TaskAnswer, evidence?: TaskAnswerEvidence) {
    const session = liveSession.current;
    const submittedAt = new Date();
    if (session?.challenge) {
      const challenge = advanceChallenge(session.challenge, submittedAt);
      if (challenge.status === "finished") { finish({ ...session, challenge }); return; }
    }
    if (!session || !task || !currentRunTask || session.result || session.finished) return;
    if (task.id !== `${session.id}:${session.index}`) return;
    const key = `${session.id}:${session.index}`;
    if (handled.current === key) return;
    const template = templateFor(task.templateId);
    if (!template) return;
    handled.current = key;
    const graded = template.grade(task, raw, session.pack.language);
    const result = evidence?.hinted ? { ...graded, hinted: true } : graded;
    const missedKey = dimensionKey(currentRunTask);
    const corrected = result.correct && !result.hinted && session.unresolved.some(miss => dimensionKey(miss) === missedKey);
    const event = recordAnswer(task, result, { sessionId: session.id, corrected, latencyMs: Math.max(0, Date.now() - stepStarted.current), timeZone: state.timeZone });
    const savedAnswer = parseWortwerkEvidence([event]).answers[0];
    if (!savedAnswer) throw new Error("Saved answer could not be rebuilt");
    let queue = session.queue;
    let unresolved = session.unresolved.filter(miss => dimensionKey(miss) !== missedKey);
    const scheduled = [...session.scheduled];
    if (!result.correct || result.hinted) {
      unresolved = [...unresolved, currentRunTask];
      if (!session.finisher && !session.bonusOf && session.kind !== "puzzle" && !session.challenge && !scheduled.includes(missedKey)) {
        queue = enqueueComeback(queue, session.index, currentRunTask, capabilities, `${session.id}:${session.index}`).tasks;
        scheduled.push(missedKey);
      }
    }
    const answers = [...session.answers, savedAnswer];
    const challenge = session.challenge ? answerChallenge(session.challenge, { eventId: event.id, correct: result.correct }, submittedAt) : null;
    const puzzleOutcomes = [...session.puzzleOutcomes];
    if (session.kind === "puzzle") puzzleOutcomes[session.index] = result.outcome;
    const next = { ...session, queue, unresolved, scheduled, answers, result, challenge, puzzleOutcomes };
    const totals = deriveRunResults(answers, next.history);
    // Persist meaningful effort immediately: leaving after five actual answers
    // keeps the streak, while only an unskipped finished Run fills the goal.
    recordSession({ sessionId: next.id, mode: next.mode, startedAt: next.startedAt, answered: totals.answered, correct: totals.correct, completed: false, scopeKey: scopeKey(next.pack.pack.id, next.scope), difficultyId: next.pack.difficulty.id, ...(next.bonusOf ? { bonusOf: next.bonusOf } : {}) }, { timeZone: state.timeZone });
    if (next.assignmentId) {
      recordAssignmentProgress(next.assignmentId, { answered: totals.answered, correct: totals.correct, bySkill: totals.bySkill, completed: false });
    }
    if (challenge?.status === "finished") finish(next); else saveSession(next);
  }

  function advance(skip = false) {
    const session = liveSession.current;
    if (session?.challenge) {
      const challenge = advanceChallenge(session.challenge, new Date());
      if (challenge.status === "finished") { finish({ ...session, challenge }); return; }
    }
    if (!session || session.finished || (!skip && !session.result)) return;
    const key = `${session.id}:${session.index}`;
    if (skip && handled.current === key) return;
    if (skip) handled.current = key;
    const next = { ...session, skipped: session.skipped + Number(skip), result: null, index: session.index + 1 };
    if (next.index >= next.queue.length) finish({ ...next, challenge: next.challenge ? { ...next.challenge, status: "finished", endReason: "complete" } : null });
    else { handled.current = null; stepStarted.current = Date.now(); saveSession(next); }
  }

  if (parsed.error) return <div className="ww-page"><section className="ww-panel"><h1>Practice link</h1><p role="alert">{parsed.error}</p><Link className="ww-button" href="/play">Choose a new practice</Link></section></div>;
  if (!activePack) return <div className="ww-page"><section className="ww-panel"><h1>Choose a content pack</h1><p>{requestedPack ? "This pack is unavailable or disabled. Enable it explicitly before starting." : "No content pack is enabled yet. Reviewed content will appear when available; test fixtures need an explicit choice."}</p><Link className="ww-button ww-button--primary" href="/play/packs">Open content packs</Link></section></div>;
  if (!session) return <div className="ww-page"><section className="ww-panel">
    <p className="ww-eyebrow">{runName(kind)}{unit ? ` · ${unit.title}` : ""}</p><h1>Your practice preview</h1>
    <p>{plan.reasonText}</p><p>{plan.tasks.length} eligible task{plan.tasks.length === 1 ? "" : "s"}{kind === "blitz" ? " · 60 seconds · 3 strikes · up to 200 tasks, with repeats" : kind === "boss" ? " · 3 strikes" : kind === "puzzle" ? ` · ${date}` : ` · about ${Math.max(1, Math.ceil(plan.tasks.length / 4))} min`}</p>
    {kind === "puzzle" ? <p>This puzzle uses the whole pack and the local calendar date. Your study scope and progress do not change its six items.</p> : kind === "blitz" || kind === "boss" ? <p>The clock and strikes apply only to challenge modes. Every answer still contributes to your practice history.</p> : <p className="ww-muted">{plan.tasks.length < count ? "This scope has fewer eligible items, so this is a shorter run. " : ""}The weakest or most overdue dimension chooses each task. Missed forms can return in a different format after a few other cards.</p>}
    {ghost ? <p>Personal best in this scope: {ghost.score} correct from {ghost.answered} answers.</p> : kind === "blitz" ? <p>No personal best in this exact scope and difficulty yet.</p> : null}
    {kind === "quick" ? <p>Answer at least five tasks to keep your streak. Your full Run goal stays separate.</p> : null}
    {activePack.fixture || activePack.pack.review.status !== "reviewed" ? <p className="ww-muted">Explicitly enabled test content · pending German review.</p> : null}
    <div className="ww-actions"><button type="button" className="ww-button ww-button--primary" disabled={!plan.tasks.length || !state.hydrated} onClick={() => begin()}>Start {runName(kind)}</button><Link className="ww-button" href="/play">Back to Today</Link></div>
  </section></div>;
  if (session.finished) {
    const results = deriveRunResults(session.answers, session.history);
    const finisher = session.finisher || session.bonusOf || session.challenge || session.kind === "puzzle" ? [] : createFinisher(session.unresolved, capabilities);
    const names = results.corrected.map(id => session.pack.pack.items.find(item => item.id === id)).map(item => item?.type === "lexeme" ? item.lemma : "a form");
    const offer = boundedRunBonus(session.id);
    const bonusTasks = session.kind === "run" && !session.skipped && !finisher.length && results.answered >= 5 && offer.eligible
      ? createDailyRun({ capabilities, answers: state.answers, now: state.now, count: 3, mode: "free" }).tasks : [];
    const heading = session.bonusOf ? "Bonus round complete" : session.kind === "blitz" ? "Blitz complete" : session.kind === "boss" ? session.challenge?.endReason === "complete" && !session.skipped ? "Boss complete" : "Boss round finished" : session.skipped > 0 ? "Practice finished with skips" : session.kind === "puzzle" ? "Daily puzzle complete" : session.finisher ? "Finisher complete" : session.mode === "quick" ? "Quick review complete" : session.mode === "free" ? "Practice complete" : "Daily Run complete";
    return <div className="ww-page"><section className="ww-panel"><p className="ww-eyebrow">Personal change</p><h1>{heading}</h1>
      {session.challenge ? <p>{session.challenge.endReason === "time" ? "The 60-second round has ended." : session.challenge.endReason === "strikes" ? "Three strikes. Your answers are saved for later practice." : session.kind === "blitz" ? `The finite ${session.queue.length}-task cap was reached.` : "You finished the finite Boss set."}</p> : null}
      <p>You remembered {results.rememberedFromLastWeek} dimension{results.rememberedFromLastWeek === 1 ? "" : "s"} from last week.</p>
      <p>{names.length ? <>You fixed <span lang={session.pack.language.locale}>{names.join(" · ")}</span>.</> : "Every answer gives the next run a better starting point."}</p>
      <p>{results.correct} correct from {results.answered} answers{session.skipped ? ` · ${session.skipped} skipped without a grade` : ""}.</p>
      {session.kind === "blitz" && session.ghost ? <p>Personal best before this round: {session.ghost.score} correct. {results.correct > session.ghost.score ? "You set a new best in this scope and difficulty." : "The comparison uses this exact scope and difficulty."}</p> : null}
      {session.kind === "puzzle" && session.puzzleDate ? <PuzzleShare date={session.puzzleDate} outcomes={session.puzzleOutcomes} /> : null}
      {session.bonusOf ? <p>Your optional three-task bonus is saved. Double earned answer XP adds up to 30 extra XP; your Daily Run goal stays complete.</p> : null}
      {session.skipped > 0 && !session.challenge ? <p>Your answers are saved. Skipped tasks keep this session from completing your Run goal.</p> : null}
      {session.mode === "run" && results.answered < 5 ? <p>This short practice is saved. A meaningful streak session needs at least five answers; your Run goal stays open.</p> : null}
      {session.mode === "quick" ? <p>{results.answered >= 5 ? "This meaningful review keeps your streak. The full Run goal is still separate." : "A streak session needs at least five answers. This shorter practice is still saved."}</p> : null}
      {session.challenge && session.result && task ? <TaskFeedback feedback={task.feedback} result={session.result} lang={task.question.lang} /> : null}
      <div className="ww-actions"><Link className="ww-button ww-button--primary" href="/play/map">Back to map</Link><Link className="ww-button" href="/play">Back to Today</Link>{bonusTasks.length === 3 ? <button type="button" className="ww-button" onClick={() => begin(bonusTasks, false, session.id)}>Optional bonus · 3 tasks · up to 30 extra XP</button> : null}{finisher.length ? <button type="button" className="ww-button" onClick={() => begin(finisher, true)}>Fix these {finisher.length} words · optional</button> : null}</div>
      {session.unresolved.length && !finisher.length ? <p className="ww-muted">Unresolved forms stay in your review history for another day.</p> : null}
    </section></div>;
  }
  const remaining = session.challenge ? challengeRemainingSeconds(session.challenge, new Date(timerInstant || Date.now())) : null;
  return <div className="ww-page"><header className="ww-page-heading"><div className="ww-run-progress"><span>{session.bonusOf ? "Optional bonus · 3 tasks" : session.finisher ? "Optional finisher" : runName(session.kind)}{unit ? ` · ${unit.title}` : ""}</span><span>{session.index + 1} / {session.queue.length}</span><progress aria-label="Practice progress" value={session.index} max={session.queue.length} /></div>
    {remaining !== null ? <p role="timer" aria-label="Blitz time remaining">{remaining} seconds</p> : null}
    {session.challenge ? <p aria-label={`Strikes: ${session.challenge.strikes} of 3`}>Strikes {session.challenge.strikes} / 3</p> : null}
    {session.ghost ? <p className="ww-muted">Ghost: {session.ghost.score} correct in this scope and difficulty.</p> : null}
    {currentRunTask?.reason === "comeback" ? <p className="ww-muted">A different way to recall the same dimension.</p> : null}
  </header>{task ? <TaskRenderer key={task.id} task={task} onAnswer={answer} result={session.result} /> : <section className="ww-panel"><p>This task is unavailable with the current source content.</p></section>}
    <div className="ww-run-next">{session.result ? <><p className="ww-muted" role="status">{session.result.correct && session.answers.at(-1)?.corrected ? "You fixed this ✓" : "Your answer is saved."}</p><button type="button" className="ww-button ww-button--primary" onClick={() => advance()}>{session.index + 1 >= session.queue.length ? "See results" : "Next task"}</button></> : !task || task.question.audio || task.question.audioSequence?.length ? <button type="button" className="ww-button" onClick={() => advance(true)}>{task ? "Audio won't play? Skip this task" : "Skip unavailable task"}</button> : null}</div>
  </div>;
}
