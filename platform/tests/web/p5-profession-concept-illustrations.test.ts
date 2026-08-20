import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RichLessonVisual } from "../../apps/web/components/media/RichLessonVisual.js";
import { IllustrationPicture } from "../../apps/web/components/media/IllustrationPicture.js";
import { MeaningPlate } from "../../apps/web/components/media/MeaningPlate.js";
import {
  PROFESSION_CONCEPT_LEXEME_IDS,
  VOCABULARY_CONCEPT_LEXEME_IDS,
  illustrationForDetail,
  type LearnerIllustration,
} from "../../apps/web/lib/content/illustrations.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const webRoot = join(repoRoot, "platform", "apps", "web");
const publicIllustrations = join(webRoot, "public", "illustrations");
const globalsCss = join(webRoot, "app", "globals.css");
const hubs = JSON.parse(
  readFileSync(join(webRoot, "generated", "learner-hubs.json"), "utf8"),
) as { hubs: readonly { id: string; items: readonly { id: string }[] }[] };

/**
 * The declared needed set. Every profession pair, masculine form first — the
 * two lexemes of a pair must land on ONE image, because the picture shows the
 * work and never the person.
 */
const PROFESSION_PAIRS: readonly (readonly [string, string])[] = [
  ["lex:arzt", "lex:aerztin"],
  ["lex:friseur", "lex:friseurin"],
  ["lex:ingenieur", "lex:ingenieurin"],
  ["lex:journalist", "lex:journalistin"],
  ["lex:kellner", "lex:kellnerin"],
  ["lex:kfz-mechatroniker", "lex:kfz-mechatronikerin"],
  ["lex:lehrer", "lex:lehrerin"],
  ["lex:paketzusteller", "lex:paketzustellerin"],
  ["lex:rentner", "lex:rentnerin"],
  ["lex:schueler", "lex:schuelerin"],
  ["lex:student", "lex:studentin"],
  ["lex:verkaeufer", "lex:verkaeuferin"],
];

const ALL_PROFESSION_IDS = PROFESSION_PAIRS.flat();

/** Nothing a learner downloads may approach the ~2MB accepted source PNGs. */
const MAX_DERIVATIVE_BYTES = 100_000;

function vocabularyItemIds(): readonly string[] {
  const hub = hubs.hubs.find((entry) => entry.id === "vocabulary");
  if (!hub) throw new Error("vocabulary hub missing from the projected hubs");
  return hub.items.map((item) => item.id);
}

function resolved(lexemeId: string): LearnerIllustration {
  const illustration = illustrationForDetail(lexemeId);
  if (!illustration) throw new Error(`${lexemeId} resolved to no illustration`);
  return illustration;
}

