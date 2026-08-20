/**
 * The vocabulary example slot, end to end: what the projection carries and
 * what the detail page actually renders.
 *
 * Three halves of the contract, all equally load-bearing:
 *
 *  1. A word the course material shows in use presents that exact wording with
 *     `lang="de"`, above the book and page a learner can look up.
 *  2. A word the app wrote a sentence for presents that sentence the same way,
 *     but under a line saying we wrote it and a German speaker has not checked
 *     it — never a book title, because there is no book behind it.
 *  3. A word with neither renders no example section at all — not an empty
 *     heading, not a "coming soon" line. An invented placeholder would read to
 *     a learner as real German.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { projectPublishedLearnerDetails } from "../../apps/web/lib/content/detail-project.js";
import {
  DETAIL_APP_AUTHORED_EXAMPLE_NOTE,
  DETAIL_SOURCED_EXAMPLE_PREFIX,
} from "../../apps/web/lib/content/detail-canonical-contract.js";
import type {
  LearnerDetailProjection,
  LearnerDetailRecord,
  LearnerVocabularyDetail,
} from "../../apps/web/lib/content/detail-types.js";
import { learnerLanguageFindings } from "../../../tools/learner-language-rules.mjs";

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    className?: string;
    "aria-current"?: string;
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

/** Ids whose sources print the word in use, with the exact wording expected. */
const EXPECTED_EXAMPLE_IDS = [
  "lex:beruf",
  "lex:geschieden",
  "lex:jahr",
  "lex:kind",
  "lex:name",
  "lex:schweiz",
] as const;

/** How many words carry a sentence the app wrote and nobody has checked yet. */
const APP_AUTHORED_COUNT = 62;

/** The one published word with no sentence of either kind. */
const NO_EXAMPLE_ID = "lex:architekt";

function vocabulary(
  projection: LearnerDetailProjection,
  id: string,
): LearnerVocabularyDetail {
  const record: LearnerDetailRecord | undefined = projection.detailsById[id];
  if (record == null || record.kind !== "Lexeme") {
    throw new Error(`expected a vocabulary detail for ${id}`);
  }
  return record;
}

describe("vocabulary example projection", () => {
  const projection = projectPublishedLearnerDetails(publishedDir);

  function lexemes(): LearnerVocabularyDetail[] {
    return projection.details.filter(
      (row): row is LearnerVocabularyDetail => row.kind === "Lexeme",
    );
  }

  it("projects a quoted example for exactly the words the sources show in use", () => {
    expect(lexemes()).toHaveLength(69);
    const quoted = lexemes().filter((row) => row.example?.origin === "glossary");
    expect(quoted.map((row) => row.id).sort()).toEqual([...EXPECTED_EXAMPLE_IDS]);
  });

  it("projects an app-authored example for the words the app wrote one for", () => {
    const authored = lexemes().filter(
      (row) => row.example?.origin === "app-authored",
    );
    expect(authored).toHaveLength(APP_AUTHORED_COUNT);
    const quotedIds = new Set<string>(EXPECTED_EXAMPLE_IDS);
    for (const row of authored) {
      expect(quotedIds.has(row.id), `${row.id} must not be both`).toBe(false);
    }
  });

  it("carries the source wording untouched, with the page a learner can look up", () => {
    const schweiz = vocabulary(projection, "lex:schweiz");
    expect(schweiz.example).toEqual({
      origin: "glossary",
      de: "Er kommt aus der Schweiz.",
      en: "He is from Switzerland.",
      provenanceLabel: "From Momente A1.1 KB Glossar Deutsch–Englisch, page 2",
    });

    const beruf = vocabulary(projection, "lex:beruf");
    expect(beruf.example?.de).toBe("von Beruf");
    expect(beruf.example?.en).toBe("by profession");
    expect(beruf.example?.provenanceLabel).toContain("page 4");
  });

  /**
   * The app-authored line is the honesty guarantee, so it is pinned exactly:
   * one wording for every such sentence, naming no book and no page.
   */
  it("labels every app-authored sentence as ours and unchecked, never as a source", () => {
    const authored = lexemes().filter(
      (row) => row.example?.origin === "app-authored",
    );
    for (const row of authored) {
      const label = row.example!.provenanceLabel;
      expect(label, `${row.id} label`).toBe(DETAIL_APP_AUTHORED_EXAMPLE_NOTE);
      expect(label).not.toContain("Momente");
      expect(label).not.toContain(DETAIL_SOURCED_EXAMPLE_PREFIX);
      expect(label).not.toMatch(/page \d+/u);
    }
    expect(DETAIL_APP_AUTHORED_EXAMPLE_NOTE).toBe(
      "We wrote this sentence for the app. A German speaker still needs to check it.",
    );
  });

  it("carries the exact app-authored wording through to the learner", () => {
    expect(vocabulary(projection, "lex:aerztin").example).toEqual({
      origin: "app-authored",
      de: "Maria ist Ärztin.",
      en: "Maria is a doctor.",
      provenanceLabel: DETAIL_APP_AUTHORED_EXAMPLE_NOTE,
    });
    // One of the three the author flagged for a closer look. The flag is a note
    // to the reviewer, not learner copy, so the page reads exactly like the rest.
    expect(vocabulary(projection, "lex:alter").example).toEqual({
      origin: "app-authored",
      de: "Mein Alter ist 30 Jahre.",
      en: "I am 30 years old.",
      provenanceLabel: DETAIL_APP_AUTHORED_EXAMPLE_NOTE,
    });
  });

  it("projects null — never an empty or placeholder example — for the rest", () => {
    const others = lexemes().filter((row) => row.example == null);
    expect(others.map((row) => row.id)).toEqual([NO_EXAMPLE_ID]);
  });

  it("keeps internal ids and file paths out of every learner-visible label", () => {
    for (const row of lexemes()) {
      const label = row.example?.provenanceLabel ?? "";
      if (!label) continue;
      expect(label).not.toMatch(/src:|assert:|lex:|source:/);
      expect(label).not.toMatch(/resources\/original|media\/generated/);
    }
    for (const id of EXPECTED_EXAMPLE_IDS) {
      const label = vocabulary(projection, id).example?.provenanceLabel ?? "";
      expect(label).toMatch(/^From Momente A1\.1 .+, page \d+$/u);
    }
  });
});

