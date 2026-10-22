/// <reference lib="dom" />
// @vitest-environment jsdom
import { createElement, type ComponentType } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratedTask, GradeResult, TaskAnswer } from "../../packages/wortwerk/src/tasks.js";
type MechanicProps = { task: GeneratedTask; onAnswer: (answer: TaskAnswer) => void; result?: GradeResult | null; disabled?: boolean; onLearn?: (word: string) => void };
const writePath = "../../apps/web/components/wortwerk/mechanics/Write.js";
const { Write } = await import(writePath) as { Write: ComponentType<MechanicProps> };
const recordPath = "../../apps/web/components/wortwerk/mechanics/Record.js";
const { Record } = await import(recordPath) as { Record: ComponentType<MechanicProps> };
const hotspotPath = "../../apps/web/components/wortwerk/mechanics/Hotspot.js";
const { Hotspot } = await import(hotspotPath) as { Hotspot: ComponentType<MechanicProps> };
const matchPath = "../../apps/web/components/wortwerk/mechanics/Match.js";
const { Match } = await import(matchPath) as { Match: ComponentType<MechanicProps> };
const task: GeneratedTask = { id: "sample", templateId: "write.prompt", itemId: "p", packId: "p", skill: "writing", mechanic: "write", dimension: "writing", format: "recall", testedDimensions: ["writing"], revealFields: ["modelAnswers"], question: { instruction: "Write a response.", options: [], input: "self-check", lang: "en", helperKeys: ["ø"], checklist: ["A clear detail"] }, solution: { selfCheck: true }, feedback: { answer: "Your response", summary: "Self-check", modelAnswers: ["FEEDBACK MODEL"] } };
beforeEach(() => { vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => { }); vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => { }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("Wortwerk literacy mechanics", () => {
    it("Write hides models until an answer is drafted and comparison begins", () => {
        const onAnswer = vi.fn();
        render(createElement(Write, { task, onAnswer }));
        expect(screen.queryByText("FEEDBACK MODEL")).toBeNull();
        fireEvent.change(screen.getByRole("textbox", { name: "Your response" }), { target: { value: "My own reply" } });
        fireEvent.click(screen.getByRole("button", { name: "Compare with the model" }));
        expect(screen.getByText("FEEDBACK MODEL")).toBeTruthy();
        const complete = screen.getByRole("button", { name: "I covered these points" }) as HTMLButtonElement;
        expect(complete.disabled).toBe(true);
        fireEvent.click(screen.getByRole("checkbox", { name: "A clear detail" }));
        fireEvent.click(complete);
        fireEvent.click(complete);
        expect(onAnswer).toHaveBeenCalledTimes(1);
        expect(onAnswer).toHaveBeenCalledWith(["self:complete", "My own reply"]);
    });
    it("objective Write sends typed answers without exposing its solution", () => {
        const onAnswer = vi.fn();
        const objective = { ...task, solution: { accepted: ["Hidden answer"] }, question: { ...task.question, input: "text" as const } };
        const view = render(createElement(Write, { task: objective, onAnswer }));
        expect(view.container.innerHTML).not.toContain("Hidden answer");
        expect(view.container.innerHTML).not.toContain("FEEDBACK MODEL");
        fireEvent.change(screen.getByRole("textbox"), { target: { value: "Typed response" } });
        fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
        expect(onAnswer).toHaveBeenCalledWith("Typed response");
    });
    it("Hotspot saves selected words once and supports explicit reading completion", () => {
        const onAnswer = vi.fn();
        const onLearn = vi.fn();
        const reading = { ...task, templateId: "read.tap", mechanic: "hotspot" as const, question: { ...task.question, passage: "One unfamiliar word." } };
        render(createElement(Hotspot, { task: reading, onAnswer, onLearn }));
        fireEvent.click(screen.getByRole("button", { name: "unfamiliar" }));
        fireEvent.click(screen.getByRole("button", { name: "unfamiliar" }));
        expect(onLearn).toHaveBeenCalledTimes(1);
        expect(onLearn).toHaveBeenCalledWith("unfamiliar");
        fireEvent.click(screen.getByRole("button", { name: "Finished reading" }));
        expect(onAnswer).toHaveBeenCalledWith(["self:complete"]);
    });
    it("Hotspot uses neutral authored choice controls and feedback only after result", () => {
        const onAnswer = vi.fn();
        const reading = { ...task, templateId: "read.quick", question: { ...task.question, input: "choice" as const, passage: "Source passage", options: [{ id: "option-1", text: "Choice one" }, { id: "option-2", text: "Choice two" }] }, solution: { optionIds: ["option-2"] } };
        const view = render(createElement(Hotspot, { task: reading, onAnswer }));
        expect(view.container.innerHTML).not.toContain("FEEDBACK MODEL");
        expect(view.container.innerHTML).not.toContain("option-2");
        fireEvent.click(screen.getByRole("button", { name: "Choice two" }));
        expect(onAnswer).toHaveBeenCalledWith("option-2");
    });
    it("Match pairs using tap and standard keyboard buttons with one final submission", () => {
        const onAnswer = vi.fn();
        const matching = { ...task, templateId: "match.meaning", mechanic: "match" as const, question: { ...task.question, input: "sequence" as const, tokens: [{ id: "left-1", text: "Word one" }, { id: "left-2", text: "Word two" }], options: [{ id: "right-1", text: "Meaning one" }, { id: "right-2", text: "Meaning two" }] }, solution: { order: ["right-2", "right-1"] } };
        render(createElement(Match, { task: matching, onAnswer }));
        fireEvent.click(screen.getByRole("button", { name: /Word one/u }));
        fireEvent.click(screen.getByRole("button", { name: /Meaning two/u }));
        fireEvent.click(screen.getByRole("button", { name: /Word two/u }));
        fireEvent.click(screen.getByRole("button", { name: /Meaning one/u }));
        fireEvent.click(screen.getByRole("button", { name: "Check pairs" }));
        expect(onAnswer).toHaveBeenCalledWith(["right-2", "right-1"]);
    });
    it("Record provides a written path when recording is unavailable and self-check stays explicit", () => {
        const onAnswer = vi.fn();
        const speaking = { ...task, templateId: "record.prompt", mechanic: "record" as const };
        render(createElement(Record, { task: speaking, onAnswer }));
        expect(screen.getByText(/Recording is unavailable/u)).toBeTruthy();
        expect(screen.queryByText("FEEDBACK MODEL")).toBeNull();
        expect((screen.getByRole("button", { name: "Start recording" }) as HTMLButtonElement).disabled).toBe(true);
        fireEvent.change(screen.getByRole("textbox", { name: "Written response alternative" }), { target: { value: "My spoken idea" } });
        fireEvent.click(screen.getByRole("button", { name: "Compare and self-check" }));
        expect(screen.getByText("FEEDBACK MODEL")).toBeTruthy();
        fireEvent.click(screen.getByRole("checkbox", { name: "A clear detail" }));
        fireEvent.click(screen.getByRole("button", { name: "I covered these points" }));
        expect(onAnswer).toHaveBeenCalledWith(["self:complete", "My spoken idea"]);
    });
});
