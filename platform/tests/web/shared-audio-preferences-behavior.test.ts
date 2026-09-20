/** @vitest-environment jsdom */
import { createElement, Fragment } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LearnerStateProvider } from "../../apps/web/components/learner-state/LearnerStateProvider";
import { AudioSpeedControl, useAudioSpeed } from "../../apps/web/components/audio/AudioSpeedControl";
import { LineAudio, stopStudyAudio } from "../../apps/web/components/study/StudyAudio";
import { WordFamilyCard } from "../../apps/web/components/word-cards/WordFamilyCard";
import { wordCardForPath } from "../../apps/web/lib/content/word-cards";
import { LemmaAudioButton } from "../../apps/web/components/media/MeaningPlate";

function Controls() {
  const control = useAudioSpeed();
  return createElement(Fragment, null,
    createElement(AudioSpeedControl, { control }),
    createElement(LineAudio, { text: "Hallo!", src: "/test-hallo.mp3" }),
    createElement(LemmaAudioButton, { audio: { publicPath: "/test-lampe.mp3", spokenText: "die Lampe" }, label: "die Lampe" }),
    createElement(WordFamilyCard, { card: wordCardForPath("/collections/professions/01")! }));
}

describe("shared pronunciation preference", () => {
  let played: HTMLMediaElement[];
  beforeEach(() => {
    localStorage.clear(); played = [];
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function(this: HTMLMediaElement) { played.push(this); return Promise.resolve(); });
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("uses the saved speed for line speech and word cards, stops the previous clip and retains it after remount", async () => {
    const user = userEvent.setup();
    const view = render(createElement(LearnerStateProvider, null, createElement(Controls)));
    const speed = await screen.findByRole("combobox", { name: "Audio speed" });
    await waitFor(() => expect((speed as HTMLSelectElement).disabled).toBe(false));
    await user.selectOptions(speed, "0.75");
    await waitFor(() => expect((speed as HTMLSelectElement).value).toBe("0.75"));
    await user.click(screen.getByRole("button", { name: "Listen: Hallo!" }));
    expect(played.at(-1)?.playbackRate).toBe(0.75);
    await user.click(screen.getByRole("button", { name: "Listen: der Elektriker" }));
    expect(played.at(-1)?.playbackRate).toBe(0.75);
    expect(screen.getByRole("button", { name: "Listen: Hallo!" }).getAttribute("aria-pressed")).toBe("false");
    await user.click(screen.getByRole("button", { name: "Listen — die Lampe pronunciation" }));
    expect(played.at(-1)?.playbackRate).toBe(0.75);
    await user.selectOptions(speed, "1.25");
    await waitFor(() => expect(played.at(-1)?.playbackRate).toBe(1.25));
    view.unmount();
    render(createElement(LearnerStateProvider, null, createElement(Controls)));
    await waitFor(() => expect((screen.getByRole("combobox", { name: "Audio speed" }) as HTMLSelectElement).value).toBe("1.25"));
  });

  it("reports a failed preview and lets the learner retry it", async () => {
    const user = userEvent.setup();
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error("network unavailable"));
    render(createElement(LearnerStateProvider, null, createElement(Controls)));
    await user.click(screen.getByRole("button", { name: "Listen — die Lampe pronunciation" }));
    expect(await screen.findByText("Audio could not play. Press Listen to retry.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Listen — die Lampe pronunciation" }));
    await waitFor(() => expect(screen.queryByText("Audio could not play. Press Listen to retry.")).toBeNull());
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalledOnce();
  });

  it("labels device-speech fallback and speaks the exact line at the chosen speed", async () => {
    const spoken: { text: string; rate: number; lang: string }[] = [];
    vi.stubGlobal("SpeechSynthesisUtterance", class {
      rate = 1; lang = "";
      constructor(public text: string) {}
    });
    vi.stubGlobal("speechSynthesis", { cancel: vi.fn(), getVoices: () => [{ lang: "de-DE" }], speak: (item: { text: string; rate: number; lang: string }) => spoken.push(item) });
    const user = userEvent.setup();
    render(createElement(LearnerStateProvider, null, createElement(Controls)));
    const speed = screen.getByRole("combobox", { name: "Audio speed" });
    await waitFor(() => expect((speed as HTMLSelectElement).disabled).toBe(false));
    await user.selectOptions(speed, "0.75");
    await waitFor(() => expect((speed as HTMLSelectElement).value).toBe("0.75"));
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error("file missing"));
    await user.click(screen.getByRole("button", { name: "Listen: Hallo!" }));
    expect(await screen.findByText("Audio file unavailable; using device speech.")).toBeTruthy();
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toMatchObject({ text: "Hallo!", rate: 0.75, lang: "de-DE" });
  });

  it("keeps the newly started native recording playing while stopping other players", () => {
    const current = document.createElement("audio"), previous = document.createElement("audio");
    document.body.append(current, previous);
    const currentPause = vi.spyOn(current, "pause"), previousPause = vi.spyOn(previous, "pause");
    stopStudyAudio(current);
    expect(currentPause).not.toHaveBeenCalled();
    expect(previousPause).toHaveBeenCalledOnce();
    current.remove(); previous.remove();
  });
});
