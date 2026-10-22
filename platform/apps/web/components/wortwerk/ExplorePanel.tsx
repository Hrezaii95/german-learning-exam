"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PackItem } from "../../../../packages/content/src/types/packs.js";
import type { ItemProgress } from "../../../../packages/learning/src/wortwerk/types.js";
import { calendarDate, calendarDaysBetween, isCalendarDate } from "../../../../packages/learning/src/wortwerk/dates.js";
import { createDailyReminderIcs, deriveBadges, deriveCollection, deriveQuests, deriveReadiness, deriveSkillStrength, deriveUnitProgress, deriveWeeklyRecap, type SkillStrength } from "../../../../packages/learning/src/wortwerk/engagement-depth.js";
import { mapFieldValues } from "../../../../packages/wortwerk/src/distractors.js";
import type { PlayPack } from "@/lib/wortwerk/content.server";
import { withPagesBaseAssetPath, withPagesBasePath } from "@/lib/content/pages-base-path";
import { playHref, type PlayScope } from "@/lib/wortwerk/links";
import { playableCapabilities } from "@/lib/wortwerk/runtime";
import { safeSourceHref } from "@/lib/wortwerk/resources";
import { wortwerkStore } from "@/lib/wortwerk/store";
import { useWortwerkState } from "@/lib/wortwerk/use-wortwerk";
import { usePlayContent } from "./PlayProvider";
import { ProgressSummary } from "./ProgressSummary";
import { BackupPanel } from "./BackupPanel";
import { PersonalDeck } from "./PersonalDeck";
import { MilestonePanel } from "./MilestonePanel";

