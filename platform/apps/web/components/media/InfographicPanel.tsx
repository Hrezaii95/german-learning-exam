import type { LearnerInfographic } from "@/lib/content/infographics";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";

export function InfographicPanel({ infographic }: { infographic: LearnerInfographic }) {
  return (
    <section className="panel infographic-panel" aria-labelledby={`${infographic.id}-heading`}>
      <p className="dense">Visual learning map</p>
      <h2 id={`${infographic.id}-heading`}>{infographic.title}</h2>
      <div className={`infographic-panel__viewport${infographic.steps ? " infographic-panel__desktop" : ""}`}>
        <img
          className="infographic-panel__image"
          src={withPagesBaseAssetPath(`/infographics/${infographic.filename}`)}
          alt={infographic.textAlternative}
          width={1200}
          height={720}
          loading="lazy"
        />
      </div>
      {infographic.steps && <ol className="infographic-panel__steps" aria-label="Diagram step by step">
        {infographic.steps.map(step => <li key={step.label}>
          <small>{step.label}</small>
          <strong lang="de">{step.german}</strong>
          <p>{step.explanation}</p>
        </li>)}
      </ol>}
      <a className="infographic-panel__expand" href={withPagesBaseAssetPath(`/infographics/${infographic.filename}`)} target="_blank" rel="noopener noreferrer">Open full-size diagram ↗ <span>(new tab)</span></a>
      <details className="infographic-panel__description">
        <summary>Read the visual as text</summary>
        <p>{infographic.textAlternative}</p>
      </details>
    </section>
  );
}
