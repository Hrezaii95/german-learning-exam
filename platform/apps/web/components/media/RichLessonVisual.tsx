import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import type { LearnerIllustration } from "@/lib/content/illustrations";

export function RichLessonVisual({
  illustration,
}: {
  illustration: LearnerIllustration;
}) {
  const headingId = `${illustration.id.replaceAll(":", "-")}-heading`;

  return (
    <figure className="rich-visual" aria-labelledby={headingId}>
      <div className="rich-visual__media">
        <img
          className="rich-visual__image"
          src={withPagesBaseAssetPath(`/illustrations/${illustration.filename}`)}
          alt={illustration.alt}
          width={illustration.width}
          height={illustration.height}
          style={{ objectPosition: illustration.objectPosition }}
          loading="eager"
          decoding="async"
        />
        <span className="rich-visual__eyebrow">{illustration.eyebrow}</span>
      </div>
      <figcaption className="rich-visual__caption">
        <div>
          <h2 id={headingId}>
            <span className="german" lang="de">
              {illustration.title}
            </span>
          </h2>
          <p className="muted">{illustration.caption}</p>
        </div>
        <ul className="rich-visual__labels" aria-label="Illustrated vocabulary">
          {illustration.labels.map((label) => (
            <li key={label.de} data-gender={label.gender}>
              <strong className="german" lang="de">
                {label.de}
              </strong>
              <span>{label.en}</span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
