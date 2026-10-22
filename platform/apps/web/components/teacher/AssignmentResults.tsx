"use client";
import { useSession } from "../../lib/account/session";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "../../lib/api-client/client";
import { type AssignmentDto, type ProgressDto, playAssignmentHref } from "../../lib/api-client/types";
import { Pagination, DataState, Field, MutationForm, Panel, RolePage, exportCsv, styles, useApiData } from "../dashboard/PlatformTools";
type Result = { assignment: AssignmentDto; students: ({ userId: string; displayName: string; progress: ProgressDto | null })[]; trickyWords?: unknown[]; results?: ({ userId: string; displayName: string; progress: ProgressDto | null })[] };
function AssignmentResultsContents() {
  const id = useSearchParams().get("id") ?? "";
  const [offset, setOffset] = useState(0);
  const state = useApiData<Result>(id ? `/api/teacher/assignment?id=${encodeURIComponent(id)}&limit=50&offset=${offset}` : null);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState("");
  const data = state.data;
  const rows = data?.students ?? data?.results ?? [];
  const href = data ? playAssignmentHref(data.assignment) : "";
  const [qr, setQr] = useState("");
  useEffect(() => { if (!href) return; const base = process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH ?? ""; void QRCode.toDataURL(`${location.origin}${base}${href}`, { margin: 2, width: 240 }).then(setQr).catch(() => setQr("")); }, [href]);
  return <RolePage title={data?.assignment.title ?? "Assignment results"} roles={["teacher", "admin"]}><p><Link href="/teacher/">Teaching</Link></p>{!id ? <p>Choose an assignment from a class.</p> : <DataState loading={state.loading} error={state.error} />}{data && <><Panel title="Share this assignment"><p>Signed-in class members sync results automatically. Learners without an account can use the game’s result code when that mode is available.</p><p><Link href={href}>Open assignment</Link></p><button className={styles.button} onClick={() => { const base = process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH ?? ""; void navigator.clipboard.writeText(`${location.origin}${base}${href}`).then(() => { setCopied(true); setShareError(""); }).catch(() => setShareError("Copy is unavailable. Open the assignment and copy its address from the browser.")); }}>{copied ? "Link copied" : "Copy assignment link"}</button>{shareError && <p role="alert">{shareError}</p>}{qr && <p><img src={qr} width={240} height={240} alt="Scan to open this assignment" /></p>}</Panel><Panel title="Assignment details"><MutationForm onSaved={state.reload} submitLabel="Update title & due date" onSubmit={form => api("/api/teacher/assignments", { method: "PATCH", body: { id: data.assignment.id, title: String(form.get("title")), dueAt: form.get("dueAt") ? new Date(String(form.get("dueAt"))).toISOString() : null } })}><Field label="Title"><input name="title" defaultValue={data.assignment.title} required maxLength={160} /></Field><Field label="Due date (your local time)"><input name="dueAt" type="datetime-local" defaultValue={data.assignment.dueAt ? new Date(new Date(data.assignment.dueAt).getTime() - new Date(data.assignment.dueAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} /></Field></MutationForm><p className={styles.muted}>Create a new assignment to change scope or size, so existing results keep their meaning.</p></Panel><Panel title="Results"><p><button className={`${styles.button} ${styles.secondary}`} onClick={() => exportCsv(rows.map(row => ({ student: row.displayName, answered: row.progress?.answered ?? 0, correct: row.progress?.correct ?? 0, completed: row.progress?.completed ?? false, bySkill: row.progress?.bySkill ?? {} })), "assignment-results.csv")}>Export results as CSV</button></p><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th scope="col">Student</th><th scope="col">Completed</th><th scope="col">Answered</th><th scope="col">Correct</th><th scope="col">By skill</th></tr></thead><tbody>{rows.map(row => <tr key={row.userId}><th scope="row">{row.displayName}</th><td>{row.progress?.completed ? "Yes" : "Not yet"}</td><td>{row.progress?.answered ?? 0}</td><td>{row.progress?.correct ?? 0}</td><td>{Object.entries(row.progress?.bySkill ?? {}).map(([skill, value]) => <p key={skill}>{skill}: {value.correct}/{value.answered}</p>)}</td></tr>)}</tbody></table></div>{rows.length === 0 && <p>No class results on this page.</p>}<Pagination offset={offset} count={rows.length} onChange={setOffset} /></Panel>{Boolean(data.trickyWords?.length) && <Panel title="Most-missed items"><ul>{data.trickyWords?.map((word, i) => <li key={i}>{JSON.stringify(word)}</li>)}</ul></Panel>}</>}</RolePage>;
}

export function AssignmentResults() { const session = useSession(); return <AssignmentResultsContents key={session.user?.id ?? session.status} />; }
