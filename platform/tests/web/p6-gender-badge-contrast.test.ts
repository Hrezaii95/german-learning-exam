/**
 * P6-02 finding 4 — WCAG 1.4.3 Contrast (Minimum), AA.
 *
 * `.gender-badge--masculine/feminine/neuter` painted their text with the raw
 * `--gender-*` hue over an 8% tint of that same hue. Measured at 13px / 650 —
 * normal text, so the threshold is 4.5:1 — masculine came out at 4.10, feminine
 * 3.32 and neuter 3.13. The gender cue is the single most-repeated piece of
 * teaching in the product and it sat below AA on 53 routes.
 *
 * This test computes the ratio from the stylesheet itself rather than trusting
 * a comment: it resolves the custom properties, replays the `color-mix` the
 * badge uses for its plate, and measures. It also asserts the raw hues would
 * still fail, so the ink tokens cannot be quietly reverted.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const cssPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "apps",
  "web",
  "app",
  "globals.css",
);
const css = readFileSync(cssPath, "utf8");

type Rgb = readonly [number, number, number];

function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "").trim();
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

/** Value of a `--token` declared on `:root`. */
function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(css);
  if (!match) throw new Error(`missing custom property --${name}`);
  return match[1]!.trim();
}

/** `color-mix(in srgb, <color> N%, white)` — the badge/plate recipe. */
function mixWithWhite(color: Rgb, percent: number): Rgb {
  const ratio = percent / 100;
  return [
    color[0] * ratio + 255 * (1 - ratio),
    color[1] * ratio + 255 * (1 - ratio),
    color[2] * ratio + 255 * (1 - ratio),
  ];
}

function relativeLuminance([r, g, b]: Rgb): number {
  const channel = (raw: number) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  );
}

function contrast(a: Rgb, b: Rgb): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  ) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** The `color:` declaration inside a rule block, as written in globals.css. */
function declaredColor(selector: string): string {
  const block = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
  ).exec(css);
  if (!block) throw new Error(`missing rule ${selector}`);
  const color = /(?:^|[;{\s])color:\s*([^;]+);/.exec(block[1]!);
  if (!color) throw new Error(`rule ${selector} declares no color`);
  return color[1]!.trim();
}

const GENDERS = [
  { name: "masculine", hue: "gender-m", ink: "gender-m-ink" },
  { name: "feminine", hue: "gender-f", ink: "gender-f-ink" },
  { name: "neuter", hue: "gender-n", ink: "gender-n-ink" },
] as const;

describe("P6 gender badge contrast", () => {
  it.each(GENDERS)(
    "$name badge text clears 4.5:1 on its own tinted plate",
    ({ name, hue, ink }) => {
      const plate = mixWithWhite(hexToRgb(token(hue)), 8);
      const inkColor = hexToRgb(token(ink));

      // The rule must actually use the ink token, not the raw hue.
      expect(declaredColor(`.gender-badge--${name}`)).toBe(`var(--${ink})`);

      const ratio = contrast(inkColor, plate);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(GENDERS)(
    "$name would still fail AA with the raw hue as ink",
    ({ hue }) => {
      const hueColor = hexToRgb(token(hue));
      const plate = mixWithWhite(hueColor, 8);
      expect(contrast(hueColor, plate)).toBeLessThan(4.5);
    },
  );

  it("keeps the identifying hue on the swatch, border and glyph", () => {
    for (const { name, hue } of GENDERS) {
      expect(css).toMatch(
        new RegExp(
          `\\.gender-badge--${name}\\s*\\{[^}]*background:\\s*color-mix\\(in srgb, var\\(--${hue}\\) 8%, white\\)`,
        ),
      );
      expect(css).toMatch(
        new RegExp(
          `\\.gender-badge--${name}\\s*\\{[^}]*border-color:\\s*color-mix\\(in srgb, var\\(--${hue}\\) 35%, var\\(--border\\)\\)`,
        ),
      );
      expect(css).toMatch(
        new RegExp(
          `\\.gender-badge--${name}\\s+\\.gender-badge__shape\\s*\\{\\s*background:\\s*var\\(--${hue}\\);`,
        ),
      );
    }
  });

  it("leaves no gender-coded text surface below AA", () => {
    // The token/label spans inherit `color` from the badge, so the three rules
    // above cover them. The remaining gender-coded text is the plural tone on
    // the muted surface, which is measured here rather than assumed.
    const plural = hexToRgb(token("gender-pl"));
    const muted = hexToRgb(token("surface-muted"));
    expect(contrast(plural, muted)).toBeGreaterThanOrEqual(4.5);
  });
});
