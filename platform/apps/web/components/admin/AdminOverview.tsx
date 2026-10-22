"use client";
import { useSession } from "../../lib/account/session";
import { DataState, Panel, RolePage, styles, useApiData } from "../dashboard/PlatformTools";
import { AdminNav } from "./AdminNav";
export type SystemDto = { version: string; usersByRole: Record<string, number>; weeklyActiveUsers: number; activeClasses: number; lastMigration: unknown; lastSeedAt: string | null; databaseBytes: number | null; errorRate: number | null; syncErrors24h: number | null };
function AdminOverviewContents({ system = false }: { system?: boolean }) {
  const state = useApiData<SystemDto>("/api/admin/system"); const d = state.data;
  return <RolePage title={system ? "System health" : "Admin overview"} roles={["admin"]}><AdminNav /><DataState loading={state.loading} error={state.error} />{d && <div className={styles.grid}><Panel title="People">{Object.entries(d.usersByRole).map(([role, count]) => <p key={role}>{role}: <strong>{count}</strong></p>)}<p>{d.weeklyActiveUsers} active in the last week</p></Panel><Panel title="Classes"><p>{d.activeClasses} active classes</p></Panel><Panel title="Sync & errors"><p>{d.syncErrors24h == null ? "Sync error metrics are not collected by the current API." : `${d.syncErrors24h} sync errors in 24 hours`}</p><p>{d.errorRate == null ? "Worker error rate is available in the Cloudflare dashboard." : `${d.errorRate}% Worker error rate`}</p></Panel><Panel title="Deployment"><p>Version: <code>{d.version}</code></p><p>Last seed: {d.lastSeedAt ?? "No seed recorded"}</p><p>Last migration: {typeof d.lastMigration === "object" ? JSON.stringify(d.lastMigration) : String(d.lastMigration ?? "Not available")}</p><p>D1 data size: {d.databaseBytes == null ? "Available in Cloudflare" : `${(d.databaseBytes / 1024).toFixed(1)} KiB`}</p></Panel></div>}</RolePage>;
}

export function AdminOverview({ system = false }: { system?: boolean }) { const session = useSession(); return <AdminOverviewContents key={session.user?.id ?? session.status} system={system} />; }
