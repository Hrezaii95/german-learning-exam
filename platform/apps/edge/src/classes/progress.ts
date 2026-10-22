import type { D1Database } from "../types.js";
import { HttpError } from "../http.js";
import { validateProgress } from "./validation.js";

type Event = { id: string; type: string; payload: unknown; createdAt?: string };
export async function validateAssignmentProgress(db: D1Database, userId: string, event: Event): Promise<void> {
  if (event.type !== "assignment.progress") return;
  const progress = validateProgress(event.payload);
  const assignment = await db.prepare(`SELECT a.item_count FROM assignments a JOIN classes c ON c.id=a.class_id
    JOIN class_members m ON m.class_id=c.id WHERE a.id=? AND m.user_id=? AND m.member_role='student'
    AND m.left_at IS NULL AND c.archived_at IS NULL`).bind(progress.assignmentId, userId).first<{ item_count: number }>();
  if (!assignment) throw new HttpError(404, "assignment_not_found");
  if (progress.answered > assignment.item_count || (progress.completed && progress.answered < assignment.item_count)) {
    throw new HttpError(400, "invalid_assignment_progress");
  }
}
/** Rebuild from the event union; retries and out-of-order delivery produce the same result. */
export async function deriveAssignmentProgress(db: D1Database, userId: string, event: Event): Promise<void> {
  if (event.type !== "assignment.progress") return;
  await validateAssignmentProgress(db, userId, event);
  const target = validateProgress(event.payload).assignmentId;
  // Selection and UPSERT share one SQLite statement/snapshot, so a slower
  // concurrent request cannot overwrite a newer event union with stale data.
  await db.prepare(`WITH candidates AS (
      SELECT event_id,created_at,json_extract(payload_json,'$.payload') AS progress
      FROM sync_events WHERE user_id=? AND event_type='assignment.progress'
        AND json_extract(payload_json,'$.payload.assignmentId')=?
    ), completion AS (
      SELECT MIN(created_at) AS completed_at FROM candidates WHERE json_extract(progress,'$.completed')=1
    ), best AS (
      SELECT progress FROM candidates ORDER BY CAST(json_extract(progress,'$.answered') AS INTEGER) DESC,created_at DESC,event_id DESC LIMIT 1
    )
    INSERT INTO assignment_progress(assignment_id,user_id,progress_json,completed_at)
    SELECT ?,?,json_set(best.progress,'$.completed',json(CASE WHEN completion.completed_at IS NOT NULL THEN 'true' ELSE 'false' END)),completion.completed_at
      FROM best CROSS JOIN completion WHERE 1
    ON CONFLICT(assignment_id,user_id) DO UPDATE SET progress_json=excluded.progress_json,completed_at=excluded.completed_at`)
    .bind(userId, target, target, userId).run();
}
