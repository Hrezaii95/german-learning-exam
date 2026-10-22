/** @vitest-environment jsdom */
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createWortwerkStore, type WortwerkStore } from "../../apps/web/lib/wortwerk/store";
import { useWortwerkState } from "../../apps/web/lib/wortwerk/use-wortwerk";

function State({ store }: { store: WortwerkStore }) {
  const state = useWortwerkState({ store, timeZone: "UTC" });
  return createElement("p", null, `${state.hydrated ? "ready" : "loading"}:${state.snapshot.events.length}:${state.now.getTime()}`);
}
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("Wortwerk reactive state", () => {
  it("uses a stable empty server snapshot and epoch clock for static rendering", () => {
    const store = createWortwerkStore({ getItem: () => null, setItem: () => undefined });
    store.appendEvent("unknown", { data: 1 });
    expect(renderToString(createElement(State, { store }))).toBe("<p>loading:0:0</p>");
  });

  it("advances the evidence clock immediately when a new answer is recorded", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-22T10:00:00.000Z"));
    const store = createWortwerkStore({ getItem: () => null, setItem: () => undefined });
    function Answers() {
      const state = useWortwerkState({ store, timeZone: "UTC" });
      return createElement("p", null, `answers:${state.answers.length}`);
    }
    render(createElement(Answers));
    expect(screen.getByText("answers:0")).not.toBeNull();
    vi.setSystemTime(new Date("2026-10-22T10:00:05.000Z"));
    act(() => { store.appendEvent("answer", { packId: "fixture", itemId: "word", dimension: "meaning", templateId: "recall", format: "recall", correct: true, hinted: false, studyDate: "2026-10-22", calendarDate: "2026-10-22" }); });
    expect(screen.getByText("answers:1")).not.toBeNull();
  });

  it("subscribes to local writes without a reload and exposes the mounted clock", () => {
    const store = createWortwerkStore({ getItem: () => null, setItem: () => undefined });
    render(createElement(State, { store }));
    expect(screen.getByText(/^ready:0:/)).not.toBeNull();
    act(() => { store.appendEvent("unknown", { data: 1 }); });
    expect(screen.getByText(/^ready:1:/)).not.toBeNull();
  });
});
