import type { PlatformEnv } from "../types.js";
import { HttpError, json, readJson, requireDb } from "../http.js";
import { audit, requireSession } from "../auth/session.js";
import { bool, identifier, integer, pagination, skills, text, timestamp, validateScope } from "../classes/validation.js";
import { assignmentDto, classDto, joinCode, memberClass, methodNotAllowed, ownedClass, rows, type AssignmentRow, type ClassRow } from "../classes/shared.js";
import { validateExtraPack } from "../classes/extras.js";

const PATHS = new Set(["/api/me/classes", "/api/me/assignments", "/api/me/position", "/api/me/extras", "/api/teacher/classes", "/api/teacher/class", "/api/teacher/class/position", "/api/teacher/class/members", "/api/teacher/assignments", "/api/teacher/assignment", "/api/teacher/student", "/api/teacher/extras"]);

export async function handleClasses(request: Request, env: PlatformEnv): Promise<Response | null> {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (!PATHS.has(path)) return null;
  const teacher = path.startsWith("/api/teacher/");
  const user = await requireSession(request, env, teacher ? ["teacher", "admin"] : undefined), db = requireDb(env);
  const page = pagination(url);

  if (path === "/api/me/classes") {
    if (method === "GET") {
      const found = await rows<ClassRow & { teacher_name: string }>(db, `SELECT c.*,u.display_name AS teacher_name FROM classes c
        JOIN class_members m ON m.class_id=c.id JOIN users u ON u.id=c.teacher_id
        WHERE m.user_id=? AND m.left_at IS NULL ORDER BY c.archived_at IS NOT NULL,c.created_at,c.id LIMIT ? OFFSET ?`, user.id, page.limit, page.offset);
      return json({ classes: found.map(row => ({ ...classDto(row), teacherName: row.teacher_name })), ...page });
    }
    if (method === "POST") {
      const body = await readJson(request), code = text(body.joinCode, "join code", 30).toUpperCase();
      const found = await db.prepare("SELECT * FROM classes WHERE join_code=? AND archived_at IS NULL").bind(code).first<ClassRow>();
      if (!found) throw new HttpError(404, "class_not_found");
      if (found.teacher_id === user.id) throw new HttpError(409, "already_teacher");
      const existing = await db.prepare("SELECT member_role FROM class_members WHERE class_id=? AND user_id=? AND left_at IS NULL").bind(found.id, user.id).first<{ member_role: string }>();
      if (!existing) await db.prepare(`INSERT INTO class_members(class_id,user_id,member_role,joined_at,left_at) VALUES(?,?,'student',?,NULL)
        ON CONFLICT(class_id,user_id) DO UPDATE SET member_role='student',joined_at=excluded.joined_at,left_at=NULL`).bind(found.id, user.id, new Date().toISOString()).run();
      await audit(db, user.id, "class.join", "class", found.id);
      return json({ class: classDto(found) });
    }
    if (method === "DELETE") {
      const body = await readJson(request), classId = identifier(body.classId);
      await memberClass(db, user.id, classId, true);
      await db.prepare("UPDATE class_members SET left_at=? WHERE class_id=? AND user_id=? AND left_at IS NULL").bind(new Date().toISOString(), classId, user.id).run();
      await audit(db, user.id, "class.leave", "class", classId);
      return json({ ok: true });
    }
    return methodNotAllowed();
  }
  if (path === "/api/me/extras") {
    if (method !== "GET") return methodNotAllowed();
    const found = await rows<{ pack_json: string }>(db, `SELECT e.pack_json FROM teacher_extras e JOIN classes c ON c.id=e.class_id
      JOIN class_members m ON m.class_id=c.id WHERE m.user_id=? AND m.left_at IS NULL AND c.archived_at IS NULL
      ORDER BY e.updated_at DESC,e.id LIMIT ? OFFSET ?`, user.id, page.limit, page.offset);
    return json(found.map(row => JSON.parse(row.pack_json)));
  }
  if (path === "/api/me/assignments") {
    if (method !== "GET") return methodNotAllowed();
    const found = await rows<AssignmentRow & { progress_json: string | null; teacher_name: string; class_name: string }>(db, `SELECT a.*,p.progress_json,u.display_name AS teacher_name,c.name AS class_name
      FROM assignments a JOIN classes c ON c.id=a.class_id JOIN users u ON u.id=c.teacher_id JOIN class_members m ON m.class_id=c.id
      LEFT JOIN assignment_progress p ON p.assignment_id=a.id AND p.user_id=? WHERE m.user_id=? AND m.left_at IS NULL AND c.archived_at IS NULL
      ORDER BY a.due_at IS NULL,a.due_at,a.created_at,a.id LIMIT ? OFFSET ?`, user.id, user.id, page.limit, page.offset);
    return json({ assignments: found.map(row => ({ ...assignmentDto(row), teacherName: row.teacher_name, className: row.class_name,
      progress: row.progress_json ? JSON.parse(row.progress_json) : null })), ...page });
  }
  if (path === "/api/me/position") {
    if (method === "GET") {
      const row = await db.prepare("SELECT value_json FROM sync_docs WHERE user_id=? AND store='study.position' AND doc_key='position'").bind(user.id).first<{ value_json: string }>();
      const position = row ? JSON.parse(row.value_json) as Record<string, unknown> : null;
      if (position && typeof position.followClassId === "string") {
        try { const followed = await memberClass(db, user.id, position.followClassId); return json({ position: { ...position, book: followed.book_id, lesson: followed.position_lesson, page: followed.position_page } }); } catch { /* A left class no longer supplies position. */ }
      }
      return json({ position });
    }
    if (method === "POST") {
      const body = await readJson(request), position: Record<string, unknown> = { book: identifier(body.book), lesson: integer(body.lesson, 1, 100) };
      if (body.page !== undefined && body.page !== null) position.page = integer(body.page, 1, 5_000);
      if (body.followClassId !== undefined && body.followClassId !== null) { position.followClassId = identifier(body.followClassId); await memberClass(db, user.id, String(position.followClassId)); }
      await db.prepare(`INSERT INTO sync_docs(user_id,store,doc_key,value_json,updated_at,device_id) VALUES(?,'study.position','position',?,?,'account-api')
        ON CONFLICT(user_id,store,doc_key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at,device_id=excluded.device_id`)
        .bind(user.id, JSON.stringify(position), new Date().toISOString()).run();
      return json({ position });
    }
    return methodNotAllowed();
  }
  if (path === "/api/teacher/classes") {
    if (method === "GET") {
      const found = await rows<ClassRow & { student_count: number; active_students: number; assignment_count: number; completed_submissions: number; behind_count: number }>(db, `SELECT c.*,
        (SELECT COUNT(*) FROM class_members m WHERE m.class_id=c.id AND m.member_role='student' AND m.left_at IS NULL) AS student_count,
        (SELECT COUNT(DISTINCT e.user_id) FROM sync_events e JOIN class_members m ON m.user_id=e.user_id WHERE m.class_id=c.id AND m.member_role='student' AND m.left_at IS NULL AND e.created_at>=?) AS active_students,
        (SELECT COUNT(*) FROM assignments a WHERE a.class_id=c.id) AS assignment_count,
        (SELECT COUNT(*) FROM assignment_progress p JOIN assignments a ON a.id=p.assignment_id JOIN class_members m ON m.class_id=a.class_id AND m.user_id=p.user_id WHERE a.class_id=c.id AND p.completed_at IS NOT NULL AND m.left_at IS NULL AND m.member_role='student') AS completed_submissions,
        (SELECT COUNT(*) FROM class_members m WHERE m.class_id=c.id AND m.member_role='student' AND m.left_at IS NULL AND
          (NOT EXISTS(SELECT 1 FROM sync_events e WHERE e.user_id=m.user_id AND e.created_at>=?) OR EXISTS(SELECT 1 FROM assignments a WHERE a.class_id=c.id AND a.due_at<? AND NOT EXISTS(SELECT 1 FROM assignment_progress p WHERE p.assignment_id=a.id AND p.user_id=m.user_id AND p.completed_at IS NOT NULL)))) AS behind_count
        FROM classes c WHERE c.teacher_id=? OR EXISTS(SELECT 1 FROM class_members m WHERE m.class_id=c.id AND m.user_id=? AND m.member_role='co_teacher' AND m.left_at IS NULL)
        ORDER BY c.created_at DESC,c.id LIMIT ? OFFSET ?`, new Date(Date.now() - 7 * 86400_000).toISOString(), new Date(Date.now() - 7 * 86400_000).toISOString(), new Date().toISOString(), user.id, user.id, page.limit, page.offset);
      return json({ classes: found.map(row => ({ ...classDto(row, true), studentCount: row.student_count, activeStudents: row.active_students, assignmentCount: row.assignment_count, behindCount: row.behind_count, averageCompletion: row.student_count && row.assignment_count ? Math.round(row.completed_submissions / (row.student_count * row.assignment_count) * 100) : null })), ...page });
    }
    if (method === "POST") {
      const body = await readJson(request), id = crypto.randomUUID(), now = new Date().toISOString();
      await db.prepare(`INSERT INTO classes(id,name,teacher_id,book_id,position_lesson,position_page,join_code,leaderboard_enabled,created_at,archived_at)
        VALUES(?,?,?,?,1,NULL,?,0,?,NULL)`).bind(id, text(body.name, "class name"), user.id, identifier(body.bookId ?? "momente-a1"), joinCode(), now).run();
      await audit(db, user.id, "class.create", "class", id);
      return json({ class: classDto((await ownedClass(db, user, id)), true) }, 201);
    }
    return methodNotAllowed();
  }
  if (path === "/api/teacher/class/position") {
    if (method !== "POST") return methodNotAllowed();
    const body = await readJson(request), classId = identifier(body.classId);
    await ownedClass(db, user, classId);
    await db.prepare("UPDATE classes SET position_lesson=?,position_page=? WHERE id=?").bind(integer(body.lesson, 1, 100), body.page === null || body.page === undefined ? null : integer(body.page, 1, 5_000), classId).run();
    await audit(db, user.id, "class.position", "class", classId);
    return json({ class: classDto(await ownedClass(db, user, classId), true) });
  }
  if (path === "/api/teacher/class/members") {
    if (method !== "POST" && method !== "DELETE") return methodNotAllowed();
    const body = await readJson(request), classId = identifier(body.classId), userId = identifier(body.userId), found = await ownedClass(db, user, classId);
    if (found.teacher_id !== user.id) throw new HttpError(403, "owner_required");
    if (method === "DELETE") {
      await db.prepare("UPDATE class_members SET left_at=? WHERE class_id=? AND user_id=? AND left_at IS NULL").bind(new Date().toISOString(), classId, userId).run();
    } else {
      const target = await db.prepare("SELECT role FROM users WHERE id=? AND status='active' AND deleted_at IS NULL").bind(userId).first<{ role: string }>();
      if (!target || !["teacher", "admin"].includes(target.role) || body.memberRole !== "co_teacher" || userId === found.teacher_id) throw new HttpError(400, "invalid_co_teacher");
      await db.prepare(`INSERT INTO class_members(class_id,user_id,member_role,joined_at,left_at) VALUES(?,?,'co_teacher',?,NULL)
        ON CONFLICT(class_id,user_id) DO UPDATE SET member_role='co_teacher',joined_at=excluded.joined_at,left_at=NULL`).bind(classId, userId, new Date().toISOString()).run();
    }
    await audit(db, user.id, method === "DELETE" ? "class.member.remove" : "class.co_teacher.add", "class", classId, { userId });
    return json({ ok: true });
  }
  if (path === "/api/teacher/class" && method === "PATCH") {
    const body = await readJson(request), classId = identifier(body.classId), found = await ownedClass(db, user, classId, true);
    if (found.teacher_id !== user.id) throw new HttpError(403, "owner_required");
    const name = body.name === undefined ? found.name : text(body.name, "class name"), bookId = body.bookId === undefined ? found.book_id : identifier(body.bookId);
    const leaderboard = body.leaderboardEnabled === undefined ? found.leaderboard_enabled : Number(bool(body.leaderboardEnabled));
    const archived = body.archive === undefined ? found.archived_at : bool(body.archive) ? new Date().toISOString() : null;
    const code = body.regenerateJoinCode === undefined ? found.join_code : bool(body.regenerateJoinCode) ? joinCode() : found.join_code;
    await db.prepare("UPDATE classes SET name=?,book_id=?,leaderboard_enabled=?,archived_at=?,join_code=? WHERE id=?").bind(name, bookId, leaderboard, archived, code, classId).run();
    await audit(db, user.id, "class.update", "class", classId);
    return json({ class: classDto(await ownedClass(db, user, classId, true), true) });
  }
  if (path === "/api/teacher/assignments") {
    if (method === "GET") {
      const classId = identifier(url.searchParams.get("class")); await ownedClass(db, user, classId);
      const found = await rows<AssignmentRow>(db, "SELECT * FROM assignments WHERE class_id=? ORDER BY created_at DESC,id LIMIT ? OFFSET ?", classId, page.limit, page.offset);
      return json({ assignments: found.map(assignmentDto), ...page });
    }
    if (!["POST", "PATCH", "DELETE"].includes(method)) return methodNotAllowed();
    const body = await readJson(request);
    if (method === "POST") {
      const classId = identifier(body.classId); await ownedClass(db, user, classId);
      const id = crypto.randomUUID(), scope = validateScope(body.scope), chosenSkills = skills(body.skills), count = integer(body.itemCount, 1, 200);
      if (!chosenSkills.length) throw new HttpError(400, "skills_required");
      scope.skills = chosenSkills; scope.count = count;
      await db.prepare(`INSERT INTO assignments(id,class_id,title,scope_json,skills_json,item_count,due_at,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)`)
        .bind(id, classId, text(body.title, "assignment title"), JSON.stringify(scope), JSON.stringify(chosenSkills), count, timestamp(body.dueAt), user.id, new Date().toISOString()).run();
      await audit(db, user.id, "assignment.create", "assignment", id);
      return json({ assignment: assignmentDto((await db.prepare("SELECT * FROM assignments WHERE id=?").bind(id).first<AssignmentRow>())!) }, 201);
    }
    const id = identifier(body.id), assignment = await db.prepare("SELECT * FROM assignments WHERE id=?").bind(id).first<AssignmentRow>();
    if (!assignment) throw new HttpError(404, "assignment_not_found");
    await ownedClass(db, user, assignment.class_id);
    if (method === "DELETE") await db.prepare("DELETE FROM assignments WHERE id=?").bind(id).run();
    else {
      // Once progress exists, scope/size remain stable so historical results stay meaningful.
      const scopeChanged = body.scope !== undefined || body.skills !== undefined || body.itemCount !== undefined;
      if (scopeChanged && await db.prepare("SELECT 1 AS found FROM assignment_progress WHERE assignment_id=? LIMIT 1").bind(id).first()) throw new HttpError(409, "assignment_has_progress");
      const scope = validateScope(body.scope ?? JSON.parse(assignment.scope_json)), chosenSkills = skills(body.skills ?? JSON.parse(assignment.skills_json));
      const count = body.itemCount === undefined ? assignment.item_count : integer(body.itemCount, 1, 200);
      if (!chosenSkills.length) throw new HttpError(400, "skills_required");
      scope.skills = chosenSkills; scope.count = count;
      await db.prepare("UPDATE assignments SET title=?,due_at=?,scope_json=?,skills_json=?,item_count=? WHERE id=?")
        .bind(body.title === undefined ? assignment.title : text(body.title), body.dueAt === undefined ? assignment.due_at : timestamp(body.dueAt), JSON.stringify(scope), JSON.stringify(chosenSkills), count, id).run();
    }
    await audit(db, user.id, method === "DELETE" ? "assignment.delete" : "assignment.update", "assignment", id);
    return json({ ok: true });
  }
  if (path === "/api/teacher/extras") {
    if (method === "GET") {
      const classId = identifier(url.searchParams.get("class")); await ownedClass(db, user, classId);
      const found = await rows<{ id: string; pack_json: string; review_status: string; updated_at: string }>(db, "SELECT id,pack_json,review_status,updated_at FROM teacher_extras WHERE class_id=? ORDER BY updated_at DESC,id LIMIT ? OFFSET ?", classId, page.limit, page.offset);
      return json({ extras: found.map(row => ({ id: row.id, pack: JSON.parse(row.pack_json), reviewStatus: row.review_status, updatedAt: row.updated_at })), ...page });
    }
    if (method !== "POST" && method !== "DELETE") return methodNotAllowed();
    const body = await readJson(request);
    if (method === "DELETE") {
      const id = identifier(body.id), extra = await db.prepare("SELECT class_id FROM teacher_extras WHERE id=?").bind(id).first<{ class_id: string }>();
      if (!extra) throw new HttpError(404, "extra_not_found");
      await ownedClass(db, user, extra.class_id);
      await db.prepare("DELETE FROM teacher_extras WHERE id=?").bind(id).run();
      await audit(db, user.id, "extra.delete", "teacher_extra", id);
      return json({ ok: true });
    }
    const classId = identifier(body.classId); await ownedClass(db, user, classId);
    const id = crypto.randomUUID(), { pack, warnings } = validateExtraPack(body.pack, classId, id);
    await db.prepare("INSERT INTO teacher_extras(id,class_id,owner_id,pack_json,review_status,updated_at) VALUES(?,?,?,?,'pending-german-review',?)")
      .bind(id, classId, user.id, JSON.stringify(pack), new Date().toISOString()).run();
    await audit(db, user.id, "extra.publish", "teacher_extra", id, { classId, itemCount: (pack.items as unknown[]).length });
    return json({ id, pack, warnings }, 201);
  }
  // Detailed class, assignment and student views are implemented by L3-6's dashboard handler.
  return null;
}
