/// <reference lib="dom" />
// @vitest-environment jsdom
import { createElement, type ComponentType } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ContentPack, DifficultyProfile, LanguageProfile } from "../../packages/content/src/types/packs.js";
import type { LearningAnswer } from "../../packages/learning/src/wortwerk/types.js";
import { deriveProgress } from "../../packages/learning/src/wortwerk/progress.js";
import { createDailyRun } from "../../packages/learning/src/wortwerk/daily-run.js";
import type { PlayPack } from "../../apps/web/lib/wortwerk/content.server";
import { decodeScope, type PlayScope } from "../../apps/web/lib/wortwerk/links";
import { materializeTask, playableCapabilities } from "../../apps/web/lib/wortwerk/runtime";
import profile from "../../content/languages/de.json";
import manifest from "../fixtures/packs/de-b2-sample/pack.json";
import fixtureItems from "../fixtures/packs/de-b2-sample/items/all.json";
import difficultyData from "../fixtures/packs/de-b2-sample/difficulty.json";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: navigation.push }) }));
type Props = { selected: PlayPack; scope: PlayScope; capabilities: ReturnType<typeof playableCapabilities>;
  progress: ReturnType<typeof deriveProgress>; answers: LearningAnswer[]; now: Date; headingLevel?: 2 | 3 };
const path = "../../apps/web/components/wortwerk/MilestonePanel.js";
const { MilestonePanel } = await import(path) as { MilestonePanel: ComponentType<Props> };
const now = new Date("2026-10-22T12:00:00Z");
const selected: PlayPack = { pack: { ...manifest,
  maps: [{ id: "patterns", title: "Patterns", rows: "gender", cols: "forms.pluralPattern" }],
  items: fixtureItems.filter(item => ["w0", "w1", "w2"].includes(item.id)) } as ContentPack,
  language: profile as LanguageProfile, difficulty: difficultyData as DifficultyProfile, fixture: true, resources: {} };
const scope: PlayScope = { v: 1, book: "fixture-book", upTo: { lesson: 1, page: 12 }, lessons: [1],
  tags: ["everyday"], sources: ["course"], skills: ["plural"] };
function evidence(ids: string[]): LearningAnswer[] {
  return ids.flatMap(itemId => [20, 21].map(day => ({ eventId: `${itemId}:${day}`, packId: selected.pack.id, itemId,
    dimension: "plural", templateId: "corners.plural.recall", format: "recall" as const, correct: true, hinted: false,
    createdAt: `2026-10-${day}T12:00:00.000Z`, studyDate: `2026-10-${day}` })));
}
function props(answers: LearningAnswer[] = [], pack = selected, selection = scope): Props {
  const capabilities = playableCapabilities(pack.pack, pack.language, pack.difficulty, selection);
  return { selected: pack, scope: selection, capabilities, progress: deriveProgress(capabilities, answers, now), answers, now };
}
afterEach(() => { cleanup(); navigation.push.mockReset(); });

describe("shared Today/Map milestone reward", () => {
  it("keeps the rule locked and excludes the holdout from the learning practice link", () => {
    render(createElement(MilestonePanel, props()));
    expect(screen.getByText(/0 \/ 2 learning items secured/)).toBeTruthy();
    expect(screen.queryByText(/Rule card unlocked/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Try one unfamiliar word" })).toBeNull();
    const link = new URL(screen.getByRole("link", { name: "Practise this pattern" }).getAttribute("href")!, "https://example.test");
    expect(decodeScope(link.searchParams.get("scope")!).items).toEqual(["w0", "w1"]);
  });

  it("unlocks only source facts, keeps the unfamiliar answer out of the DOM and opens one isolated normal task", () => {
    const answers = evidence(["w0", "w1"]);
    render(createElement(MilestonePanel, { ...props(answers), headingLevel: 2 }));
    expect(screen.getByRole("heading", { name: "Rule card unlocked · der × -(e)n", level: 3 })).toBeTruthy();
    expect(screen.getByText(/der Name → die Namen/)).toBeTruthy();
    expect(document.body.innerHTML).not.toMatch(/Familienname|Familiennamen|w2/u);
    const button = screen.getByRole("button", { name: "Try one unfamiliar word" });
    expect(button.hasAttribute("href")).toBe(false);
    expect(navigation.push).not.toHaveBeenCalled();
    fireEvent.click(button);
    const href = new URL(navigation.push.mock.calls[0]![0] as string, "https://example.test");
    expect(href.searchParams.get("mode")).toBe("free");
    expect(href.searchParams.get("pack")).toBe(selected.pack.id);
    const challengeScope = decodeScope(href.searchParams.get("scope")!);
    expect(challengeScope).toEqual({ ...scope, items: ["w2"], skills: ["plural"], count: 1 });
    const capabilities = playableCapabilities(selected.pack, selected.language, selected.difficulty, challengeScope);
    const run = createDailyRun({ capabilities, answers, now, count: challengeScope.count ?? 1, mode: "free" });
    expect(run.tasks).toHaveLength(1);
    expect(run.tasks[0]).toMatchObject({ itemId: "w2", dimension: "plural" });
    const task = materializeTask(run.tasks[0]!, selected.pack, selected.language, selected.difficulty, "milestone-task");
    expect(task).not.toBeNull();
    expect(task?.feedback.forms).toEqual(["die Familiennamen"]);
  });

  it("does not re-offer a previously seen word and leaves single-item scopes honest", () => {
    const view = render(createElement(MilestonePanel, props(evidence(["w0", "w1", "w2"]))));
    expect(screen.queryByRole("button", { name: "Try one unfamiliar word" })).toBeNull();
    expect(screen.getByText(/already been practised/)).toBeTruthy();
    view.unmount();
    render(createElement(MilestonePanel, props(evidence(["w0"]), selected, { ...scope, items: ["w0"] })));
    expect(screen.getByText(/No unfamiliar-word challenge is available/)).toBeTruthy();
    expect(screen.getByText(/Rule card unlocked/)).toBeTruthy();
  });

  it("reports missing authored rule support without labelling a nonexistent card unlocked", () => {
    const generic = { ...selected, pack: { ...selected.pack, maps: [{ id: "generic", title: "Group", rows: "unitId", cols: "pos" }] } };
    render(createElement(MilestonePanel, props(evidence(["w0", "w1", "w2"]), generic)));
    expect(screen.getByText(/No source-backed rule card is available/)).toBeTruthy();
    expect(screen.queryByText(/Rule card unlocked/)).toBeNull();
    expect(screen.getByText(/Learning goal secured/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Try one unfamiliar word" })).toBeNull();
  });
});
