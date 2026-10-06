// @vitest-environment jsdom
import { createElement, Fragment } from "react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WordCardLibrary } from "../../apps/web/components/word-cards/WordCardLibrary";
import { LanguageSelector, LocaleProvider } from "../../apps/web/components/i18n/LocaleProvider";
import { StudyScopeProvider } from "../../apps/web/components/study/StudyScope";
import { LOCALE_KEY, translate, type Locale } from "../../apps/web/lib/i18n/catalog";
import { defaultStudyScope, STUDY_SCOPE_KEY } from "../../apps/web/lib/study/scope";
import type { WordCardCatalog } from "../../apps/web/lib/content/word-card-types";

vi.mock("next/navigation", () => ({ usePathname: () => null, useSearchParams: () => new URLSearchParams() }));

const fullCatalog = JSON.parse(readFileSync("apps/web/generated/word-cards.json", "utf8")) as WordCardCatalog;
const catalog: WordCardCatalog = {
  ...fullCatalog,
  cards: fullCatalog.cards.filter(card => ["W126", "W130", "W136", "W179", "W364"].includes(card.id)),
};

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); localStorage.clear(); });

function renderLibrary(locale: Locale, props: { teachersOnly?: boolean; initialQuery?: string } = {}, connected = false) {
  localStorage.setItem(LOCALE_KEY, locale);
  const library = createElement(WordCardLibrary, { catalog, ...props });
  return render(createElement(LocaleProvider, null,
    createElement(Fragment, null,
      createElement(LanguageSelector),
      connected ? createElement(StudyScopeProvider, null, library) : library,
    ),
  ));
}

function search(query: string) {
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: query } });
}

function expectCard(id: string | null) {
  const rendered = document.querySelectorAll("[data-word-card]");
  expect(rendered).toHaveLength(id ? 1 : 0);
  if (id) expect(rendered[0]?.getAttribute("data-word-card")).toBe(id);
}

describe("word-family search in the selected interface language", () => {
  it.each([
    { locale: "hy" as const, title: "ինժեներ", rowMeaning: "ԻՆԺԵՆԵՐ ԿԻՆ" },
    { locale: "ru" as const, title: "инженер", rowMeaning: "ИНЖЕНЕР ЖЕНЩИНА" },
  ])("finds the displayed $locale title and row-specific meaning", ({ locale, title, rowMeaning }) => {
    renderLibrary(locale);
    search(title);
    expectCard("W126");
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    // The gender word occurs in the translated row meaning, not the title or
    // German/English source index. All entered words must match the same card.
    search(rowMeaning);
    expectCard("W126");
    search(`${rowMeaning} unmatched`);
    expectCard(null);
  });

  it("refreshes results when the interface language changes without resetting the query", () => {
    renderLibrary("en", { initialQuery: "врач" });
    expectCard(null);
    fireEvent.change(screen.getByRole("combobox", { name: "Interface language" }), { target: { value: "ru" } });
    expectCard("W136");
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("врач");
    fireEvent.change(screen.getByRole("combobox", { name: translate("Interface language", "ru") }), { target: { value: "hy" } });
    expectCard(null);
    search("բժիշկ");
    expectCard("W136");
  });

  it("retains German forms, umlaut aliases, and English meanings in Russian", () => {
    renderLibrary("ru");
    for (const query of ["Ärztinnen", "Aerztinnen", "DOCTOR FEMALE"]) {
      search(query);
      expectCard("W136");
    }
    search("Ingenieurinnen engineer");
    expectCard("W126");
  });

  it("intersects translated matches with lesson, topic, and study-focus filters", () => {
    renderLibrary("ru", { initialQuery: "инженер" });
    expectCard("W126");
    const change = (label: string, value: string) => fireEvent.change(
      screen.getByRole("combobox", { name: translate(label, "ru") }), { target: { value } },
    );
    change("Lesson", "3");
    expectCard(null);
    change("Lesson", "2");
    expectCard("W126");
    change("Topic", "Family");
    expectCard(null);
    change("Topic", "Profession");
    expectCard("W126");
    change("Study focus", "Context");
    expectCard(null);
    change("Study focus", "Core");
    expectCard("W126");
  });

  it("keeps the shared study scope when searching a translated meaning", () => {
    localStorage.setItem(STUDY_SCOPE_KEY, JSON.stringify({ ...defaultStudyScope(), mode: "one", lessons: [3] }));
    renderLibrary("hy", { initialQuery: "ինժեներ" }, true);
    expectCard(null);
    fireEvent.change(screen.getByRole("combobox", { name: translate("Lesson", "hy") }), { target: { value: "2" } });
    expectCard("W126");
    expect(JSON.parse(localStorage.getItem(STUDY_SCOPE_KEY)!)).toMatchObject({ mode: "one", lessons: [2] });
  });

  it("keeps the teacher-only inventory boundary for translated queries", () => {
    renderLibrary("hy", { teachersOnly: true });
    search(translate("university student", "hy"));
    expectCard(null);
    search("ինժեներ");
    expectCard("W126");
  });
});
