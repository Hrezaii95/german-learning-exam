/**
 * @vitest-environment jsdom
 *
 * The pronunciation listening surface, driven the way a reviewer drives it.
 *
 * The board takes its clips as plain props, which is what makes this possible
 * at all: the file reader stays on the server and the component under test is
 * fed the same frozen data the page would hand it. Most cases use a six-clip
 * fixture drawn from the real projection; one case renders the whole set,
 * because "every clip is on one page" is the promise the surface exists to
 * keep and a subset could never prove it.
 */
import { createElement, type ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PronunciationReviewBoard } from "../../apps/web/components/review-audio/PronunciationReviewBoard.js";
import {
  summarisePronunciationReview,
  type PronunciationReviewClip,
} from "../../apps/web/lib/audio/pronunciation-review.js";
import { listPronunciationReviewClips } from "../../apps/web/lib/audio/pronunciation-review.server.js";
import {
  REVIEW_VERDICT_STORAGE_KEY,
  parseVerdictBook,
} from "../../apps/web/lib/audio/review-verdicts.js";
import { LEARNER_STATE_STORAGE_KEY } from "@german-learning/learning";

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    target?: string;
    rel?: string;
  }) {
    return createElement("a", { href, ...rest }, children);
  },
}));

const allClips = listPronunciationReviewClips();

/** Two clips from each of three sounds, so a filter has something to hide. */
const fixture: readonly PronunciationReviewClip[] = (() => {
  const wanted = ["ich-or-ach-sound", "r-sound", "connected-speech"] as const;
  const picked: PronunciationReviewClip[] = [];
  for (const tag of wanted) {
    picked.push(
      ...allClips.filter((clip) => clip.primaryRiskTag === tag).slice(0, 2),
    );
  }
  return Object.freeze(picked);
})();

