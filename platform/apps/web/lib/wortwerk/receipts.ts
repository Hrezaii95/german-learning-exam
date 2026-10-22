/** Public, self-reported result codes. The checksum is not authentication. */
export type SkillReceipt = {
    answered: number;
    correct: number;
};
export type CompletionReceipt = {
    v: 1;
    assignmentId?: string;
    packId: string;
    bySkill: Record<string, SkillReceipt>;
    completedAt: string;
    answered: number;
    correct: number;
};
export const RECEIPT_DISCLAIMER = "Checksum catches typing errors; this is not proof of identity or a verified score.";
export class ReceiptCodeError extends Error {
    constructor(public readonly code: "invalid" | "checksum" | "update-required", message: string) {
        super(message);
        this.name = "ReceiptCodeError";
    }
}
function invalid(): never { throw new ReceiptCodeError("invalid", "This result code is invalid."); }
function object(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function text(value: unknown, max = 160): value is string {
    return typeof value === "string" && !!value.trim() && value.length <= max && !/[\u0000-\u001f\u007f]/u.test(value);
}
function count(value: unknown): value is number {
    return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 100000;
}
function timestamp(value: unknown): value is string {
    return typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(value)
        && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
export function parseReceipt(value: unknown): CompletionReceipt {
    if (!object(value))
        return invalid();
    if (typeof value.v === "number" && value.v > 1)
        throw new ReceiptCodeError("update-required", "Please update the app to read this result code.");
    if (value.v !== 1 || !text(value.packId) || !timestamp(value.completedAt) || !count(value.answered) || !count(value.correct)
        || value.correct > value.answered || !object(value.bySkill))
        return invalid();
    if (value.assignmentId !== undefined && !text(value.assignmentId))
        return invalid();
    const entries = Object.entries(value.bySkill);
    if (entries.length > 32)
        return invalid();
    const bySkill: Record<string, SkillReceipt> = Object.create(null) as Record<string, SkillReceipt>;
    let answered = 0;
    let correct = 0;
    for (const [skill, result] of entries.sort(([a], [b]) => a.localeCompare(b, "en"))) {
        if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/u.test(skill) || ["constructor", "prototype"].includes(skill)
            || !object(result) || !count(result.answered) || !count(result.correct) || result.correct > result.answered)
            return invalid();
        bySkill[skill] = { answered: result.answered, correct: result.correct };
        answered += result.answered;
        correct += result.correct;
    }
    if (answered !== value.answered || correct !== value.correct)
        return invalid();
    return { v: 1, ...(value.assignmentId !== undefined ? { assignmentId: value.assignmentId as string } : {}),
        packId: value.packId, bySkill, completedAt: value.completedAt, answered: value.answered, correct: value.correct };
}
function checksum(payload: string): string {
    let hash = 0x811c9dc5;
    for (const byte of new TextEncoder().encode(payload)) {
        hash ^= byte;
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
}
/** Shared wire envelope for student links; errors are bounded before JSON parsing. */
export function encodeStudentCode(prefix: string, value: unknown): string {
    const json = JSON.stringify(value);
    const bytes = new TextEncoder().encode(json);
    const encoded = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(""))
        .replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
    return `${prefix}.${encoded}.${checksum(`${prefix}.${encoded}`)}`;
}
export function decodeStudentCode(code: string, prefix: string, maxLength = 20000): unknown {
    if (typeof code !== "string" || code.length > maxLength)
        return invalid();
    const parts = code.trim().split(".");
    if (parts.length !== 3)
        return invalid();
    const [header, encoded, check] = parts;
    const base = prefix.replace(/\d+$/u, "");
    if (header !== prefix) {
        const match = header?.match(new RegExp(`^${base}(\\d+)$`, "u"));
        if (match && Number(match[1]) > Number(prefix.slice(base.length)))
            throw new ReceiptCodeError("update-required", "Please update the app to open this code.");
        return invalid();
    }
    if (!encoded || !/^[A-Za-z0-9_-]+$/u.test(encoded) || !check || !/^[a-f0-9]{8}$/u.test(check))
        return invalid();
    if (checksum(`${header}.${encoded}`) !== check)
        throw new ReceiptCodeError("checksum", "The checksum does not match. Check the copied code for typing errors.");
    try {
        const bytes = Uint8Array.from(atob(encoded.replace(/-/gu, "+").replace(/_/gu, "/")), char => char.charCodeAt(0));
        const json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        return JSON.parse(json) as unknown;
    }
    catch {
        return invalid();
    }
}
export function encodeReceipt(receipt: CompletionReceipt): string {
    const value = parseReceipt(receipt);
    return encodeStudentCode("WRC1", { v: 1, ...(value.assignmentId ? { a: value.assignmentId } : {}), p: value.packId,
        t: Date.parse(value.completedAt), n: value.answered, c: value.correct,
        s: Object.entries(value.bySkill).map(([skill, result]) => [skill, result.answered, result.correct]) });
}
export function decodeReceipt(code: string): CompletionReceipt {
    const value = decodeStudentCode(code, "WRC1");
    if (!object(value) || value.v !== 1 || value.s === undefined)
        return parseReceipt(value);
    if (!Array.isArray(value.s) || value.s.length > 32 || typeof value.t !== "number" || !Number.isFinite(value.t))
        return invalid();
    const bySkill: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const row of value.s) {
        if (!Array.isArray(row) || row.length !== 3 || typeof row[0] !== "string" || Object.hasOwn(bySkill, row[0]))
            return invalid();
        bySkill[row[0]] = { answered: row[1], correct: row[2] };
    }
    let completedAt: string;
    try {
        completedAt = new Date(value.t).toISOString();
    }
    catch {
        return invalid();
    }
    return parseReceipt({ v: 1, ...(value.a !== undefined ? { assignmentId: value.a } : {}), packId: value.p,
        completedAt, answered: value.n, correct: value.c, bySkill });
}
