import type { Metadata } from "next";
import Link from "next/link";
import { PronunciationReviewBoard } from "@/components/review-audio/PronunciationReviewBoard";
import {
  listPronunciationReviewClips,
  summarisePronunciationReview,
} from "@/lib/audio/pronunciation-review";
import { pronunciationReviewPageMetadata } from "@/lib/content/page-metadata";

export const metadata: Metadata = pronunciationReviewPageMetadata();

/**
 * The listening surface for the computer-generated German voice.
 *
 * Deliberately outside the app shell and outside `PRIMARY_NAV`: this is a tool
 * for one person doing one job, not something a learner should meet. It is
 * reached by typing its address. Everything it does is read the clip list and
 * keep the listener notes on their own device — no manifest, no page and no
 * learner profile is touched from here.
 */
export default function ReviewAudioPage() {
  const clips = listPronunciationReviewClips();
  const summary = summarisePronunciationReview(clips);

  return (
    <div className="review-audio">
      <a className="skip-link" href="#main-content">
        Skip to the clips
      </a>

      <main id="main-content" className="review-audio__main">
        <header className="page-header review-audio__header">
          <p className="review-audio__eyebrow">Listening tool</p>
          <h1>Pronunciation listening check</h1>
          <p className="lede">
            Every German clip the app can currently play, on one page, so one
            person can listen straight through and write down what they hear.
          </p>
        </header>

        <section className="panel review-audio__truth" aria-labelledby="review-truth-heading">
          <h2 id="review-truth-heading">Read this before you start</h2>
          <ul>
            <li>
              <strong>The voice is a computer.</strong> Every clip here was
              produced by speech software ({summary.voice}, generated at{" "}
              {summary.rate}). None of it is a recording of a person.
            </li>
            <li>
              <strong>Nothing here has been agreed to be good yet.</strong> No
              one has said any of these clips is right for teaching, and this
              page does not say so either. It only collects what a listener
              hears.
            </li>
            <li>
              <strong>Only a qualified German speaker can decide.</strong>{" "}
              Software cannot tell you whether a vowel, a stress or a rhythm is
              right, so no automatic check stands in for the ear.
            </li>
            <li>
              <strong>This is not part of the course.</strong> It is not in the
              menu and no learner page links to it — you got here by typing the
              address, which is the only way in.
            </li>
            <li>
              <strong>Your notes stay on this device</strong>, kept apart from
              anything about a learner{"'"}s progress. Download them when you are
              done; that file is the thing that can be shared.
            </li>
          </ul>
          <p className="dense">
            Scope: these {summary.clipCount} clips are the ones a learner can
            hear inside the app today. The whole generated batch holds{" "}
            {summary.fullSetSize}; the other{" "}
            {summary.fullSetSize - summary.clipCount} are not wired into any
            page, so listening to them would say nothing about what a learner
            actually hears.
          </p>
          <p className="dense">
            Where the recordings and the course material come from is set out on
            the <Link href="/references">References</Link> page.
          </p>
        </section>

        <PronunciationReviewBoard clips={clips} summary={summary} />
      </main>
    </div>
  );
}
