import type { PlatformEnv } from "../types.js";
import { HttpError, json, requireDb } from "../http.js";
import { requireSession } from "../auth/session.js";
import { identifier, pagination } from "../classes/validation.js";
import { assignmentDto, classDto, methodNotAllowed, ownedClass, rows, type AssignmentRow, type ClassRow } from "../classes/shared.js";
import { learningMetrics, type LearningMetrics } from "../classes/metrics.js";

const PATHS = new Set(["/api/me/dashboard", "/api/teacher/class", "/api/teacher/assignment", "/api/teacher/student"]);
type RosterRow = { id: string; display_name: string; username: string; member_role: string; joined_at: string; last_active_at: string | null };

export async function handleDashboards(request: Request, env: PlatformEnv): Promise<Response | null> {
  const url = new URL(request.url), path = url.pathname;
  if (!PATHS.has(path)) return null;
  if (request.method !== "GET") return methodNotAllowed();
  const user = await requireSession(request, env, path.startsWith("/api/teacher/") ? ["teacher", "admin"] : undefined), db = requireDb(env), page = pagination(url);
  if (path === "/api/me/dashboard") {
    const classes = await rows<ClassRow & { teacher_name: string }>(db, `SELECT c.*,u.display_name AS teacher_name FROM classes c JOIN users u ON u.id=c.teacher_id
      JOIN class_members m ON m.class_id=c.id WHERE m.user_id=? AND m.left_at IS NULL ORDER BY c.archived_at IS NOT NULL,c.name,c.id LIMIT ? OFFSET ?`, user.id, page.limit, page.offset);
    const assignments = await rows<AssignmentRow & { progress_json: string | null; teacher_name: string; class_name: string }>(db, `SELECT a.*,p.progress_json,u.display_name AS teacher_name,c.name AS class_name
      FROM assignments a JOIN classes c ON c.id=a.class_id JOIN users u ON u.id=c.teacher_id JOIN class_members m ON m.class_id=c.id
      LEFT JOIN assignment_progress p ON p.assignment_id=a.id AND p.user_id=? WHERE m.user_id=? AND m.left_at IS NULL AND c.archived_at IS NULL
      ORDER BY a.due_at IS NULL,a.due_at,a.id LIMIT ? OFFSET ?`, user.id, user.id, page.limit, page.offset);
    const position = await db.prepare("SELECT value_json FROM sync_docs WHERE user_id=? AND store='study.position' AND doc_key='position'").bind(user.id).first<{ value_json: string }>();
    const devices = await rows<{ id: string; label: string; last_sync_at: string }>(db, "SELECT id,label,last_sync_at FROM devices WHERE user_id=? ORDER BY last_sync_at DESC,id LIMIT ? OFFSET ?", user.id, page.limit, page.offset);
    const history = await rows<{ id: string; action: string; meta_json: string; created_at: string }>(db,
      "SELECT id,action,meta_json,created_at FROM audit_log WHERE target_type='user' AND target_id=? ORDER BY created_at DESC,id LIMIT ? OFFSET ?", user.id, page.limit, page.offset);
    return json({ user, classes: classes.map(row => ({ ...classDto(row), teacherName: row.teacher_name })),
      assignments: assignments.map(row => ({ ...assignmentDto(row), className: row.class_name, teacherName: row.teacher_name, progress: row.progress_json ? JSON.parse(row.progress_json) : null })),
      position: position ? JSON.parse(position.value_json) : null, devices: devices.map(row => ({ id: row.id, label: row.label, lastSyncAt: row.last_sync_at })),
      history: history.map(row => ({ id: row.id, action: row.action, createdAt: row.created_at })), ...page });
  }
  if (path === "/api/teacher/class") {
    const classId = identifier(url.searchParams.get("id")), found = await ownedClass(db, user, classId, true);
    const roster = await rows<RosterRow>(db, `SELECT u.id,u.display_name,u.username,m.member_role,m.joined_at,
      (SELECT MAX(e.created_at) FROM sync_events e WHERE e.user_id=u.id) AS last_active_at FROM class_members m JOIN users u ON u.id=m.user_id
      WHERE m.class_id=? AND m.left_at IS NULL AND u.deleted_at IS NULL ORDER BY u.display_name,u.id LIMIT ? OFFSET ?`, classId, page.limit, page.offset);
    const assignments = await rows<AssignmentRow>(db, "SELECT * FROM assignments WHERE class_id=? ORDER BY due_at IS NULL,due_at,id LIMIT ? OFFSET ?", classId, page.limit, page.offset);
    const studentCount = await db.prepare("SELECT COUNT(*) AS total FROM class_members WHERE class_id=? AND member_role='student' AND left_at IS NULL").bind(classId).first<{ total: number }>();
    const active = await db.prepare(`SELECT COUNT(DISTINCT m.user_id) AS total FROM class_members m JOIN sync_events e ON e.user_id=m.user_id
      WHERE m.class_id=? AND m.member_role='student' AND m.left_at IS NULL AND e.created_at>=?`).bind(classId, new Date(Date.now() - 7 * 86400_000).toISOString()).first<{ total: number }>();
    const metrics: Array<{ row: RosterRow; stats: LearningMetrics }> = [];
    // One bounded projection at a time: avoid retaining concurrent per-student buffers.
    for (const row of roster.filter(row => row.member_role === "student")) metrics.push({ row, stats: await learningMetrics(db, row.id, found.position_lesson, found.book_id, found.position_page) });
    const words = new Map<string, { itemId: string; answered: number; incorrect: number; missRate: number }>();
    for (const { stats } of metrics) for (const word of stats.trickyWords) {
      const sum = words.get(word.itemId) ?? { itemId: word.itemId, answered: 0, incorrect: 0, missRate: 0 };
      sum.answered += word.answered; sum.incorrect += word.incorrect; sum.missRate = sum.incorrect / sum.answered; words.set(word.itemId, sum);
    }
    const progress = await rows<{ assignment_id: string; user_id: string; progress_json: string; completed_at: string | null }>(db, `SELECT p.* FROM assignment_progress p JOIN assignments a ON a.id=p.assignment_id
      JOIN class_members m ON m.class_id=a.class_id AND m.user_id=p.user_id WHERE a.class_id=? AND m.left_at IS NULL ORDER BY p.assignment_id,p.user_id LIMIT 1000`, classId);
    const timed = metrics.map(v => v.stats.averageMinutes).filter((v): v is number => v !== null);
    const needsAttention = metrics.flatMap(({ row, stats }) => {
      const reasons: string[] = [];
      if (!stats.lastActiveAt || Date.now() - Date.parse(stats.lastActiveAt) > 7 * 86400_000) reasons.push("Inactive for 7 or more days");
      const counts = Object.values(stats.skills).filter((v): v is NonNullable<typeof v> => Boolean(v));
      const total = counts.reduce((a, b) => a + b.answered, 0), correct = counts.reduce((a, b) => a + b.correct, 0);
      if (total > 0 && correct / total < .5) reasons.push("Accuracy below 50% at the class position");
      if (assignments.some(a => a.due_at && a.due_at < new Date().toISOString() && !progress.some(p => p.assignment_id === a.id && p.user_id === row.id && p.completed_at))) reasons.push("Overdue work");
      return reasons.length ? [{ userId: row.id, displayName: row.display_name, reasons }] : [];
    });
    return json({ class: classDto(found, true), roster: roster.map(row => ({ id: row.id, displayName: row.display_name, username: row.username,
      memberRole: row.member_role, joinedAt: row.joined_at, lastActiveAt: row.last_active_at })),
      assignments: assignments.map(row => {
        const result = progress.filter(p => p.assignment_id === row.id), completed = result.filter(p => p.completed_at).length;
        return { ...assignmentDto(row), completedStudents: completed, completionPercent: studentCount?.total ? Math.round(completed / studentCount.total * 100) : 0 };
      }), metrics: { activeStudents: active?.total ?? 0, studentCount: studentCount?.total ?? 0, runsCompleted: metrics.reduce((sum, v) => sum + v.stats.runsCompleted, 0),
        averageMinutes: timed.length ? Math.round(timed.reduce((a, b) => a + b, 0) / timed.length * 10) / 10 : null, scope: "shown roster page", accuracyIsMastery: false },
      skillHeatmap: metrics.map(({ row, stats }) => ({ userId: row.id, displayName: row.display_name, skills: stats.skills, truncated: stats.truncated })),
      trickyWords: [...words.values()].sort((a, b) => b.missRate - a.missRate || b.answered - a.answered).slice(0, 10), needsAttention, ...page });
  }
  if (path === "/api/teacher/assignment") {
    const id = identifier(url.searchParams.get("id")), assignment = await db.prepare("SELECT * FROM assignments WHERE id=?").bind(id).first<AssignmentRow>();
    if (!assignment) throw new HttpError(404, "assignment_not_found");
    await ownedClass(db, user, assignment.class_id, true);
    const found = await rows<{ id: string; display_name: string; progress_json: string | null; completed_at: string | null }>(db, `SELECT u.id,u.display_name,p.progress_json,p.completed_at
      FROM class_members m JOIN users u ON u.id=m.user_id LEFT JOIN assignment_progress p ON p.user_id=u.id AND p.assignment_id=?
      WHERE m.class_id=? AND m.member_role='student' AND m.left_at IS NULL ORDER BY u.display_name,u.id LIMIT ? OFFSET ?`, id, assignment.class_id, page.limit, page.offset);
    const results = found.map(row => ({ userId: row.id, displayName: row.display_name, progress: row.progress_json ? JSON.parse(row.progress_json) : null, completedAt: row.completed_at }));
    if (url.searchParams.get("format") === "csv") {
      const cell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""').replace(/^[\s]*[=+@-]/u, "'$&")}"`;
      const csv = ["User,Name,Answered,Correct,Completed", ...results.map(row => [row.userId, row.displayName, row.progress?.answered ?? 0, row.progress?.correct ?? 0, row.completedAt].map(cell).join(","))].join("\r\n");
      return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store", "Content-Disposition": 'attachment; filename="assignment-results.csv"' } });
    }
    return json({ assignment: assignmentDto(assignment), results, ...page });
  }
  const classId = identifier(url.searchParams.get("class")), target = identifier(url.searchParams.get("id")), found = await ownedClass(db, user, classId, true);
  const student = await db.prepare(`SELECT u.id,u.display_name FROM users u JOIN class_members m ON m.user_id=u.id
    WHERE m.class_id=? AND m.user_id=? AND m.member_role='student' AND m.left_at IS NULL AND u.deleted_at IS NULL`).bind(classId, target).first<{ id: string; display_name: string }>();
  if (!student) throw new HttpError(404, "student_not_found");
  const stats = await learningMetrics(db, target, found.position_lesson, found.book_id, found.position_page);
  const assignments = await rows<AssignmentRow & { progress_json: string | null; completed_at: string | null }>(db, `SELECT a.*,p.progress_json,p.completed_at FROM assignments a
    LEFT JOIN assignment_progress p ON p.assignment_id=a.id AND p.user_id=? WHERE a.class_id=? ORDER BY a.created_at DESC,a.id LIMIT ? OFFSET ?`, target, classId, page.limit, page.offset);
  return json({ student: { id: student.id, displayName: student.display_name }, lessons: stats.lessons, skills: stats.skills,
    trickyWords: stats.trickyWords, recentActivity: stats.recentActivity, lastActiveAt: stats.lastActiveAt, truncated: stats.truncated,
    assignments: assignments.map(row => ({ ...assignmentDto(row), progress: row.progress_json ? JSON.parse(row.progress_json) : null, completedAt: row.completed_at })), ...page });
}