describe("vocabulary example rendering", () => {
  let projection: LearnerDetailProjection;
  let DetailView: (props: { detail: LearnerDetailRecord }) => ReactNode;

  beforeAll(async () => {
    projection = projectPublishedLearnerDetails(publishedDir);
    const mod = await import("../../apps/web/components/details/DetailViews.tsx");
    DetailView = mod.DetailView as typeof DetailView;
  });

  function render(id: string): string {
    return renderToStaticMarkup(
      createElement(DetailView, { detail: vocabulary(projection, id) }),
    );
  }

  /**
   * What a learner actually reads: tags removed and entities resolved, so an
   * apostrophe rendered as `&#x27;` still matches the sentence it came from.
   */
  function visibleText(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, "\n")
      .replace(/&#x27;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&");
  }

  /** Just the example panel, so page chrome cannot satisfy an assertion. */
  function exampleSection(html: string): string {
    const start = html.indexOf('aria-labelledby="vocab-example-heading"');
    if (start < 0) return "";
    const end = html.indexOf("</section>", start);
    return html.slice(start, end < 0 ? undefined : end);
  }

  it("shows the German dominant and marked as German, with the English beneath", () => {
    const html = render("lex:schweiz");
    expect(html).toContain('id="vocab-example-heading"');
    expect(html).toContain(
      '<p class="vocab-example__de german" lang="de">Er kommt aus der Schweiz.</p>',
    );
    expect(html).toContain("He is from Switzerland.");
    expect(html).toContain("From Momente A1.1 KB Glossar Deutsch–Englisch, page 2");
    expect(html).toContain('data-example-origin="glossary"');
    // The section is a labelled region, so the heading names it for a screen reader.
    expect(html).toContain('aria-labelledby="vocab-example-heading"');
  });

  it("shows an app-authored sentence the same way, under the honest line", () => {
    const html = render("lex:aerztin");
    expect(html).toContain(
      '<p class="vocab-example__de german" lang="de">Maria ist Ärztin.</p>',
    );
    expect(html).toContain("Maria is a doctor.");
    expect(html).toContain(DETAIL_APP_AUTHORED_EXAMPLE_NOTE);
    expect(html).toContain('data-example-origin="app-authored"');
    // The one thing it must never say: no book, no page, nowhere in the panel.
    const panel = visibleText(exampleSection(html));
    expect(panel).not.toContain("Momente");
    expect(panel).not.toMatch(/page \d+/u);
    expect(panel).not.toContain("From ");
    expect(html).not.toContain("Momente");
  });

  it("renders the review line on every app-authored sentence, and only those", () => {
    let authored = 0;
    for (const record of projection.details) {
      if (record.kind !== "Lexeme") continue;
      const html = renderToStaticMarkup(
        createElement(DetailView, { detail: record }),
      );
      const origin = record.example?.origin ?? null;
      expect(html.includes(DETAIL_APP_AUTHORED_EXAMPLE_NOTE)).toBe(
        origin === "app-authored",
      );
      if (origin === "app-authored") authored += 1;
    }
    expect(authored).toBe(APP_AUTHORED_COUNT);
  });

  it("renders no example section at all when there is no sentence to show", () => {
    const html = render(NO_EXAMPLE_ID);
    expect(html).not.toContain("vocab-example");
    expect(html).not.toContain("vocab-example-heading");
    expect(html).not.toMatch(/>Example</);
    // Still a complete page — the absent example removes nothing else.
    expect(html).toContain('id="vocab-forms-heading"');
  });

  /**
   * The release gate reads the exported HTML; this reads the same component
   * output with the same rule set, so a jargon leak in the example slot is
   * caught here rather than at export time.
   */
  it("keeps the example wording clear of the learner-language rules", () => {
    const findings: string[] = [];
    for (const record of projection.details) {
      if (record.kind !== "Lexeme" || record.example == null) continue;
      const visible = renderToStaticMarkup(
        createElement(DetailView, { detail: record }),
      )
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, "\n");
      for (const line of visible.split("\n")) {
        const phrase = line.trim();
        if (!phrase) continue;
        for (const code of learnerLanguageFindings(phrase)) {
          findings.push(`${record.id} ${code}: ${phrase}`);
        }
      }
    }
    expect(findings).toEqual([]);
  });

  it("never renders an example section without both languages and its label", () => {
    for (const record of projection.details) {
      if (record.kind !== "Lexeme") continue;
      const html = renderToStaticMarkup(
        createElement(DetailView, { detail: record }),
      );
      const hasSection = html.includes("vocab-example-heading");
      expect(hasSection).toBe(record.example != null);
      if (!hasSection) continue;
      const panel = visibleText(exampleSection(html));
      expect(panel, `${record.id} German`).toContain(record.example!.de);
      expect(panel, `${record.id} English`).toContain(record.example!.en);
      expect(panel, `${record.id} label`).toContain(
        record.example!.provenanceLabel,
      );
      // German stays the dominant, correctly tagged line in every case.
      expect(html).toContain(
        `<p class="vocab-example__de german" lang="de">`,
      );
    }
  });
});
