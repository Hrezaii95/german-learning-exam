import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createTestDb } from "./classes-db.js";
import { createSession } from "../src/auth/session.js";
import { errorResponse } from "../src/http.js";
import { handleClasses } from "../src/routes/classes.js";
import { handleDashboards } from "../src/routes/dashboards.js";
import { validateAssignmentProgress, deriveAssignmentProgress } from "../src/classes/progress.js";
import type { PlatformEnv } from "../src/types.js";

async function fixture() {
  const db = createTestDb();
  await db.exec(readFileSync(new URL("../migrations/0002_sync.sql", import.meta.url), "utf8"));
  const now = new Date().toISOString();
  const users = [{ id: "teacher", role: "teacher" }, { id: "other-teacher", role: "teacher" }, { id: "co-teacher", role: "teacher" }, { id: "student", role: "student" }, { id: "other-student", role: "student" }, { id: "admin", role: "admin" }];
  const cookies: Record<string, string> = {};
  for (const user of users) {
    await db.prepare("INSERT INTO users(id,username,display_name,role,status,must_change_password,is_demo,created_at) VALUES(?,?,?,?,'active',0,0,?)").bind(user.id, user.id, user.id, user.role, now).run();
    cookies[user.id] = (await createSession(db, user.id)).cookie.split(";")[0]!;
  }
  const env: PlatformEnv = { DB: db, ASSETS: { fetch: async () => new Response("missing", { status: 404 }) } };
  async function call(user: string | null, path: string, method = "GET", body?: unknown) {
    const request = new Request(`https://german.learnilabs.com${path}`, { method, headers: { ...(user ? { Cookie: cookies[user]! } : {}), ...(body === undefined ? {} : { Origin: "https://german.learnilabs.com", "Content-Type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    try { return await handleClasses(request, env) ?? await handleDashboards(request, env) ?? new Response("unknown", { status: 404 }); }
    catch (error) { return errorResponse(error); }
  }
  const classResponse = await call("teacher", "/api/teacher/classes", "POST", { name: "A1", bookId: "momente-a1" });
  assert.equal(classResponse.status, 201);
  const created = await classResponse.json() as { class: { id: string; joinCode: string } };
  const classId = created.class.id;
  assert.equal((await call("student", "/api/me/classes", "POST", { joinCode: created.class.joinCode })).status, 200);
  return { db, env, cookies, call, classId };
}

test("all class read/write routes enforce role and teacher ownership", async () => {
  const f = await fixture();
  assert.equal((await f.call(null, "/api/teacher/classes")).status, 401);
  for (const user of ["student", "other-student"]) assert.equal((await f.call(user, "/api/teacher/classes")).status, 403);
  for (const user of ["other-teacher", "admin"]) assert.equal((await f.call(user, `/api/teacher/class?id=${f.classId}`)).status, 404);
  assert.equal((await f.call("teacher", `/api/teacher/class?id=${f.classId}`)).status, 200);
  const home = await f.call("teacher", "/api/teacher/classes");
  assert.equal(home.status, 200);
  const homeData = await home.json() as { classes: Array<{ studentCount: number; activeStudents: number; assignmentCount: number; behindCount: number }> };
  assert.equal(homeData.classes[0]?.studentCount, 1);
  assert.equal(homeData.classes[0]?.activeStudents, 0);
  assert.equal(homeData.classes[0]?.assignmentCount, 0);
  assert.equal(homeData.classes[0]?.behindCount, 1);
  assert.equal((await f.call("other-teacher", "/api/teacher/class/position", "POST", { classId: f.classId, lesson: 4 })).status, 404);
  f.db.close();
});

test("membership join is idempotent, hides codes and leave removes access", async () => {
  const f = await fixture();
  const current = await (await f.call("student", "/api/me/classes")).json() as { classes: Array<Record<string, unknown>> };
  assert.equal(current.classes.length, 1);
  assert.equal(current.classes[0]?.joinCode, undefined);
  assert.equal((await f.call("other-student", "/api/me/position", "POST", { book: "momente-a1", lesson: 1, followClassId: f.classId })).status, 404);
  assert.equal((await f.call("student", "/api/me/position", "POST", { book: "momente-a1", lesson: 1, followClassId: f.classId })).status, 200);
  await f.call("teacher", "/api/teacher/class/position", "POST", { classId: f.classId, lesson: 5, page: 62 });
  const follow = await (await f.call("student", "/api/me/position")).json() as { position: { lesson: number; page: number } };
  assert.equal(follow.position.lesson, 5); assert.equal(follow.position.page, 62);
  await f.call("student", "/api/me/classes", "DELETE", { classId: f.classId });
  const left = await (await f.call("student", "/api/me/classes")).json() as { classes: unknown[] };
  assert.equal(left.classes.length, 0);
  f.db.close();
});

test("co-teachers can teach but only owner can change codes, settings or roster", async () => {
  const f = await fixture();
  assert.equal((await f.call("teacher", "/api/teacher/class/members", "POST", { classId: f.classId, userId: "co-teacher", memberRole: "co_teacher" })).status, 200);
  assert.equal((await f.call("co-teacher", "/api/teacher/class/position", "POST", { classId: f.classId, lesson: 5 })).status, 200);
  assert.equal((await f.call("co-teacher", "/api/teacher/class", "PATCH", { classId: f.classId, regenerateJoinCode: true })).status, 403);
  assert.equal((await f.call("co-teacher", "/api/teacher/class/members", "DELETE", { classId: f.classId, userId: "student" })).status, 403);
  f.db.close();
});

test("assignment writes and progress are scoped, bounded, monotonic and retry-safe", async () => {
  const f = await fixture();
  assert.equal((await f.call("teacher", "/api/teacher/assignments", "POST", { classId: f.classId, title: "Bad", scope: { v: 2 }, skills: ["gender"], itemCount: 2 })).status, 400);
  const response = await f.call("teacher", "/api/teacher/assignments", "POST", { classId: f.classId, title: "Practice", scope: { v: 1, upTo: { lesson: 5 } }, skills: ["gender"], itemCount: 2 });
  assert.equal(response.status, 201);
  const body = await response.json() as { assignment: { id: string } }, assignmentId = body.assignment.id;
  const complete = { id: "late", type: "assignment.progress", payload: { assignmentId, answered: 2, correct: 1, completed: true, bySkill: { gender: { answered: 2, correct: 1 } } } };
  await assert.rejects(() => validateAssignmentProgress(f.db, "other-student", complete));
  await assert.rejects(() => validateAssignmentProgress(f.db, "student", { ...complete, payload: { ...complete.payload, answered: 1 } }));
  for (const event of [complete, { ...complete, id: "early", payload: { ...complete.payload, answered: 1, correct: 1, completed: false, bySkill: { gender: { answered: 1, correct: 1 } } } }]) {
    await validateAssignmentProgress(f.db, "student", event);
    await f.db.prepare("INSERT INTO sync_events(user_id,store,event_id,device_id,created_at,payload_json,event_type) VALUES(?,'wortwerk',?,'device',?,?,'assignment.progress')").bind("student", event.id, new Date().toISOString(), JSON.stringify(event)).run();
    await deriveAssignmentProgress(f.db, "student", event);
    await deriveAssignmentProgress(f.db, "student", event);
  }
  const result = await (await f.call("teacher", `/api/teacher/assignment?id=${assignmentId}`)).json() as { results: Array<{ progress: { answered: number; completed: boolean } }> };
  assert.equal(result.results[0]?.progress.answered, 2); assert.equal(result.results[0]?.progress.completed, true);
  assert.equal((await f.call("other-teacher", "/api/teacher/assignments", "PATCH", { id: assignmentId, title: "Theft" })).status, 404);
  assert.equal((await f.call("other-teacher", `/api/teacher/student?class=${f.classId}&id=student`)).status, 404);
  await f.call("student", "/api/me/classes", "DELETE", { classId: f.classId });
  await assert.rejects(() => validateAssignmentProgress(f.db, "student", complete));
  f.db.close();
});

test("teacher extras match the class-prefixed pack contract and never promote review status", async () => {
  const f = await fixture();
  const pack = { schemaVersion: 1, id: "p", title: "Words", language: "de", cefr: "A1", difficulty: "a1", units: [{ id: "u", title: "L1", canDo: [] }], maps: [], review: { status: "reviewed" }, items: [
    { id: "i", unitId: "u", type: "lexeme", source: "teacher-extra", lemma: "Haus", pos: "noun", meaning: "house", tags: [], bookRef: { book: "momente-a1", lesson: 1 } },
  ] };
  assert.equal((await f.call("other-teacher", "/api/teacher/extras", "POST", { classId: f.classId, pack })).status, 404);
  const response = await f.call("teacher", "/api/teacher/extras", "POST", { classId: f.classId, pack });
  assert.equal(response.status, 201);
  const body = await response.json() as { pack: { id: string; review: { status: string }; items: Array<{ source: string }> } };
  assert.ok(body.pack.id.includes(f.classId)); assert.equal(body.pack.review.status, "pending-german-review");
  const seen = await (await f.call("student", "/api/me/extras")).json() as unknown[];
  assert.equal(seen.length, 1);
  const absent = await (await f.call("other-student", "/api/me/extras")).json() as unknown[];
  assert.deepEqual(absent, []);
  assert.equal((await f.call("teacher", "/api/teacher/extras", "POST", { classId: f.classId, pack: { ...pack, items: [{ ...pack.items[0], source: "course" }] } })).status, 400);
  f.db.close();
});

test("dashboard and student details exclude raw notes and cross-class personal payloads", async () => {
  const f = await fixture();
  await f.db.prepare("INSERT INTO sync_docs(user_id,store,doc_key,value_json,updated_at,device_id) VALUES('student','learner.docs','notes',?,?, 'd')").bind(JSON.stringify({ secret: "personal-note-marker" }), new Date().toISOString()).run();
  const self = await (await f.call("student", "/api/me/dashboard")).text();
  const teacher = await (await f.call("teacher", `/api/teacher/student?class=${f.classId}&id=student`)).text();
  assert.ok(!self.includes("personal-note-marker")); assert.ok(!teacher.includes("personal-note-marker"));
  assert.equal((await f.call("teacher", `/api/teacher/student?class=${f.classId}&id=other-student`)).status, 404);
  f.db.close();
});

test("students can see and leave archived classes, immediately ending teacher visibility", async () => {
  const f = await fixture();
  assert.equal((await f.call("teacher", "/api/teacher/class", "PATCH", { classId: f.classId, archive: true })).status, 200);
  const classes = await (await f.call("student", "/api/me/classes")).json() as { classes: Array<{ id: string; archivedAt: string | null }> };
  assert.equal(classes.classes[0]?.id, f.classId); assert.ok(classes.classes[0]?.archivedAt);
  const dashboard = await (await f.call("student", "/api/me/dashboard")).json() as { classes: Array<{ id: string }> };
  assert.equal(dashboard.classes[0]?.id, f.classId);
  assert.equal((await f.call("student", "/api/me/classes", "DELETE", { classId: f.classId })).status, 200);
  assert.equal((await f.call("teacher", `/api/teacher/student?class=${f.classId}&id=student`)).status, 404);
  f.db.close();
});

test("teacher metrics expose only recognized bounded fields within the class book and position", async () => {
  const f = await fixture();
  await f.call("teacher", "/api/teacher/class/position", "POST", { classId: f.classId, lesson: 5, page: 62 });
  for (const [id, book, lesson, page] of [["public", "momente-a1", 1, 10], ["private-book-item", "other-private-book", 1, 10], ["future-lesson-item", "momente-a1", 6, 10], ["future-page-item", "momente-a1", 5, 63]]) {
    const event = { id, type: "answer", payload: { correct: false, skill: "gender", itemId: id, bookRef: { book, lesson, page }, privateNotes: "huge-private-field".repeat(3000) } };
    await f.db.prepare("INSERT INTO sync_events(user_id,store,event_id,device_id,created_at,payload_json,event_type) VALUES('student','wortwerk',?,'d',?,?,'answer')").bind(id, new Date().toISOString(), JSON.stringify(event)).run();
  }
  const response = await f.call("teacher", `/api/teacher/student?class=${f.classId}&id=student`);
  assert.equal(response.status, 200);
  const raw = await response.text();
  assert.ok(raw.includes('"itemId":"public"'));
  for (const privateValue of ["private-book-item", "other-private-book", "future-lesson-item", "future-page-item", "huge-private-field"]) assert.ok(!raw.includes(privateValue), privateValue);
  assert.ok(raw.length < 5000);
  f.db.close();
});
