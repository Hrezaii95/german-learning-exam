/**
 * P4A — seven games: IDs, prompts, grading, parseLearnerEvent emission, routes.
 */
import { describe, expect, it } from "vitest";
import {
  parseLearnerEvent,
  type LearnerEvent,
} from "@german-learning/learning";
import {
  VOCAB_ARCHITEKT_CANONICAL,
  VERB_SEIN_CANONICAL,
  QA_PROFESSION_CASUAL_CANONICAL,
} from "../../apps/web/lib/content/detail-canonical-contract.js";
import {
  isSafeNavigationPath,
  buildDetailPracticeNavigationContext,
  resolveBackHref,
} from "../../apps/web/lib/content/navigation-context.js";
import {
  listCanonicalPracticeRoutePaths,
  resolveLearnerRoute,
} from "../../apps/web/lib/content/routes.js";
import { projectPublishedLearnerWeb } from "../../apps/web/lib/content/project.js";
import { projectPublishedLearnerDetails } from "../../apps/web/lib/content/detail-project.js";
import {
  PRACTICE_GAME_IDS,
  assertExactPracticeGameIds,
  isExactPracticeGameIdSet,
  practiceGameIdDiff,
  buildPracticeGameCatalog,
  buildPromptForGame,
  buildFlashcardPrompt,
  buildPictureWordMatchPrompt,
  buildArticleChoicePrompt,
  buildWordOrderPrompt,
  buildVerbBuilderPrompt,
  buildMorphologyPuzzlePrompt,
  gradeObjectiveAttempt,
  isUnsafePracticeAnswer,
  emitSelfRatedFlashcard,
  emitObjectiveGameAttempt,
  emitAudioMatchAttempt,
  createPracticeUuid,
  createPracticeTimestamp,
  practiceActivityId,
  taskFamilyForEnabledGame,
  measuredDimensionForEnabledGame,
  practiceCanonicalPath,
} from "../../apps/web/lib/games/index.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");

const SESSION = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function ids(): { eventId: string; timestamp: string } {
  return {
    eventId: createPracticeUuid(),
    timestamp: createPracticeTimestamp(),
  };
}

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return;
  }
  if (value != null && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectStrings(nested, out);
    }
  }
}

describe("P4A exact seven game IDs", () => {
  it("diff is empty for the canonical set", () => {
    const diff = practiceGameIdDiff([...PRACTICE_GAME_IDS]);
    expect(diff.missing).toEqual([]);
    expect(diff.unknown).toEqual([]);
    expect(diff.duplicates).toEqual([]);
    expect(isExactPracticeGameIdSet([...PRACTICE_GAME_IDS])).toBe(true);
    expect(() => assertExactPracticeGameIds([...PRACTICE_GAME_IDS])).not.toThrow();
  });

  it("fails closed on unknown, duplicate, or missing modes", () => {
    expect(practiceGameIdDiff(["flashcards"]).missing.length).toBe(6);
    expect(practiceGameIdDiff([...PRACTICE_GAME_IDS, "flashcards"]).duplicates).toContain(
      "flashcards",
    );
    expect(practiceGameIdDiff([...PRACTICE_GAME_IDS, "invented"]).unknown).toContain(
      "invented",
    );
    expect(() => assertExactPracticeGameIds(["flashcards"] as string[])).toThrow();
  });

  it("catalog exposes exactly seven modes with audio-match unavailable", () => {
    const catalog = buildPracticeGameCatalog();
    expect(catalog.map((g) => g.id)).toEqual([...PRACTICE_GAME_IDS]);
    const audio = catalog.find((g) => g.id === "audio-match")!;
    expect(audio.availability).toBe("unavailable");
    expect(catalog.filter((g) => g.availability === "enabled")).toHaveLength(6);
  });
});

