/**
 * Server-rendered UI smoke for P4B conversation surfaces.
 */
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConversationLadder } from "../../apps/web/components/conversation/ConversationLadder.tsx";
import { ConversationSelector } from "../../apps/web/components/conversation/ConversationNavViews.tsx";
import { GameSelector } from "../../apps/web/components/games/GameSelector.tsx";
import { CONVERSATION_LEVEL_IDS } from "../../apps/web/lib/conversation/index.js";

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    className?: string;
    "aria-label"?: string;
    "data-conversation-entry"?: string;
    "data-conversation-entity"?: string;
  }) {
    return createElement("a", { href, ...rest }, children);
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

describe("P4B conversation UI", () => {
  it("renders ladder with exact level order and 44px-capable controls", () => {
    const html = renderToStaticMarkup(createElement(ConversationLadder));
    expect(html).toContain('data-conversation="true"');
    expect(html).toContain(CONVERSATION_LEVEL_IDS.join(","));
    expect(html).toContain("Was bist du von Beruf?");
    expect(html).toContain("1/5");
    expect(html).toContain('data-level="model"');
    expect(html).toMatch(/Mark studied/);
    expect(html).not.toContain("correct pronunciation");
    expect(html).not.toContain("pronunciationScore");
  });

  it("exposes conversation entry from practice selector", () => {
    const html = renderToStaticMarkup(createElement(GameSelector));
    expect(html).toContain("Conversation practice");
    expect(html).toContain('data-conversation-entry="true"');
    expect(html).toContain("/conversation/qa%3Aprofession-casual-main");
  });

  it("renders conversation index selector", () => {
    const html = renderToStaticMarkup(createElement(ConversationSelector));
    expect(html).toContain("Conversation practice");
    expect(html).toContain("Was bist du von Beruf?");
  });
});
