"use client";
import { useSession } from "../../lib/account/session";
import { useState } from "react";
import Link from "next/link";
import { Pagination, DataState, Panel, RolePage, displayDate, styles, useApiData } from "../dashboard/PlatformTools";
import { AdminNav } from "./AdminNav";
type RequestEntry = { id: string; action: string; targetId: string | null; createdAt: string; status: string };
function AdminDataRequestsContents() {
  const [offset, setOffset] = useState(0);
  const state = useApiData<{ entries: RequestEntry[] }>(`/api/admin/data-requests?limit=50&offset=${offset}`);
  return <RolePage title="Data requests" roles={["admin"]}><AdminNav /><Panel title="Exports & deletions"><p>People can export or delete their own data in Account. Completed requests are recorded here. Administrators can delete an account from Users after verifying the request; personal notes are never exposed to administrators.</p><p><Link href="/admin/users/">Manage a verified deletion request</Link></p><DataState loading={state.loading} error={state.error} /><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th scope="col">When</th><th scope="col">Request</th><th scope="col">Account</th><th scope="col">Status</th></tr></thead><tbody>{state.data?.entries.map(e => <tr key={e.id}><td>{displayDate(e.createdAt)}</td><td>{e.action}</td><td>{e.targetId ?? "Deleted account"}</td><td>{e.status}</td></tr>)}</tbody></table></div>{state.data?.entries.length === 0 && <p>No completed export or deletion requests on this page.</p>}<Pagination offset={offset} count={state.data?.entries.length ?? 0} onChange={setOffset} /></Panel></RolePage>;
}

export function AdminDataRequests() { const session = useSession(); return <AdminDataRequestsContents key={session.user?.id ?? session.status} />; }
