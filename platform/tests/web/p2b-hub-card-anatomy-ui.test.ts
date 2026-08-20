/**
 * Phase 2b — per-type hub card anatomies and the permanent meaning plate.
 *
 * These assert the chosen-direction contract in rendered markup:
 *  - no universal panel: each hub renders the anatomy its learner question needs;
 *  - the meaning plate is the permanent media treatment when no approved
 *    illustration exists, with the reserved geometry and a single audio control;
 *  - gender and verb-rule cues stay immutable (colour + shape + label);
 *  - nothing renders mastery, due counts, progress or audio without real data;
 *  - raw object ids never reach learner copy.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { projectPublishedLearnerHubs } from "../../apps/web/lib/content/hub-project.js";
import { projectPublishedLearnerDetails } from "../../apps/web/lib/content/detail-project.js";
import type { LearnerHubProjection } from "../../apps/web/lib/content/hub-types.js";
import type { LearnerDetailProjection } from "../../apps/web/lib/content/detail-types.js";

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    className?: string;
    "aria-label"?: string;
  }) {
    return createElement("a", { href, ...rest }, children);
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");

/** Copy that would claim learner state this static projection cannot back. */
const UNBACKED_STATE_COPY = [
  "Mastery",
  "mastery",
  "Due today",
  "due today",
  "Next review",
  "% learned",
] as const;

