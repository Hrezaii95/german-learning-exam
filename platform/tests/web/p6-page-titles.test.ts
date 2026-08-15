/**
 * P6-02 finding 1 — WCAG 2.4.2 Page Titled (Level A).
 *
 * 156 of the 205 exported pages announced the identical title "German Learning
 * OS", because `export const metadata` / `generateMetadata` existed in exactly
 * three route files and every other route inherited the root layout's constant.
 * The title is the first thing a screen reader announces on a route change and
 * the only thing that separates 156 tabs, bookmarks and history entries.
 *
 * Two computed predicates guard it:
 *  1. every route file wires a title (source scan — this is the defect itself);
 *  2. the titles those routes will emit are all distinct (built from the real
 *     projections through the same helpers the routes use).
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  loadLearnerDetailProjection,
  loadLearnerHubProjection,
  loadLearnerProjection,
} from "../../apps/web/lib/content/access.js";
import { loadExtraProfessionsProjection } from "../../apps/web/lib/content/extra-professions.js";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  activityPageMetadata,
  detailPageMetadata,
  hubPageMetadata,
  lessonPageMetadata,
} from "../../apps/web/lib/content/page-metadata.js";
import { buildPracticeGameCatalog } from "../../apps/web/lib/games/game-prompts.js";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "apps", "web");
const appRoot = join(webRoot, "app");

function routeFiles(directory: string): readonly string[] {
  const out: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) out.push(...routeFiles(absolute));
    else if (entry.name === "page.tsx" || entry.name === "not-found.tsx") {
      out.push(absolute);
    }
  }
  return out.sort();
}

function titleOf(metadata: { title?: unknown }): string {
  const title = metadata.title;
  if (typeof title === "string") return title;
  if (title && typeof title === "object" && "absolute" in title) {
    return String((title as { absolute: string }).absolute);
  }
  throw new Error(`route metadata has no usable title: ${JSON.stringify(metadata)}`);
}

describe("P6 page titles", () => {
  it("wires a title into every route, not just three of them", () => {
    const files = routeFiles(appRoot);
    // 26 `page.tsx` plus `not-found.tsx`; before the fix only three of them
    // declared a title.
    expect(files.length).toBeGreaterThanOrEqual(27);

    const missing = files.filter((file) => {
      const source = readFileSync(file, "utf8");
      return (
        !/export const metadata\b/.test(source) &&
        !/export async function generateMetadata\b/.test(source)
      );
    });
    expect(missing.map((file) => relative(webRoot, file).split(sep).join("/"))).toEqual([]);
  });

  it("appends the product name once, through the root layout template", () => {
    const layout = readFileSync(join(appRoot, "layout.tsx"), "utf8");
    expect(layout).toMatch(/template:\s*`%s \| \$\{SITE_NAME\}`/);
    expect(layout).toMatch(/default:\s*SITE_NAME/);

    // Routes that sit in the layout's own segment do not receive the template,
    // so they must carry the finished title themselves.
    for (const name of ["page.tsx", "not-found.tsx"]) {
      expect(readFileSync(join(appRoot, name), "utf8")).toContain(
        `| ${"$"}{SITE_NAME}\` }`,
      );
    }
  });

  it("describes the app to a learner, not to the team", () => {
    expect(SITE_DESCRIPTION).not.toMatch(
      /web shell|publication|validated|projection|alpha/i,
    );
    expect(SITE_DESCRIPTION.length).toBeGreaterThan(60);
    expect(SITE_NAME).toBe("German Learning OS");
  });

  it("gives every route family a title of its own", () => {
    const projection = loadLearnerProjection();
    const details = loadLearnerDetailProjection();
    const hubs = loadLearnerHubProjection();
    const professions = loadExtraProfessionsProjection();

    const titles = new Map<string, string>();
    const add = (route: string, title: string) => {
      expect(title.trim().length).toBeGreaterThan(0);
      expect(title).not.toBe(SITE_NAME);
      const clash = [...titles.entries()].find(([, value]) => value === title);
      expect(
        clash ? `${route} duplicates ${clash[0]} ("${title}")` : null,
      ).toBeNull();
      titles.set(route, title);
    };

    for (const lesson of projection.lessons) {
      add(`/lessons/${lesson.routeSegment}`, titleOf(lessonPageMetadata(lesson)));
    }
    for (const activity of projection.activities) {
      const lesson = projection.lessons.find((item) => item.id === activity.lessonId);
      if (!lesson) throw new Error(`activity without lesson: ${activity.id}`);
      add(activity.canonicalPath, titleOf(activityPageMetadata(lesson, activity)));
    }
    for (const detail of details.details) {
      add(detail.canonicalPath, titleOf(detailPageMetadata(detail)));
    }
    for (const hub of hubs.hubs) {
      add(hub.path, titleOf(hubPageMetadata(hub)));
    }
    for (const game of buildPracticeGameCatalog()) {
      add(`/practice/${game.id}`, `${game.title} · Practice`);
    }
    for (const row of professions.rows) {
      add(`/collections/professions/${row.routeSegment}`, `${row.meaningEn} · Optional professions`);
    }

    // The families above are exactly the pages that used to share one title.
    expect(titles.size).toBeGreaterThan(150);
    expect(new Set(titles.values()).size).toBe(titles.size);
  });

  it("never leaks a padded lesson label into a title", () => {
    for (const lesson of loadLearnerProjection().lessons) {
      expect(titleOf(lessonPageMetadata(lesson))).not.toMatch(/\bLesson 0\d/);
    }
    const projection = loadLearnerProjection();
    for (const activity of projection.activities) {
      const lesson = projection.lessons.find((item) => item.id === activity.lessonId)!;
      expect(titleOf(activityPageMetadata(lesson, activity))).not.toMatch(/\bLesson 0\d/);
    }
  });

  it("names a detail page with the same German its h1 shows", () => {
    for (const detail of loadLearnerDetailProjection().details) {
      expect(titleOf(detailPageMetadata(detail)).startsWith(detail.displayText)).toBe(
        true,
      );
    }
  });
});
