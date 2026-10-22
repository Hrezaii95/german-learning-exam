import type {StudySource} from "./scope";

/** A local source filter never changes the learner's shared study selection. */
export function normalizeSheetSource(value:unknown):StudySource|undefined {
  return value==="course"||value==="teacher-extra"||value==="study-extra"?value:undefined;
}