function renderBoard(clips: readonly PronunciationReviewClip[] = fixture) {
  return render(
    createElement(PronunciationReviewBoard, {
      clips,
      summary: summarisePronunciationReview(clips),
    }),
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

/* ===========================================================================
 * Everything on one page
 * ======================================================================== */

describe("the list", () => {
  it("puts all 110 clips on the page at once", () => {
    renderBoard(allClips);
    const players = document.querySelectorAll("audio[data-review-audio]");
    expect(players).toHaveLength(allClips.length);
    expect(players).toHaveLength(110);
    expect(document.querySelectorAll(".review-clip")).toHaveLength(110);
  });

  it("shows the German, marked as German, beside a player and its length", () => {
    renderBoard();
    for (const clip of fixture) {
      const card = document.querySelector(
        `[data-clip-reference="${clip.reference}"]`,
      ) as HTMLElement;
      expect(card).toBeTruthy();

      const german = card.querySelector(".review-clip__german") as HTMLElement;
      expect(german.textContent).toBe(clip.spokenText);
      expect(german.getAttribute("lang")).toBe("de");

      const audio = card.querySelector("audio") as HTMLAudioElement;
      expect(audio.hasAttribute("controls")).toBe(true);
      expect(audio.getAttribute("preload")).toBe("metadata");
      expect(audio.getAttribute("src")).toContain(clip.publicRelativePath);

      expect(card.textContent).toContain(
        `${clip.durationSeconds.toFixed(1)} seconds`,
      );
    }
  });

  it("says where each clip is heard, in words", () => {
    renderBoard();
    const withUsage = fixture.find((clip) => clip.usages.length > 0);
    expect(withUsage).toBeTruthy();
    const card = document.querySelector(
      `[data-clip-reference="${withUsage?.reference}"]`,
    ) as HTMLElement;
    const first = withUsage?.usages[0];
    expect(card.textContent).toContain(first?.label);
    expect(card.textContent).toContain(first?.context);
  });
});

/* ===========================================================================
 * Filtering and grouping
 * ======================================================================== */

/**
 * A clip carries several sounds at once — an r in a phrase is both `r-sound`
 * and `connected-speech` — so a filter's count is every clip that carries the
 * sound, not just the ones it happens to head a group with. Deriving it here
 * keeps the test honest if the fixture changes.
 */
const withRSound = fixture.filter((clip) => clip.riskTags.includes("r-sound"));

describe("choosing what to listen to", () => {
  it("counts each sound on its own control", () => {
    renderBoard();
    expect(withRSound.length).toBeGreaterThan(0);
    const rSound = screen.getByRole("button", {
      name: `German r (${withRSound.length})`,
    });
    expect(rSound.getAttribute("aria-pressed")).toBe("false");
  });

  it("narrows the page to one sound and back again", async () => {
    const user = userEvent.setup();
    renderBoard();
    expect(document.querySelectorAll(".review-clip")).toHaveLength(6);
    expect(withRSound.length).toBeLessThan(fixture.length);

    await user.click(
      screen.getByRole("button", { name: `German r (${withRSound.length})` }),
    );

    const shown = [...document.querySelectorAll<HTMLElement>(".review-clip")];
    expect(shown).toHaveLength(withRSound.length);
    for (const card of shown) {
      const reference = card.dataset.clipReference;
      const clip = fixture.find((entry) => entry.reference === reference);
      expect(clip?.riskTags).toContain("r-sound");
    }
    expect(document.querySelector(".review-board__progress")?.textContent).toContain(
      `Showing ${withRSound.length} of 6 clips`,
    );

    await user.click(screen.getByRole("button", { name: "Show every sound" }));
    expect(document.querySelectorAll(".review-clip")).toHaveLength(6);
  });

  it("groups by sound, hardest first, with a heading a listener can act on", () => {
    renderBoard();
    const headings = [
      ...document.querySelectorAll<HTMLElement>(".review-board__group h2"),
    ].map((node) => node.textContent ?? "");
    expect(headings[0]).toContain("ich / ach sound");
    expect(headings.some((text) => text.includes("German r"))).toBe(true);
    expect(headings.some((text) => text.includes("Words run together"))).toBe(
      true,
    );
  });
});

/* ===========================================================================
 * Recording a verdict, and finding it again
 * ======================================================================== */

describe("recording a verdict", () => {
  it("writes to the reviewer's own key and never to learner progress", async () => {
    const user = userEvent.setup();
    renderBoard();
    const clip = fixture[0] as PronunciationReviewClip;
    const card = document.querySelector(
      `[data-clip-reference="${clip.reference}"]`,
    ) as HTMLElement;

    await user.click(within(card).getByRole("radio", { name: /^Approve/ }));

    const stored = window.localStorage.getItem(REVIEW_VERDICT_STORAGE_KEY);
    expect(stored).toBeTruthy();
    const book = parseVerdictBook(stored);
    expect(book.entries[clip.id]).toMatchObject({
      verdict: "approve",
      sha256: clip.sha256,
    });
    expect(book.entries[clip.id]?.recordedAt).not.toBe("");

    // The learner store must be untouched — not merged into, not created.
    expect(window.localStorage.getItem(LEARNER_STATE_STORAGE_KEY)).toBeNull();
  });

  it("keeps a free-text note beside the verdict", async () => {
    const user = userEvent.setup();
    renderBoard();
    const clip = fixture[0] as PronunciationReviewClip;
    const card = document.querySelector(
      `[data-clip-reference="${clip.reference}"]`,
    ) as HTMLElement;

    await user.click(within(card).getByRole("radio", { name: /^Reject/ }));
    await user.type(
      within(card).getByRole("textbox", { name: /^Note/ }),
      "Final g is soft.",
    );

    const book = parseVerdictBook(
      window.localStorage.getItem(REVIEW_VERDICT_STORAGE_KEY),
    );
    expect(book.entries[clip.id]).toMatchObject({
      verdict: "reject",
      note: "Final g is soft.",
    });
  });

  it("reads an earlier sitting back off this device", async () => {
    const user = userEvent.setup();
    const first = renderBoard();
    const clip = fixture[0] as PronunciationReviewClip;
    await user.click(
      within(
        document.querySelector(
          `[data-clip-reference="${clip.reference}"]`,
        ) as HTMLElement,
      ).getByRole("radio", { name: /^Approve/ }),
    );
    await user.type(screen.getByLabelText("Who is listening?"), "Anna B.");
    first.unmount();

    renderBoard();
    expect(
      (screen.getByLabelText("Who is listening?") as HTMLInputElement).value,
    ).toBe("Anna B.");
    const card = document.querySelector(
      `[data-clip-reference="${clip.reference}"]`,
    ) as HTMLElement;
    expect(card.dataset.verdict).toBe("approve");
    expect(
      (within(card).getByRole("radio", { name: /^Approve/ }) as HTMLInputElement)
        .checked,
    ).toBe(true);
  });

  it("undoes one clip without disturbing the rest", async () => {
    const user = userEvent.setup();
    renderBoard();
    const clip = fixture[0] as PronunciationReviewClip;
    const card = () =>
      document.querySelector(
        `[data-clip-reference="${clip.reference}"]`,
      ) as HTMLElement;

    expect(
      (within(card()).getByRole("button", { name: /^Clear/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await user.click(within(card()).getByRole("radio", { name: /^Approve/ }));
    await user.click(within(card()).getByRole("button", { name: /^Clear/ }));

    expect(card().dataset.verdict).toBe("none");
    const book = parseVerdictBook(
      window.localStorage.getItem(REVIEW_VERDICT_STORAGE_KEY),
    );
    expect(book.entries[clip.id]).toBeUndefined();
  });
});

/* ===========================================================================
 * Knowing where you are, and coming back tomorrow
 * ======================================================================== */

describe("resuming a sitting", () => {
  it("counts what has been reviewed out of the whole set", async () => {
    const user = userEvent.setup();
    renderBoard();
    const progress = () =>
      document.querySelector(".review-board__count") as HTMLElement;
    expect(progress().textContent).toContain("0 of 6");

    await user.click(
      within(
        document.querySelector(
          `[data-clip-reference="${(fixture[0] as PronunciationReviewClip).reference}"]`,
        ) as HTMLElement,
      ).getByRole("radio", { name: /^Approve/ }),
    );
    expect(progress().textContent).toContain("1 of 6");
    expect(
      (document.querySelector(".review-board__bar") as HTMLProgressElement).value,
    ).toBe(1);
  });

  it("hides what is already done so the next sitting starts where it stopped", async () => {
    const user = userEvent.setup();
    renderBoard();
    await user.click(
      within(
        document.querySelector(
          `[data-clip-reference="${(fixture[0] as PronunciationReviewClip).reference}"]`,
        ) as HTMLElement,
      ).getByRole("radio", { name: /^Approve/ }),
    );

    await user.click(
      screen.getByLabelText("Only the ones I have not reviewed yet"),
    );
    expect(document.querySelectorAll(".review-clip")).toHaveLength(5);
    expect(
      document.querySelector(
        `[data-clip-reference="${(fixture[0] as PronunciationReviewClip).reference}"]`,
      ),
    ).toBeNull();
  });

  it("speaks each change through a live region that already exists", async () => {
    const user = userEvent.setup();
    renderBoard();
    const region = document.querySelector('[role="status"]') as HTMLElement;
    expect(region).toBeTruthy();
    expect(region.getAttribute("aria-live")).toBe("polite");
    const before = region.dataset.announcementSeq;

    await user.click(
      within(
        document.querySelector(
          `[data-clip-reference="${(fixture[0] as PronunciationReviewClip).reference}"]`,
        ) as HTMLElement,
      ).getByRole("radio", { name: /^Approve/ }),
    );

    const after = document.querySelector('[role="status"]') as HTMLElement;
    expect(after.dataset.announcementSeq).not.toBe(before);
    expect(after.textContent).toContain("1 of 6 reviewed");
  });
});

/* ===========================================================================
 * The file that leaves the room
 * ======================================================================== */

describe("the download", () => {
  it("hands over a JSON file bound to the audio that was judged", async () => {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    const createObjectURL = vi
      .fn((blob: Blob) => {
        blobs.push(blob);
        return "blob:notes";
      })
      .mockName("createObjectURL");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
    const clicks: string[] = [];
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicks.push(this.download);
      });

    try {
      renderBoard();
      const clip = fixture[0] as PronunciationReviewClip;
      await user.type(screen.getByLabelText("Who is listening?"), "Anna B.");
      await user.click(
        within(
          document.querySelector(
            `[data-clip-reference="${clip.reference}"]`,
          ) as HTMLElement,
        ).getByRole("radio", { name: /^Approve/ }),
      );
      await user.click(screen.getByRole("button", { name: "Download my notes" }));

      expect(clicks).toHaveLength(1);
      expect(clicks[0]).toMatch(
        /^german-pronunciation-listening-notes-.*\.json$/,
      );
      expect(blobs).toHaveLength(1);
      expect(blobs[0]?.type).toBe("application/json");

      const notes = JSON.parse(await (blobs[0] as Blob).text()) as {
        documentKind: string;
        reviewer: string;
        clipsInApp: number;
        clipsInWholeGeneratedSet: number;
        clipsReviewed: number;
        rows: readonly Record<string, unknown>[];
      };
      expect(notes.documentKind).toBe("german-pronunciation-listening-notes");
      expect(notes.reviewer).toBe("Anna B.");
      expect(notes.clipsInApp).toBe(fixture.length);
      expect(notes.clipsInWholeGeneratedSet).toBe(354);
      expect(notes.clipsReviewed).toBe(1);
      expect(notes.rows).toHaveLength(1);
      expect(notes.rows[0]).toMatchObject({
        clipId: clip.id,
        sha256: clip.sha256,
        verdict: "approve",
        reviewer: "Anna B.",
      });
      expect(String(notes.rows[0]?.recordedAt)).not.toBe("");
    } finally {
      clickSpy.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});

/* ===========================================================================
 * Accessibility the page is gated on
 * ======================================================================== */

describe("accessible names and targets", () => {
  it("starts every control's spoken name with the words on screen", () => {
    renderBoard();
    const clip = fixture[0] as PronunciationReviewClip;
    const card = document.querySelector(
      `[data-clip-reference="${clip.reference}"]`,
    ) as HTMLElement;

    // Voice control says what it sees: "click Approve", "click Clear".
    for (const [visible, role] of [
      ["Approve", "radio"],
      ["Needs re-record", "radio"],
      ["Reject", "radio"],
    ] as const) {
      const control = within(card).getByRole(role, {
        name: new RegExp(`^${visible.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
      });
      expect(control).toBeTruthy();
    }
    expect(
      within(card).getByRole("button", { name: /^Clear/ }),
    ).toBeTruthy();
    expect(within(card).getByRole("textbox", { name: /^Note/ })).toBeTruthy();

    // …and the extra words that make 110 identical controls distinguishable
    // are the German itself, carried after the visible label.
    const approve = within(card).getByRole("radio", { name: /^Approve/ });
    expect(approve.closest("label")?.textContent).toContain(clip.spokenText);
  });

  it("names the player by what it will say", () => {
    renderBoard();
    const clip = fixture[0] as PronunciationReviewClip;
    const audio = document.querySelector(
      `[data-clip-reference="${clip.reference}"] audio`,
    ) as HTMLAudioElement;
    const label = audio.getAttribute("aria-label") ?? "";
    expect(label.startsWith("Play ")).toBe(true);
    expect(label).toContain(clip.spokenText);
    expect(label).toContain("computer voice");
  });

  it("marks German as German and English as English in the usage list", () => {
    renderBoard();
    const clip = fixture.find((entry) =>
      entry.usages.some((usage) => usage.language === "en"),
    );
    if (!clip) return;
    const card = document.querySelector(
      `[data-clip-reference="${clip.reference}"]`,
    ) as HTMLElement;
    const english = clip.usages.find((usage) => usage.language === "en");
    const node = [...card.querySelectorAll<HTMLElement>("[lang]")].find(
      (element) => element.textContent === english?.label,
    );
    expect(node?.getAttribute("lang")).toBe("en");
  });

  it("gives every clip a heading-free structure a keyboard can walk", async () => {
    const user = userEvent.setup();
    renderBoard();
    // Tab order reaches the reviewer name, the filters, then the first clip's
    // player and its verdict controls — no control is mouse-only.
    await user.tab();
    expect(document.activeElement?.id).toBe("review-listener");
    const focusables = [
      ...document.querySelectorAll<HTMLElement>(
        "button, input, textarea, audio[controls], summary, a[href]",
      ),
    ];
    for (const element of focusables) {
      expect(element.getAttribute("tabindex")).not.toBe("-1");
    }
  });
});
