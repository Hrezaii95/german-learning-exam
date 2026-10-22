import { createAlphaReviewScheduler } from "../review/alpha-scheduler.js";
import { createNewReviewCard } from "../review/validate.js";
import type { ReviewCardState } from "../review/types.js";
import { calendarDaysBetween, isCalendarDate } from "./dates.js";
import type { DimensionProgress, ItemProgress, LearningAnswer, LearningCapability, LearningFormat } from "./types.js";

const FORMATS: readonly LearningFormat[] = ["recognition", "reduced-cues", "recall"];
const scheduler = createAlphaReviewScheduler();

/** Ignore malformed/future remote evidence; merge duplicates idempotently in a stable order. */
export function orderedAnswers(answers: readonly LearningAnswer[], now: Date): LearningAnswer[] {
  const cutoff = now.getTime();
  if (!Number.isFinite(cutoff)) throw new Error("Invalid instant");
  const seen = new Set<string>();
  return [...answers].filter(a => a && typeof a.eventId === "string" && a.eventId.length > 0
    && typeof a.packId === "string" && typeof a.itemId === "string" && typeof a.dimension === "string"
    && typeof a.templateId === "string" && FORMATS.includes(a.format)
    && typeof a.correct === "boolean" && typeof a.hinted === "boolean"
    && isCalendarDate(a.studyDate) && (a.calendarDate === undefined || isCalendarDate(a.calendarDate)) && Number.isFinite(Date.parse(a.createdAt))
    && Date.parse(a.createdAt) <= cutoff)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.eventId.localeCompare(b.eventId))
    .filter(a => { if (seen.has(a.eventId)) return false; seen.add(a.eventId); return true; });
}

function segment(packId: string, itemId: string, dimension: string, events: LearningAnswer[], now: Date): DimensionProgress {
  let card: ReviewCardState | undefined;
  let step = 0;
  let consecutive = 0;
  let correct = 0;
  let lapses = 0;
  let securedAt: string | null = null;
  let gold = false;
  const recallDates: string[] = [];
  let evidenceCeiling = 0;
  for (const event of events) {
    const at = new Date(event.createdAt);
    card ??= createNewReviewCard({ cardId: `wortwerk:card:${JSON.stringify([packId, itemId, dimension])}`,
      conceptId: `wortwerk:item:${JSON.stringify([packId, itemId])}`, templateId: `wortwerk:dimension:${dimension}`,
      measuredDimension: "recall", now: at });
    card = scheduler.review(card, !event.correct ? "again" : event.hinted || event.format !== "recall" ? "hard" : "good", at).card;
    if (event.correct) correct += 1;
    else { lapses += 1; step = Math.max(0, step - 1); consecutive = 0; }
    if (event.correct && !event.hinted) {
      // Two successful retrievals at the current rung earn fewer cues next time.
      if (FORMATS.indexOf(event.format) >= step) {
        consecutive += 1;
        if (consecutive >= 2 && step < 2) { step += 1; consecutive = 0; }
      }
      evidenceCeiling = event.format === "recall" ? 1 : event.format === "reduced-cues" ? 0.7 : 0.5;
      const recalledDate = event.calendarDate ?? event.studyDate;
      if (event.format === "recall" && !recallDates.includes(recalledDate)) {
        recallDates.push(recalledDate);
        recallDates.sort();
        if (recallDates.length >= 2 && securedAt === null) securedAt = event.createdAt;
        if (recallDates.length >= 2 && calendarDaysBetween(recallDates[0]!, recalledDate) >= 30) gold = true;
      }
    } else evidenceCeiling = event.correct ? 0.4 : 0;
  }
  const elapsedDays = card?.lastReview ? Math.max(0, (now.getTime() - Date.parse(card.lastReview)) / 86_400_000) : 0;
  const strength = card ? evidenceCeiling * Math.pow(0.9, elapsedDays / Math.max(0.1, card.stability)) : 0;
  return {
    dimension, state: securedAt ? "secured" : events.length ? "learning" : "new",
    format: FORMATS[step]!, attempts: events.length, correct, lapses,
    strength, due: !!card && (Date.parse(card.due) <= now.getTime() || evidenceCeiling === 0),
    dueAt: card?.due ?? null, lastSeen: card?.lastReview ?? null, securedAt, recallDates: recallDates.sort(), gold,
  };
}

export function deriveProgress(capabilities: readonly LearningCapability[], answers: readonly LearningAnswer[], now: Date): ItemProgress[] {
  const events = orderedAnswers(answers, now);
  const grouped = new Map<string, LearningAnswer[]>();
  for (const event of events) {
    const key = JSON.stringify([event.packId, event.itemId, event.dimension]);
    const rows = grouped.get(key) ?? [];
    rows.push(event); grouped.set(key, rows);
  }
  return capabilities.map(capability => {
    const segments: Record<string, DimensionProgress> = Object.create(null) as Record<string, DimensionProgress>;
    for (const dimension of [...new Set(capability.dimensions)].sort()) {
      segments[dimension] = segment(capability.packId, capability.itemId, dimension,
        grouped.get(JSON.stringify([capability.packId, capability.itemId, dimension])) ?? [], now);
    }
    const parts = Object.values(segments);
    return { packId: capability.packId, itemId: capability.itemId, segments,
      complete: parts.length > 0 && parts.every(p => p.state === "secured"),
      gold: parts.length > 0 && parts.every(p => p.state === "secured" && p.gold) };
  });
}

export type ProgressSummary = { items: number; complete: number; gold: number; segments: number; secured: number; due: number; strength: number };
export function summarizeProgress(progress: readonly ItemProgress[]): ProgressSummary {
  const segments = progress.flatMap(item => Object.values(item.segments));
  return { items: progress.length, complete: progress.filter(p => p.complete).length, gold: progress.filter(p => p.gold).length,
    segments: segments.length, secured: segments.filter(s => s.state === "secured").length,
    due: segments.filter(s => s.due).length,
    strength: segments.length ? segments.reduce((sum, s) => sum + s.strength, 0) / segments.length : 0 };
}
