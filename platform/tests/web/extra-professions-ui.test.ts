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
  let ExtraProfessionsHub: typeof import("../../apps/web/components/collections/ExtraProfessionsHub.js").ExtraProfessionsHub;
  let ExtraProfessionDetail: typeof import("../../apps/web/components/collections/ExtraProfessionDetail.js").ExtraProfessionDetail;

  beforeAll(async () => {
    ({ ExtraProfessionsHub } = await import(
      "../../apps/web/components/collections/ExtraProfessionsHub.js"
    ));
    ({ ExtraProfessionDetail } = await import(
      "../../apps/web/components/collections/ExtraProfessionDetail.js"
    ));
  });

  it("renders a filterable, linkable optional hub with honest review and media labels", () => {
    const projection = projectPublishedExtraProfessions(publishedDir);
    const html = renderToStaticMarkup(
      createElement(ExtraProfessionsHub, { projection }),
    );
    expect(html).toContain("All 48 rows from the learner note");
    expect(html).toContain("102 form lexemes");
    expect(html).toContain("not core completion");
    expect(html).toContain("qualified German-language review");
    expect(html).toContain("No audio or images are published");
    expect(html).toContain('type="search"');
    expect(html).toContain("Show only rows with slash alternatives");
    expect(html).toContain("Source-backed flashcards");
    expect(html).toContain('href="/collections/professions/01"');
    expect(html).toContain('href="/collections/professions/48"');
    expect(html).not.toMatch(/<(?:audio|img)\b/i);
  });

  it("renders every exact variant on an alternative-row detail without fake media controls", () => {
    const row = projectPublishedExtraProfessions(publishedDir).rowsBySegment["39"]!;
    const html = renderToStaticMarkup(createElement(ExtraProfessionDetail, { row }));
    expect(html).toContain("Plumber");
    expect(html).toContain("der Klempner");
    expect(html).toContain("der Installateur");
    expect(html).toContain("die Klempnerinnen");
    expect(html).toContain("die Installateurinnen");
    expect(html).toContain("Quick self-review");
    expect(html).toContain("No audio or image is published for this row");
    expect(html).not.toMatch(/<(?:audio|img)\b/i);
  });
});
