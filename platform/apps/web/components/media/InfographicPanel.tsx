import type { LearnerInfographic } from "@/lib/content/infographics";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";

export function InfographicPanel({ infographic }: { infographic: LearnerInfographic }) {
  return (
    <section className="panel infographic-panel" aria-labelledby={`${infographic.id}-heading`}>
      <p className="dense">Visual learning map</p>
      <h2 id={`${infographic.id}-heading`}>{infographic.title}</h2>
      <div className="infographic-panel__viewport" role="region" tabIndex={0} aria-label="Scrollable infographic">
        <img
          className="infographic-panel__image"
          src={withPagesBaseAssetPath(`/infographics/${infographic.filename}`)}
          alt={infographic.textAlternative}
          width={1200}
          height={720}
          loading="lazy"
        />
      </div>
      <details className="infographic-panel__description">
        <summary>Read the visual as text</summary>
        <p>{infographic.textAlternative}</p>
      </details>
    </section>
  );
}
