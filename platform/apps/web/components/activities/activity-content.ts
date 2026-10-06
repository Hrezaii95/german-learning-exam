import type { EnrichedActivity, EnrichmentContentTarget } from "../../lib/content/enrichment-types";
import type { LearnerActivity } from "../../lib/content/types";

export type ActivityQuestionKind = "matching" | "selection" | "typing" | "builder";

export type ActivityQuestion = Readonly<{
  id: string;
  /** Published concept ID when the answer can produce mastery evidence. */
  targetId: string | null;
  kind: ActivityQuestionKind;
  prompt: string;
  /** Interpolate after translating the template; never translate German stimuli. */
  promptValues?: Readonly<Record<string, string>>;
  hint?: string;
  /** Exact published German text; never derived from prompt prose. */
  spokenText: string;
  expected: string;
  /** Additional exact source-supported answers accepted by the grader. */
  accepted?: readonly string[];
  choices: readonly string[];
  tokens: readonly string[];
}>;

const ALPHABET_PRACTICE: readonly ActivityQuestion[] = Object.freeze([
  {
    id: "alphabet:special-characters",
    targetId: null,
    kind: "typing",
    prompt: "Type the four additional German characters in this order: A-umlaut, O-umlaut, U-umlaut, sharp s. Spaces are optional.",
    spokenText: "Ä Ö Ü ß",
    expected: "Ä Ö Ü ß",
    accepted: ["ÄÖÜß"],
    choices: [],
    tokens: [],
  },
  {
    id: "alphabet:spell-miriam",
    targetId: null,
    kind: "typing",
    prompt: "Spell the model first name Miriam with spaces between its letters.",
    spokenText: "M I R I A M",
    expected: "M I R I A M",
    choices: [],
    tokens: [],
  },
]);

const NUMBER_PRACTICE: readonly ActivityQuestion[] = Object.freeze([
  ["21", "einundzwanzig"],
  ["37", "siebenunddreißig"],
  ["46", "sechsundvierzig"],
  ["64", "vierundsechzig"],
  ["72", "zweiundsiebzig"],
  ["88", "achtundachtzig"],
  ["99", "neunundneunzig"],
  ["100", "hundert", "einhundert"],
].map(([number, expected, alternate]) => Object.freeze({
  id: `number:${number}`,
  targetId: null,
  kind: "typing" as const,
  prompt: "Write {number} as one German word.",
  promptValues: { number: number! },
  spokenText: expected!,
  expected: expected!,
  ...(alternate ? { accepted: Object.freeze([alternate]) } : {}),
  choices: Object.freeze([]) as readonly string[],
  tokens: Object.freeze([]) as readonly string[],
})));

