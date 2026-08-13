import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { projectPublishedLearnerWeb } from "../../apps/web/lib/content/project.js";
import { workbookAudioForActivity, APPROVED_WORKBOOK_TRACK_COUNT } from "../../apps/web/lib/audio/workbook-audio.js";
import { infographicForActivity, infographicForDetail } from "../../apps/web/lib/content/infographics.js";
import { ActivityScreen } from "../../apps/web/components/lessons/ActivityAndBrowser.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const platform = join(root, "platform");
const publicAudio = join(platform, "apps", "web", "public", "audio", "source-workbook-approved-v1");
const rights = JSON.parse(readFileSync(join(root, "media", "manifests", "workbook-audio-rights-projections.json"), "utf8")) as {
  projections: { publicDeployable: { assets: Array<{ filename: string; sha256: string }> } };
};

describe("P5 approved media integration", () => {
  it("ships exactly the 15 owner-approved byte-identical workbook tracks", () => {
    const assets = rights.projections.publicDeployable.assets;
    const disk = readdirSync(publicAudio).sort();
    expect(APPROVED_WORKBOOK_TRACK_COUNT).toBe(15);
    expect(assets).toHaveLength(15);
    expect(disk).toEqual(assets.map((asset) => asset.filename).sort());
    for (const asset of assets) {
      const hash = createHash("sha256").update(readFileSync(join(publicAudio, asset.filename))).digest("hex");
      expect(hash).toBe(asset.sha256);
    }
  });

  it("maps tracks only to their five exact activities", () => {
    expect(workbookAudioForActivity("activity:lesson-01-alphabet-listen-spell")).toHaveLength(4);
    expect(workbookAudioForActivity("activity:lesson-01-workbook-listening")).toHaveLength(2);
    expect(workbookAudioForActivity("activity:lesson-02-workbook-listening")).toHaveLength(9);
    expect(workbookAudioForActivity("activity:lesson-02-numbers-0-100")).toHaveLength(8);
    expect(workbookAudioForActivity("activity:lesson-02-core-professions")).toHaveLength(1);
    expect(workbookAudioForActivity("activity:lesson-02-person-form-morphology")).toEqual([]);
  });

  it("renders the original-workbook player and a learner-safe infographic on mapped activities", () => {
    const projection = projectPublishedLearnerWeb(join(platform, "content", "published"));
    const activity = projection.activities.find((row) => row.id === "activity:lesson-02-core-professions")!;
    const lesson = projection.lessons.find((row) => row.id === activity.lessonId)!;
    const html = renderToStaticMarkup(createElement(ActivityScreen, { lesson, activity }));
    expect(html).toContain("Original workbook audio");
    expect(html).toContain("1_15_AB_Momente_A11_2_12.mp3");
    expect(html).toContain("Profession word stress and repetition");
  });

  it("publishes only infographic families with fully learner-published examples", () => {
    expect(infographicForActivity("activity:lesson-01-greetings-by-context")?.filename).toBe("greetings-context-day-v1.svg");
    expect(infographicForActivity("activity:lesson-02-full-person-conjugation")?.filename).toBe("verb-endings-regular-special-irregular-v1.svg");
    expect(infographicForDetail("qa:profession-casual-main")?.filename).toBe("qa-register-casual-formal-v1.svg");
    expect(infographicForActivity("activity:lesson-02-person-form-morphology")).toBeNull();
  });
});