describe("P4A representative prompts (P3D pins only)", () => {
  it("uses exact published German from the canonical contract", () => {
    const flash = buildFlashcardPrompt();
    expect(flash.frontDe).toBe(VOCAB_ARCHITEKT_CANONICAL.displayText);
    expect(flash.relatedDe).toBe(
      VOCAB_ARCHITEKT_CANONICAL.personForm.relatedDisplayText,
    );

    const picture = buildPictureWordMatchPrompt();
    expect(picture.choices.map((c) => c.displayText).sort()).toEqual(
      ["der Architekt", "die Architektin"].sort(),
    );

    const article = buildArticleChoicePrompt();
    expect([...article.choices].sort()).toEqual(["der", "die"].sort());
    expect(article.correctArticle).toBe("der");
    expect(article.lemma).toBe("Architekt");

    const word = buildWordOrderPrompt();
    expect(word.sourceSentence).toBe(
      QA_PROFESSION_CASUAL_CANONICAL.questionRealization,
    );

    const verb = buildVerbBuilderPrompt(0);
    expect(verb.expectedForm).toBe(VERB_SEIN_CANONICAL.present[0]!.form);
    expect(verb.formChoices).toEqual(
      VERB_SEIN_CANONICAL.present.map((p) => p.form),
    );

    const morph = buildMorphologyPuzzlePrompt();
    expect(morph.sharedStem).toBe("Architekt");
    expect(morph.feminineSuffix).toBe("in");
    expect(morph.expectedLemma).toBe("Architektin");
  });

  it("never leaks unpublished plurals or review audio markers in prompts", () => {
    const strings: string[] = [];
    for (const id of PRACTICE_GAME_IDS) {
      collectStrings(buildPromptForGame(id), strings);
    }
    const blob = strings.join("\n");
    expect(blob).not.toContain("Architekten");
    expect(blob).not.toContain("Architektinnen");
    expect(blob).not.toContain(".mp3");
    expect(blob).not.toContain("media/generated");
    expect(blob).not.toContain("candidate-needs-listening-review");
  });
});

describe("P4A grading + hint/reveal policy", () => {
  it("awards correct only without hint/reveal", () => {
    const clean = gradeObjectiveAttempt({
      rawAnswer: "bin",
      expectedNormalized: "bin",
      revealed: false,
      hintsUsed: 0,
    });
    expect(clean.outcome).toBe("correct");

    const hinted = gradeObjectiveAttempt({
      rawAnswer: "bin",
      expectedNormalized: "bin",
      revealed: false,
      hintsUsed: 1,
    });
    expect(hinted.outcome).toBe("partial");

    const revealed = gradeObjectiveAttempt({
      rawAnswer: "bin",
      expectedNormalized: "bin",
      revealed: true,
      hintsUsed: 0,
    });
    expect(revealed.outcome).toBe("partial");
  });

  it("rejects HTML/path-shaped answers without echoing them", () => {
    expect(isUnsafePracticeAnswer("<script>x</script>")).toBe(true);
    expect(isUnsafePracticeAnswer("../../etc/passwd")).toBe(true);
    const grade = gradeObjectiveAttempt({
      rawAnswer: "<b>bin</b>",
      expectedNormalized: "bin",
      revealed: false,
      hintsUsed: 0,
    });
    expect(grade.outcome).toBe("incorrect");
    expect(grade.feedbackMessage).not.toContain("<b>");
    expect(grade.feedbackMessage).not.toContain("script");
  });
});

