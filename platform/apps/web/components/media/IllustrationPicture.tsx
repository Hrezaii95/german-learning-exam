import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import type {
  LearnerIllustrationRendition,
  LearnerIllustrationVariant,
} from "@/lib/content/illustrations";

/**
 * One illustration, served at the size the slot actually paints.
 *
 * The accepted source artwork is a 1254px PNG of about 2MB; nothing that large
 * is ever sent to a learner. This renders the pre-cropped derivatives instead:
 * AVIF first, WebP next, and a JPEG every browser can read as the `<img>`
 * itself. Width and height always describe the intrinsic box, so the reserved
 * media geometry is known before a single byte of image arrives and the
 * teaching sections underneath never jump.
 */

function toSrcSet(renditions: readonly LearnerIllustrationRendition[]): string {
  return renditions
    .map(
      (rendition) =>
        `${withPagesBaseAssetPath(`/illustrations/${rendition.path}`)} ${rendition.width}w`,
    )
    .join(", ");
}

export function IllustrationPicture({
  variant,
  alt,
  imageClassName,
  pictureClassName,
  loading,
  objectPosition,
}: {
  variant: LearnerIllustrationVariant;
  alt: string;
  imageClassName: string;
  pictureClassName: string;
  loading: "eager" | "lazy";
  objectPosition: string;
}) {
  return (
    <picture className={pictureClassName}>
      {variant.sources.map((source) => (
        <source
          key={source.type}
          type={source.type}
          srcSet={toSrcSet(source.renditions)}
          sizes={variant.sizes}
        />
      ))}
      <img
        className={imageClassName}
        src={withPagesBaseAssetPath(`/illustrations/${variant.intrinsic.path}`)}
        srcSet={toSrcSet(variant.fallback)}
        sizes={variant.sizes}
        alt={alt}
        width={variant.intrinsic.width}
        height={variant.intrinsic.height}
        style={{ objectPosition }}
        loading={loading}
        decoding="async"
      />
    </picture>
  );
}
