import { CORNERS_TEMPLATES } from "./templates/corners.js";
import { GRAMMAR_LISTENING_TEMPLATES } from "./templates/grammar-listening.js";
import { LITERACY_TEMPLATES } from "./templates/literacy.js";
import type { TaskTemplate } from "./tasks.js";

/** A later definition replaces an older one, matching the app's original registry order. */
export function deduplicateTemplates(templates: readonly TaskTemplate[]): readonly TaskTemplate[] {
  return Object.freeze([...new Map(templates.map(template => [template.id, template])).values()]);
}

/** Browser, server loader and authoring tools share these exact implementations. */
export const TASK_TEMPLATES = deduplicateTemplates([
  ...CORNERS_TEMPLATES, ...GRAMMAR_LISTENING_TEMPLATES, ...LITERACY_TEMPLATES,
]);
const byId = new Map(TASK_TEMPLATES.map(template => [template.id, template]));
export function getTaskTemplate(id: string): TaskTemplate | undefined { return byId.get(id); }
export function templateMinimum(template: TaskTemplate): number {
  const value = template.minItems ?? 1;
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid minimum item count for template ${template.id}`);
  return value;
}
