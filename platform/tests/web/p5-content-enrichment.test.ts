import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildContentIndexes,
  loadAndValidatePublication,
} from "@german-learning/content";
import {
  assertLearnerEnrichmentProjection,
  GENERATED_ENRICHMENT_PATH,
  projectPublishedLearnerEnrichment,
  serializeEnrichmentProjectionDeterministic,
} from "../../apps/web/lib/content/enrichment-access.js";
import type { LearnerEnrichmentProjection } from "../../apps/web/lib/content/enrichment-types.js";

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");
const expectedArtifact = join(
  platformRoot,
  "apps",
  "web",
  "generated",
  "enrichment",
  "learner-content-enrichment.json",
);

function collect(value: unknown, keys: string[], strings: string[]): void {
  if (typeof value === "string") {
    strings.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collect(item, keys, strings);
    return;
  }
  if (value != null && typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      keys.push(key);
      collect(nested, keys, strings);
    }
  }
}

describe("P5 learner content enrichment", () => {
  it("projects exact learner-safe Lessons 1–2 and core profession counts", () => {
    const projection = projectPublishedLearnerEnrichment(publishedDir);
    expect(projection.counts).toEqual({
      lessons: 2,
      activities: 23,
      professionCards: 26,
      professionPairs: 13,
      reviewOnlyTeacherRowsExcluded: 48,
      reviewOnlyTeacherLexemesExcluded: 86,
      professionPluralGaps: 26,
      professionAudioPendingReview: 26,
      professionImageGaps: 26,
      activityContentLinkGaps: 4,
    });
    expect(projection.activities).toHaveLength(23);
    expect(projection.professionCards).toHaveLength(26);
    expect(new Set(projection.professionCards.map((card) => card.personForm.relationId)).size).toBe(13);
    expect(projection.activities.filter((activity) => activity.contentTargets.length === 0).map((activity) => activity.id).sort()).toEqual([
      "activity:lesson-01-alphabet-listen-spell",
      "activity:lesson-01-workbook-listening",
      "activity:lesson-02-numbers-0-100",
      "activity:lesson-02-workbook-listening",
    ]);
  });

  it("is deterministically generated and contains no source, private, media, HTML, or assertion leaks", () => {
    const projection = projectPublishedLearnerEnrichment(publishedDir);
    const disk = readFileSync(expectedArtifact, "utf8");
    expect(GENERATED_ENRICHMENT_PATH).toBe(expectedArtifact);
    expect(disk).toBe(serializeEnrichmentProjectionDeterministic(projection));
    expect(createHash("sha256").update(disk).digest("hex")).toHaveLength(64);
    const parsed = JSON.parse(disk) as unknown;
    expect(() => assertLearnerEnrichmentProjection(parsed)).not.toThrow();

    const keys: string[] = [];
    const strings: string[] = [];
    collect(parsed, keys, strings);
    for (const key of keys) {
      expect(key).not.toMatch(/sourceassertion|assertionvalue|originalpath|privatepath|audiourl|mp3path|sha256|checksum|secret|password|apikey|credential|rawhtml/i);
    }
    for (const text of strings) {
      expect(text).not.toMatch(/assert:|\.mp3\b|resources[\\/]original|media[\\/]private|rights-gated:\/\/|[A-Z]:\\|\/Users\/|<\/?[a-z][^>]*>/i);
      expect(text).not.toMatch(/collection:teacher-professions|rel:teacher-row-|person-form:teacher-/i);
    }
  });

  it("resolves every relationship and activity target to the published learner graph", () => {
    const publication = loadAndValidatePublication({ publishedDir });
    expect(publication.ok).toBe(true);
    if (!publication.bundle) throw new Error("expected validated bundle");
    const bundle = publication.bundle;
    const indexes = buildContentIndexes(bundle);
    const projection = projectPublishedLearnerEnrichment(publishedDir);
    const relationIds = new Set<string>(bundle.relationships.map((relationship) => relationship.id));

    for (const activity of projection.activities) {
      expect(indexes.byId.get(activity.id)?.publicationStatus).toBe("published");
      expect(activity.source.sourcePriority).toBe(2);
      for (const target of activity.contentTargets) {
        const record = indexes.byId.get(target.id);
        expect(record?.publicationStatus).toBe("published");
        expect(record?.lessonIds).toContain(activity.lessonId);
      }
      for (const relationId of activity.relationIds) {
        expect(relationIds.has(relationId)).toBe(true);
      }
    }

    for (const card of projection.professionCards) {
      const canonical = bundle.lexemes.find((lexeme) => lexeme.id === card.id);
      expect(canonical?.publication.status).toBe("published");
      expect(canonical?.noun?.article).toBe(card.article);
      expect(canonical?.noun?.gender).toBe(card.gender);
      expect(canonical?.noun?.singular).toBe(card.singular);
      expect(canonical?.meanings[0]?.glossEn).toBe(card.glossEn);
      expect(projection.professionCardsById[card.personForm.pairedConceptId]).toBeTruthy();
      expect(projection.professionCardsById[card.personForm.pairedConceptId]?.personForm.pairedConceptId).toBe(card.id);
      expect(relationIds.has(card.personForm.relationId)).toBe(true);
    }
  });

  it("exposes only evidence-supported capabilities and explicit gap states", () => {
    const projection = projectPublishedLearnerEnrichment(publishedDir);
    for (const card of projection.professionCards) {
      expect(card.plural).toEqual({
        state: "missing",
        forms: [],
        learnerMessage: "Plural awaiting content approval.",
      });
      expect(card.reviewEligibility).toEqual({
        conceptEligible: true,
        cardTemplateState: "missing",
        schedulerReady: false,
      });
      expect(card.gameEligibility.find((game) => game.gameId === "article-sort")?.state).toBe("ready");
      expect(card.gameEligibility.find((game) => game.gameId === "plural-forge")?.state).toBe("missing");
      expect(card.gameEligibility.find((game) => game.gameId === "audio-match")?.state).toBe("pending-review");
      expect(card.mediaSlots.find((slot) => slot.kind === "image")?.state).toBe("missing");
    }
  });

  it("fails closed on tampered counts, index drift, HTML, and review-only leakage", () => {
    const base = projectPublishedLearnerEnrichment(publishedDir);
    const cases: Array<(clone: LearnerEnrichmentProjection) => void> = [
      (clone) => {
        (clone.counts as { activities: number }).activities = 99;
      },
      (clone) => {
        (clone.activitiesById as Record<string, unknown>)[clone.activities[0]!.id] = clone.activities[1]!;
      },
      (clone) => {
        (clone.professionCards[0] as { displayTextDe: string }).displayTextDe = "<b>unsafe</b>";
      },
      (clone) => {
        (clone.professionCards[0] as unknown as { relationIds: readonly string[] }).relationIds = ["rel:teacher-row-01"];
      },
    ];
    for (const mutate of cases) {
      const clone = structuredClone(base);
      mutate(clone);
      expect(() => assertLearnerEnrichmentProjection(clone)).toThrow();
    }
  });
});
