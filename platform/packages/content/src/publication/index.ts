export * from "./fragment.js";
export * from "./metadata.js";
export * from "./authority.js";
export * from "./merge.js";
export * from "./gates.js";
export * from "./load.js";
export * from "./integrity.js";

/** Alias retained for callers that expect assertion-based row collection. */
export { collectTeacherSourceRowsFromAssertions as collectTeacherSourceRows } from "./gates.js";
