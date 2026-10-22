"use client";
import { useSession } from "../../lib/account/session";
import { useState } from "react";
import { api } from "../../lib/api-client/client";
import { Action, Pagination, DataState, Panel, RolePage, styles, useApiData } from "../dashboard/PlatformTools";
import { AdminNav } from "./AdminNav";
const later = new Set(["email_login", "google_login", "live_game"]);
function AdminFlagsContents() {
  const [offset, setOffset] = useState(0);
  const state = useApiData<{ flags: Record<string, boolean> }>(`/api/admin/flags?limit=50&offset=${offset}`);
  return <RolePage title="Feature flags" roles={["admin"]}><AdminNav /><p>Changes are logged. Email, Google sign-in and live games stay disabled until their providers and flows are implemented.</p><DataState loading={state.loading} error={state.error} /><div className={styles.grid}>{Object.entries({ email_login: false, google_login: false, class_leaderboard: false, live_game: false, bonus_rounds: false, ...(state.data?.flags ?? {}) }).map(([key, value]) => <Panel key={key} title={key.replaceAll("_", " ")}><p>{value ? "On" : "Off"}</p>{later.has(key) ? <p className={styles.muted}>Prepared for a later release.</p> : <Action confirm={`Turn ${key} ${value ? "off" : "on"}?`} run={() => api("/api/admin/flags", { method: "PATCH", body: { key, value: !value } })} onSaved={state.reload}>Turn {value ? "off" : "on"}</Action>}</Panel>)}</div><Pagination offset={offset} count={Object.keys(state.data?.flags ?? {}).length} onChange={setOffset} /></RolePage>;
}

export function AdminFlags() { const session = useSession(); return <AdminFlagsContents key={session.user?.id ?? session.status} />; }