describe("P2B hub card anatomies", () => {
  let hubs: LearnerHubProjection;
  let details: LearnerDetailProjection;
  let HubListView: (props: {
    hub: LearnerHubProjection["hubs"][number];
    searchParams: Record<string, string | string[] | undefined>;
  }) => ReactNode;
  let DetailView: (props: { detail: unknown }) => ReactNode;
  let MeaningPlate: (props: Record<string, unknown>) => ReactNode;

  const render = (hubId: LearnerHubProjection["hubs"][number]["id"]) =>
    renderToStaticMarkup(
      createElement(HubListView, {
        hub: hubs.hubsById[hubId],
        searchParams: {},
      }),
    );

  beforeAll(async () => {
    hubs = projectPublishedLearnerHubs(publishedDir);
    details = projectPublishedLearnerDetails(publishedDir);
    const hubMod = await import("../../apps/web/components/hubs/HubViews.tsx");
    const detailMod = await import(
      "../../apps/web/components/details/DetailViews.tsx"
    );
    const plateMod = await import(
      "../../apps/web/components/media/MeaningPlate.tsx"
    );
    HubListView = hubMod.HubListView;
    DetailView = detailMod.DetailView as typeof DetailView;
    MeaningPlate = plateMod.MeaningPlate as typeof MeaningPlate;
  });

  it("gives every listing hub its own card anatomy instead of one shared panel", () => {
    const markers: Record<string, string> = {
      vocabulary: 'data-hub-card="vocabulary"',
      verbs: 'data-hub-card="verbs"',
      grammar: 'data-hub-card="grammar"',
      phrases: 'data-hub-card="phrases"',
      listening: 'data-hub-card="listening"',
      concepts: 'data-hub-card="concepts"',
    };
    const rendered = Object.fromEntries(
      Object.keys(markers).map((hubId) => [
        hubId,
        render(hubId as LearnerHubProjection["hubs"][number]["id"]),
      ]),
    );

    for (const [hubId, marker] of Object.entries(markers)) {
      expect(rendered[hubId]).toContain(marker);
      // No hub borrows another hub's anatomy.
      for (const [otherId, otherMarker] of Object.entries(markers)) {
        if (otherId === hubId) continue;
        expect(rendered[hubId]).not.toContain(otherMarker);
      }
    }
  });

  it("builds vocabulary cards from a 1:1 media slot, lemma, gloss, gender and plural", () => {
    const html = render("vocabulary");

    // Unillustrated items get the permanent plate in the reserved 1:1 slot.
    expect(html).toContain('data-media="plate"');
    expect(html).toContain('data-meaning-plate="card"');
    expect(html).toContain("die Ärztin");
    expect(html).toContain("doctor");
    // Gender stays colour + shape + label, never colour alone.
    expect(html).toContain('data-gender="feminine"');
    expect(html).toContain('data-gender-shape="circle"');
    expect(html).toContain("Feminine");
    // One concise morphology preview.
    expect(html).toContain("Plural");
    expect(html).toContain("die Ärztinnen");

    // The one approved vocabulary illustration keeps the media slot.
    expect(html).toContain('data-media="illustration"');
    expect(html).toContain("vocabulary-architekt-studio.png");
    // Illustrated cards still carry the same semantic anatomy.
    expect(html).toContain('data-meaning-plate="body"');
    expect(html).toContain("der Architekt");
  });

  it("keeps the plate honest: audio only for real clips, no invented review state", () => {
    const html = render("vocabulary");
    expect(html).toContain('data-meaning-plate-audio="true"');
    expect(html).toContain("Listen — die Ärztin pronunciation");
    for (const phrase of UNBACKED_STATE_COPY) {
      expect(html).not.toContain(phrase);
    }
    expect(html).not.toMatch(/<progress\b/);

    // Items with no article carry no gender cue at all rather than a guess.
    const adjectiveOnly = renderToStaticMarkup(
      createElement(MeaningPlate, {
        variant: "card",
        lemma: "allein",
        gloss: "alone",
      }),
    );
    expect(adjectiveOnly).toContain('data-gender="none"');
    expect(adjectiveOnly).not.toContain("gender-badge");
    expect(adjectiveOnly).not.toContain("meaning-plate__audio");
    expect(adjectiveOnly).not.toContain("meaning-plate__morph");
  });

  it("reserves the contract geometry for every plate variant", () => {
    for (const variant of ["card", "detail", "compact", "body"] as const) {
      const html = renderToStaticMarkup(
        createElement(MeaningPlate, {
          variant,
          lemma: "Ärztin",
          article: "die",
          gloss: "doctor",
          gender: "feminine",
        }),
      );
      expect(html).toContain(`meaning-plate--${variant}`);
      expect(html).toContain(`data-meaning-plate="${variant}"`);
      // Selectable HTML: German is text, never baked into an image.
      expect(html).toContain('lang="de"');
      expect(html).not.toContain("<img");
      // At most one audio control per plate.
      expect((html.match(/meaning-plate__audio-btn/g) ?? []).length).toBeLessThanOrEqual(1);
    }
  });

  it("labels verbs with their rule class and two useful forms", () => {
    const html = render("verbs");

    expect(html).toContain('data-verb-rule="IRR"'); // sein
    expect(html).toContain('data-verb-rule="SPELL"'); // arbeiten, heißen
    expect(html).toContain('data-verb-rule="REG"'); // kommen, wohnen, …
    // Rule cues reuse the locked --rule-* tone system.
    expect(html).toContain('data-tone="irregular"');
    expect(html).toContain('data-tone="special"');
    expect(html).toContain('data-tone="regular"');

    expect(html).toContain("to work");
    expect(html).toContain("arbeite");
    expect(html).toContain("arbeitest");
    expect(html).toContain("ich");
    expect(html).toContain("du");

    // Four of ten verbs have an approved clip; the rest show no player.
    expect(html).toContain("Listen — heißen pronunciation");
    expect(html).not.toContain("Listen — arbeiten pronunciation");
    expect(html).not.toContain("Pronunciation unavailable");
  });

  it("shows grammar rules by their German title, rule name and one worked model", () => {
    const html = render("grammar");
    expect(html).toContain("Herkunft mit aus");
    expect(html).toContain("Origin with aus");
    expect(html).toContain("Listen — Herkunft mit aus pronunciation");
    expect(html).not.toMatch(/\bgram:[a-z0-9-]/);

    // The contract's grammar anatomy is rule title plus one HTML model.
    const modelCount = (html.match(/hub-card__form\b/g) ?? []).length;
    expect(modelCount).toBe(hubs.hubsById.grammar.items.length);
    expect(html).toContain("Ich komme aus Deutschland.");
    expect(html).toContain("Ich bin Architekt.");
    // German model is selectable HTML, never baked into an image.
    expect(html).toMatch(
      /<dd class="german" lang="de">Ich komme aus Deutschland\.<\/dd>/,
    );
    expect(html).not.toMatch(/<img/);
    // Every card shows exactly one model, and no card invents one.
    for (const item of hubs.hubsById.grammar.items) {
      expect(typeof item.model).toBe("string");
      expect(html).toContain(item.model as string);
    }
  });

  it("previews phrases as a learner turn with its register, never a raw id", () => {
    const html = render("phrases");
    expect(html).toContain("Wie alt bist du?");
    expect(html).toContain('data-turn="question"');
    expect(html).toContain('data-turn="answer"');
    expect(html).toContain("Informal (du)");
    expect(html).toContain("Formal (Sie)");
    expect(html).toContain("Opens the whole exchange with its answers");
    // The learner-facing German question is the label.
    expect(html).not.toMatch(/\bqa:[a-z0-9-]/);
    expect(html).not.toMatch(/\bphrase:[a-z0-9-]/);
  });

  it("gives listening exercises a purpose, duration, track count and player action", () => {
    const html = render("listening");
    expect(html).toContain("Names and spelling");
    expect(html).toContain("AB 3");
    expect(html).toContain("4 tracks");
    expect(html).toMatch(/\d+ (sec|min)/);
    expect(html).toContain("Workbook exercises");
  });

  it("draws a concept relationship mini-map from real destinations only", () => {
    const html = render("concepts");
    expect(html).toContain("Where this topic goes");
    expect(html).toContain("concept-map__spoke");
    expect(html).toContain("connected items");
    // The map is HTML, not an image.
    expect(html).not.toMatch(/<img[^>]*concept/);
  });

  it("upgrades vocabulary detail pages individually with the 4:3 plate", () => {
    const withPicture = renderToStaticMarkup(
      createElement(DetailView, {
        detail: details.detailsById["lex:architekt"],
      }),
    );
    expect(withPicture).toContain("vocabulary-architekt-studio.png");
    expect(withPicture).not.toContain('data-meaning-plate="detail"');

    // `lex:architektin` has no illustration, so it keeps the plate. (`lex:aerztin`
    // stood here before the profession set, `lex:beruf` before the first
    // vocabulary batch and `lex:wohnort` before the second; all three now have a
    // picture of their own. The plate is not a gap treatment being phased out —
    // it is the declared media treatment for anything without an approved
    // illustration, so it is asserted here on the item that still uses it.)
    const withPlate = renderToStaticMarkup(
      createElement(DetailView, {
        detail: details.detailsById["lex:architektin"],
      }),
    );
    expect(withPlate).toContain('data-meaning-plate="detail"');
    expect(withPlate).toContain("meaning-plate--detail");
    expect(withPlate).toContain("die Architektinnen");
    expect(withPlate).toContain("Listen — die Architektin pronunciation");

    // A detail with no stored plural shows no morphology preview at all.
    // Every projected no-plural lexeme now carries an illustration, so this
    // holds the behaviour on a synthetic record instead: same shape as the
    // projected `lex:alter`, under an id no illustration is mapped to.
    const projectedNoPlural = details.detailsById["lex:alter"];
    if (projectedNoPlural?.kind !== "Lexeme") throw new Error("expected a lexeme");
    const syntheticNoPlural = {
      ...projectedNoPlural,
      id: "lex:__no-illustration-fixture",
    };
    const noPlural = renderToStaticMarkup(
      createElement(DetailView, { detail: syntheticNoPlural }),
    );
    expect(noPlural).toContain('data-meaning-plate="detail"');
    expect(noPlural).not.toContain("meaning-plate__morph");
  });
});
