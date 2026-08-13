export type RapidGapState =
  | "missing"
  | "pending-review"
  | "publication-pending"
  | "excluded";

export type RapidGender = "masculine" | "feminine" | "neuter" | "plural";

export type RapidGenderLegendItem = {
  readonly article: "der" | "die" | "das";
  readonly gender: RapidGender;
  readonly colorToken: "gender-m" | "gender-f" | "gender-n" | "gender-pl";
  readonly shape: "square" | "circle" | "diamond" | "double";
  readonly learnerLabel: string;
};

export type RapidGreeting = {
  readonly id: string;
  readonly de: string;
  readonly en: string;
  readonly function: "greeting" | "farewell";
};

export type RapidQaGroup = {
  readonly id: string;
  readonly title: string;
  readonly register: "informal" | "formal";
  readonly question: string;
  readonly answers: readonly string[];
};

export type RapidVerb = {
  readonly id: "verb:sein" | "verb:heissen" | "verb:kommen";
  readonly infinitive: string;
  readonly meaningEn: string;
  readonly pattern: "irregular" | "published-partial";
  readonly forms: readonly { readonly person: string; readonly form: string }[];
};

export type RapidProfessionPair = {
  readonly id: string;
  readonly masculine: string;
  readonly feminine: string;
  readonly glossEn: string;
  readonly operation: string;
};

export type RapidPracticePrompt = {
  readonly id: string;
  readonly kind: "choice" | "build" | "respond";
  readonly prompt: string;
  readonly options?: readonly string[];
  readonly tokens?: readonly string[];
  readonly answer?: string;
  readonly accepted?: readonly string[];
};

export type RapidGap = {
  readonly code: string;
  readonly state: RapidGapState;
  readonly learnerMessage: string;
};

export type RapidLearnerContent = {
  readonly schemaVersion: "1.0.0";
  readonly projectionKind: "rapid-learner-content";
  readonly scope: {
    readonly lessonIds: readonly ["lesson:01", "lesson:02"];
    readonly policy: string;
  };
  readonly genderLegend: readonly RapidGenderLegendItem[];
  readonly greetings: readonly RapidGreeting[];
  readonly qaGroups: readonly RapidQaGroup[];
  readonly verbs: readonly RapidVerb[];
  readonly verbGap: {
    readonly learnerMessage: string;
    readonly state: "publication-pending";
    readonly requestedCount: 2;
  };
  readonly professionPairs: readonly RapidProfessionPair[];
  readonly pluralGap: {
    readonly state: "missing";
    readonly learnerMessage: string;
  };
  readonly practicePrompts: readonly RapidPracticePrompt[];
  readonly gaps: readonly RapidGap[];
};

