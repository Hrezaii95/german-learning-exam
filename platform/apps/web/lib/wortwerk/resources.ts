/** Browser-safe resource validation shared with the build-time pack loader. */
export type { PackStoryChapter, PackStoryResource, PackExamResource } from "../../../../packages/content/src/types/pack-resources.js";
export { parseStoryResource, parseExamResource, validateStoryResource, validateExamResource, assertPackResource, examItemRefs } from "../../../../packages/content/src/validation/pack-resources.js";

import { isAppRelativeHref } from "../../../../packages/content/src/validation/packs.js";
export function safeSourceHref(value: unknown): string | undefined {
  return typeof value === "string" && isAppRelativeHref(value) ? value : undefined;
}
