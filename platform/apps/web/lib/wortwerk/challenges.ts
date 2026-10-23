import { encodeScope, parsePlayScope, playHref, type PlayScope } from "./links";
import { decodeStudentCode, encodeStudentCode, parseReceipt, ReceiptCodeError } from "./receipts";
import type { SyncEvent } from "./sync-store";
import { wortwerkStore, type WortwerkStore } from "./store";
export type BlitzChallenge = {
    v: 1;
    packId: string;
    scope: PlayScope;
    difficultyId: string;
    score: number;
    durationSeconds: 60;
};
export type PendingAssignment = {
    assignmentId: string;
    scope: PlayScope;
    packId?: string;
    receivedAt: string;
};
export const PENDING_ASSIGNMENTS_KEY = "assignments.pending";
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function identifier(value: unknown): value is string { return typeof value === "string" && !!value.trim() && value.length <= 160 && !/[\u0000-\u001f\u007f]/u.test(value); }
function invalid(): never { throw new ReceiptCodeError("invalid", "This challenge link is invalid."); }
export function parseChallenge(value: unknown): BlitzChallenge {
    if (!object(value))
        return invalid();
    if (typeof value.v === "number" && value.v > 1)
        throw new ReceiptCodeError("update-required", "Please update the app to open this challenge.");
    if (value.v !== 1 || !identifier(value.packId) || !identifier(value.difficultyId) || value.durationSeconds !== 60
        || !Number.isSafeInteger(value.score) || Number(value.score) < 0 || Number(value.score) > 100000)
        return invalid();
    const scope = parsePlayScope(value.scope);
    if (encodeScope(scope).length > 30000)
        return invalid();
    return { v: 1, packId: value.packId, difficultyId: value.difficultyId, score: value.score as number, durationSeconds: 60, scope };
}
export function encodeChallenge(challenge: BlitzChallenge): string { return encodeStudentCode("WWC1", parseChallenge(challenge)); }
export function decodeChallenge(code: string): BlitzChallenge { return parseChallenge(decodeStudentCode(code, "WWC1", 60000)); }
export function challengeHref(challenge: BlitzChallenge): string {
    const value = parseChallenge(challenge);
    const query = new URLSearchParams({ challenge: encodeChallenge(value), scope: encodeScope(value.scope), pack: value.packId, difficulty: value.difficultyId });
    return `/play/blitz?${query.toString()}`;
}
export function readPendingAssignments(value: unknown): PendingAssignment[] {
    if (value === undefined)
        return [];
    if (!object(value) || value.v !== 1 || !Array.isArray(value.assignments) || value.assignments.length > 25)
        return [];
    const result: PendingAssignment[] = [];
    for (const row of value.assignments) {
        if (!object(row) || !identifier(row.assignmentId) || (row.packId !== undefined && !identifier(row.packId))
            || typeof row.receivedAt !== "string" || !Number.isFinite(Date.parse(row.receivedAt)))
            continue;
        try {
            const scope = parsePlayScope(row.scope);
            if (encodeScope(scope).length > 30000 || result.some(existing => existing.assignmentId === row.assignmentId))
                continue;
            result.push({ assignmentId: row.assignmentId, scope, receivedAt: row.receivedAt,
                ...(row.packId !== undefined ? { packId: row.packId as string } : {}) });
        }
        catch { /* One malformed row does not hide valid assignments. */ }
    }
    return result;
}
/** Called when a student opens an assignment. It only writes a syncable local doc. */
export function rememberAssignment(scope: PlayScope, assignmentId: string, store: WortwerkStore = wortwerkStore, packId?: string): void {
    if (!identifier(assignmentId) || (packId !== undefined && !identifier(packId)))
        throw new Error("Invalid assignment id");
    const normalized = parsePlayScope(scope);
    if (encodeScope(normalized).length > 30000)
        throw new Error("This assignment scope is too large.");
    store.refresh();
    const envelope = store.getSnapshot().docs.find(doc => doc.key === PENDING_ASSIGNMENTS_KEY);
    if (envelope && envelope.schemaVersion > 1)
        throw new Error("Please update the app before saving this assignment.");
    const current = store.getDoc<unknown>(PENDING_ASSIGNMENTS_KEY);
    if (object(current) && typeof current.v === "number" && current.v > 1)
        throw new Error("Please update the app before saving this assignment.");
    const assignments = readPendingAssignments(current);
    const existing = assignments.find(value => value.assignmentId === assignmentId);
    if (existing && JSON.stringify(existing.scope) === JSON.stringify(normalized) && existing.packId === packId)
        return;
    const row: PendingAssignment = { assignmentId, scope: normalized, receivedAt: new Date().toISOString(), ...(packId ? { packId } : {}) };
    store.setDoc(PENDING_ASSIGNMENTS_KEY, { v: 1, assignments: [row, ...assignments.filter(value => value.assignmentId !== assignmentId)].slice(0, 25) });
}
export function pendingAssignmentHref(assignment: PendingAssignment): string {
    return playHref(assignment.scope, { assignment: assignment.assignmentId, ...(assignment.packId ? { pack: assignment.packId } : {}) });
}
/** A shared target is comparable only for this exact pack, scope, level and duration. */
export function resolveChallengeTarget(code: string | null, context: {
    packId: string;
    scope: PlayScope;
    difficultyId: string;
}): {
    challenge: BlitzChallenge | null;
    error: string | null;
} {
    if (!code)
        return { challenge: null, error: null };
    try {
        const challenge = decodeChallenge(code);
        if (challenge.packId !== context.packId || challenge.difficultyId !== context.difficultyId
            || encodeScope(challenge.scope) !== encodeScope(context.scope)) {
            return { challenge: null, error: "This challenge uses a different pack, practice selection or level." };
        }
        return { challenge, error: null };
    }
    catch (error) {
        return { challenge: null, error: error instanceof Error ? error.message : "This challenge link is invalid." };
    }
}
/** Unknown schemas, future evidence and malformed result totals never hide a task. */
export function completedAssignmentIds(events: readonly SyncEvent[], now: Date): Set<string> {
    const completed = new Set<string>();
    if (!Number.isFinite(now.getTime()))
        return completed;
    for (const event of events) {
        const time = Date.parse(event.createdAt);
        if (event.store !== "wortwerk" || event.schemaVersion !== 1 || event.type !== "assignment.progress"
            || !Number.isFinite(time) || time > now.getTime() || !object(event.payload) || event.payload.completed !== true)
            continue;
        try {
            const receipt = parseReceipt({ v: 1, packId: "assignment", assignmentId: event.payload.assignmentId,
                completedAt: event.createdAt, answered: event.payload.answered, correct: event.payload.correct, bySkill: event.payload.bySkill });
            if (receipt.assignmentId)
                completed.add(receipt.assignmentId);
        }
        catch { /* An unsupported/malformed event remains raw history only. */ }
    }
    return completed;
}
