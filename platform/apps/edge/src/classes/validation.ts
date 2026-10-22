import { HttpError } from "../http.js";

export const SKILLS = ["meaning", "gender", "plural", "listening", "grammar", "reading", "writing", "speaking"] as const;
export type Skill = typeof SKILLS[number];
export type Scope = { v: 1; book?: string; upTo?: { lesson?: number; page?: number }; lessons?: number[]; tags?: string[]; sources?: string[]; skills?: Skill[]; items?: string[]; count?: number };
export type AssignmentProgress = { assignmentId: string; answered: number; correct: number; completed: boolean; bySkill: Partial<Record<Skill, { answered: number; correct: number }>> };

export function invalid(message = "Invalid input"): never { throw new HttpError(400, "invalid_input", message); }
export function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid();
  return input as Record<string, unknown>;
}
export function text(input: unknown, name = "value", max = 200): string {
  if (typeof input !== "string" || !input.trim() || input.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(input)) invalid(`Invalid ${name}`);
  return input.trim().normalize("NFC");
}
export function identifier(input: unknown): string {
  const value = text(input, "identifier", 150);
  if (!/^[\p{L}\p{N}_.:-]+$/u.test(value)) invalid("Invalid identifier");
  return value;
}
export function integer(input: unknown, min = 0, max = 10_000): number {
  if (typeof input !== "number" || !Number.isInteger(input) || input < min || input > max) invalid("Invalid number");
  return input;
}
export function bool(input: unknown): boolean { if (typeof input !== "boolean") invalid("Invalid boolean"); return input; }
export function timestamp(input: unknown): string | null {
  if (input === null || input === undefined || input === "") return null;
  if (typeof input !== "string" || !/^\d{4}-\d\d-\d\dT/u.test(input) || !Number.isFinite(Date.parse(input))) invalid("Invalid date");
  return new Date(input).toISOString();
}
export function stringList(input: unknown, max = 100): string[] {
  if (!Array.isArray(input) || input.length > max) invalid("Invalid list");
  return [...new Set(input.map(v => text(v, "list entry", 200)))];
}
export function skills(input: unknown): Skill[] {
  const result = stringList(input, SKILLS.length);
  if (!result.every(v => (SKILLS as readonly string[]).includes(v))) invalid("Invalid skill");
  return result as Skill[];
}
export function pagination(url: URL): { limit: number; offset: number } {
  function number(name: string, fallback: number, min: number, max: number) {
    const value = url.searchParams.get(name);
    if (value === null) return fallback;
    if (!/^\d+$/u.test(value)) invalid("Invalid pagination");
    return integer(Number(value), min, max);
  }
  return { limit: number("limit", 50, 1, 100), offset: number("offset", 0, 0, 1_000_000) };
}
export function validateScope(input: unknown): Scope {
  const value = record(input);
  if (value.v !== 1) invalid("Unsupported scope version");
  const scope: Scope = { v: 1 };
  if (value.book !== undefined) scope.book = identifier(value.book);
  if (value.upTo !== undefined) {
    const position = record(value.upTo), upTo: NonNullable<Scope["upTo"]> = {};
    if (position.lesson !== undefined) upTo.lesson = integer(position.lesson, 1, 100);
    if (position.page !== undefined) upTo.page = integer(position.page, 1, 5_000);
    if (upTo.lesson === undefined && upTo.page === undefined) invalid("Empty position");
    scope.upTo = upTo;
  }
  if (value.lessons !== undefined) {
    if (!Array.isArray(value.lessons) || value.lessons.length > 100) invalid();
    scope.lessons = [...new Set(value.lessons.map(v => integer(v, 1, 100)))];
  }
  for (const key of ["tags", "sources", "items"] as const) if (value[key] !== undefined) scope[key] = stringList(value[key], key === "items" ? 500 : 100);
  if (value.skills !== undefined) scope.skills = skills(value.skills);
  if (value.count !== undefined) scope.count = integer(value.count, 1, 200);
  return scope;
}
export function validateProgress(input: unknown): AssignmentProgress {
  const value = record(input);
  const answered = integer(value.answered), correct = integer(value.correct, 0, answered);
  const bySkill: AssignmentProgress["bySkill"] = {};
  const raw = record(value.bySkill);
  let skillAnswers = 0, skillCorrect = 0;
  for (const [key, scores] of Object.entries(raw)) {
    if (!(SKILLS as readonly string[]).includes(key)) invalid("Invalid skill");
    const score = record(scores), count = integer(score.answered, 0, answered), right = integer(score.correct, 0, Math.min(count, correct));
    bySkill[key as Skill] = { answered: count, correct: right };
    skillAnswers += count; skillCorrect += right;
  }
  if (skillAnswers > answered || skillCorrect > correct) invalid("Invalid skill totals");
  return { assignmentId: identifier(value.assignmentId), answered, correct, completed: bool(value.completed), bySkill };
}
