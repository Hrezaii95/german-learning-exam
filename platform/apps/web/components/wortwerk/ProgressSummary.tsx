"use client";

import "./wortwerk.css";
import "./daily.css";

import { useMemo } from "react";
import { deriveProgress, summarizeProgress } from "../../../../packages/learning/src/wortwerk/index.js";
import { selectedPanelMetadata } from "@/lib/wortwerk/panel-catalog";
import { playableCapabilities } from "@/lib/wortwerk/runtime";
import { useWortwerkState } from "@/lib/wortwerk/use-wortwerk";
import { usePlayContent } from "./PlayProvider";

export function ProgressSummary() {
  const content = usePlayContent();
  const selected = content?.selectedPack;
  const capabilities = useMemo(() => selected ? playableCapabilities(selected.pack, selected.language, selected.difficulty, content?.scope) : [], [selected, content?.scope]);
  const state = useWortwerkState({ capabilities });
  const cached = useMemo(() => selectedPanelMetadata(state.snapshot), [state.snapshot]);
  const available = !!selected || !content && cached.status === "ready";
  const progress = useMemo(() => !content && cached.status === "ready"
    ? deriveProgress(cached.pack!.capabilities, state.answers, state.now) : state.progress,
  [content, cached, state.answers, state.now, state.progress]);
  const summary = !content && cached.status === "ready" ? summarizeProgress(progress) : state.summary;
  const percent = (value: number | null) => value === null ? "Not enough evidence yet" : `${Math.round(value * 100)}%`;
  return <section id="progress" className="ww-panel" aria-labelledby="ww-progress-heading"><p className="ww-eyebrow">From your answer history</p><h2 id="ww-progress-heading">Your progress</h2>{available ? <dl className="ww-stats"><div><dt>Items complete</dt><dd>{summary.complete} / {summary.items}</dd></div><div><dt>Dimensions secured</dt><dd>{summary.secured} / {summary.segments}</dd></div><div><dt>Due dimensions</dt><dd>{summary.due}</dd></div><div><dt>Current recall strength</dt><dd>{Math.round(summary.strength * 100)}%</dd></div><div><dt>Items practised</dt><dd>{summary.practised ?? 0}</dd></div><div><dt>Self-check practice</dt><dd>{summary.selfPractice ?? 0} {summary.selfPractice === 1 ? "attempt" : "attempts"}</dd></div></dl> : <p>Pack progress is unavailable here until you open practice to refresh your current selection. Your answer history is still saved.</p>}<p className="ww-muted">A secured milestone stays yours. Recall strength and secured counts use objective tasks. Self-check practice is recorded separately.</p><h3>Your learning, on this device</h3><dl className="ww-stats"><div><dt>7-day return</dt><dd>{state.metrics.return7Day === null ? "Available after a week" : state.metrics.return7Day ? "You returned" : "No return recorded yet"}</dd></div><div><dt>Runs finished</dt><dd>{percent(state.metrics.runCompletion)}</dd></div><div><dt>Recall after a week</dt><dd>{percent(state.metrics.delayedRecall.accuracy)}</dd></div><div><dt>Practice XP</dt><dd>{state.rewards.xp}</dd></div></dl><p className="ww-muted">Based on your saved evidence, not an exam prediction. {state.metrics.delayedRecall.tested} delayed recall attempt{state.metrics.delayedRecall.tested === 1 ? "" : "s"} recorded.</p>{state.snapshot.storageStatus !== "persistent" && state.hydrated ? <p role="status">{state.snapshot.storageStatus === "future-version" ? "This saved data needs a newer app. New practice stays in memory until you update." : "Storage is unavailable. New progress stays in memory for this tab."}</p> : null}</section>;
}
