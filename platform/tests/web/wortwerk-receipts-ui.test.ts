/// <reference lib="dom" />
// @vitest-environment jsdom
import { createElement, type ComponentType } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const receiptPanelPath = "../../apps/web/components/wortwerk/ReceiptPanel.js";
const { ReceiptPanel, AssignmentCard, ReceiptButton } = await import(receiptPanelPath) as {
    ReceiptPanel: ComponentType<{
        receipt: CompletionReceipt;
    }>;
    AssignmentCard: ComponentType;
    ReceiptButton: ComponentType<{
        receipt: CompletionReceipt;
    }>;
};
import { decodeReceipt, RECEIPT_DISCLAIMER, type CompletionReceipt } from "../../apps/web/lib/wortwerk/receipts";
import { rememberAssignment } from "../../apps/web/lib/wortwerk/challenges";
import { wortwerkStore } from "../../apps/web/lib/wortwerk/store";
const receipt: CompletionReceipt = { v: 1, packId: "sample", bySkill: { meaning: { answered: 5, correct: 4 } }, completedAt: "2026-10-22T12:00:00.000Z", answered: 5, correct: 4 };
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("Wortwerk student result panels", () => {
    it("requires an explicit gesture before generating a result code", () => {
        render(createElement(ReceiptButton, { receipt }));
        expect(screen.queryByRole("textbox", { name: "Result code" })).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "Create a result code" }));
        expect(screen.getByRole("textbox", { name: "Result code" })).toBeTruthy();
    });
    it("discloses the checksum limit and copies only after a user click", async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
        render(createElement(ReceiptPanel, { receipt }));
        expect(screen.getByText(RECEIPT_DISCLAIMER)).toBeTruthy();
        expect(writeText).not.toHaveBeenCalled();
        const code = (screen.getByRole("textbox", { name: "Result code" }) as HTMLTextAreaElement).value;
        expect(decodeReceipt(code)).toEqual(receipt);
        fireEvent.click(screen.getByRole("button", { name: "Copy result code" }));
        await waitFor(() => expect(writeText).toHaveBeenCalledWith(code));
        expect(screen.getByRole("status").textContent).toContain("copied");
    });
    it("keeps the selectable code available when clipboard copying is denied", async () => {
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
        render(createElement(ReceiptPanel, { receipt }));
        fireEvent.click(screen.getByRole("button", { name: "Copy result code" }));
        await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Select the result code"));
        expect((screen.getByRole("textbox", { name: "Result code" }) as HTMLTextAreaElement).readOnly).toBe(true);
    });
    it("downloads locally without network or automatic transmission", () => {
        vi.useFakeTimers();
        const createObjectURL = vi.fn().mockReturnValue("blob:receipt");
        const revokeObjectURL = vi.fn();
        Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
        Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
        const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => { });
        render(createElement(ReceiptPanel, { receipt }));
        expect(createObjectURL).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", { name: "Download result code" }));
        expect(createObjectURL).toHaveBeenCalledTimes(1);
        expect(click).toHaveBeenCalledTimes(1);
        vi.runAllTimers();
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:receipt");
    });
    it("shows remembered assignments and removes completed tasks using raw progress events", () => {
        act(() => rememberAssignment({ v: 1, lessons: [3], count: 5 }, "ui-task", wortwerkStore, "sample"));
        render(createElement(AssignmentCard));
        const link = screen.getByRole("link", { name: "Continue assignment ui-task" }) as HTMLAnchorElement;
        expect(link.getAttribute("href")).toContain("assignment=ui-task");
        act(() => { wortwerkStore.appendEvent("assignment.progress", { assignmentId: "ui-task", answered: 5, correct: 4, bySkill: { meaning: { answered: 5, correct: 4 } }, completed: true }); });
        expect(screen.queryByRole("link", { name: "Continue assignment ui-task" })).toBeNull();
    });
});
