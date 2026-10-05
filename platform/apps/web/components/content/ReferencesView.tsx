
import { LDiv, LH1, LH2, LHeader, LLi, LP, LSection, LSpan, LStrong, LUl } from "@/components/i18n/LocalizedElements";
import Link from "@/components/i18n/LocalizedLink";
import {
  REFERENCES_PUBLISHER,
  REFERENCE_GROUPS,
  type ReferenceGroup,
} from "@/lib/content/references";

/**
 * Learner-reachable source credit for the course material this app teaches
 * from (ADR-016). Three claims are kept visibly apart because blurring them
 * would be dishonest in different directions: the course books and CDs are
 * real published material used with the owner's rights; the in-app
 * illustrations are original artwork that the course must not be credited
 * for; and the short pronunciation previews are machine-made and still
 * unchecked.
 */

function ReferenceGroupSection({ group }: { group: ReferenceGroup }) {
  const headingId = `references-${group.id}`;
  return (
    <LSection className="panel reference-group" aria-labelledby={headingId}>
      <LH2 id={headingId}>{group.title}</LH2>
      <LP className="lede reference-group__intro">{group.intro}</LP>
      <LUl className="reference-list">
        {group.works.map((work) => (
          <LLi key={work.id} className="reference-item">
            <LP className="reference-item__title german" lang="de">
              {work.title}
            </LP>
            <LP className="meta-row">
              <LSpan className="meta-chip">{work.role}</LSpan>
              <LSpan className="meta-chip">{REFERENCES_PUBLISHER}</LSpan>
            </LP>
            <LP className="reference-item__note">{work.contribution}</LP>
          </LLi>
        ))}
      </LUl>
    </LSection>
  );
}

export function ReferencesView() {
  return (
    <LDiv className="stack references-page">
      <LHeader className="page-header">
        <LP className="dense">Credits</LP>
        <LH1>References</LH1>
        <LP className="lede">
          This app teaches from the <LSpan lang="de">Momente</LSpan> A1.1 and A1.2
          course by {REFERENCES_PUBLISHER}. The owner of this app holds the
          rights to use that material here, on the condition that the books and
          the recordings are credited as its sources. This page is that credit.
        </LP>
      </LHeader>

      {REFERENCE_GROUPS.map((group) => (
        <ReferenceGroupSection key={group.id} group={group} />
      ))}

      <LSection className="panel reference-note" aria-labelledby="references-scope">
        <LH2 id="references-scope">What this release covers</LH2>
        <LP>
          The interactive book covers Lessons 1–4: 32 original coursebook and
          workbook pages with 64 original exercise recordings. Lesson 4 adds
          furniture, prices and opinions, with authored explanations and practice.
        </LP>
      </LSection>

      <LSection
        className="panel reference-note reference-note--artwork"
        aria-labelledby="references-artwork"
      >
        <LH2 id="references-artwork">
          Course pages and app illustrations
        </LH2>
        <LP>
          The original pages and the pictures inside the interactive book come
          from <LSpan lang="de">Momente</LSpan> and are credited to {REFERENCES_PUBLISHER}.
          The profession illustrations on the vocabulary cards and the Lesson 4
          room diagram were created for this app.
        </LP>
        <LP>
          The job pictures deliberately show the work being done — hands and
          tools, never a face. That is what lets one drawing stand for both the{" "}
          <LSpan lang="de">der</LSpan> word and the <LSpan lang="de">die</LSpan>{" "}
          word. The article, the word ending and the colour badge are what tell
          those two forms apart; the picture never does.
        </LP>
      </LSection>

      <LSection
        className="panel reference-note reference-note--synthetic"
        aria-labelledby="references-synthetic"
      >
        <LH2 id="references-synthetic">
          Computer-generated pronunciation is not course audio
        </LH2>
        <LP>
          Some single words and short phrases have a small{" "}
          <LStrong>pronunciation preview</LStrong> you can play. Those previews do
          not come from the course. A computer voice reads them, and they are
          still waiting to be checked by a qualified German speaker, so they may
          not be a reliable model for how a word really sounds. They are labelled
          as previews everywhere they appear.
        </LP>
        <LP>
          The workbook listening tracks are a different thing entirely: those are
          the original {REFERENCES_PUBLISHER} recordings described above, and
          nothing on this page credits the course for a computer-made voice.
        </LP>
        <LP className="reference-note__action">
          <Link className="btn btn-secondary" href="/listening">
            Go to the workbook listening tracks
          </Link>
        </LP>
      </LSection>
    </LDiv>
  );
}
