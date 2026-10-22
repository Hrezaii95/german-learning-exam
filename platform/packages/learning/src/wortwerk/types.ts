/** Raw evidence. These records are rebuilt from the syncable event log, never a saved percentage. */
export type LearningFormat = "recognition" | "reduced-cues" | "recall";
export type LearningAnswer = {
  selfAssessed?: boolean;
  eventId: string; packId: string; itemId: string; dimension: string; templateId: string;
  format: LearningFormat; correct: boolean; hinted: boolean;
  createdAt: string; studyDate: string; calendarDate?: string; sessionId?: string; latencyMs?: number;
  corrected?: boolean; skill?: string;
};
export type LearningSession = {
  sessionId: string; mode: "run" | "quick" | "blitz" | "boss" | "free";
  startedAt: string; completedAt: string; answered: number; correct: number;
  completed: boolean; studyDate: string; scopeKey?: string; difficultyId?: string;
};
export type LearningAssessment = "objective" | "self";
export type LearningTemplate = { id: string; dimension: string; skill: string; format: LearningFormat; assessment?: LearningAssessment };
export type LearningCapability = {
  packId: string; itemId: string; dimensions: readonly string[];
  templates: readonly LearningTemplate[];
};
export type DimensionProgress = {
  dimension: string; assessment?: LearningAssessment; practiceAttempts?: number; state: "new" | "learning" | "secured"; format: LearningFormat;
  attempts: number; correct: number; lapses: number; strength: number;
  due: boolean; dueAt: string | null; lastSeen: string | null;
  securedAt: string | null; recallDates: string[]; gold: boolean;
};
export type ItemProgress = {
  packId: string; itemId: string; segments: Record<string, DimensionProgress>;
  complete: boolean; gold: boolean;
};
export type RunReason = "new" | "review" | "tricky" | "maintenance" | "comeback" | "finisher";
export type RunTask = {
  packId: string; itemId: string; dimension: string; templateId: string;
  skill: string; format: LearningFormat; reason: RunReason;
};
export type DailyRunPlan = {
  tasks: RunTask[];
  preview: { new: number; reviews: number; tricky: number; byDimension: Record<string, number> };
  reasonText: string;
};
