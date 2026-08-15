/**
 * @vitest-environment jsdom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PronunciationControl } from "../../apps/web/components/audio/PronunciationControl.js";

const approved = {
  state: "preview" as const,
  assetId: "aud:tts:62dc09ce76149784:v1",
  publicPath: "/audio/tts-de-de-v1/tts-62dc09ce76149784.mp3",
  sourceText: "der Architekt",
  spokenText: "der Architekt",
  locale: "de-DE" as const,
  voice: "de-DE-KatjaNeural",
  generationRate: "+4%",
  origin: "synthesized-edge-tts" as const,
};

describe("pronunciation control behavior", () => {
  const play = vi.fn<() => Promise<void>>();
  const pause = vi.fn<() => void>();

  beforeEach(() => {
    play.mockResolvedValue(undefined);
    pause.mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("plays immediately at normal speed and exposes the exact synthesized text", async () => {
    const user = userEvent.setup();
    const { container } = render(
      createElement(PronunciationControl, { media: approved, label: "der Architekt" }),
    );
    const audio = container.querySelector("audio");
    expect(audio).not.toBeNull();
    expect(audio?.getAttribute("src")).toContain("tts-62dc09ce76149784.mp3");
    expect(audio?.playbackRate).toBe(1);
    expect(screen.getByText("der Architekt", { selector: "p" }).getAttribute("lang")).toBe("de");
    expect(screen.getByText(/Synthesized German preview voice/u)).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Play pronunciation — der Architekt" }));
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("switches between pitch-preserving 0.8x and 1x and repeats from the start", async () => {
    const user = userEvent.setup();
    const { container } = render(
      createElement(PronunciationControl, { media: approved, label: "der Architekt" }),
    );
    const audio = container.querySelector("audio");
    if (!audio) throw new Error("expected pronunciation audio element");

    await user.click(screen.getByRole("button", { name: "Study 0.8×" }));
    expect(audio.playbackRate).toBe(0.8);
    expect(screen.getByRole("button", { name: "Study 0.8×" }).getAttribute("aria-pressed")).toBe("true");

    await user.click(screen.getByRole("button", { name: "Normal 1×" }));
    expect(audio.playbackRate).toBe(1);
    expect(screen.getByRole("button", { name: "Normal 1×" }).getAttribute("aria-pressed")).toBe("true");

    audio.currentTime = 2.4;
    await user.click(screen.getByRole("button", { name: "Repeat" }));
    expect(audio.currentTime).toBe(0);
    expect(play).toHaveBeenCalledTimes(1);
  });
});
