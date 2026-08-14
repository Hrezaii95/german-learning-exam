import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { projectPublishedExtraProfessions } from "../../apps/web/lib/content/extra-professions.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    className?: string;
  }) {
    return createElement("a", { href, ...rest }, children);
  },
}));

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");

describe("extra professions learner UI", () => {
  let ProfessionCollectionClient: typeof import("../../apps/web/app/collections/professions/ProfessionCollectionClient.js").ProfessionCollectionClient;
  let ProfessionRowClient: typeof import("../../apps/web/app/collections/professions/ProfessionRowClient.js").ProfessionRowClient;

  beforeAll(async () => {
    ({ ProfessionCollectionClient } = await import(
      "../../apps/web/app/collections/professions/ProfessionCollectionClient.js"
    ));
    ({ ProfessionRowClient } = await import(
      "../../apps/web/app/collections/professions/ProfessionRowClient.js"
    ));
  });

  it("renders a filterable, linkable optional hub with honest review and media labels", () => {
    const projection = projectPublishedExtraProfessions(publishedDir);
    const html = renderToStaticMarkup(
      createElement(ProfessionCollectionClient, { projection }),
    );
    expect(html).toContain("All 48 rows from the learner note");
    expect(html).toContain("102 form lexemes");
    expect(html).toContain("not core completion");
    expect(html).toContain("qualified German-language review");
    expect(html).toContain("only approved computer-generated previews of the exact word are offered");
    expect(html).toContain("marked as not available yet");
    expect(html).toContain('type="search"');
    expect(html).toContain("Show only rows with slash alternatives");
    expect(html).toContain("Source-backed visual flashcards");
    expect(html).toContain('href="/collections/professions/01"');
    expect(html).toContain('href="/collections/professions/48"');
    expect(html).toContain("Masculine person form");
    expect(html).toContain("Feminine person form");
    expect(html).toContain("16 exact audio previews across 8 rows");
    expect(html).not.toMatch(/<img\b/i);
  });

  it("renders every exact variant on an alternative-row detail without fake media controls", () => {
    const row = projectPublishedExtraProfessions(publishedDir).rowsBySegment["39"]!;
    const html = renderToStaticMarkup(createElement(ProfessionRowClient, { row }));
    expect(html).toContain("Plumber");
    expect(html).toContain("der Klempner");
    expect(html).toContain("der Installateur");
    expect(html).toContain("die Klempnerinnen");
    expect(html).toContain("die Installateurinnen");
    expect(html).toContain("Quick self-review");
    expect(html).toContain("0 of 8 forms available");
    expect(html).toContain("Pronunciation unavailable");
    expect(html).not.toMatch(/<(?:audio|img)\b/i);
  });

  it("exposes only exact existing synthesized previews and labels everything else unavailable", () => {
    const row = projectPublishedExtraProfessions(publishedDir).rowsBySegment["24"]!;
    const html = renderToStaticMarkup(createElement(ProfessionRowClient, { row }));
    expect(html).toContain("Engineer");
    expect(html).toContain("2 of 4 forms available");
    expect(html).toContain("der Ingenieur");
    expect(html).toContain("die Ingenieurin");
    expect(html).toContain("Synthesized German preview voice");
    expect(html).toContain("independent German listening review pending");
    expect(html.match(/<audio\b/g)).toHaveLength(2);
    expect(html).toContain("die Ingenieure");
    expect(html).toContain("Pronunciation unavailable");
  });
});
