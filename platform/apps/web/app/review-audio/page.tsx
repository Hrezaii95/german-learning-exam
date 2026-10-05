
import { LA, LDiv, LH1, LH2, LHeader, LLi, LMain, LP, LSection, LStrong, LUl } from "@/components/i18n/LocalizedElements";
import type { Metadata } from "next";
import Link from "@/components/i18n/LocalizedLink";
import { PronunciationReviewBoard } from "@/components/review-audio/PronunciationReviewBoard";
import { summarisePronunciationReview } from "@/lib/audio/pronunciation-review";
import { listPronunciationReviewClips } from "@/lib/audio/pronunciation-review.server";
import { pronunciationReviewPageMetadata } from "@/lib/content/page-metadata";

export const metadata: Metadata = pronunciationReviewPageMetadata();

/**
 * The listening surface for the computer-generated German voice.
 *
 * A SERVER component, and that is the whole architecture of this route. It is
 * the only place allowed to touch `pronunciation-review.server.ts`, which reads
 * the manifest and the technical notes off disk. Everything below this file is
 * a client leaf that receives plain serialisable data — an earlier attempt let
 * a `"use client"` component import the file reader for its constants, which
 * pulled `node:fs` into the browser bundle and made `next build` fail with
 * `UnhandledSchemeError`, blocking every gate behind it.
 *
 * Deliberately outside the app shell and outside `PRIMARY_NAV`: this is a tool
 * for one person doing one job, not something a learner should meet. It is
 * reached by typing its address. Everything it does is read the clip list and
 * keep the listener's notes on their own device — no manifest, no page and no
 * learner profile is touched from here.
 */
export default function ReviewAudioPage() {
  const clips = listPronunciationReviewClips();
  const summary = summarisePronunciationReview(clips);

  return (
    <LDiv className="review-audio">
      <LA className="skip-link" href="#main-content">
        Skip to the clips
      </LA>

      <LMain id="main-content" className="review-audio__main">
        <LHeader className="page-header review-audio__header">
          <LP className="review-audio__eyebrow">Listening tool</LP>
          <LH1>Pronunciation listening check</LH1>
          <LP className="lede">
            Every German clip the app can currently play, on one page, so one
            person can listen straight through and write down what they hear.
          </LP>
        </LHeader>

        <LSection
          className="panel review-audio__truth"
          aria-labelledby="review-truth-heading"
        >
          <LH2 id="review-truth-heading">Read this before you start</LH2>
          <LUl>
            <LLi>
              <LStrong>The voice is a computer.</LStrong> Every clip here was
              produced by Microsoft speech software — the {summary.voice} voice
              driven through edge-tts, generated at {summary.rate}. None of it
              is a recording of a person.
            </LLi>
            <LLi>
              <LStrong>Nothing here has been agreed to be good yet.</LStrong> No
              one has said any of these clips is right for teaching, and this
              page does not say so either. It only collects what a listener
              hears.
            </LLi>
            <LLi>
              <LStrong>Only a qualified German speaker can decide.</LStrong>{" "}
              Software cannot tell you whether a vowel, a stress or a rhythm is
              right, so no automatic check stands in for the ear.
            </LLi>
            <LLi>
              <LStrong>This is not part of the course.</LStrong> It is not in the
              menu and no learner page links to it — you got here by typing the
              address, which is the only way in.
            </LLi>
            <LLi>
              <LStrong>Your notes stay on this device</LStrong>, kept apart from
              anything about a learner{"'"}s progress. Download them when you
              are done; that file is the thing that can be shared.
            </LLi>
          </LUl>
          <LP className="dense">
            Scope: these {summary.clipCount} clips are the ones a learner can
            hear inside the app today. The whole generated batch holds{" "}
            {summary.fullSetSize}; the other{" "}
            {summary.fullSetSize - summary.clipCount} are not wired into any
            page, so listening to them would say nothing about what a learner
            actually hears.
          </LP>
          <LP className="dense">
            Where the recordings and the course material come from is set out on
            the <Link href="/references">References</Link> page.
          </LP>
        </LSection>

        <PronunciationReviewBoard clips={clips} summary={summary} />
      </LMain>
    </LDiv>
  );
}
