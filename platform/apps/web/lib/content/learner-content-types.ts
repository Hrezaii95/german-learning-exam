/**
 * Minimal learner-facing content type aliases mirrored from the content package.
 * Kept local so the Next app graph does not import `@german-learning/content`.
 */

export type ActivityId = `activity:${string}`;
export type LessonId = `lesson:${string}`;

export type SkillDimension =
  | "exposure"
  | "recognition"
  | "recall"
  | "listening"
  | "production"
  | "review-stability";

export type LoopMode =
  | "see"
  | "hear"
  | "notice"
  | "repeat"
  | "recall"
  | "use"
  | "check"
  | "review";

export type Gender = "masculine" | "feminine" | "neuter";

export type TextToken =
  | { type: "plain"; text: string }
  | { type: "emphasis"; text: string; reason?: string }
  | { type: "gender"; text: string; gender: Gender | "plural" }
  | { type: "morph"; text: string; tag: "REG" | "SPELL" | "IRR" | "STEM" | "SUFFIX" }
  | { type: "gap"; label: string };

export type StructuredText = {
  tokens: TextToken[];
};

export type StructuredPrompt = {
  instruction: StructuredText;
  stem?: StructuredText;
  choices?: Array<{ id: string; label: StructuredText }>;
};
