import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import type { LearnerIllustration } from "@/lib/content/illustrations";
import { IllustrationPicture } from "@/components/media/IllustrationPicture";

/**
 * The framed media treatment for a learning object that has an approved
 * illustration.
 *
 * Two shapes share this component. The lesson and activity heroes are wide
 * single-file scenes. A profession concept illustration carries optimized
 * `responsive` sources instead, and reserves the same 4:3 box the meaning
 * plate holds on a detail page — so replacing a plate with a picture never
 * moves the teaching sections below it.
 */
export function RichLessonVisual({
  illustration,
}: {
  illustration: LearnerIllustration;
}) {
  const headingId = `${illustration.id.replaceAll(":", "-")}-heading`;
  const responsive = illustration.responsive;

  return (
    <figure
      className={`rich-visual${responsive ? " rich-visual--concept" : ""}`}
      aria-labelledby={headingId}
    >
      <div className="rich-visual__media">
        {responsive ? (
          <IllustrationPicture
            variant={responsive.detail}
            alt={illustration.alt}
            imageClassName="rich-visual__image"
            pictureClassName="rich-visual__picture"
            /* The detail media slot sits above the fold on its own page. */
            loading="eager"
            objectPosition={illustration.objectPosition}
          />
        ) : (
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
        )}
        <span className="rich-visual__eyebrow">{illustration.eyebrow}</span>
      </div>
      <figcaption className="rich-visual__caption">
        <div>
          <h2 id={headingId}>
            {illustration.titleLang === "de" ? (
              <span className="german" lang="de">
                {illustration.title}
              </span>
            ) : (
              <span>{illustration.title}</span>
            )}
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
