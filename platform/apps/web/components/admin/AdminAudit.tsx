"use client";
import { useSession } from "../../lib/account/session";
import { useState } from "react";
import { DataState, Field, JsonDetails, Panel, RolePage, displayDate, exportCsv, styles, useApiData } from "../dashboard/PlatformTools";
import { AdminNav } from "./AdminNav";
type Entry = { id: string; actorId: string | null; action: string; targetType: string; targetId: string | null; meta: unknown; createdAt: string };
function AdminAuditContents() {
  const [action, setAction] = useState(""); const [offset, setOffset] = useState(0);
  const state = useApiData<{ entries: Entry[] }>(`/api/admin/audit?${new URLSearchParams({ action, limit: "50", offset: String(offset) })}`);
  return <RolePage title="Security audit log" roles={["admin"]}><AdminNav /><Panel title="Filter & export"><Field label="Action"><input value={action} onChange={e => { setAction(e.target.value); setOffset(0); }} placeholder="login, user.role, seed…" /></Field><p><button className={styles.button} disabled={!state.data} onClick={() => exportCsv((state.data?.entries ?? []) as unknown as Record<string, unknown>[], "security-audit.csv")}>Export this page as CSV</button></p><DataState loading={state.loading} error={state.error} /><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th scope="col">When</th><th scope="col">Actor</th><th scope="col">Action</th><th scope="col">Target</th><th scope="col">Details</th></tr></thead><tbody>{state.data?.entries.map(e => <tr key={e.id}><td>{displayDate(e.createdAt)}</td><td>{e.actorId ?? "Deleted account / system"}</td><td>{e.action}</td><td>{e.targetType} {e.targetId}</td><td><JsonDetails value={e.meta} /></td></tr>)}</tbody></table></div><div className={styles.actions}><button className={styles.button} disabled={offset === 0} onClick={() => setOffset(n => Math.max(0, n - 50))}>Previous</button><span>Page {offset / 50 + 1}</span><button className={styles.button} disabled={(state.data?.entries.length ?? 0) < 50} onClick={() => setOffset(n => n + 50)}>Next</button></div></Panel></RolePage>;
}

export function AdminAudit() { const session = useSession(); return <AdminAuditContents key={session.user?.id ?? session.status} />; }
