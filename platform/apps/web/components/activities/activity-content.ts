import type { EnrichedActivity, EnrichmentContentTarget } from "../../lib/content/enrichment-types";
import type { LearnerActivity } from "../../lib/content/types";

export type ActivityQuestionKind = "matching" | "selection" | "typing" | "builder";

export type ActivityQuestion = Readonly<{
  id: string;
  targetId: string;
  kind: ActivityQuestionKind;
  prompt: string;
  expected: string;
  choices: readonly string[];
  tokens: readonly string[];
}>;

export type ActivityPracticePlan = Readonly<{
  activityId: string;
  mechanic: "matching" | "selection" | "typing" | "builder" | "checkpoint" | "listening-notes";
  title: string;
  instructions: string;
  questions: readonly ActivityQuestion[];
  gradeable: boolean;
  missingReason: string | null;
}>;

const PERSISTED_OWNER_BY_ACTIVITY: Readonly<Record<string, string>> = Object.freeze({
  "activity:lesson-02-core-professions": "lex:architekt",
  "activity:lesson-02-person-form-morphology": "lex:architekt",
  "activity:lesson-02-sein-arbeiten-contrast": "verb:sein",
  "activity:lesson-02-profession-qa-builder": "qa:profession-casual-main",
});

function uniqueTargets(targets: readonly EnrichmentContentTarget[]): EnrichmentContentTarget[] {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = `${target.displayTextDe}\0${target.glossEn ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function prioritisePersistedOwner(
  activityId: string,
  targets: readonly EnrichmentContentTarget[],
): EnrichmentContentTarget[] {
  const owner = PERSISTED_OWNER_BY_ACTIVITY[activityId];
  if (!owner) return [...targets];
  return [...targets].sort((left, right) => Number(right.id === owner) - Number(left.id === owner));
}

function distinctGlossTargets(targets: readonly EnrichmentContentTarget[]): EnrichmentContentTarget[] {
  const counts = new Map<string, number>();
  for (const target of targets) {
    const gloss = target.glossEn?.trim();
    if (gloss) counts.set(gloss, (counts.get(gloss) ?? 0) + 1);
  }
  return targets.filter((target) => {
    const gloss = target.glossEn?.trim();
    return gloss !== undefined && gloss.length > 0 && counts.get(gloss) === 1;
  });
}

function choiceWindow(expected: string, allChoices: readonly string[], questionIndex: number): string[] {
  const alternatives = allChoices.filter((choice) => choice !== expected);
  const rotated = alternatives.length === 0
    ? []
    : alternatives.map((_, index) => alternatives[(index + questionIndex) % alternatives.length]!);
  return [expected, ...rotated.slice(0, 3)].sort((left, right) => left.localeCompare(right, "en"));
}

function matchingQuestions(targets: readonly EnrichmentContentTarget[]): ActivityQuestion[] {
  const selected = distinctGlossTargets(targets).slice(0, 5);
  const choices = selected.map((target) => target.glossEn!.trim());
  return selected.map((target, index) => ({
    id: `${target.id}:meaning`,
    targetId: target.id,
    kind: "matching",
    prompt: `Match “${target.displayTextDe}” to its published English meaning.`,
    expected: target.glossEn!.trim(),
    choices: choiceWindow(target.glossEn!.trim(), choices, index),
    tokens: [],
  }));
}

function builderQuestion(target: EnrichmentContentTarget): ActivityQuestion {
  const sourceTokens = target.displayTextDe.trim().split(/\s+/u);
  return {
    id: `${target.id}:build`,
    targetId: target.id,
    kind: "builder",
    prompt: target.glossEn?.trim()
      ? `Build the published German item meaning “${target.glossEn.trim()}”.`
      : "Build this published phrase in the correct order.",
    expected: target.displayTextDe,
    choices: [],
    tokens: [...sourceTokens].reverse(),
  };
}

function recallQuestion(target: EnrichmentContentTarget): ActivityQuestion {
  const gloss = target.glossEn?.trim();
  if (!gloss || target.displayTextDe.trim().split(/\s+/u).length > 3) {
    return builderQuestion(target);
  }
  return {
    id: `${target.id}:recall`,
    targetId: target.id,
    kind: "typing",
    prompt: `Type the published German item meaning “${gloss}”.`,
    expected: target.displayTextDe,
    choices: [],
    tokens: [],
  };
}

function selectionQuestion(
  target: EnrichmentContentTarget,
  targets: readonly EnrichmentContentTarget[],
  index: number,
): ActivityQuestion {
  const allChoices = targets.map((item) => item.displayTextDe);
  return {
    id: `${target.id}:select`,
    targetId: target.id,
    kind: "selection",
    prompt: target.glossEn?.trim()
      ? `Choose the published German item meaning “${target.glossEn.trim()}”.`
      : `Choose “${target.displayTextDe}” exactly as published.`,
    expected: target.displayTextDe,
    choices: choiceWindow(target.displayTextDe, allChoices, index),
    tokens: [],
  };
}

function questionsForCheckpoint(targets: readonly EnrichmentContentTarget[]): ActivityQuestion[] {
  const distinct = distinctGlossTargets(targets);
  const selected = (distinct.length >= 2 ? distinct : targets).slice(0, 5);
  return selected.map((target, index) => selectionQuestion(target, targets, index));
}

export function buildActivityPracticePlan(
  activity: LearnerActivity,
  enrichment: EnrichedActivity | null,
): ActivityPracticePlan {
  const targets = prioritisePersistedOwner(
    activity.id,
    uniqueTargets(enrichment?.contentTargets ?? []),
  );

  if (targets.length === 0) {
    return {
      activityId: activity.id,
      mechanic: "listening-notes",
      title: "Listening check",
      instructions: "Use the linked lesson audio, record what you heard, and confirm the listening pass. This activity is ungraded because its published projection has no answer key.",
      questions: [],
      gradeable: false,
      missingReason: "No gradeable content targets or answer key are published for this listening-led activity.",
    };
  }

  if (activity.mode === "check") {
    return {
      activityId: activity.id,
      mechanic: "checkpoint",
      title: "Checkpoint questions",
      instructions: "Answer each question from the published lesson set. Feedback is immediate; retry any missed item.",
      questions: questionsForCheckpoint(targets),
      gradeable: true,
      missingReason: null,
    };
  }

  if (activity.mode === "see" || activity.mode === "hear") {
    const questions = matchingQuestions(targets);
    if (questions.length >= 2) {
      return {
        activityId: activity.id,
        mechanic: "matching",
        title: "Meaning match",
        instructions: "Match each published German item to its published English meaning.",
        questions,
        gradeable: true,
        missingReason: null,
      };
    }
    const selected = targets.slice(0, Math.min(5, targets.length));
    return {
      activityId: activity.id,
      mechanic: "selection",
      title: "Select the published item",
      instructions: "Choose the item that matches the source-backed prompt.",
      questions: selected.map((target, index) => selectionQuestion(target, targets, index)),
      gradeable: true,
      missingReason: null,
    };
  }

  if (activity.mode === "notice") {
    const questions = targets.slice(0, 4).map((target) => {
      const tokenCount = target.displayTextDe.trim().split(/\s+/u).length;
      return tokenCount > 1 ? builderQuestion(target) : recallQuestion(target);
    });
    return {
      activityId: activity.id,
      mechanic: questions.some((question) => question.kind === "builder") ? "builder" : "typing",
      title: "Notice and build",
      instructions: "Reconstruct or type the published form, then check it against the lesson data.",
      questions,
      gradeable: true,
      missingReason: null,
    };
  }

  const questions = targets.slice(0, 4).map(recallQuestion);
  return {
    activityId: activity.id,
    mechanic: questions.some((question) => question.kind === "builder") ? "builder" : "typing",
    title: activity.mode === "use" ? "Build and use" : "Recall from memory",
    instructions: "Complete each source-backed prompt. Answers are checked against the published lesson item.",
    questions,
    gradeable: true,
    missingReason: null,
  };
}

export function normalizeActivityAnswer(value: string): string {
  return value
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ")
    .replace(/[.!?]+$/u, "")
    .toLocaleLowerCase("de-DE");
}

export function persistedConceptForActivity(activityId: string): string | null {
  return PERSISTED_OWNER_BY_ACTIVITY[activityId] ?? null;
}