export type ExploreView = "map" | "journey" | "skills" | "progress";
const titles: Record<ExploreView, string> = { map: "Your map", journey: "Your journey", skills: "Practice by skill", progress: "Your learning" };
function itemLabel(item: PackItem): string { return item.type === "lexeme" ? item.article ? `${item.article} ${item.lemma}` : item.lemma : item.type === "sentence" ? item.text : "title" in item ? item.title : item.id; }
function percent(value: number): string { return `${Math.round(value * 100)}%`; }
function fieldLabel(value: string, selected: PlayPack): string {
  const gender = selected.language.genders.find(entry => entry.id === value);
  return gender ? `${gender.article} · ${gender.label}` : selected.language.pluralPatterns.find(entry => entry.id === value)?.label ?? value;
}
function downloadText(value: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ExplorePanel({ view }: { view: ExploreView }) {
  const content = usePlayContent();
  return <>
    {content?.selectedPack ? <ExploreContent key={`${content.selectedPack.pack.id}:${view}`} view={view} selected={content.selectedPack} scope={content.scope} /> : <div className="ww-page"><section className="ww-panel"><h1>{titles[view]}</h1><p>Choose an enabled content pack to explore your practice.</p><Link className="ww-button" href="/play/packs">Choose a pack</Link></section></div>}
    {view === "progress" ? <div className="ww-page"><BackupPanel /></div> : null}
  </>;
}
function ExploreContent({ view, selected, scope }: { view: ExploreView; selected: PlayPack; scope: PlayScope }) {
  const capabilities = useMemo(() => playableCapabilities(selected.pack, selected.language, selected.difficulty, scope), [selected, scope]);
  const allCapabilities = useMemo(() => playableCapabilities(selected.pack, selected.language, selected.difficulty), [selected]);
  const state = useWortwerkState({ capabilities: allCapabilities });
  const progress = new Map(state.progress.map(item => [item.itemId, item]));
  const inScope = new Set(capabilities.map(item => item.itemId));
  const items = selected.pack.items.filter(item => inScope.has(item.id));
  const cells = selected.pack.maps.flatMap(map => {
    const groups = new Map<string, { id: string; title: string; items: PackItem[] }>();
    for (const item of items) for (const row of mapFieldValues(item, map.rows)) for (const column of mapFieldValues(item, map.cols)) {
      const key = JSON.stringify([row, column]);
      const cell = groups.get(key) ?? { id: key, title: `${fieldLabel(row, selected)} × ${fieldLabel(column, selected)}`, items: [] };
      if (!cell.items.some(entry => entry.id === item.id)) cell.items.push(item);
      groups.set(key, cell);
    }
    return [...groups.values()].map(cell => ({ ...cell, mapId: map.id }));
  });
  const units = deriveUnitProgress(selected.pack, state.progress);
  const skills = deriveSkillStrength(capabilities, state.progress);
  const cards = deriveCollection(selected.pack, state.answers, state.progress, selected.difficulty, state.now);
  const recap = deriveWeeklyRecap(state.answers, state.sessions, state.now, state.timeZone);
  const quests = deriveQuests(state.answers, state.sessions, state.now, state.timeZone);
  const readiness = deriveReadiness(selected.pack, state.progress);
  const badges = deriveBadges(selected.pack, state.answers, state.progress, { now: state.now, streak: state.habit.longestStreak });
  const [reminderTime, setReminderTime] = useState("19:30");
  const [message, setMessage] = useState("");
  const [examDateDraft, setExamDateDraft] = useState<string | undefined>();
  const savedGoal = state.snapshot.docs.find(doc => doc.key === "exam.goal")?.value;
  const goal = savedGoal && typeof savedGoal === "object" && !Array.isArray(savedGoal) ? savedGoal as Record<string, unknown> : {};
  const examDate = examDateDraft ?? (goal.packId === selected.pack.id && isCalendarDate(goal.date) ? goal.date : "");
  const countdown = state.hydrated && isCalendarDate(examDate) ? calendarDaysBetween(calendarDate(state.now, state.timeZone), examDate) : null;

  function reminder() {
    try {
      const value = createDailyReminderIcs({ timeZone: state.timeZone, time: reminderTime, startDate: calendarDate(new Date(), state.timeZone), url: new URL(withPagesBasePath("/play"), window.location.origin).href });
      downloadText(value, "daily-practice.ics", "text/calendar;charset=utf-8");
      wortwerkStore.setDoc("reminder", { time: reminderTime, timeZone: state.timeZone, enabled: true });
      setMessage("Your calendar file is ready. Open it in your calendar to add the reminder.");
    } catch { setMessage("Choose a valid local time to create your calendar reminder."); }
  }

  return <div className="ww-page"><header className="ww-page-heading"><p className="ww-eyebrow">{selected.pack.cefr} · {selected.pack.title}</p><h1>{titles[view]}</h1><nav className="ww-actions" aria-label="Wortwerk views">{(["map", "journey", "skills", "progress"] as const).map(name => <Link key={name} className="ww-button" href={`/play/${name}`} aria-current={name === view ? "page" : undefined}>{titles[name]}</Link>)}<Link className="ww-button" href="/play">Today</Link></nav></header>
    {view === "map" ? <>
      <section className="ww-panel"><MilestonePanel selected={selected} scope={scope} capabilities={capabilities} progress={state.progress} answers={state.answers} now={state.now} headingLevel={2} /></section>
      {selected.pack.maps.map(map => <section key={map.id} className="ww-panel"><h2>{map.title}</h2><p className="ww-muted">Each token shows its supported dimensions. Secured milestones stay filled; a due dot marks a review.</p><div className="ww-stats">{cells.filter(cell => cell.mapId === map.id).map(cell => <section key={cell.id}><h3>{cell.title}</h3>{cell.items.map(item => <MapToken key={item.id} item={item} progress={progress.get(item.id)} selected={selected} scope={scope} />)}</section>)}</div>{!cells.some(cell => cell.mapId === map.id) ? <p>No items in the current scope match this authored map.</p> : null}</section>)}
      {!selected.pack.maps.length ? <section className="ww-panel"><p>This pack has no authored map yet.</p></section> : null}
    </> : null}
    {view === "journey" ? <><section className="ww-panel"><h2>{selected.pack.cefr} journey</h2><p>Can-do statements come from this pack. Unit mastery follows objective secured dimensions; self-check practice is recorded separately.</p><ol className="ww-pack-list">{units.map(unit => <li key={unit.unitId}><h3>{unit.title} · {unit.complete ? "complete" : unit.unlocked ? "in progress" : "next"}</h3><p>{unit.segments ? `${unit.secured} / ${unit.segments} objective dimensions secured · recall strength ${percent(unit.strength)}` : "Self-check practice"} · {unit.practised ?? 0} {unit.practised === 1 ? "item" : "items"} practised with self-checks</p><ul lang={selected.language.locale}>{unit.canDo.map(statement => <li key={statement}>{statement}</li>)}</ul><div className="ww-actions"><Link className="ww-button" href={playHref({ ...scope, items: selected.pack.items.filter(item => item.unitId === unit.unitId).map(item => item.id) }, { mode: "free", pack: selected.pack.id })}>Practise {unit.title}</Link>{unit.bossUnlocked ? <Link className="ww-button" href={`/play/run?${new URLSearchParams({ mode: "boss", unit: unit.unitId, pack: selected.pack.id })}`}>Unit boss · 3 strikes</Link> : <span className="ww-muted">{unit.segments ? "Unit boss unlocks at 80% secured." : "Practise this unit with its source models."}</span>}</div></li>)}</ol></section><section className="ww-panel"><h2>Story and challenges</h2><div className="ww-actions"><Link className="ww-button" href="/play/story">Story chapters</Link><Link className="ww-button" href="/play/blitz">Blitz · 60 seconds</Link><Link className="ww-button" href="/play/puzzle">Daily puzzle</Link><Link className="ww-button" href="/play/exam">Exam practice</Link></div></section></> : null}
    {view === "skills" ? <section className="ww-panel"><h2>Separate skills, from your evidence</h2>{skills.filter(skill => skill.assessment !== "self").length >= 3 ? <SkillsRadar skills={skills.filter(skill => skill.assessment !== "self")} /> : null}<div className="ww-stats">{skills.map(skill => <section key={skill.skill}><h3>{selected.language.grammarLabels[skill.skill] ?? skill.skill}</h3>{skill.assessment === "self" ? <p>Self-check practice · {skill.practised ?? 0} {skill.practised === 1 ? "item" : "items"} practised</p> : <><p>Level {skill.level} · {skill.secured} / {skill.segments} dimensions secured</p><label>Current recall strength <progress max={1} value={skill.strength} aria-label={`${skill.skill} recall strength`} style={{ width: "100%" }} />{percent(skill.strength)}</label></>}<p><Link className="ww-button" href={playHref({ ...scope, skills: [skill.skill] }, { mode: "free", pack: selected.pack.id })}>Practise this skill</Link></p></section>)}</div>{!skills.length ? <p>No playable skill is available in the current scope.</p> : null}</section> : null}
    {view === "progress" ? <>
      <ProgressSummary />
      <PersonalDeck />
      <section className="ww-panel"><h2>Your last seven days</h2><p>{recap.startDate} – {recap.endDate}</p><dl className="ww-stats"><div><dt>Answers reviewed</dt><dd>{recap.answered}</dd></div><div><dt>Active days</dt><dd>{recap.activeDays} / 7</dd></div><div><dt>Daily Runs complete</dt><dd>{recap.completedRuns}</dd></div><div><dt>Listening tasks</dt><dd>{recap.listeningTasks}</dd></div></dl><button className="ww-button" type="button" onClick={() => downloadText(`My practice · ${recap.startDate}–${recap.endDate}\n${recap.answered} answers · ${recap.activeDays}/7 days · ${recap.completedRuns} Daily Runs`, "practice-week.txt", "text/plain;charset=utf-8")}>Save weekly recap</button><p className="ww-muted">Year in review will use the same saved evidence when a full year is available.</p></section>
      <section className="ww-panel"><h2>Small quests for today</h2><ul>{quests.map(quest => <li key={quest.id}>{quest.complete ? "✓ " : "○ "}{quest.title} · {quest.progress} / {quest.target}</li>)}</ul><p className="ww-muted">Extra practice is optional. The daily goal and your streak stay separate.</p></section>
      <section className="ww-panel"><h2>Your collection</h2><p>{cards.filter(card => card.collected).length} / {cards.length} cards collected through unhinted retrieval.</p><div className="ww-stats">{cards.filter(card => card.collected).map(card => <article key={card.item.id} style={{ border: "1px solid var(--line, #e4ddd2)", borderStyle: card.rarity === "legendary" ? "double" : card.rarity === "rare" ? "dashed" : card.rarity === "uncommon" ? "dotted" : "solid", borderRadius: ".75rem", padding: ".75rem" }}><h3 lang={selected.language.locale}>{itemLabel(card.item)}</h3>{card.item.image ? <img src={withPagesBaseAssetPath(card.item.image)} width={100} height={100} alt="" loading="lazy" style={{ maxWidth: "100%", objectFit: "contain" }} /> : null}<p>{card.item.meaning}</p><p className="ww-muted">{card.rarity} · {card.gold ? "Gold" : card.complete ? "Complete" : "Learning"}</p>{safeSourceHref(card.item.sourceRef?.href) ? <Link href={safeSourceHref(card.item.sourceRef?.href)!}>Open source card</Link> : null}</article>)}</div><h3>Badges and titles</h3>{badges.length ? <ul>{badges.map(entry => <li key={entry.badge.id}><strong>{entry.earned ? "✓ " : "○ "}{entry.badge.title}</strong> · {entry.current} / {entry.target}{entry.badge.description ? <p>{entry.badge.description}</p> : null}{entry.titleAward ? <p>Title earned: {entry.titleAward}</p> : null}</li>)}</ul> : <p className="ww-muted">This pack has no authored badges yet.</p>}</section>
      <section className="ww-panel"><h2>Exam goal and readiness</h2><label className="ww-pack-select">Exam date<input type="date" value={examDate} onChange={event => setExamDateDraft(event.target.value)} style={{ minHeight: 44 }} /></label><button type="button" className="ww-button" disabled={!isCalendarDate(examDate)} onClick={() => wortwerkStore.setDoc("exam.goal", { packId: selected.pack.id, date: examDate })}>Save exam goal</button>{countdown !== null ? <p>{countdown >= 0 ? `${countdown} day${countdown === 1 ? "" : "s"} until your exam date.` : "Your saved exam date has passed. You can choose a new goal."}</p> : null}{readiness.map(section => <div key={section.section}><h3>{section.section}</h3>{section.segments ? <><progress max={1} value={section.strength} aria-label={`${section.section} practice evidence`} style={{ width: "100%" }} /><p>{percent(section.strength)} current objective practice strength.</p></> : <p>{section.selfCheck ? "Self-check practice" : "No objective practice evidence available"}.</p>}{section.selfCheck ? <p>{section.selfPractice ?? 0} {section.selfPractice === 1 ? "item" : "items"} practised with self-checks.</p> : null}</div>)}<p className="ww-muted">These meters describe practice evidence, not a predicted exam score. Open speaking and writing responses use self-checks.</p><Link className="ww-button" href="/play/exam">Open exam simulation</Link></section>
      <section className="ww-panel"><h2>One gentle reminder</h2><label className="ww-pack-select">Local time<input type="time" value={reminderTime} onChange={event => setReminderTime(event.target.value)} style={{ minHeight: 44 }} /></label><p className="ww-muted">{state.timeZone} · daily for the next 366 occurrences. Your calendar handles the reminder; this static app does not schedule phone notifications.</p><button type="button" className="ww-button" disabled={!state.hydrated} onClick={reminder}>Add daily reminder to my calendar</button><p role="status">{message}</p></section>
    </> : null}
  </div>;
}
function MapToken({ item, progress, selected, scope }: { item: PackItem; progress: ItemProgress | undefined; selected: PlayPack; scope: PlayScope }) {
  return <article className="ww-preview"><h4 lang={selected.language.locale}>{itemLabel(item)}</h4><ul>{Object.values(progress?.segments ?? {}).map(segment => <li key={segment.dimension}>{selected.language.grammarLabels[segment.dimension] ?? segment.dimension} · {segment.assessment === "self" ? `self-check practice · ${segment.practiceAttempts ?? segment.attempts} attempts` : segment.state === "secured" ? "✓ secured" : segment.state === "learning" ? "○ learning" : "○ new"}{segment.assessment !== "self" && segment.due ? " · • due" : ""}</li>)}</ul><div className="ww-actions"><Link className="ww-button" href={playHref({ ...scope, items: [item.id] }, { pack: selected.pack.id })}>Practise</Link>{safeSourceHref(item.sourceRef?.href) ? <Link href={safeSourceHref(item.sourceRef?.href)!}>Source card</Link> : null}</div></article>;
}

function SkillsRadar({ skills }: { skills: SkillStrength[] }) {
  const point = (index: number, radius: number): [number, number] => {
    const angle = -Math.PI / 2 + index * 2 * Math.PI / skills.length;
    return [160 + Math.cos(angle) * radius, 150 + Math.sin(angle) * radius];
  };
  const polygon = (radius: number) => skills.map((_, index) => point(index, radius).join(",")).join(" ");
  return <figure style={{ margin: "1rem auto", maxWidth: "24rem" }}><svg viewBox="0 0 320 300" role="img" aria-label={`Skills radar: ${skills.map(skill => `${skill.skill} ${percent(skill.strength)}`).join(", ")}`} style={{ width: "100%", display: "block" }}>
    {[30, 60, 90].map(radius => <polygon key={radius} points={polygon(radius)} fill="none" stroke="currentColor" opacity={0.2} />)}
    {skills.map((skill, index) => { const edge = point(index, 90); const label = point(index, 115); return <g key={skill.skill}><line x1={160} y1={150} x2={edge[0]} y2={edge[1]} stroke="currentColor" opacity={0.3} /><text x={label[0]} y={label[1]} textAnchor="middle" dominantBaseline="middle" fill="currentColor" fontSize={11}>{index + 1}</text></g>; })}
    <polygon points={skills.map((skill, index) => point(index, 90 * skill.strength).join(",")).join(" ")} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeWidth={2} />
  </svg><figcaption>{skills.map((skill, index) => `${index + 1}: ${skill.skill}`).join(" · ")}. Each axis uses current recall strength.</figcaption></figure>;
}