export type ActivityPracticePlan = Readonly<{
  activityId: string;
  mechanic: "matching" | "selection" | "typing" | "builder" | "checkpoint" | "listening-notes" | "speaking-review";
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
    prompt: "Choose the meaning of “{word}”.",
    promptValues: { word: target.displayTextDe },
    spokenText: target.displayTextDe,
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
      ? "Build the German phrase for “{meaning}”."
      : "Build this phrase in the correct order.",
    ...(target.glossEn?.trim() ? { promptValues: { meaning: target.glossEn.trim() } } : {}),
    spokenText: target.displayTextDe,
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
    prompt: "Write the German word or phrase for “{meaning}”.",
    promptValues: { meaning: gloss },
    spokenText: target.displayTextDe,
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
      ? "Choose the German phrase for “{meaning}”."
      : "Choose “{word}” exactly as it is written.",
    promptValues: target.glossEn?.trim()
      ? { meaning: target.glossEn.trim() }
      : { word: target.displayTextDe },
    spokenText: target.displayTextDe,
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

function contextualQuestion(
  id: string,
  targetId: string | null,
  prompt: string,
  expected: string,
  kind: ActivityQuestionKind = "typing",
  choices: readonly string[] = [],
  hint?: string,
): ActivityQuestion {
  return {
    id, targetId, prompt, expected, kind, choices,
    spokenText: expected,
    tokens: kind === "builder" ? expected.split(/\s+/u).reverse() : [],
    ...(hint ? { hint } : {}),
  };
}

const NAME_FORM_HINT = "With ich, use heiße; with du, use heißt; with Sie, use heißen.";
const SEIN_FORM_HINT = "With ich, use bin; with du, use bist; with Sie, use sind.";

const NAME_FORMS = [
  contextualQuestion("name:ich-heisse", "verb:heissen", "Use heißen: Ich ___ Miriam.", "heiße", "selection", ["heißen", "heißt", "heiße"], NAME_FORM_HINT),
  contextualQuestion("name:formal-heissen", "verb:heissen", "Complete the polite question: Wie ___ Sie?", "heißen", "typing", [], NAME_FORM_HINT),
  contextualQuestion("name:ich-bin", "verb:sein", "Use sein: Ich ___ Miriam.", "bin", "selection", ["bist", "sind", "bin"], SEIN_FORM_HINT),
  contextualQuestion("name:du-heisst", "verb:heissen", "Complete the question with du: Wie ___ du?", "heißt", "typing", [], NAME_FORM_HINT),
] as const;

/** Cover the lesson's communicative outcomes, not the first alphabetic targets. */
const LESSON_ONE_CHECKPOINT: readonly ActivityQuestion[] = [
  contextualQuestion("checkpoint:greeting", "lex:guten-morgen", "It is morning. Which time-specific greeting fits?", "Guten Morgen", "selection", ["Guten Abend", "Auf Wiedersehen", "Guten Morgen", "Gute Nacht"], "Guten Morgen is a morning greeting. Gute Nacht is a farewell before sleep."),
  contextualQuestion("checkpoint:formal-name", "qa:name-formal", "Ask an adult you do not know for their name. Use Sie.", "Wie heißen Sie?", "selection", ["Wie heißt du?", "Woher kommen Sie?", "Wie heißen Sie?"], "Sie is the polite form. The question about a name begins with Wie heißen."),
  contextualQuestion("checkpoint:name-form", "verb:heissen", "Use heißen: Ich ___ Miriam.", "heiße", "typing", [], NAME_FORM_HINT),
  contextualQuestion("checkpoint:origin", "qa:origin-formal", "Ask an adult you do not know where they come from. Use Sie.", "Woher kommen Sie?", "builder", [], "Woher asks about origin. With Sie, use kommen."),
  { ...contextualQuestion("checkpoint:wellbeing", "qa:wellbeing-casual", "Someone asks “Wie geht’s dir?”. Say “Fine, thank you.” in German.", "Gut, danke.", "typing", [], "Gut means fine; danke means thank you."), accepted: ["Gut danke"] },
  // A checked spelling item, deliberately without invented mastery ownership.
  ALPHABET_PRACTICE[1]!,
];

const LESSON_TWO_CHECKPOINT: readonly ActivityQuestion[] = [
  contextualQuestion("checkpoint:relationship", "lex:verheiratet", "Choose the German word for “married”.", "verheiratet", "selection", ["geschieden", "allein", "verheiratet"], "Verheiratet means married; geschieden means divorced."),
  contextualQuestion("checkpoint:sein", "verb:sein", "Use sein: Ich ___ 25 Jahre alt.", "bin", "typing", [], SEIN_FORM_HINT),
  contextualQuestion("checkpoint:residence", "qa:residence-casual", "Ask a classmate where they live. Use du.", "Wo wohnst du?", "builder", [], "Wo asks about a place. With du, use wohnst."),
  contextualQuestion("checkpoint:age", "qa:age-casual", "Ask a classmate how old they are. Use du.", "Wie alt bist du?", "selection", ["Wo wohnst du?", "Wie alt bist du?", "Was bist du von Beruf?"], "Wie alt asks about age. With du, use bist."),
  contextualQuestion("checkpoint:profession", "qa:profession-casual-main", "Ask a classmate about their profession. Use du.", "Was bist du von Beruf?", "builder", [], "Von Beruf asks about a profession."),
  NUMBER_PRACTICE[0]!,
];

export function activityLearnerTitle(activity: LearnerActivity): string {
  const titles: Readonly<Record<string, string>> = {
    "activity:lesson-01-greetings-by-context": "Your first German greetings",
    "activity:lesson-01-greeting-farewell-match": "Greetings and goodbyes",
    "activity:lesson-01-heissen-sein-notice": "Names with heißen and sein",
    "activity:lesson-01-guided-intro-recording": "Say your introduction",
    "activity:lesson-01-checkpoint-summary": "Your first conversation checkpoint",
    "activity:lesson-02-checkpoint-summary": "Your personal profile checkpoint",
  };
  return titles[activity.id] ?? activity.promptPlainText;
}

export function buildActivityPracticePlan(
  activity: LearnerActivity,
  enrichment: EnrichedActivity | null,
): ActivityPracticePlan {
  const targets = prioritisePersistedOwner(
    activity.id,
    uniqueTargets(enrichment?.contentTargets ?? []),
  );

  if (activity.id === "activity:lesson-01-guided-intro-recording") {
    return {
      activityId: activity.id,
      mechanic: "speaking-review",
      title: "Say your introduction",
      instructions: "Say these sentences aloud using your own details.",
      questions: [],
      gradeable: false,
      missingReason: null,
    };
  }

  if (activity.id === "activity:lesson-01-heissen-sein-notice") {
    return {
      activityId: activity.id,
      mechanic: "selection",
      title: "Names with heißen and sein",
      instructions: "Use heißen to give a name and sein to say who someone is. Both Ich heiße Anna and Ich bin Anna can introduce Anna.",
      questions: NAME_FORMS,
      gradeable: true,
      missingReason: null,
    };
  }

  if (activity.id === "activity:lesson-01-alphabet-listen-spell") {
    return {
      activityId: activity.id,
      mechanic: "typing",
      title: "Alphabet and spelling lab",
      instructions: "Practise the German special characters and spelling a name. You can open the lesson audio for more listening practice.",
      questions: ALPHABET_PRACTICE,
      gradeable: true,
      missingReason: null,
    };
  }

  if (activity.id === "activity:lesson-02-numbers-0-100") {
    return {
      activityId: activity.id,
      mechanic: "typing",
      title: "Build numbers from 0 to 100",
      instructions: "German compound numbers put the ones before und and the tens after it. Write each answer as one word.",
      questions: NUMBER_PRACTICE,
      gradeable: true,
      missingReason: null,
    };
  }

  if (targets.length === 0) {
    return {
      activityId: activity.id,
      mechanic: "listening-notes",
      title: "Listening check",
      instructions: "Use the linked lesson audio, record what you heard, and confirm the listening pass. This activity is not graded because it has no answer key yet.",
      questions: [],
      gradeable: false,
      missingReason: "This listening activity has no answer key yet, so your answers cannot be checked.",
    };
  }

  if (activity.mode === "check") {
    return {
      activityId: activity.id,
      mechanic: "checkpoint",
      title: "Checkpoint questions",
      instructions: "Answer each question from this lesson. Feedback is immediate; retry any missed item.",
      questions: activity.lessonRouteSegment === "01" ? LESSON_ONE_CHECKPOINT
        : activity.lessonRouteSegment === "02" ? LESSON_TWO_CHECKPOINT
        : questionsForCheckpoint(targets),
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
        instructions: "Choose the meaning of each German phrase.",
        questions,
        gradeable: true,
        missingReason: null,
      };
    }
    const selected = targets.slice(0, Math.min(5, targets.length));
    return {
      activityId: activity.id,
      mechanic: "selection",
      title: "Select the right item",
      instructions: "Choose the phrase that fits the question.",
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
      instructions: "Reconstruct or type the German form, then check it against the lesson.",
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
    instructions: "Complete each question, then check your answer.",
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
