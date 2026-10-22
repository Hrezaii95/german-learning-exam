import type { ContentPack } from "../types/packs.js";
import type { PackExamResource, PackResourceKind, PackStoryResource } from "../types/pack-resources.js";
import { isRecord } from "./packs-schema.js";
export type PackResourceIssue = { path: string; message: string };
export type PackResourceResult<T> = { value: T | null; issues: PackResourceIssue[] };
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= 1000;
function strings(value: unknown): value is string[] { return Array.isArray(value) && value.length > 0 && value.length <= 1000 && value.every(text) && new Set(value).size === value.length; }
function base(value: unknown): PackResourceIssue[] {
  if (!isRecord(value)) return [{ path: "$", message: "Expected a resource object" }];
  return [...(value.schemaVersion !== 1 ? [{ path: "$.schemaVersion", message: "Expected resource schema version 1" }] : []), ...(!text(value.title) ? [{ path: "$.title", message: "Resource title is required" }] : [])];
}
export function validateStoryResource(value: unknown, pack: ContentPack): PackResourceIssue[] {
  const issues = base(value);
  if (!isRecord(value)) return issues;
  if (!Array.isArray(value.chapters) || value.chapters.length < 1 || value.chapters.length > 1000) return [...issues, { path: "$.chapters", message: "Expected 1–1000 chapters" }];
  const units = new Set(pack.units.map(unit => unit.id));
  const items = new Map(pack.items.map(item => [item.id, item]));
  const ids = new Set<string>();
  value.chapters.forEach((chapter, index) => {
    const path = `$.chapters[${index}]`;
    if (!isRecord(chapter)) { issues.push({ path, message: "Expected a chapter object" }); return; }
    if (!text(chapter.id) || ids.has(chapter.id)) issues.push({ path: `${path}.id`, message: "Chapter id must be nonempty and unique" });
    else ids.add(chapter.id);
    if (!text(chapter.title)) issues.push({ path: `${path}.title`, message: "Chapter title is required" });
    if (!text(chapter.unitId) || !units.has(chapter.unitId)) issues.push({ path: `${path}.unitId`, message: "Chapter unit does not exist" });
    if (!strings(chapter.itemRefs)) issues.push({ path: `${path}.itemRefs`, message: "Expected unique chapter item references" });
    else chapter.itemRefs.forEach(id => { const item = items.get(id); if (!item || !["dialogue", "text", "sentence"].includes(item.type)) issues.push({ path: `${path}.itemRefs`, message: `Unsupported story item reference: ${id}` }); });
    if (chapter.requires !== undefined) {
      const gate = chapter.requires;
      if (!isRecord(gate) || !text(gate.unitId) || !units.has(gate.unitId) || typeof gate.securedRatio !== "number" || !Number.isFinite(gate.securedRatio) || gate.securedRatio < 0 || gate.securedRatio > 1) issues.push({ path: `${path}.requires`, message: "Expected an existing unit and mastery ratio from 0 to 1" });
    }
  });
  return issues;
}
export function validateExamResource(value: unknown, pack: ContentPack): PackResourceIssue[] {
  const issues = base(value);
  if (!isRecord(value)) return issues;
  if (!strings(value.taskRefs)) return [...issues, { path: "$.taskRefs", message: "Expected unique examTask references" }];
  const items = new Map(pack.items.map(item => [item.id, item]));
  const visit = (id: string, ancestors: Set<string>): void => {
    if (ancestors.has(id)) { issues.push({ path: "$.taskRefs", message: `Cyclic exam reference: ${id}` }); return; }
    const item = items.get(id);
    if (!item) { issues.push({ path: "$.taskRefs", message: `Missing exam item reference: ${id}` }); return; }
    if (item.type !== "examTask") return;
    if (!Number.isInteger(item.timing) || item.timing < 1 || item.timing > 86400 || !strings(item.itemRefs)) { issues.push({ path: "$.taskRefs", message: `Invalid exam section definition: ${id}` }); return; }
    const next = new Set(ancestors); next.add(id);
    for (const ref of item.itemRefs) visit(ref, next);
  };
  for (const id of value.taskRefs) {
    if (items.get(id)?.type !== "examTask") issues.push({ path: "$.taskRefs", message: `Expected an examTask reference: ${id}` });
    else visit(id, new Set());
  }
  return issues;
}
export function parseStoryResource(value: unknown, pack: ContentPack): PackResourceResult<PackStoryResource> {
  const issues = validateStoryResource(value, pack);
  return { value: issues.length ? null : value as PackStoryResource, issues };
}
export function parseExamResource(value: unknown, pack: ContentPack): PackResourceResult<PackExamResource> {
  const issues = validateExamResource(value, pack);
  return { value: issues.length ? null : value as PackExamResource, issues };
}
export function assertPackResource(value: unknown, kind: PackResourceKind, pack: ContentPack): void {
  const issues = kind === "story" ? validateStoryResource(value, pack) : validateExamResource(value, pack);
  if (issues.length) throw new Error(`Invalid ${kind} resource: ${issues.map(issue => `${issue.path}: ${issue.message}`).join("; ")}`);
}
/** Resolve authored nested exam containers without manufacturing questions. */
export function examItemRefs(pack: ContentPack, taskId: string): string[] {
  const index = new Map(pack.items.map(item => [item.id, item]));
  const result = new Set<string>();
  const visit = (id: string, seen: Set<string>): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const item = index.get(id);
    if (item?.type === "examTask") for (const ref of item.itemRefs) visit(ref, seen);
    else if (item) result.add(id);
  };
  visit(taskId, new Set());
  return [...result];
}
