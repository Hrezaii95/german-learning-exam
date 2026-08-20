import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RichLessonVisual } from "../../apps/web/components/media/RichLessonVisual.js";
import { IllustrationPicture } from "../../apps/web/components/media/IllustrationPicture.js";
import {
  VOCABULARY_CONCEPT_LEXEME_IDS,
  illustrationForDetail,
  type LearnerIllustration,
} from "../../apps/web/lib/content/illustrations.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const webRoot = join(repoRoot, "platform", "apps", "web");
const publicIllustrations = join(webRoot, "public", "illustrations");
const sourceManifest = JSON.parse(
  readFileSync(
    join(repoRoot, "media", "generated", "vocabulary-batch-v2", "manifest.json"),
    "utf8",
  ),
) as readonly { key: string; german: string; alt: string }[];

/**
 * The declared needed set: the greetings and farewells, the five wellbeing
 * answers, the work-and-study nouns, the eight countries, and the profile,
 * status and address words of the accepted `vocabulary-batch-v2` delivery.
 * One image per lexeme — these words are not gendered pairs.
 */
const VOCABULARY_CONCEPT_IDS: readonly string[] = [
  "lex:hallo",
  "lex:guten-morgen",
  "lex:guten-tag",
  "lex:guten-abend",
  "lex:gute-nacht",
  "lex:auf-wiedersehen",
  "lex:tschues",
  "lex:super",
  "lex:auch-super",
  "lex:sehr-gut-danke",
  "lex:gut-danke",
  "lex:es-geht",
  "lex:nicht-so-gut",
  "lex:beruf",
  "lex:job",
  "lex:firma",
  "lex:ausbildung",
  "lex:praktikum",
  "lex:studium",
  "lex:deutschland",
  "lex:eritrea",
  "lex:frankreich",
  "lex:oesterreich",
  "lex:schweiz",
  "lex:spanien",
  "lex:tuerkei",
  "lex:usa",
  "lex:name",
  "lex:vorname",
  "lex:familienname",
  "lex:alter",
  "lex:jahr",
  "lex:kind",
  "lex:herkunft",
  "lex:wohnort",
  "lex:verheiratet",
  "lex:geschieden",
  "lex:single",
  "lex:allein",
  "lex:familienstand",
  "lex:herr",
  "lex:frau",
  "lex:stelle",
];

/** Every key is encoded twice per slot and three ways per encode. */
const DERIVATIVES_PER_KEY = 12;

/** Nothing a learner downloads may approach the ~2MB accepted source PNGs. */
const MAX_DERIVATIVE_BYTES = 100_000;

function resolved(lexemeId: string): LearnerIllustration {
  const illustration = illustrationForDetail(lexemeId);
  if (!illustration) throw new Error(`${lexemeId} resolved to no illustration`);
  return illustration;
}

function everyRendition(illustration: LearnerIllustration): readonly string[] {
  const responsive = illustration.responsive;
  if (!responsive) throw new Error(`${illustration.id} carries no responsive sources`);
  return [responsive.card, responsive.detail].flatMap((variant) =>
    [
      ...variant.fallback,
      ...variant.sources.flatMap((source) => source.renditions),
    ].map((rendition) => rendition.path),
  );
}

