import type { D1Database } from "../types.js";
import { rows } from "./shared.js";
import { SKILLS, type Skill } from "./validation.js";

type Counter = { answered: number; correct: number };
export type LearningMetrics = { skills: Partial<Record<Skill, Counter & { percent: number }>>; trickyWords: Array<{ itemId: string; answered: number; incorrect: number; missRate: number }>; lessons: Array<{ lesson: number; answered: number; correct: number }>; recentActivity: { days7: number; days30: number }; runsCompleted: number; averageMinutes: number | null; lastActiveAt: string | null; truncated: boolean };
type MetricRow = { created_at: string; event_type: string; book: string | null; lesson: number | null; page: number | null; correct: number | null; item_id: string | null; skill: string | null; duration_ms: number | null; completed: number | null };

/** Project bounded learning primitives inside SQLite. Never load arbitrary synced payloads. */
export async function learningMetrics(db: D1Database, userId: string, throughLesson: number | null = null, bookId?: string, throughPage: number | null = null): Promise<LearningMetrics> {
  const found = await rows<MetricRow>(db, `SELECT created_at,event_type,
    CASE WHEN json_type(payload_json,'$.payload.book')='text' THEN substr(json_extract(payload_json,'$.payload.book'),1,150)
      WHEN json_type(payload_json,'$.payload.bookRef.book')='text' THEN substr(json_extract(payload_json,'$.payload.bookRef.book'),1,150) END AS book,
    CASE WHEN json_type(payload_json,'$.payload.lesson')='integer' THEN json_extract(payload_json,'$.payload.lesson')
      WHEN json_type(payload_json,'$.payload.bookRef.lesson')='integer' THEN json_extract(payload_json,'$.payload.bookRef.lesson') END AS lesson,
    CASE WHEN json_type(payload_json,'$.payload.page')='integer' THEN json_extract(payload_json,'$.payload.page')
      WHEN json_type(payload_json,'$.payload.bookRef.page')='integer' THEN json_extract(payload_json,'$.payload.bookRef.page') END AS page,
    CASE WHEN json_type(payload_json,'$.payload.correct') IN ('true','false') THEN json_extract(payload_json,'$.payload.correct') END AS correct,
    CASE WHEN json_type(payload_json,'$.payload.itemId')='text' THEN substr(json_extract(payload_json,'$.payload.itemId'),1,200) END AS item_id,
    CASE WHEN json_type(payload_json,'$.payload.skill')='text' THEN substr(json_extract(payload_json,'$.payload.skill'),1,30)
      WHEN json_type(payload_json,'$.payload.dimension')='text' THEN substr(json_extract(payload_json,'$.payload.dimension'),1,30) END AS skill,
    CASE WHEN json_type(payload_json,'$.payload.durationMs') IN ('integer','real') THEN json_extract(payload_json,'$.payload.durationMs') END AS duration_ms,
    CASE WHEN json_type(payload_json,'$.payload.completed') IN ('true','false') THEN json_extract(payload_json,'$.payload.completed') END AS completed
    FROM sync_events WHERE user_id=? AND (event_type='answer' OR event_type LIKE '%.answer' OR event_type IN ('run.completed','session.completed','session'))
    ORDER BY server_seq DESC LIMIT 1001`, userId);
  const skillCounts: Partial<Record<Skill, Counter>> = {}, lessonCounts = new Map<number, Counter>(), words = new Map<string, Counter>();
  let days7 = 0, days30 = 0, runsCompleted = 0, duration = 0, timedRuns = 0, lastActiveAt: string | null = null;
  const now = Date.now();
  for (const row of found.slice(0, 1000)) {
    if (bookId !== undefined && row.book !== bookId) continue;
    if (throughLesson !== null && (row.lesson === null || row.lesson > throughLesson)) continue;
    if (throughPage !== null && row.lesson === throughLesson && (row.page === null || row.page > throughPage)) continue;
    const age = now - Date.parse(row.created_at);
    if (lastActiveAt === null || row.created_at > lastActiveAt) lastActiveAt = row.created_at;
    if (age >= 0 && age <= 30 * 86400_000) days30++;
    if (age >= 0 && age <= 7 * 86400_000) days7++;
    if (row.event_type === "run.completed" || row.event_type === "session.completed" || (row.event_type === "session" && row.completed === 1)) {
      if (age >= 0 && age <= 7 * 86400_000) {
        runsCompleted++;
        if (row.duration_ms !== null && Number.isFinite(row.duration_ms) && row.duration_ms > 0 && row.duration_ms <= 86_400_000) { duration += row.duration_ms / 60_000; timedRuns++; }
      }
    }
    if (!(row.event_type === "answer" || row.event_type.endsWith(".answer")) || row.correct === null) continue;
    const correct = row.correct;
    if (row.skill !== null && (SKILLS as readonly string[]).includes(row.skill)) {
      const count = skillCounts[row.skill as Skill] ??= { answered: 0, correct: 0 }; count.answered++; count.correct += correct;
    }
    if (row.lesson !== null && Number.isInteger(row.lesson) && row.lesson > 0 && row.lesson <= 100) {
      const count = lessonCounts.get(row.lesson) ?? { answered: 0, correct: 0 }; count.answered++; count.correct += correct; lessonCounts.set(row.lesson, count);
    }
    if (row.item_id !== null) {
      const count = words.get(row.item_id) ?? { answered: 0, correct: 0 }; count.answered++; count.correct += correct; words.set(row.item_id, count);
    }
  }
  const skills: LearningMetrics["skills"] = {};
  for (const skill of SKILLS) { const count = skillCounts[skill]; if (count) skills[skill] = { ...count, percent: Math.round(count.correct / count.answered * 100) }; }
  return { skills,
    trickyWords: [...words].map(([itemId, count]) => ({ itemId, answered: count.answered, incorrect: count.answered - count.correct, missRate: (count.answered - count.correct) / count.answered })).filter(item => item.incorrect > 0).sort((a, b) => b.missRate - a.missRate || b.answered - a.answered || a.itemId.localeCompare(b.itemId)).slice(0, 10),
    lessons: [...lessonCounts].map(([lesson, count]) => ({ lesson, ...count })).sort((a, b) => a.lesson - b.lesson),
    recentActivity: { days7, days30 }, runsCompleted, averageMinutes: timedRuns ? Math.round(duration / timedRuns * 10) / 10 : null,
    lastActiveAt, truncated: found.length > 1000 };
}
