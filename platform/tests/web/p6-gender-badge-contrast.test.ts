/** The shared reference tones must remain readable on article plates. */
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
  const value = match[1]!.trim();
  const alias = /^var\(--([\w-]+)(?:,\s*([^)]*))?\)$/.exec(value);
  if (!alias) return value;
  // L1-3 can be reviewed before its L1-1 token dependency is merged.
  if (!new RegExp(`--${alias[1]}:\\s*`).test(css) && alias[2]) return alias[2].trim();
  return token(alias[1]!);
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
  { name: "male", hue: "gender-m", ink: "gender-m-ink" },
  { name: "female", hue: "gender-f", ink: "gender-f-ink" },
  { name: "neuter", hue: "gender-n", ink: "gender-n-ink" },
] as const;

describe("P6 gender badge contrast", () => {
  it.each(GENDERS)(
    "$name badge text clears 4.5:1 on its own tinted plate",
    ({ name, hue, ink }) => {
      const plate = mixWithWhite(hexToRgb(token(hue)), 8);
      const inkColor = hexToRgb(token(ink));

      // Compatibility ink names resolve to the same reference hue.
      expect(declaredColor(`.gender-badge--${name}`)).toBe(`var(--${ink})`);

      const ratio = contrast(inkColor, plate);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(GENDERS)(
    "$name uses the same reference tone for its text and swatch",
    ({ hue, ink }) => {
      expect(token(ink)).toBe(token(hue));
      for (const tint of [3, 7, 8]) {
        expect(contrast(hexToRgb(token(ink)), mixWithWhite(hexToRgb(token(hue)), tint)))
          .toBeGreaterThanOrEqual(4.5);
      }
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