describe("vocabulary concept illustrations", () => {
  it("covers exactly the 43 lexemes of the accepted set", () => {
    expect(VOCABULARY_CONCEPT_IDS).toHaveLength(43);
    expect([...VOCABULARY_CONCEPT_LEXEME_IDS].sort()).toEqual(
      [...VOCABULARY_CONCEPT_IDS].sort(),
    );

    const unresolved = VOCABULARY_CONCEPT_IDS.filter(
      (lexemeId) => illustrationForDetail(lexemeId) === null,
    );
    expect(unresolved).toEqual([]);
  });

  it("gives every lexeme its own picture, never a shared one", () => {
    const filenames = VOCABULARY_CONCEPT_IDS.map((id) => resolved(id).filename);
    expect(new Set(filenames).size).toBe(43);
  });

  it("carries the accepted manifest's alt text verbatim", () => {
    expect(sourceManifest).toHaveLength(43);
    for (const entry of sourceManifest) {
      const illustration = resolved(`lex:${entry.key}`);
      expect(illustration.alt).toBe(entry.alt);
      expect(illustration.alt.trim().length).toBeGreaterThan(20);
      // The picture is a meaning cue: it must not spell out the German word.
      expect(illustration.alt.toLowerCase()).not.toContain(
        entry.german.replace(/[.!]$/u, "").toLowerCase(),
      );
    }
  });

  it("declares explicit dimensions on every rendition of both slots", () => {
    for (const lexemeId of VOCABULARY_CONCEPT_IDS) {
      const responsive = resolved(lexemeId).responsive;
      expect(responsive).not.toBeNull();
      if (!responsive) continue;

      expect(responsive.card.intrinsic.width).toBe(480);
      expect(responsive.card.intrinsic.height).toBe(480);
      expect(responsive.detail.intrinsic.width).toBe(1024);
      expect(responsive.detail.intrinsic.height).toBe(768);

      for (const variant of [responsive.card, responsive.detail]) {
        expect(variant.sizes.length).toBeGreaterThan(0);
        expect(variant.sources.map((source) => source.type)).toEqual([
          "image/avif",
          "image/webp",
        ]);
        const every = [
          ...variant.fallback,
          ...variant.sources.flatMap((source) => source.renditions),
        ];
        expect(every).toHaveLength(6);
        for (const rendition of every) {
          expect(rendition.width).toBeGreaterThan(0);
          expect(rendition.height).toBeGreaterThan(0);
        }
      }
    }
  });

  it("ships all 516 derivatives, each well under the payload budget", () => {
    const missing: string[] = [];
    const oversized: string[] = [];
    let counted = 0;

    for (const lexemeId of VOCABULARY_CONCEPT_IDS) {
      for (const relative of everyRendition(resolved(lexemeId))) {
        counted += 1;
        const absolute = join(publicIllustrations, ...relative.split("/"));
        if (!existsSync(absolute)) {
          missing.push(relative);
          continue;
        }
        if (statSync(absolute).size >= MAX_DERIVATIVE_BYTES) oversized.push(relative);
      }
    }

    expect(counted).toBe(VOCABULARY_CONCEPT_IDS.length * DERIVATIVES_PER_KEY);
    expect(counted).toBe(516);
    expect(missing).toEqual([]);
    expect(oversized).toEqual([]);
  });

  it("serves responsive sources lazily in the 1:1 hub card slot", () => {
    const responsive = resolved("lex:beruf").responsive;
    expect(responsive).not.toBeNull();
    if (!responsive) return;

    const html = renderToStaticMarkup(
      createElement(IllustrationPicture, {
        variant: responsive.card,
        alt: "scene",
        imageClassName: "hub-card__image",
        pictureClassName: "hub-card__picture",
        loading: "lazy" as const,
        objectPosition: "50% 50%",
      }),
    );

    expect(html).toContain('type="image/avif"');
    expect(html).toContain('type="image/webp"');
    expect(html).toContain("/illustrations/vocabulary/beruf-square-240.avif 240w");
    expect(html).toContain("/illustrations/vocabulary/beruf-square-480.webp 480w");
    expect(html).toContain("/illustrations/vocabulary/beruf-square-480.jpg");
    expect(html).toContain('width="480"');
    expect(html).toContain('height="480"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('sizes="');
  });

  it("serves the 4:3 detail slot eagerly, and titles it in German", () => {
    const html = renderToStaticMarkup(
      createElement(RichLessonVisual, { illustration: resolved("lex:guten-morgen") }),
    );

    expect(html).toContain("rich-visual--concept");
    expect(html).toContain(
      "/illustrations/vocabulary/guten-morgen-wide-1024.avif 1024w",
    );
    expect(html).toContain("/illustrations/vocabulary/guten-morgen-wide-512.webp 512w");
    expect(html).toContain('width="1024"');
    expect(html).toContain('height="768"');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('lang="de"');
    expect(html).toContain("Guten Morgen");
    expect(html).toContain("Sunrise light falls across a breakfast table");
  });

  it("titles a country by its learner-facing display form, article included", () => {
    // `Deutschland` takes no article and `die Schweiz` does; the title has to
    // follow the projected display text rather than a rule invented here.
    const germany = renderToStaticMarkup(
      createElement(RichLessonVisual, { illustration: resolved("lex:deutschland") }),
    );
    expect(germany).toContain("Deutschland");
    expect(germany).toContain("/illustrations/vocabulary/deutschland-wide-1024.avif 1024w");
    expect(germany).toContain('loading="eager"');

    const switzerland = renderToStaticMarkup(
      createElement(RichLessonVisual, { illustration: resolved("lex:schweiz") }),
    );
    expect(switzerland).toContain("die Schweiz");
    expect(switzerland).toContain("Two cable cars cross a valley");
    // No flag, no map outline, no lettering: the scene is a place, not an emblem.
    expect(switzerland.toLowerCase()).not.toContain("flag");
  });

  it("applies the GitHub Pages base path to every responsive source", () => {
    const previous = process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH;
    process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH = "/german-learning-exam";
    try {
      const html = renderToStaticMarkup(
        createElement(RichLessonVisual, { illustration: resolved("lex:studium") }),
      );
      expect(html).toContain(
        "/german-learning-exam/illustrations/vocabulary/studium-wide-1024.jpg",
      );
      expect(html).not.toContain('"/illustrations/vocabulary/studium');
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH;
      else process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH = previous;
    }
  });
});
