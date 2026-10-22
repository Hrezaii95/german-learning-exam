"use client";
import { useSession } from "../../lib/account/session";
import { useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api-client/client";
import type { ClassDto } from "../../lib/api-client/types";
import { Pagination, DataState, Field, MutationForm, Panel, RolePage, styles, useApiData } from "../dashboard/PlatformTools";
function TeacherHomeContents() {
  const [offset, setOffset] = useState(0);
  const state = useApiData<{ classes: (ClassDto & { activeStudents?: number; studentCount?: number })[] }>(`/api/teacher/classes?limit=50&offset=${offset}`);
  return <RolePage title="Teaching" roles={["teacher", "admin"]}><p>Set the class position, assign a little practice and see who needs support.</p><DataState loading={state.loading} error={state.error} /><div className={styles.grid}>{state.data?.classes.map(c => <Panel key={c.id} title={c.name}><p>{c.bookId} · Lektion {c.position.lesson ?? "—"} · Seite {c.position.page ?? "—"}</p><p>{c.activeStudents ?? 0} / {c.studentCount ?? 0} students active this week</p>{c.joinCode && <p>Join code: <strong>{c.joinCode}</strong></p>}{c.archivedAt && <p>Archived</p>}<Link href={`/teacher/class/?id=${encodeURIComponent(c.id)}`}>Open class</Link></Panel>)}<Panel title="New class"><MutationForm submitLabel="Create class" onSaved={state.reload} onSubmit={data => api("/api/teacher/classes", { method: "POST", body: { name: String(data.get("name")), bookId: String(data.get("bookId")) } })}><Field label="Class name"><input name="name" required maxLength={160} /></Field><Field label="Book"><input name="bookId" defaultValue="momente-a1" required /></Field></MutationForm></Panel></div><Pagination offset={offset} count={state.data?.classes.length ?? 0} onChange={setOffset} />{state.data?.classes.length === 0 && <p>Your first class starts with a name. Create one and share its join code.</p>}</RolePage>;
}

export function TeacherHome() { const session = useSession(); return <TeacherHomeContents key={session.user?.id ?? session.status} />; }
