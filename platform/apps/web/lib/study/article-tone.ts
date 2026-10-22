import type { LearnerGender } from "../content/detail-types";

/** Presentation values stay independent of the published content schema. */
export type ArticleTone = "male" | "female" | "neuter" | "plural" | "plain";

export function articleTone(gender: LearnerGender | "plural" | null | undefined): ArticleTone {
  if (gender === "masculine") return "male";
  if (gender === "feminine") return "female";
  return gender ?? "plain";
}
