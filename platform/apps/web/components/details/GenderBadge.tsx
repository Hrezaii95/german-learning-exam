import type { LearnerGender } from "@/lib/content/detail-types";
import { articleTone } from "@/lib/study/article-tone";

const GENDER_META: Readonly<
  Record<LearnerGender, { token: string; label: string; shape: string }>
> = Object.freeze({
  masculine: Object.freeze({
    token: "der",
    label: "Masculine",
    shape: "square",
  }),
  feminine: Object.freeze({
    token: "die",
    label: "Feminine",
    shape: "circle",
  }),
  neuter: Object.freeze({
    token: "das",
    label: "Neuter",
    shape: "diamond",
  }),
});

/** Semantic gender cue: token + text + shape — never color alone. */
export function GenderBadge({
  gender,
}: {
  gender: LearnerGender;
}) {
  const meta = GENDER_META[gender];
  return (
    <span
      className={`gender-badge gender-badge--${articleTone(gender)} gender-badge--shape-${meta.shape}`}
      data-tone={articleTone(gender)}
      data-gender-token={meta.token}
      data-gender-label={meta.label}
      data-gender-shape={meta.shape}
      aria-label={`Gender: ${meta.label}`}
    >
      <span className="gender-badge__shape" aria-hidden="true" />
      <span className="gender-badge__token" lang="de" aria-hidden="true">
        {meta.token}
      </span>
      <span className="gender-badge__label">{meta.label}</span>
    </span>
  );
}
