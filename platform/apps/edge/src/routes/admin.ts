import type { PlatformEnv, Role, SessionUser, D1PreparedStatement } from "../types.js";
import { HttpError, json, readJson, requireDb } from "../http.js";
import { requireSession, sessionToken, sha256 } from "../auth/session.js";
import { hashPassword, validateNewPassword } from "../auth/password.js";
import { bool, identifier, invalid, pagination, text } from "../classes/validation.js";
import { classDto, methodNotAllowed, rows, type ClassRow } from "../classes/shared.js";

const PATHS = new Set(["/api/admin/users", "/api/admin/classes", "/api/admin/packs", "/api/admin/flags", "/api/admin/audit", "/api/admin/system", "/api/admin/data-requests"]);
type UserRow = { id: string; username: string; display_name: string; role: Role; status: string; must_change_password: number; is_demo: number; created_at: string };
const userDto = (user: UserRow) => ({ id: user.id, username: user.username, displayName: user.display_name, role: user.role, status: user.status,
  mustChangePassword: Boolean(user.must_change_password), isDemo: Boolean(user.is_demo), createdAt: user.created_at });
function role(value: unknown): Role { if (value !== "student" && value !== "teacher" && value !== "admin") invalid("Invalid role"); return value; }
function status(value: unknown): string { if (value !== "active" && value !== "disabled") invalid("Invalid status"); return value; }
function username(value: unknown): string { const name = text(value, "username", 32).toLowerCase(); if (!/^[a-z0-9][a-z0-9_.-]{2,31}$/u.test(name)) invalid("Invalid username"); return name; }
function csvCell(value: unknown): string { return `"${String(value ?? "").replaceAll('"', '""').replace(/^[\s]*[=+@-]/u, "'$&")}"`; }

/** A unique audit row is the conditional mutation ticket inside one D1 transaction.
 * CAS/authorization failure creates no ticket, so every downstream write is a no-op.
 * Any statement failure rolls back the ticket and all security/data changes.
 */
async function mutationTicket(request: Request, env: PlatformEnv, user: SessionUser, action: string, targetType: string,
  targetId: string | null, meta: unknown, condition = "1", values: unknown[] = []): Promise<{ id: string; statement: D1PreparedStatement }> {
  const token = sessionToken(request);
  if (!token) throw new HttpError(401, "unauthorized");
  const db = requireDb(env), id = crypto.randomUUID(), now = new Date().toISOString();
  const statement = db.prepare(`INSERT INTO audit_log(id,actor_id,action,target_type,target_id,meta_json,created_at)
    SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.id_hash=? AND u.id=? AND u.role='admin' AND u.status='active' AND u.deleted_at IS NULL
      AND u.must_change_password=0 AND s.expires_at>?) AND (${condition})`)
    .bind(id, user.id, action, targetType, targetId, JSON.stringify(meta), now, await sha256(token), user.id, now, ...values);
  return { id, statement };
}
const TICKET = "EXISTS(SELECT 1 FROM audit_log WHERE id=?)";
async function commitMutation(env: PlatformEnv, ticket: { id: string; statement: D1PreparedStatement }, statements: D1PreparedStatement[]) {
  const result = await requireDb(env).batch([ticket.statement, ...statements]);
  if (!result[0]?.meta.changes) throw new HttpError(409, "mutation_conflict");
}

