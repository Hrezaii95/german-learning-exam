import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RichLessonVisual } from "../../apps/web/components/media/RichLessonVisual.js";
import {
  illustrationForActivity,
  illustrationForDetail,
} from "../../apps/web/lib/content/illustrations.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const publicIllustrations = join(root, "platform", "apps", "web", "public", "illustrations");

describe("P5 rich lesson visuals", () => {
  it("maps each generated image only to its exact published surface", () => {
    expect(illustrationForActivity("activity:lesson-02-core-professions")?.filename)
      .toBe("lesson-02-professions-ensemble.png");
    expect(illustrationForDetail("lex:architekt")?.filename)
      .toBe("vocabulary-architekt-studio.png");
    expect(illustrationForActivity("activity:lesson-02-checkpoint-summary")?.filename)
      .toBe("lesson-02-personal-profile-context.png");
    expect(illustrationForActivity("activity:lesson-01-wellbeing-scale")?.filename)
      .toBe("lesson-01-wellbeing-five-states.png");
    expect(illustrationForDetail("lex:architektin")).toBeNull();
  });

  it("ships both visual assets and renders semantic HTML labels", () => {
    const illustration = illustrationForActivity("activity:lesson-02-core-professions")!;
    expect(existsSync(join(publicIllustrations, illustration.filename))).toBe(true);
    expect(existsSync(join(publicIllustrations, "vocabulary-architekt-studio.png"))).toBe(true);

    const html = renderToStaticMarkup(createElement(RichLessonVisual, { illustration }));
    expect(html).toContain("/illustrations/lesson-02-professions-ensemble.png");
    expect(html).toContain("Berufe in der Stadt");
    expect(html).toContain("die Ärztin");
    expect(html).toContain("data-gender=\"feminine\"");
    expect(html).toContain("alt=\"Six professionals standing in a city and workplace scene");
  });

  it("uses the GitHub Pages base path for raw image assets", () => {
    const previous = process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH;
    process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH = "/german-learning-exam";
    try {
      const illustration = illustrationForDetail("lex:architekt")!;
      const html = renderToStaticMarkup(createElement(RichLessonVisual, { illustration }));
      expect(html).toContain("src=\"/german-learning-exam/illustrations/vocabulary-architekt-studio.png\"");
      expect(html).toContain("der Architekt");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH;
      else process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH = previous;
    }
  });
});