describe("P4A parseLearnerEvent emissions", () => {
  it("flashcards emit selfRatedAttempt only — never objective correctness", () => {
    const { eventId, timestamp } = ids();
    const result = emitSelfRatedFlashcard({
      rating: "good",
      hintsUsed: 0,
      latencyMs: 900,
      conceptId: "lex:architekt",
      sessionId: SESSION,
      eventId,
      timestamp,
      activityId: practiceActivityId("flashcards"),
    });
    expect(result.emitted).toBe(true);
    if (!result.emitted) throw new Error("expected emit");
    const event = parseLearnerEvent(result.event);
    expect(event.kind).toBe("selfRatedAttempt");
    if (event.kind !== "selfRatedAttempt") throw new Error("expected selfRated");
    expect(event.taskFamily).toBe("flashcard");
    expect(event.measuredDimensions).toEqual(["recall"]);
    expect(event).not.toHaveProperty("graderOutcome");
  });

  it("six enabled objective games emit accepted events with exact family/dimension", () => {
    const cases: Array<{
      gameId: Exclude<
        (typeof PRACTICE_GAME_IDS)[number],
        "audio-match" | "flashcards"
      >;
      answer: string;
      expected: string;
      conceptId: "lex:architekt" | "verb:sein" | "qa:profession-casual-main";
    }> = [
      {
        gameId: "picture-word-match",
        answer: "der Architekt",
        expected: "der Architekt",
        conceptId: "lex:architekt",
      },
      {
        gameId: "article-choice",
        answer: "der",
        expected: "der",
        conceptId: "lex:architekt",
      },
      {
        gameId: "word-order",
        answer: "Was bist du von Beruf?",
        expected: "Was bist du von Beruf?",
        conceptId: "qa:profession-casual-main",
      },
      {
        gameId: "verb-builder",
        answer: "bin",
        expected: "bin",
        conceptId: "verb:sein",
      },
      {
        gameId: "morphology-puzzle",
        answer: "Architektin",
        expected: "Architektin",
        conceptId: "lex:architekt",
      },
    ];

    for (const row of cases) {
      const { eventId, timestamp } = ids();
      const result = emitObjectiveGameAttempt({
        gameId: row.gameId,
        rawAnswer: row.answer,
        expectedNormalized: row.expected,
        revealed: false,
        hintsUsed: 0,
        latencyMs: 800,
        conceptId: row.conceptId,
        sessionId: SESSION,
        eventId,
        timestamp,
        taskFamily: taskFamilyForEnabledGame(row.gameId),
        measuredDimension: measuredDimensionForEnabledGame(row.gameId),
        activityId: practiceActivityId(row.gameId),
      });
      expect(result.emitted).toBe(true);
      if (!result.emitted) throw new Error("expected emit");
      const event = parseLearnerEvent(result.event) as Extract<
        LearnerEvent,
        { kind: "objectiveAttempt" }
      >;
      expect(event.kind).toBe("objectiveAttempt");
      expect(event.taskFamily).toBe(taskFamilyForEnabledGame(row.gameId));
      expect(event.measuredDimensions).toEqual([
        measuredDimensionForEnabledGame(row.gameId),
      ]);
      expect(event.graderOutcome).toBe("correct");
      expect(event.conceptId).toBe(row.conceptId);
      expect(event.sourceActivityMode).toBe("review");
    }
  });

  it("hint/reveal cannot produce unqualified strong evidence (correct)", () => {
    const { eventId, timestamp } = ids();
    const result = emitObjectiveGameAttempt({
      gameId: "verb-builder",
      rawAnswer: "bin",
      expectedNormalized: "bin",
      revealed: true,
      hintsUsed: 1,
      latencyMs: 800,
      conceptId: "verb:sein",
      sessionId: SESSION,
      eventId,
      timestamp,
      taskFamily: "formManipulation",
      measuredDimension: "form",
      activityId: practiceActivityId("verb-builder"),
    });
    expect(result.emitted).toBe(true);
    if (!result.emitted) throw new Error("expected emit");
    expect(result.grade?.outcome).toBe("partial");
    const event = parseLearnerEvent(result.event);
    expect(event.kind).toBe("objectiveAttempt");
    if (event.kind !== "objectiveAttempt") throw new Error("expected objective");
    expect(event.graderOutcome).toBe("partial");
    expect(event.hintsUsed).toBe(1);
  });

  it("audio-match emits no graded event while unavailable", () => {
    const result = emitAudioMatchAttempt();
    expect(result.emitted).toBe(false);
    if (result.emitted) throw new Error("expected no emit");
    expect(result.reason).toBe("unavailable");
  });
});

describe("P4A practice routes", () => {
  const projection = projectPublishedLearnerWeb(publishedDir);
  const details = projectPublishedLearnerDetails(publishedDir);

  it("resolves selector and exact game IDs; unknown/malformed/extra 404", () => {
    expect(resolveLearnerRoute("/practice", projection, details).kind).toBe(
      "practice",
    );
    for (const id of PRACTICE_GAME_IDS) {
      const resolved = resolveLearnerRoute(
        practiceCanonicalPath(id),
        projection,
        details,
      );
      expect(resolved.kind).toBe("practice");
      if (resolved.kind === "practice") {
        expect(resolved.gameId).toBe(id);
      }
    }
    expect(
      resolveLearnerRoute("/practice/unknown-game", projection, details).kind,
    ).toBe("not-found");
    expect(
      resolveLearnerRoute("/practice/flashcards/extra", projection, details)
        .kind,
    ).toBe("not-found");
    expect(
      resolveLearnerRoute("/practice/<script>", projection, details).kind,
    ).toBe("not-found");
  });

  it("lists canonical practice paths and allows them in navigation", () => {
    const paths = listCanonicalPracticeRoutePaths();
    expect(paths).toContain("/practice");
    expect(paths).toHaveLength(8);
    for (const path of paths) {
      expect(isSafeNavigationPath(path)).toBe(true);
    }
  });

  it("Practise back context returns to the detail canonical path", () => {
    const nav = buildDetailPracticeNavigationContext({
      hubId: "vocabulary",
      detailPath: "/vocabulary/lex%3Aarchitekt",
      resultId: "lex:architekt",
    });
    expect(nav).not.toBeNull();
    expect(resolveBackHref(nav)).toBe("/vocabulary/lex%3Aarchitekt");
  });
});
