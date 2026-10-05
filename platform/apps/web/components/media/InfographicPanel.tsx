
import { LA, LDetails, LDiv, LH2, LLi, LOl, LP, LSection, LSmall, LSpan, LStrong, LSummary } from "@/components/i18n/LocalizedElements";
import type { LearnerInfographic } from "@/lib/content/infographics";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";

export function InfographicPanel({ infographic }: { infographic: LearnerInfographic }) {
  return (
    <LSection className="panel infographic-panel" aria-labelledby={`${infographic.id}-heading`}>
      <LP className="dense">Visual learning map</LP>
      <LH2 id={`${infographic.id}-heading`}>{infographic.title}</LH2>
      <LDiv className={`infographic-panel__viewport${infographic.steps ? " infographic-panel__desktop" : ""}`}>
        <img
          className="infographic-panel__image"
          src={withPagesBaseAssetPath(`/infographics/${infographic.filename}`)}
          alt={infographic.textAlternative}
          width={1200}
          height={720}
          loading="lazy"
        />
      </LDiv>
      {infographic.steps && <LOl className="infographic-panel__steps" aria-label="Diagram step by step">
        {infographic.steps.map(step => <LLi key={step.label}>
          <LSmall>{step.label}</LSmall>
          <LStrong lang="de">{step.german}</LStrong>
          <LP>{step.explanation}</LP>
        </LLi>)}
      </LOl>}
      <LA className="infographic-panel__expand" href={withPagesBaseAssetPath(`/infographics/${infographic.filename}`)} target="_blank" rel="noopener noreferrer">Open full-size diagram ↗ <LSpan>(new tab)</LSpan></LA>
      <LDetails className="infographic-panel__description">
        <LSummary>Read the visual as text</LSummary>
        <LP>{infographic.textAlternative}</LP>
      </LDetails>
    </LSection>
  );
}
