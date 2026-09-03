// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { WordFamilyCard } from "../../apps/web/components/word-cards/WordFamilyCard";
import type { WordCardCatalog } from "../../apps/web/lib/content/word-card-types";
import { isSafeNavigationPath } from "../../apps/web/lib/content/navigation-context";

const catalog = JSON.parse(readFileSync(resolve("apps/web/generated/word-cards.json"), "utf8")) as WordCardCatalog;
const engineer = catalog.cards.find(c => c.id === "W126")!;
afterEach(cleanup);

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
