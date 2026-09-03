// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { WordFamilyCard } from "../../apps/web/components/word-cards/WordFamilyCard";
import type { WordCardCatalog } from "../../apps/web/lib/content/word-card-types";
import { isSafeNavigationPath } from "../../apps/web/lib/content/navigation-context";
import { buildHubNavigationContext, resolveBackHref } from "../../apps/web/lib/content/navigation-context";
import { withWordCardHub } from "../../apps/web/lib/content/word-cards";
import type { LearnerHubProjection } from "../../apps/web/lib/content/hub-types";
import { HubListView } from "../../apps/web/components/hubs/HubViews";
import { filterHubRecords, parseHubSearchParams } from "../../apps/web/lib/content/hub-query";

const catalog = JSON.parse(readFileSync(resolve("apps/web/generated/word-cards.json"), "utf8")) as WordCardCatalog;
const engineer = catalog.cards.find(c => c.id === "W126")!;
const originalHub = (JSON.parse(readFileSync(resolve("apps/web/generated/learner-hubs.json"), "utf8")) as LearnerHubProjection).hubsById.vocabulary;
afterEach(cleanup);

describe("original vocabulary browsing with complete cards", () => {
  it("keeps every complete family reachable through the original grid inventory", () => {
    const hub = withWordCardHub(originalHub);
    expect(hub.items).toHaveLength(catalog.cards.length);
    expect(new Set(hub.items.map(i => i.hubDestination.path))).toEqual(new Set(catalog.cards.map(c => c.path)));
    expect(hub.title).toBe(originalHub.title);
    expect(hub.description).toBe(originalHub.description);
    expect(hub.categories).toEqual(expect.arrayContaining([...originalHub.categories]));
  });
  it("preserves the original filter form and grid, with one aggregated engineer result", () => {
    render(createElement(HubListView, { hub: withWordCardHub(originalHub), searchParams: { q: "Ingenieurinnen", lesson: "02", category: "noun" } }));
    expect(screen.getByRole("searchbox", {name:"Search Vocabulary"})).toBeTruthy();
    expect(screen.getByRole("combobox", {name:"Filter Vocabulary by lesson"})).toBeTruthy();
    expect(screen.getByRole("combobox", {name:"Filter Vocabulary by category"})).toBeTruthy();
    expect(screen.getByRole("button", {name:"Apply filters"})).toBeTruthy();
    expect(screen.getByRole("link", {name:"Clear filters"})).toBeTruthy();
    expect(document.querySelectorAll(".card-grid.hub-results [data-word-family]")).toHaveLength(1);
    for(const text of ["der Ingenieur", "die Ingenieure", "die Ingenieurin", "die Ingenieurinnen"]) expect(screen.getByText(text, {exact:true})).toBeTruthy();
    expect(screen.getByRole("link", {name:"Study this word family"}).getAttribute("href")).toMatch(/^\/vocabulary\/w126\?nav=/);
  });
  it("keeps Lesson 3 and every added number searchable and preserves return filters", () => {
    const hub = withWordCardHub(originalHub);
    const third = filterHubRecords(hub.items, parseHubSearchParams({lesson:"03"},hub.categories));
    expect(third.items.length).toBeGreaterThanOrEqual(58);
    const numbers = filterHubRecords(hub.items, parseHubSearchParams({category:"number"},hub.categories));
    expect(numbers.items).toHaveLength(101);
    const navigation = buildHubNavigationContext({hubId:"vocabulary",lesson:"03",q:"meine",category:"pronoun"});
    expect(resolveBackHref(navigation,"hub")).toBe("/vocabulary?q=meine&lesson=03&category=pronoun");
  });
  it("clears edited form values when navigation clears the active filters", () => {
    const complete = withWordCardHub(originalHub);
    const hub = { ...complete, items: complete.items.filter(i => i.wordFamily?.id === "W126"), itemCount: 1 };
    const view = render(createElement(HubListView, { hub, searchParams: {q:"Ingenieur"} }));
    fireEvent.change(screen.getByRole("searchbox", {name:"Search Vocabulary"}), {target:{value:"Krankenpfleger"}});
    view.rerender(createElement(HubListView, { hub, searchParams: {} }));
    expect((screen.getByRole("searchbox", {name:"Search Vocabulary"}) as HTMLInputElement).value).toBe("");
  });
});

describe("complete word-family cards", () => {
  it("keeps both engineer entries and all four forms together", () => {
    expect(engineer.sourceIds).toEqual(["W126", "W127"]);
    expect(engineer.rows.flatMap(r => [r.singular.text, ...r.plurals.map(p => p.text)])).toEqual(["der Ingenieur", "die Ingenieure", "die Ingenieurin", "die Ingenieurinnen"]);
    expect(engineer.teacherRows.length).toBeGreaterThan(0);
  });
  it("hides study material during recall and checks all four answers", () => {
    render(createElement(WordFamilyCard, { card: engineer }));
    fireEvent.click(screen.getByRole("button", { name: "Try recall" }));
    expect(screen.queryByText("Notice")).toBeNull();
    expect(screen.queryByText("Lesson notes & sources")).toBeNull();
    for (const prompt of engineer.prompts) {
      fireEvent.change(screen.getByLabelText("German answer"), { target: { value: prompt.answers[0] } });
      fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
      expect(screen.getByRole("status").textContent).toContain("You remembered it.");
      fireEvent.click(screen.getByRole("button", { name: "Next form →" }));
    }
  });
  it("rejects a wrong article and does not call a revealed answer correct", () => {
    render(createElement(WordFamilyCard, { card: engineer }));
    fireEvent.click(screen.getByRole("button", { name: "Recall" }));
    fireEvent.change(screen.getByLabelText("German answer"), { target: { value: "das Ingenieur" } });
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(screen.getByLabelText("German answer").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("status").textContent).not.toContain("You remembered it.");
    fireEvent.click(screen.getByRole("button", { name: "Next form →" }));
    fireEvent.click(screen.getByRole("button", { name: "Show answer" }));
    expect(screen.getByRole("status").textContent).toContain("Read it once");
  });
  it("keeps formal Sie distinct from sie", () => {
    const card = catalog.cards.find(c => c.id === "W008")!;
    render(createElement(WordFamilyCard, { card }));
    fireEvent.click(screen.getByRole("button", { name: "Recall" }));
    fireEvent.change(screen.getByLabelText("German answer"), { target: { value: "sie" } });
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(screen.getByLabelText("German answer").getAttribute("aria-invalid")).toBe("true");
  });
  it("provides a recall answer for every displayed form, including old phrases", () => {
    for (const card of catalog.cards) for (const row of card.rows) for (const form of [row.singular, ...row.plurals]) {
      expect(card.prompts.some(p => p.answers.includes(form.text)), `${card.id}: ${form.text}`).toBe(true);
    }
  });
  it("allows every real card path while rejecting malformed or out-of-scope paths", () => {
    for (const card of catalog.cards) expect(isSafeNavigationPath(card.path), card.path).toBe(true);
    for (const path of ["/vocabulary/number-101", "/vocabulary/letter-31", "/vocabulary/w000", "/vocabulary/w544", "/vocabulary/../settings", "/vocabulary/number-01", "//evil.example/vocabulary/w001"]) expect(isSafeNavigationPath(path), path).toBe(false);
  });
});
