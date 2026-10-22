import type { D1Database, SessionUser } from "../types.js";
import { HttpError } from "../http.js";

export type ClassRow = { id: string; name: string; teacher_id: string; book_id: string; position_lesson: number | null; position_page: number | null; join_code: string; leaderboard_enabled: number; created_at: string; archived_at: string | null };
export type AssignmentRow = { id: string; class_id: string; title: string; scope_json: string; skills_json: string; item_count: number; due_at: string | null; created_by: string; created_at: string };
export async function rows<T>(db: D1Database, sql: string, ...bindings: unknown[]): Promise<T[]> {
  const result = await db.prepare(sql).bind(...bindings).all<T>();
  return result.results ?? [];
}
export async function ownedClass(db: D1Database, user: SessionUser, classId: string, allowArchived = false): Promise<ClassRow> {
  const row = await db.prepare(`SELECT c.* FROM classes c WHERE c.id=? AND (c.teacher_id=? OR EXISTS
    (SELECT 1 FROM class_members m WHERE m.class_id=c.id AND m.user_id=? AND m.member_role='co_teacher' AND m.left_at IS NULL))`).bind(classId, user.id, user.id).first<ClassRow>();
  if (!row || (!allowArchived && row.archived_at)) throw new HttpError(404, "class_not_found");
  return row;
}
export async function memberClass(db: D1Database, userId: string, classId: string, allowArchived = false): Promise<ClassRow> {
  const row = await db.prepare(`SELECT c.* FROM classes c JOIN class_members m ON m.class_id=c.id
    WHERE c.id=? AND m.user_id=? AND m.left_at IS NULL AND (c.archived_at IS NULL OR ?=1)`).bind(classId, userId, Number(allowArchived)).first<ClassRow>();
  if (!row) throw new HttpError(404, "class_not_found");
  return row;
}
export function classDto(row: ClassRow, includeCode = false) {
  return { id: row.id, name: row.name, teacherId: row.teacher_id, bookId: row.book_id,
    position: { lesson: row.position_lesson, page: row.position_page }, leaderboardEnabled: Boolean(row.leaderboard_enabled),
    createdAt: row.created_at, archivedAt: row.archived_at, ...(includeCode ? { joinCode: row.join_code } : {}) };
}
export function assignmentDto(row: AssignmentRow) {
  return { id: row.id, classId: row.class_id, title: row.title, scope: JSON.parse(row.scope_json), skills: JSON.parse(row.skills_json),
    itemCount: row.item_count, dueAt: row.due_at, createdAt: row.created_at, overdue: Boolean(row.due_at && row.due_at < new Date().toISOString()) };
}
export function joinCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, byte => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[byte % 32]).join("");
}
export function methodNotAllowed(): never { throw new HttpError(405, "method_not_allowed"); }
