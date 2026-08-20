/**
 * The vocabulary example slot, end to end: what the projection carries and
 * what the detail page actually renders.
 *
 * The two halves of the contract are equally load-bearing. A word the course
 * material shows in use must present that exact wording with `lang="de"`, and
 * a word it never shows in use must render no example section at all — not an
 * empty heading, not a "coming soon" line. An invented placeholder would read
 * to a learner as real German.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { projectPublishedLearnerDetails } from "../../apps/web/lib/content/detail-project.js";
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

  it("projects an example for exactly the words the sources show in use", () => {
    const lexemes = projection.details.filter(
      (row): row is LearnerVocabularyDetail => row.kind === "Lexeme",
    );
    expect(lexemes).toHaveLength(69);
    const withExample = lexemes.filter((row) => row.example != null);
    expect(withExample.map((row) => row.id).sort()).toEqual([
      ...EXPECTED_EXAMPLE_IDS,
    ]);
  });

  it("carries the source wording untouched, with the page a learner can look up", () => {
    const schweiz = vocabulary(projection, "lex:schweiz");
    expect(schweiz.example).toEqual({
      de: "Er kommt aus der Schweiz.",
      en: "He is from Switzerland.",
      sourceLabel: "Momente A1.1 KB Glossar Deutsch–Englisch, page 2",
    });

    const beruf = vocabulary(projection, "lex:beruf");
    expect(beruf.example?.de).toBe("von Beruf");
    expect(beruf.example?.en).toBe("by profession");
    expect(beruf.example?.sourceLabel).toContain("page 4");
  });

  it("projects null — never an empty or placeholder example — for the rest", () => {
    const known = new Set<string>(EXPECTED_EXAMPLE_IDS);
    const others = projection.details.filter(
      (row): row is LearnerVocabularyDetail =>
        row.kind === "Lexeme" && !known.has(row.id),
    );
    expect(others.length).toBe(63);
    for (const row of others) {
      expect(row.example, `${row.id} must project a null example`).toBeNull();
    }
  });

  it("keeps internal ids and file paths out of the learner-visible source label", () => {
    for (const id of EXPECTED_EXAMPLE_IDS) {
      const label = vocabulary(projection, id).example?.sourceLabel ?? "";
      expect(label).not.toMatch(/src:|assert:|lex:/);
      expect(label).not.toMatch(/resources\/original/);
      expect(label).toMatch(/^Momente A1\.1 .+, page \d+$/u);
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

  it("shows the German dominant and marked as German, with the English beneath", () => {
    const html = render("lex:schweiz");
    expect(html).toContain('id="vocab-example-heading"');
    expect(html).toContain(
      '<p class="vocab-example__de german" lang="de">Er kommt aus der Schweiz.</p>',
    );
    expect(html).toContain("He is from Switzerland.");
    expect(html).toContain("Momente A1.1 KB Glossar Deutsch–Englisch, page 2");
    // The section is a labelled region, so the heading names it for a screen reader.
    expect(html).toContain('aria-labelledby="vocab-example-heading"');
  });

  it("renders no example section at all when the sources show no example", () => {
    const html = render("lex:alter");
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
    for (const id of EXPECTED_EXAMPLE_IDS) {
      const visible = render(id)
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, "\n");
      for (const line of visible.split("\n")) {
        const phrase = line.trim();
        if (!phrase) continue;
        for (const code of learnerLanguageFindings(phrase)) {
          findings.push(`${id} ${code}: ${phrase}`);
        }
      }
    }
    expect(findings).toEqual([]);
  });

  it("never renders an example section without both languages present", () => {
    for (const record of projection.details) {
      if (record.kind !== "Lexeme") continue;
      const html = renderToStaticMarkup(
        createElement(DetailView, { detail: record }),
      );
      const hasSection = html.includes("vocab-example-heading");
      expect(hasSection).toBe(record.example != null);
      if (!hasSection) continue;
      expect(html).toContain(record.example!.de);
      expect(html).toContain(record.example!.en);
      expect(html).toContain(record.example!.sourceLabel);
    }
  });
});
