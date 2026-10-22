"use client";

import "./wortwerk.css";
import "./daily.css";

import Link from "next/link";
import { useMemo } from "react";
import { createDailyRun, deriveProgress, summarizeProgress } from "../../../../packages/learning/src/wortwerk/index.js";
import { playableCapabilities } from "@/lib/wortwerk/runtime";
import { playHref } from "@/lib/wortwerk/links";
import { useWortwerkState } from "@/lib/wortwerk/use-wortwerk";
import { panelItemLabel, selectedPanelMetadata } from "@/lib/wortwerk/panel-catalog";
import { usePlayContent } from "./PlayProvider";

const DEFAULT_SCOPE = { v: 1 as const };
const EMPTY_CAPABILITIES = Object.freeze([]);

export function TodayPanel() {
  const content = usePlayContent();
  const selected = content?.selectedPack;
  const providerScope = content?.scope ?? DEFAULT_SCOPE;
  const providerCapabilities = useMemo(() => selected ? playableCapabilities(selected.pack, selected.language, selected.difficulty, providerScope) : [], [selected, providerScope]);
  const state = useWortwerkState({ capabilities: providerCapabilities });
  const cached = useMemo(() => selectedPanelMetadata(state.snapshot), [state.snapshot]);
  const available = !!selected || !content && cached.status === "ready";
  const capabilities = useMemo(() => selected ? providerCapabilities : !content && cached.status === "ready" ? cached.pack!.capabilities : EMPTY_CAPABILITIES, [selected, providerCapabilities, content, cached]);
  const scope = selected ? providerScope : cached.scope;
  const packId = selected?.pack.id ?? cached.pack?.packId;
  const locale = selected?.language.locale ?? cached.pack?.locale;
  const progress = useMemo(() => selected ? state.progress : deriveProgress(capabilities, state.answers, state.now), [selected, state.progress, capabilities, state.answers, state.now]);
  const summary = selected ? state.summary : summarizeProgress(progress);
  const plan = createDailyRun({ capabilities, answers: state.answers, now: state.now, count: 20 });
  const next = progress.filter(item => !item.complete).sort((a, b) => Object.values(b.segments).filter(segment => segment.state === "secured").length - Object.values(a.segments).filter(segment => segment.state === "secured").length)[0];
  const segment = next && Object.values(next.segments).filter(part => part.state !== "secured").sort((a, b) => b.recallDates.length - a.recallDates.length)[0];
  const item = selected?.pack.items.find(item => item.id === next?.itemId);
  const label = item ? panelItemLabel(item) : next ? cached.pack?.labels[next.itemId] ?? "your next item" : "your next item";
  const packOption = packId ? { pack: packId } : {};


  return (
    <section className="ww-panel ww-today" aria-labelledby="ww-today-heading">
      <div className="ww-section-heading"><div><p className="ww-eyebrow">Your practice</p><h2 id="ww-today-heading">Today</h2></div><span className="ww-streak">{state.habit.streak} day{state.habit.streak === 1 ? "" : "s"} in your streak</span></div>
      <div className="ww-habit">
        <div className="ww-goal"><svg viewBox="0 0 100 100" role="img" aria-label={`Daily Run goal: ${Math.min(1, state.habit.goalRuns)} of 1`}><circle className="ww-goal__track" cx="50" cy="50" r="42" /><circle className="ww-goal__fill" cx="50" cy="50" r="42" pathLength="100" strokeDasharray={`${state.habit.goalComplete ? 100 : 0} 100`} /><text x="50" y="56" textAnchor="middle">{Math.min(1, state.habit.goalRuns)} / 1</text></svg><span>Daily Run goal</span></div>
        <div><ol className="ww-checkins" aria-label="Seven-day check-in">{state.habit.checkInDays.map(day => <li key={day.date} className={day.studied ? "ww-checkin ww-checkin--done" : "ww-checkin"} aria-label={`${day.date}: ${day.studied ? "studied" : day.frozen ? "freeze used" : "no session"}${day.today ? ", today" : ""}`}>{day.studied ? "✓" : day.frozen ? "◇" : "·"}</li>)}</ol><p className="ww-muted">{state.habit.freezes} earned freeze{state.habit.freezes === 1 ? "" : "s"} saved. A five-answer Quick review keeps your streak; the full Run goal is separate.</p></div>
      </div>
      {state.habit.doneForToday ? <p className="ww-done" role="status">Done for today. More practice is optional.</p> : null}
      {available ? <div className="ww-preview"><h3>Your next run</h3><p>{plan.reasonText}</p><p className="ww-muted">{plan.tasks.length} eligible task{plan.tasks.length === 1 ? "" : "s"} · about {Math.max(1, Math.ceil(plan.tasks.length / 4))} min{plan.tasks.length < 20 ? " · a shorter pack-sized run" : ""}</p></div> : <p>{cached.status === "stale" ? "Open practice to refresh the content for your current selection." : cached.status === "unsupported" ? "Open the current app to refresh your practice catalog." : "Your run preview is unavailable here until you open practice and choose a pack."} <Link href="/play/packs">Choose a pack</Link>.</p>}
      <div className="ww-actions">{available ? <Link className="ww-button ww-button--primary" href={playHref({ ...scope, count: 20 }, packOption)}>Preview Daily Run</Link> : null}<Link className="ww-button" href={playHref({ ...scope, count: 5 }, { ...packOption, mode: "quick" })}>Quick review · 1 min</Link></div>
      <div className="ww-milestone"><h3>Next milestone</h3>{segment ? <p>Secure {segment.dimension} for <span lang={locale}>{label}</span>. Recall it correctly on {Math.max(1, 2 - segment.recallDates.length)} more calendar day{segment.recallDates.length === 1 ? "" : "s"}.</p> : available && summary.items > 0 ? <p>Every available dimension is secured. Keep recall fresh when a due dot appears.</p> : available ? <p>No eligible dimensions in this selection. Choose another scope to find your next milestone.</p> : <p>Open practice to see the nearest milestone for your selected pack. Your saved answers remain available.</p>}</div>
      {!content ? <p><Link className="ww-button" href="/play">Open today&apos;s practice</Link></p> : null}
    </section>
  );
}