describe("profession concept illustrations", () => {
  it("resolves all 24 profession lexemes to a concept image", () => {
    expect(ALL_PROFESSION_IDS).toHaveLength(24);
    expect([...PROFESSION_CONCEPT_LEXEME_IDS].sort()).toEqual(
      [...ALL_PROFESSION_IDS].sort(),
    );

    const unresolved = ALL_PROFESSION_IDS.filter(
      (lexemeId) => illustrationForDetail(lexemeId) === null,
    );
    expect(unresolved).toEqual([]);
  });

  it("gives both forms of a pair the same file, and each pair its own", () => {
    const perPair = PROFESSION_PAIRS.map(([masculine, feminine]) => {
      const one = resolved(masculine);
      const other = resolved(feminine);
      // Same object, same asset, same alt: the picture cannot carry gender.
      expect(one.filename).toBe(other.filename);
      expect(one.id).toBe(other.id);
      expect(one.alt).toBe(other.alt);
      expect(one.responsive?.card.intrinsic.path).toBe(
        other.responsive?.card.intrinsic.path,
      );
      return one.filename;
    });

    expect(new Set(perPair).size).toBe(12);
  });

  it("names both German forms in the caption, so gender stays in the HTML", () => {
    const illustration = resolved("lex:aerztin");
    expect(illustration.labels.map((label) => label.de)).toEqual([
      "der Arzt",
      "die Ärztin",
    ]);
    expect(illustration.labels.map((label) => label.gender)).toEqual([
      "masculine",
      "feminine",
    ]);

    const html = renderToStaticMarkup(createElement(RichLessonVisual, { illustration }));
    expect(html).toContain("der Arzt");
    expect(html).toContain("die Ärztin");
    expect(html).toContain('data-gender="masculine"');
    expect(html).toContain('data-gender="feminine"');
    // The picture is never titled with one of the two German words.
    expect(html).not.toContain('<span class="german" lang="de">der Arzt</span></h2>');
  });

  it("carries non-empty alt text that never states the German word", () => {
    for (const lexemeId of ALL_PROFESSION_IDS) {
      const illustration = resolved(lexemeId);
      expect(illustration.alt.trim().length).toBeGreaterThan(20);
      for (const label of illustration.labels) {
        const german = label.de.replace(/^(der|die)\s+/u, "");
        expect(illustration.alt.toLowerCase()).not.toContain(german.toLowerCase());
      }
    }
  });

  it("declares explicit dimensions on every rendition of both slots", () => {
    for (const lexemeId of ALL_PROFESSION_IDS) {
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

  it("ships every derivative, each well under the payload budget", () => {
    const missing: string[] = [];
    const oversized: string[] = [];

    for (const lexemeId of ALL_PROFESSION_IDS) {
      const responsive = resolved(lexemeId).responsive;
      if (!responsive) continue;
      for (const variant of [responsive.card, responsive.detail]) {
        const paths = [
          ...variant.fallback,
          ...variant.sources.flatMap((source) => source.renditions),
        ].map((rendition) => rendition.path);
        for (const relative of paths) {
          const absolute = join(publicIllustrations, ...relative.split("/"));
          if (!existsSync(absolute)) {
            missing.push(relative);
            continue;
          }
          if (statSync(absolute).size >= MAX_DERIVATIVE_BYTES) oversized.push(relative);
        }
      }
    }

    expect(missing).toEqual([]);
    expect(oversized).toEqual([]);
  });

  it("serves responsive sources with lazy loading in the 1:1 hub card slot", () => {
    const responsive = resolved("lex:lehrerin").responsive;
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
    expect(html).toContain("/illustrations/professions/lehrer-square-240.avif 240w");
    expect(html).toContain("/illustrations/professions/lehrer-square-480.webp 480w");
    expect(html).toContain("/illustrations/professions/lehrer-square-480.jpg");
    expect(html).toContain('width="480"');
    expect(html).toContain('height="480"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('sizes="');
  });

  it("serves the 4:3 detail slot eagerly, since it sits above the fold", () => {
    const html = renderToStaticMarkup(
      createElement(RichLessonVisual, { illustration: resolved("lex:student") }),
    );

    expect(html).toContain("rich-visual--concept");
    expect(html).toContain("/illustrations/professions/student-wide-1024.avif 1024w");
    expect(html).toContain("/illustrations/professions/student-wide-512.webp 512w");
    expect(html).toContain('width="1024"');
    expect(html).toContain('height="768"');
    expect(html).toContain('loading="eager"');
    expect(html).toContain("Adult hands study an open diagram book");
  });

  it("applies the GitHub Pages base path to every responsive source", () => {
    const previous = process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH;
    process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH = "/german-learning-exam";
    try {
      const html = renderToStaticMarkup(
        createElement(RichLessonVisual, { illustration: resolved("lex:kellner") }),
      );
      expect(html).toContain(
        "/german-learning-exam/illustrations/professions/kellner-wide-1024.jpg",
      );
      expect(html).not.toContain('"/illustrations/professions/kellner');
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH;
      else process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH = previous;
    }
  });
});

describe("the meaning plate keeps the vocabulary items that have no picture", () => {
  it("splits the vocabulary hub into 68 illustrated and 15 plate items", () => {
    const ids = vocabularyItemIds();
    expect(ids).toHaveLength(83);

    const illustrated = ids.filter((id) => illustrationForDetail(id) !== null);
    const plated = ids.filter((id) => illustrationForDetail(id) === null);

    expect(illustrated).toHaveLength(68);
    // The 24 professions, the 43 vocabulary concepts, and the older architect
    // studio scene.
    expect([...illustrated].sort()).toEqual(
      [
        ...ALL_PROFESSION_IDS,
        ...VOCABULARY_CONCEPT_LEXEME_IDS,
        "lex:architekt",
      ].sort(),
    );
    // The plate is not retired by full coverage: it is the declared media
    // treatment for anything without an approved illustration. Alongside the
    // feminine architect it now carries the fourteen words encoded straight
    // from the official glossary — courtesy phrases, the Lesson 1 pronouns,
    // and the Lesson 2 profile nouns — none of which has an approved
    // illustration yet. Drawing one is a media job, not a content one.
    expect([...plated].sort()).toEqual(
      [
        "lex:architektin",
        "lex:danke",
        "lex:du",
        "lex:entschuldigung",
        "lex:er",
        "lex:ich",
        "lex:interview",
        "lex:partner",
        "lex:partnerin",
        "lex:sie",
        "lex:sie-formal",
        "lex:text",
        "lex:und-dir",
        "lex:wie-bitte",
        "lex:zusammenleben",
      ].sort(),
    );
  });

  it("keeps the feminine architect on the plate while its scene shows a man", () => {
    // Not an oversight. The concept set is safe to share across both forms
    // precisely because every scene is gender-neutral; the older architect
    // illustration is not, so pairing it with `die Architektin` would use a
    // picture to assert the one thing the set refuses to assert.
    expect(illustrationForDetail("lex:architekt")?.filename).toBe(
      "vocabulary-architekt-studio.png",
    );
    expect(illustrationForDetail("lex:architektin")).toBeNull();
  });

  it("still renders a plate with its own reserved 1:1 card geometry", () => {
    const html = renderToStaticMarkup(
      createElement(MeaningPlate, {
        variant: "card" as const,
        headingLevel: 2 as const,
        lemma: "Beruf",
        article: "der",
        gloss: "job",
        gender: "masculine" as const,
      }),
    );

    expect(html).toContain('data-meaning-plate="card"');
    expect(html).toContain('lang="de"');
    expect(html).toContain("Beruf");
  });

  it("reserves the same box for a picture and for a plate, in both slots", () => {
    const css = readFileSync(globalsCss, "utf8");

    // Hub grid: a card with a picture and a card with a plate must not make a
    // checkerboard of mismatched heights inside one row.
    expect(css).toMatch(
      /\.hub-card__media\s*\{[^}]*aspect-ratio:\s*var\(--media-card-ratio\)/,
    );
    expect(css).toMatch(
      /\.meaning-plate--card\s*\{[^}]*aspect-ratio:\s*var\(--media-card-ratio\)/,
    );

    // Detail page: the concept illustration takes over exactly the 4:3 box the
    // plate held, capped at the same 32rem measure.
    expect(css).toMatch(
      /\.meaning-plate--detail\s*\{[^}]*aspect-ratio:\s*var\(--media-hero-ratio\)[^}]*max-inline-size:\s*32rem/,
    );
    expect(css).toMatch(
      /\.rich-visual--concept\s*\{[^}]*max-inline-size:\s*32rem/,
    );
    expect(css).toMatch(
      /\.rich-visual--concept\s\.rich-visual__media\s*\{[^}]*aspect-ratio:\s*var\(--media-hero-ratio\)/,
    );
  });
});

describe("the references page states where the artwork came from", () => {
  it("says the illustrations are original and not from the coursebook", () => {
    const view = readFileSync(
      join(webRoot, "components", "content", "ReferencesView.tsx"),
      "utf8",
    );
    expect(view).toContain("references-artwork");
    expect(view).toContain("was made for this app");
    expect(view).toContain("None of it comes from the");
  });
});
