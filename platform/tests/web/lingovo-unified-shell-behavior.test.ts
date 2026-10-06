// @vitest-environment jsdom
import { createElement, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../../apps/web/components/i18n/LocaleProvider";
import { A1CourseNavigation, LingovoAppHeader } from "../../apps/web/components/shell/LingovoAppHeader";
import { LOCALE_KEY } from "../../apps/web/lib/i18n/catalog";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: { href: string; children: ReactNode }) => createElement("a", { href, ...props }, children) }));

beforeEach(() => localStorage.setItem(LOCALE_KEY, "en"));
afterEach(() => { cleanup(); localStorage.clear(); });

function shell(track: "a1" | "c1" = "a1") {
  return createElement(LocaleProvider, null,
    createElement(LingovoAppHeader, { track, current: "dashboard" }),
    track === "a1" ? createElement(A1CourseNavigation, { current: "dashboard" }) : null,
    createElement("main", { id: "main-content", tabIndex: -1 }, "Lesson workspace"),
  );
}

describe("unified Lingovo navigation", () => {
  it("keeps one four-language control and the selected language when changing course tracks", () => {
    const view = render(shell());
    const language = screen.getByRole("combobox") as HTMLSelectElement;
    expect([...language.options].map(option => option.value).sort()).toEqual(["de", "en", "hy", "ru"]);
    expect(language.getAttribute("aria-label")).toBeTruthy();
    fireEvent.change(language, { target: { value: "de" } });
    expect(localStorage.getItem(LOCALE_KEY)).toBe("de");
    expect(document.documentElement.lang).toBe("de");
    view.rerender(shell("c1"));
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("de");
    expect(screen.getByRole("link", { name: "Wiederholen" }).getAttribute("href")).toBe("/prepare/c1/review");
  });

  it("opens navigation at a useful focus point and returns focus on Escape", () => {
    render(shell());
    const trigger = screen.getByRole("button", { name: "Menu" });
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const courses = screen.getByRole("link", { name: "Courses" });
    expect(document.activeElement).toBe(courses);
    fireEvent.keyDown(courses, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("preserves every A1 learning destination in compact navigation and dismisses Resources with Escape", () => {
    render(shell());
    const summary = screen.getByText("Resources", { exact: true });
    fireEvent.click(summary);
    const resources = summary.closest("details")!;
    expect(resources.open).toBe(true);
    for (const href of ["/dashboard", "/lessons", "/book", "/cheat-sheets", "/saved", "/vocabulary", "/verbs", "/grammar", "/phrases", "/listening", "/search", "/practice", "/review", "/references", "/settings"]) {
      expect(document.querySelector(`a[href="${href}"]`)).toBeTruthy();
    }
    const saved = screen.getByRole("link", { name: "Saved vocabulary" });
    saved.focus();
    fireEvent.keyDown(saved, { key: "Escape" });
    expect(resources.open).toBe(false);
    expect(document.activeElement).toBe(summary);
  });
});
