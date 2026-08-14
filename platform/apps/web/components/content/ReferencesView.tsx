import Link from "next/link";
import {
  REFERENCES_PUBLISHER,
  REFERENCE_GROUPS,
  type ReferenceGroup,
} from "@/lib/content/references";

/**
 * Learner-reachable source credit for the course material this app teaches
 * from (ADR-016). Two claims are kept visibly apart because blurring them
 * would be dishonest in opposite directions: the course books and CDs are
 * real published material used with the owner's rights, while the short
 * pronunciation previews are machine-made and still unchecked.
 */

function ReferenceGroupSection({ group }: { group: ReferenceGroup }) {
  const headingId = `references-${group.id}`;
  return (
    <section className="panel reference-group" aria-labelledby={headingId}>
      <h2 id={headingId}>{group.title}</h2>
      <p className="lede reference-group__intro">{group.intro}</p>
      <ul className="reference-list">
        {group.works.map((work) => (
          <li key={work.id} className="reference-item">
            <p className="reference-item__title german" lang="de">
              {work.title}
            </p>
            <p className="meta-row">
              <span className="meta-chip">{work.role}</span>
              <span className="meta-chip">{REFERENCES_PUBLISHER}</span>
            </p>
            <p className="reference-item__note">{work.contribution}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReferencesView() {
  return (
    <div className="stack references-page">
      <header className="page-header">
        <p className="dense">Credits</p>
        <h1>References</h1>
        <p className="lede">
          This app teaches from the <span lang="de">Momente</span> A1.1 and A1.2
          course by {REFERENCES_PUBLISHER}. The owner of this app holds the
          rights to use that material here, on the condition that the books and
          the recordings are credited as its sources. This page is that credit.
        </p>
      </header>

      {REFERENCE_GROUPS.map((group) => (
        <ReferenceGroupSection key={group.id} group={group} />
      ))}

      <section className="panel reference-note" aria-labelledby="references-scope">
        <h2 id="references-scope">What this release covers</h2>
        <p>
          This release builds Lessons 1 and 2 only. Material from later lessons
          and from the second workbook CD is left out because those lessons are
          not built yet — that is a decision about how much of the course exists
          in the app, not a question about the sources.
        </p>
      </section>

      <section
        className="panel reference-note reference-note--synthetic"
        aria-labelledby="references-synthetic"
      >
        <h2 id="references-synthetic">
          Computer-generated pronunciation is not course audio
        </h2>
        <p>
          Some single words and short phrases have a small{" "}
          <strong>pronunciation preview</strong> you can play. Those previews do
          not come from the course. A computer voice reads them, and they are
          still waiting to be checked by a qualified German speaker, so they may
          not be a reliable model for how a word really sounds. They are labelled
          as previews everywhere they appear.
        </p>
        <p>
          The workbook listening tracks are a different thing entirely: those are
          the original {REFERENCES_PUBLISHER} recordings described above, and
          nothing on this page credits the course for a computer-made voice.
        </p>
        <p className="reference-note__action">
          <Link className="btn btn-secondary" href="/listening">
            Go to the workbook listening tracks
          </Link>
        </p>
      </section>
    </div>
  );
}