export async function handleAdmin(request: Request, env: PlatformEnv): Promise<Response | null> {
  const url = new URL(request.url), path = url.pathname, method = request.method;
  if (!PATHS.has(path)) return null;
  const user = await requireSession(request, env, ["admin"]), db = requireDb(env), page = pagination(url);
  if (path === "/api/admin/users") {
    if (method === "GET") {
      const conditions = ["deleted_at IS NULL"], bindings: unknown[] = [];
      if (url.searchParams.get("query")) { const query = text(url.searchParams.get("query"), "search", 100); conditions.push("(username LIKE ? ESCAPE '\\' OR display_name LIKE ? ESCAPE '\\')"); const search = `%${query.replace(/[\\%_]/gu, "\\$&")}%`; bindings.push(search, search); }
      if (url.searchParams.get("role")) { conditions.push("role=?"); bindings.push(role(url.searchParams.get("role"))); }
      if (url.searchParams.get("status")) { conditions.push("status=?"); bindings.push(status(url.searchParams.get("status"))); }
      if (url.searchParams.get("demo")) { const demo = url.searchParams.get("demo"); if (demo !== "true" && demo !== "false") invalid(); conditions.push("is_demo=?"); bindings.push(Number(demo === "true")); }
      const found = await rows<UserRow>(db, `SELECT id,username,display_name,role,status,must_change_password,is_demo,created_at FROM users WHERE ${conditions.join(" AND ")} ORDER BY username,id LIMIT ? OFFSET ?`, ...bindings, page.limit, page.offset);
      return json({ users: found.map(userDto), ...page });
    }
    if (method === "POST") {
      const body = await readJson(request), name = username(body.username), displayName = text(body.displayName, "display name"), targetRole = role(body.role);
      if (!validateNewPassword(body.password)) invalid("Password must contain at least 12 characters");
      const id = crypto.randomUUID(), now = new Date().toISOString(), passwordHash = await hashPassword(body.password);
      const ticket = await mutationTicket(request, env, user, "admin.user.create", "user", id, { username: name, role: targetRole });
      try {
        await commitMutation(env, ticket, [
          db.prepare(`INSERT INTO users(id,username,display_name,role,status,must_change_password,is_demo,created_at) SELECT ?,?,?,?,'active',1,0,? WHERE ${TICKET}`).bind(id, name, displayName, targetRole, now, ticket.id),
          db.prepare(`INSERT INTO identities(id,user_id,provider,provider_subject,password_hash,created_at) SELECT ?,?,'password',?,?,? WHERE ${TICKET}`).bind(crypto.randomUUID(), id, name, passwordHash, now, ticket.id),
        ]);
      } catch (error) { if (String(error).includes("UNIQUE")) throw new HttpError(409, "username_unavailable"); throw error; }
      const created = await db.prepare("SELECT * FROM users WHERE id=?").bind(id).first<UserRow>();
      return json({ user: userDto(created!) }, 201);
    }
    if (method !== "PATCH" && method !== "DELETE") return methodNotAllowed();
    const body = await readJson(request), id = identifier(body.id), target = await db.prepare("SELECT * FROM users WHERE id=? AND deleted_at IS NULL").bind(id).first<UserRow>();
    if (!target) throw new HttpError(404, "user_not_found");
    if (method === "DELETE") {
      if (body.confirm !== true) throw new HttpError(400, "confirmation_required");
      const eligible = `EXISTS(SELECT 1 FROM users WHERE id=? AND role=? AND status=? AND (role<>'admin' OR status<>'active' OR (SELECT COUNT(*) FROM users WHERE role='admin' AND status='active' AND deleted_at IS NULL)>1))`;
      const ticket = await mutationTicket(request, env, user, "admin.user.delete", "user", null, { deleted: true }, eligible, [id, target.role, target.status]);
      await commitMutation(env, ticket, [
        db.prepare(`UPDATE audit_log SET actor_id=NULL,meta_json='{}' WHERE actor_id=? AND ${TICKET}`).bind(id, ticket.id),
        db.prepare(`UPDATE audit_log SET target_id=NULL,meta_json='{}' WHERE target_type='user' AND target_id=? AND ${TICKET}`).bind(id, ticket.id),
        db.prepare(`DELETE FROM users WHERE id=? AND ${TICKET}`).bind(id, ticket.id),
      ]);
      return json({ ok: true });
    }
    const newRole = body.role === undefined ? target.role : role(body.role), newStatus = body.status === undefined ? target.status : status(body.status), name = body.displayName === undefined ? target.display_name : text(body.displayName, "display name");
    const resetsPassword = body.password !== undefined;
    if (resetsPassword && !validateNewPassword(body.password)) invalid("Password must contain at least 12 characters");
    const hash = resetsPassword ? await hashPassword(body.password as string) : null;
    const removeAdmin = newRole !== "admin" || newStatus !== "active";
    const condition = `EXISTS(SELECT 1 FROM users WHERE id=? AND role=? AND status=? AND display_name=? AND must_change_password=? AND
      (?=0 OR role<>'admin' OR status<>'active' OR (SELECT COUNT(*) FROM users WHERE role='admin' AND status='active' AND deleted_at IS NULL)>1))`;
    const ticket = await mutationTicket(request, env, user, resetsPassword ? "admin.user.reset" : "admin.user.update", "user", id,
      { role: newRole, status: newStatus, displayName: name }, condition, [id, target.role, target.status, target.display_name, target.must_change_password, Number(removeAdmin)]);
    const statements = [db.prepare(`UPDATE users SET role=?,status=?,display_name=?,must_change_password=? WHERE id=? AND ${TICKET}`)
      .bind(newRole, newStatus, name, resetsPassword ? 1 : target.must_change_password, id, ticket.id)];
    if (hash) {
      statements.push(
        db.prepare(`UPDATE identities SET password_hash=? WHERE user_id=? AND provider='password' AND ${TICKET}`).bind(hash, id, ticket.id),
        db.prepare(`INSERT INTO identities(id,user_id,provider,provider_subject,password_hash,created_at) SELECT ?,?,'password',?,?,? WHERE ${TICKET} AND NOT EXISTS(SELECT 1 FROM identities WHERE user_id=? AND provider='password')`)
          .bind(crypto.randomUUID(), id, target.username, hash, new Date().toISOString(), ticket.id, id),
      );
    }
    if (newRole !== target.role || newStatus !== target.status || resetsPassword) statements.push(db.prepare(`DELETE FROM sessions WHERE user_id=? AND ${TICKET}`).bind(id, ticket.id));
    await commitMutation(env, ticket, statements);
    return json({ user: userDto((await db.prepare("SELECT * FROM users WHERE id=?").bind(id).first<UserRow>())!) });
  }
  if (path === "/api/admin/classes") {
    if (method === "GET") {
      const found = await rows<ClassRow & { teacher_name: string; student_count: number; last_activity: string | null }>(db, `SELECT c.*,u.display_name AS teacher_name,
        (SELECT COUNT(*) FROM class_members m WHERE m.class_id=c.id AND m.member_role='student' AND m.left_at IS NULL) AS student_count,
        (SELECT MAX(e.created_at) FROM sync_events e JOIN class_members m ON m.user_id=e.user_id WHERE m.class_id=c.id AND m.left_at IS NULL) AS last_activity
        FROM classes c JOIN users u ON u.id=c.teacher_id ORDER BY c.created_at DESC,c.id LIMIT ? OFFSET ?`, page.limit, page.offset);
      return json({ classes: found.map(row => ({ ...classDto(row, true), teacherName: row.teacher_name, studentCount: row.student_count, lastActiveAt: row.last_activity })), ...page });
    }
    if (method !== "PATCH") return methodNotAllowed();
    const body = await readJson(request), id = identifier(body.classId), found = await db.prepare("SELECT * FROM classes WHERE id=?").bind(id).first<ClassRow>();
    if (!found) throw new HttpError(404, "class_not_found");
    const teacherId = body.teacherId === undefined ? found.teacher_id : identifier(body.teacherId);
    const teacher = await db.prepare("SELECT id FROM users WHERE id=? AND role IN ('teacher','admin') AND status='active' AND deleted_at IS NULL").bind(teacherId).first();
    if (!teacher) throw new HttpError(400, "invalid_teacher");
    const archivedAt = body.archive === undefined ? found.archived_at : bool(body.archive) ? new Date().toISOString() : null;
    const ticket = await mutationTicket(request, env, user, "admin.class.update", "class", id, { teacherId, archivedAt },
      "EXISTS(SELECT 1 FROM classes WHERE id=? AND teacher_id=? AND archived_at IS ?) AND EXISTS(SELECT 1 FROM users WHERE id=? AND role IN ('teacher','admin') AND status='active' AND deleted_at IS NULL)", [id, found.teacher_id, found.archived_at, teacherId]);
    await commitMutation(env, ticket, [db.prepare(`UPDATE classes SET teacher_id=?,archived_at=? WHERE id=? AND ${TICKET}`).bind(teacherId, archivedAt, id, ticket.id)]);
    return json({ ok: true });
  }
  if (path === "/api/admin/packs") {
    if (method === "GET") {
      const found = await rows<{ pack_id: string; review_status: string; enabled: number; updated_by: string | null; updated_at: string }>(db,
        "SELECT pack_id,review_status,enabled,updated_by,updated_at FROM content_pack_status ORDER BY pack_id LIMIT ? OFFSET ?", page.limit, page.offset);
      return json({ packs: found.map(row => ({ packId: row.pack_id, reviewStatus: row.review_status, enabled: Boolean(row.enabled), updatedBy: row.updated_by, updatedAt: row.updated_at })),
        canReview: (env.GERMAN_REVIEWER_IDS ?? "").split(",").map(v => v.trim()).includes(user.id), ...page });
    }
    if (method !== "PATCH") return methodNotAllowed();
    const body = await readJson(request), packId = identifier(body.packId), reviewStatus = body.reviewStatus;
    if (reviewStatus !== "reviewed" && reviewStatus !== "pending-german-review") invalid("Invalid review status");
    const existing = await db.prepare("SELECT review_status FROM content_pack_status WHERE pack_id=?").bind(packId).first<{ review_status: string }>();
    if (reviewStatus === "reviewed" && existing?.review_status !== "reviewed" && !(env.GERMAN_REVIEWER_IDS ?? "").split(",").map(v => v.trim()).includes(user.id)) throw new HttpError(403, "qualified_reviewer_required");
    const enabled = bool(body.enabled);
    if (enabled && reviewStatus !== "reviewed") throw new HttpError(409, "review_required");
    const qualified = (env.GERMAN_REVIEWER_IDS ?? "").split(",").map(v => v.trim()).includes(user.id);
    const ticket = await mutationTicket(request, env, user, "admin.pack.update", "content_pack", packId, { reviewStatus, enabled, reviewer: user.displayName },
      reviewStatus === "reviewed" && !qualified ? "EXISTS(SELECT 1 FROM content_pack_status WHERE pack_id=? AND review_status='reviewed')" : "1", reviewStatus === "reviewed" && !qualified ? [packId] : []);
    await commitMutation(env, ticket, [db.prepare(`INSERT INTO content_pack_status(pack_id,review_status,enabled,updated_by,updated_at) SELECT ?,?,?,?,? WHERE ${TICKET}
      ON CONFLICT(pack_id) DO UPDATE SET review_status=excluded.review_status,enabled=excluded.enabled,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
      .bind(packId, reviewStatus, Number(enabled), user.id, new Date().toISOString(), ticket.id)]);
    return json({ ok: true });
  }
  if (path === "/api/admin/flags") {
    if (method === "GET") {
      const found = await rows<{ key: string; value_json: string }>(db, "SELECT key,value_json FROM feature_flags ORDER BY key LIMIT ? OFFSET ?", page.limit, page.offset);
      const flags: Record<string, boolean> = {};
      for (const row of found) { const value: unknown = JSON.parse(row.value_json); if (typeof value === "boolean") flags[row.key] = value; }
      return json({ flags, ...page });
    }
    if (method !== "PATCH") return methodNotAllowed();
    const body = await readJson(request), key = identifier(body.key), value = bool(body.value);
    if (!["email_login", "google_login", "class_leaderboard", "live_game", "bonus_rounds"].includes(key)) invalid("Unknown flag");
    if (value && ["email_login", "google_login", "live_game"].includes(key)) throw new HttpError(501, "provider_not_implemented");
    const ticket = await mutationTicket(request, env, user, "admin.flag.update", "feature_flag", key, { value });
    await commitMutation(env, ticket, [db.prepare(`INSERT INTO feature_flags(key,value_json,updated_by,updated_at) SELECT ?,?,?,? WHERE ${TICKET}
      ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
      .bind(key, JSON.stringify(value), user.id, new Date().toISOString(), ticket.id)]);
    return json({ ok: true });
  }
  if (path === "/api/admin/audit" || path === "/api/admin/data-requests") {
    if (method !== "GET") return methodNotAllowed();
    const clauses: string[] = [], values: unknown[] = [];
    if (path === "/api/admin/data-requests") clauses.push("action IN ('account.export','account.deleted','admin.user.delete')");
    if (url.searchParams.has("action")) { clauses.push("action=?"); values.push(text(url.searchParams.get("action"), "action", 100)); }
    if (url.searchParams.has("target")) { clauses.push("target_id=?"); values.push(identifier(url.searchParams.get("target"))); }
    const found = await rows<{ id: string; actor_id: string | null; action: string; target_type: string; target_id: string | null; meta_json: string; created_at: string }>(db,
      `SELECT id,actor_id,action,target_type,target_id,meta_json,created_at FROM audit_log ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY created_at DESC,id LIMIT ? OFFSET ?`, ...values, page.limit, page.offset);
    const entries = found.map(row => ({ id: row.id, actorId: row.actor_id, action: row.action, targetType: row.target_type, targetId: row.target_id, meta: JSON.parse(row.meta_json), createdAt: row.created_at,
      ...(path.endsWith("data-requests") ? { status: "completed" } : {}) }));
    if (url.searchParams.get("format") === "csv") {
      const csv = ["ID,Actor,Action,Target type,Target,Created", ...entries.map(row => [row.id, row.actorId, row.action, row.targetType, row.targetId, row.createdAt].map(csvCell).join(","))].join("\r\n");
      return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store, private", "Content-Disposition": 'attachment; filename="security-audit.csv"' } });
    }
    return json({ entries, ...page });
  }
  if (method !== "GET") return methodNotAllowed();
  const users = await rows<{ role: string; total: number }>(db, "SELECT role,COUNT(*) AS total FROM users WHERE deleted_at IS NULL GROUP BY role");
  const active = await db.prepare("SELECT COUNT(DISTINCT user_id) AS total FROM sessions WHERE last_seen_at>=?").bind(new Date(Date.now() - 7 * 86400_000).toISOString()).first<{ total: number }>();
  const classes = await db.prepare("SELECT COUNT(*) AS total FROM classes WHERE archived_at IS NULL").first<{ total: number }>();
  const seed = await db.prepare("SELECT MAX(created_at) AS created FROM audit_log WHERE action='seed.accounts'").first<{ created: string | null }>();
  let lastMigration: string | null = null, databaseBytes: number | null = null;
  try { const migration = await db.prepare("SELECT name FROM d1_migrations ORDER BY id DESC LIMIT 1").first<{ name: string }>(); lastMigration = migration?.name ?? null; } catch { /* Local fixtures can omit Wrangler's migrations table. */ }
  try { const count = await db.prepare("PRAGMA page_count").first<{ page_count: number }>(), size = await db.prepare("PRAGMA page_size").first<{ page_size: number }>(); databaseBytes = count && size ? count.page_count * size.page_size : null; } catch { /* D1 may restrict administrative PRAGMAs. */ }
  return json({ version: env.BUILD_SHA ?? "development", usersByRole: Object.fromEntries(users.map(row => [row.role, row.total])), weeklyActiveUsers: active?.total ?? 0,
    activeClasses: classes?.total ?? 0, lastMigration, lastSeedAt: seed?.created ?? null, databaseBytes, errorRate: null, syncErrors24h: null,
    unavailableMetrics: ["Worker request error rate and sync errors require Workers analytics integration"] });
}
