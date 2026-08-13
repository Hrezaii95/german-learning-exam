/**
 * Server-rendered behavioral UI tests for P3D representative details.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { projectPublishedLearnerDetails } from "../../apps/web/lib/content/detail-project.js";
import type { LearnerDetailProjection } from "../../apps/web/lib/content/detail-types.js";
import {
  PRONUNCIATION_APPROVED_PENDING_ACTIVATION_EXPLANATION,
  PRONUNCIATION_PENDING_EXPLANATION,
  ADD_TO_REVIEW_PENDING_EXPLANATION,
} from "../../apps/web/lib/content/media-copy.js";
import {
  buildHubNavigationContext,
  buildSearchNavigationContext,
} from "../../apps/web/lib/content/navigation-context.js";
import type { ShellNavCurrent } from "../../apps/web/lib/content/nav.js";

vi.mock("next/link", () => ({
  default: function MockLink({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    className?: string;
    "aria-current"?: string;
    "aria-label"?: string;
  }) {
    return createElement("a", { href, ...rest }, children);
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publishedDir = join(platformRoot, "content", "published");

const FORBIDDEN_RENDER = [
  "Architekten",
  "Architektinnen",
  ".mp3",
  "media/generated",
  "candidate-needs-listening-review",
  "assert:",
  "SourceAssertion",
] as const;

describe("P3D detail UI contracts", () => {
  let details: LearnerDetailProjection;
  let AppShell: (props: {
    current: ShellNavCurrent;
    children?: ReactNode;
  }) => ReactNode;
  let DetailView: (props: {
    detail: LearnerDetailProjection["representatives"][number];
    navigation?: ReturnType<typeof buildHubNavigationContext> | null;
  }) => ReactNode;

  beforeAll(async () => {
    details = projectPublishedLearnerDetails(publishedDir);
    const shellMod = await import(
      "../../apps/web/components/shell/AppShell.tsx"
    );
    const detailMod = await import(
      "../../apps/web/components/details/DetailViews.tsx"
    );
    AppShell = shellMod.AppShell as typeof AppShell;
    DetailView = detailMod.DetailView as typeof DetailView;
  });

  it("renders vocabulary semantic tokens, plural gap, and pending audio", () => {
    const vocab = details.representativesById["lex:architekt"];
    const html = renderToStaticMarkup(
      createElement(
        AppShell,
        { current: "vocabulary" },
        createElement(DetailView, {
          detail: vocab,
          navigation: buildHubNavigationContext({
            hubId: "vocabulary",
            lesson: "02",
            resultId: "lex:architekt",
          }),
        }),
      ),
    );

    expect(html.match(/<main\b/g)?.length).toBe(1);
    expect(html).toContain('lang="de"');
    expect(html).toContain("der Architekt");
    expect(html).toContain("die Architektin");
    expect(html).toContain('data-gender="masculine"');
    expect(html).toContain('data-gender-token="M"');
    expect(html).toContain('data-gender-label="Masculine"');
    expect(html).toContain('data-gender="feminine"');
    expect(html).toContain('data-gender-token="F"');
    expect(html).toContain("Plural awaiting content approval");
    expect(html).toContain(PRONUNCIATION_PENDING_EXPLANATION);
    expect(html).toContain("Review cards, tags, and notes become available when local learning state loads in the browser.");
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain("disabled");
    expect(html).toContain("Architekt");
    expect(html).toContain("-in");
    expect(html).toContain('href="/vocabulary?lesson=02"');
    for (const bad of FORBIDDEN_RENDER) {
      expect(html).not.toContain(bad);
    }
  });

  it("renders seven sein forms and irregular legend", () => {
    const verb = details.representativesById["verb:sein"];
    const html = renderToStaticMarkup(
      createElement(DetailView, {
        detail: verb,
        navigation: buildSearchNavigationContext("sein", "verb:sein"),
      }),
    );
    for (const form of ["bin", "bist", "ist", "sind", "seid"]) {
      expect(html).toContain(form);
    }
    expect(html).toContain("er/sie/es");
    expect(html).toContain("Sie (formal)");
    expect(html).toContain("This paradigm is irregular and must be learned as forms.");
    expect(html).toContain('data-morph="IRR"');
    expect(html).toContain(PRONUNCIATION_PENDING_EXPLANATION);
    expect(html).toContain('href="/search?q=sein"');
  });

  it("renders exact Q&A patterns and conversation practice entry", () => {
    const qa = details.representativesById["qa:profession-casual-main"];
    const html = renderToStaticMarkup(
      createElement(DetailView, { detail: qa, navigation: null }),
    );
    expect(html).toContain("Was bist du von Beruf?");
    expect(html).toContain("Ich bin … von Beruf.");
    expect(html).toContain("Ich bin …");
    expect(html).toContain("Ich arbeite als …");
    expect(html).toContain("Conversation practice");
    expect(html).toContain("guided-recognition");
    expect(html).toContain("spoken-role-play");
    expect(html).toContain("Open spoken role-play");
    expect(html).not.toContain("Pending P4");
    expect(html).toContain(PRONUNCIATION_PENDING_EXPLANATION);
    for (const bad of FORBIDDEN_RENDER) {
      expect(html).not.toContain(bad);
    }
  });

  it("keeps malicious nav out of Back href", () => {
    const vocab = details.representativesById["lex:architekt"];
    const html = renderToStaticMarkup(
      createElement(DetailView, {
        detail: vocab,
        navigation: {
          entryContext: "hub",
          returnPath: "//evil.example",
          hubId: "vocabulary",
        },
      }),
    );
    expect(html).not.toContain("://");
    expect(html).not.toContain("evil.example");
  });

  it("never enables Play even for synthetic approved media", async () => {
    const audioMod = await import(
      "../../apps/web/components/audio/PronunciationControl.tsx"
    );
    const PronunciationControl = audioMod.PronunciationControl;
    const resolveAudioControl = audioMod.resolveAudioControl;

    const approved = {
      state: "approved" as const,
      assetId: "synthetic-approved-asset",
    };
    const control = resolveAudioControl(approved);
    expect(control.canPlay).toBe(false);
    expect(control.explanation).toBe(
      PRONUNCIATION_APPROVED_PENDING_ACTIVATION_EXPLANATION,
    );

    const html = renderToStaticMarkup(
      createElement(PronunciationControl, {
        media: approved,
        label: "Pronunciation",
      }),
    );
    expect(html).toContain("disabled");
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain(PRONUNCIATION_APPROVED_PENDING_ACTIVATION_EXPLANATION);
    expect(html).not.toContain("Play pronunciation");
    expect(html).not.toMatch(/<audio\b/i);
    expect(html).not.toContain("onClick");
    expect(html).not.toContain(".mp3");
    expect(html).not.toContain("media/generated");

    // pending-review copy remains exact for the real projected state
    const pending = resolveAudioControl({
      state: "pending-review",
      assetId: null,
    });
    expect(pending.canPlay).toBe(false);
    expect(pending.explanation).toBe(PRONUNCIATION_PENDING_EXPLANATION);
  });

  it("renders generic published details with explicit gaps and no invented rich data", () => {
    const genericLexeme = details.detailsById["lex:alter"];
    const genericVerb = details.detailsById["verb:lernen"];
    const genericQa = details.detailsById["qa:name-formal"];
    if (genericLexeme?.kind !== "Lexeme") throw new Error("expected generic lexeme");
    if (genericVerb?.kind !== "Verb") throw new Error("expected generic verb");
    if (genericQa?.kind !== "QAPair") throw new Error("expected generic QA");

    const lexemeHtml = renderToStaticMarkup(
      createElement(DetailView as any, { detail: genericLexeme }),
    );
    expect(lexemeHtml).toContain("das Alter");
    expect(lexemeHtml).toContain("Plural is not published for this item.");
    expect(lexemeHtml).toContain("No published person-form relation");
    expect(lexemeHtml).not.toContain("Thirteen published person-form pairs");

    const verbHtml = renderToStaticMarkup(
      createElement(DetailView as any, { detail: genericVerb }),
    );
    expect(verbHtml).toContain("lernen");
    expect(verbHtml).toContain("4 published present forms");
    expect(verbHtml).not.toContain("Seven published present forms");
    expect(verbHtml).toContain("Only the published present forms are shown.");

    const qaHtml = renderToStaticMarkup(
      createElement(DetailView as any, { detail: genericQa }),
    );
    expect(qaHtml).toContain("Formal register");
    expect(qaHtml).toContain("Conversation ladder is not published for this Q&amp;A yet.");
    expect(qaHtml).toContain("Speaking practice is not published for this Q&amp;A yet.");
    expect(qaHtml).not.toContain("Open spoken role-play");
  });
});
