"use client";
import { useSession } from "../../lib/account/session";
import { useState } from "react";
import { api } from "../../lib/api-client/client";
import type { ClassDto } from "../../lib/api-client/types";
import { Action, Pagination, DataState, Field, MutationForm, Panel, RolePage, styles, useApiData } from "../dashboard/PlatformTools";
import { AdminNav } from "./AdminNav";
function AdminClassesContents() {
  const [offset, setOffset] = useState(0);
  const state = useApiData<{ classes: ClassDto[] }>(`/api/admin/classes?limit=50&offset=${offset}`);
  return <RolePage title="All classes" roles={["admin"]}><AdminNav /><DataState loading={state.loading} error={state.error} /><div className={styles.grid}>{state.data?.classes.map(c => <Panel key={c.id} title={c.name}><p>{c.bookId} · {c.archivedAt ? "Archived" : "Active"}</p><MutationForm submitLabel="Transfer class" onSaved={state.reload} onSubmit={data => api("/api/admin/classes", { method: "PATCH", body: { classId: c.id, teacherId: String(data.get("teacherId")) } })}><Field label="Owning teacher account ID"><input name="teacherId" defaultValue={c.teacherId} required maxLength={128} /></Field></MutationForm><p><Action confirm={`Archive ${c.name}?`} run={() => api("/api/admin/classes", { method: "PATCH", body: { classId: c.id, archive: true } })} onSaved={state.reload}>Archive class</Action></p></Panel>)}</div><Pagination offset={offset} count={state.data?.classes.length ?? 0} onChange={setOffset} />{state.data?.classes.length === 0 && <p>No classes have been created.</p>}</RolePage>;
}

export function AdminClasses() { const session = useSession(); return <AdminClassesContents key={session.user?.id ?? session.status} />; }
