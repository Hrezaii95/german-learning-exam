import { SavedReview } from "./SavedReview";
import { GuidedReviewPanel } from "./GuidedReviewPanel";

/** Keep personal recall and guided exercise scheduling in their existing stores. */
export function ReviewHome() {
  return <div className="stack review-home">
    <SavedReview/>
    <section id="guided-review" className="study-workspace" aria-label="Guided exercise missions">
      <GuidedReviewPanel/>
    </section>
  </div>;
}
