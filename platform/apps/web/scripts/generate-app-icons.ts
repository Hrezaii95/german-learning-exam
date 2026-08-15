/**
 * Generates the installable-app icons referenced by `manifest.webmanifest`.
 *
 * A manifest that points at a missing icon is worse than no manifest: the
 * install prompt disappears with no diagnostic. So the icons are produced from
 * the same artwork as `app/icon.svg` rather than referenced and hoped for.
 *
 * Output is deterministic — same source, same bytes — so `npm run check` can
 * regenerate and byte-compare instead of trusting that someone re-ran this.
 *
 *   npx tsx scripts/generate-app-icons.ts
 *
 * PNG is written by hand (IHDR/IDAT/IEND + CRC32 + `zlib.deflateSync`) to keep
 * the web app free of an image dependency it needs nowhere else.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { APP_ICON_FILES } from "../lib/offline/policy.js";

const here = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(here, "..", "public", "icons");

/* ---------------------------------------------------------------------------
 * Artwork — the `app/icon.svg` motif on a 64-unit grid
 * ------------------------------------------------------------------------ */

const GRID = 64;

type Rgb = readonly [number, number, number];

const BACKDROP: Rgb = [0x21, 0x19, 0x3f];
const BAR_BRAND: Rgb = [0x69, 0x46, 0xe8];
const BAR_MASCULINE: Rgb = [0x24, 0x6b, 0xfd];
const BAR_FEMININE: Rgb = [0xe6, 0x4c, 0x86];
const DOT_REGULAR: Rgb = [0x1f, 0x9d, 0x8f];

type Shape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; r: number; fill: Rgb }
  | { kind: "circle"; cx: number; cy: number; r: number; fill: Rgb };

/** The three word bars and the rule dot, in paint order. */
const MOTIF: readonly Shape[] = [
  { kind: "rect", x: 14, y: 17, w: 28, h: 11, r: 5.5, fill: BAR_BRAND },
  { kind: "rect", x: 22, y: 29.5, w: 28, h: 13, r: 6, fill: BAR_MASCULINE },
  { kind: "rect", x: 14, y: 44, w: 28, h: 8, r: 4, fill: BAR_FEMININE },
  { kind: "circle", cx: 49, cy: 17.5, r: 5, fill: DOT_REGULAR },
];

function insideRoundedRect(
  px: number,
  py: number,
  shape: Extract<Shape, { kind: "rect" }>,
): boolean {
  const { x, y, w, h } = shape;
  const r = Math.min(shape.r, w / 2, h / 2);
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const dx = Math.max(x + r - px, 0, px - (x + w - r));
  const dy = Math.max(y + r - py, 0, py - (y + h - r));
  return dx * dx + dy * dy <= r * r;
}

function insideCircle(
  px: number,
  py: number,
  shape: Extract<Shape, { kind: "circle" }>,
): boolean {
  const dx = px - shape.cx;
  const dy = py - shape.cy;
  return dx * dx + dy * dy <= shape.r * shape.r;
}

function inside(px: number, py: number, shape: Shape): boolean {
  return shape.kind === "rect"
    ? insideRoundedRect(px, py, shape)
    : insideCircle(px, py, shape);
}

/* ---------------------------------------------------------------------------
 * Rasterizer
 * ------------------------------------------------------------------------ */

/** 4x4 subsamples per pixel: enough to keep the rounded corners smooth. */
const SUBSAMPLES = 4;

type IconVariant = "any" | "maskable";

/**
 * `maskable` icons are cropped to a circle on Android, so the motif is drawn
 * at 62% inside a full-bleed background — everything outside the safe zone is
 * backdrop and can be cut away without losing the mark.
 */
function renderIcon(size: number, variant: IconVariant): Uint8Array {
  const pixels = new Uint8Array(size * size * 4);
  const scale = size / GRID;
  const motifScale = variant === "maskable" ? 0.62 : 1;
  const motifOffset = ((1 - motifScale) * GRID) / 2;

  // The `any` icon carries its own rounded-square silhouette; the maskable one
  // must fill the whole square so the platform mask has something to cut.
  const silhouette: Shape | null =
    variant === "any"
      ? { kind: "rect", x: 0, y: 0, w: GRID, h: GRID, r: 14, fill: BACKDROP }
      : null;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      if (variant === "maskable") {
        [r, g, b] = BACKDROP;
        a = 1;
      } else {
        const coverage = sampleCoverage(x, y, scale, (px, py) =>
          silhouette ? inside(px, py, silhouette) : false,
        );
        [r, g, b] = BACKDROP;
        a = coverage;
      }

      for (const shape of MOTIF) {
        const coverage = sampleCoverage(x, y, scale, (px, py) =>
          inside((px - motifOffset) / motifScale, (py - motifOffset) / motifScale, shape),
        );
        if (coverage === 0) continue;
        const fill = shape.fill;
        r = Math.round(r * (1 - coverage) + fill[0] * coverage);
        g = Math.round(g * (1 - coverage) + fill[1] * coverage);
        b = Math.round(b * (1 - coverage) + fill[2] * coverage);
        a = a + coverage * (1 - a);
      }

      const offset = (y * size + x) * 4;
      pixels[offset] = r;
      pixels[offset + 1] = g;
      pixels[offset + 2] = b;
      pixels[offset + 3] = Math.round(Math.min(1, a) * 255);
    }
  }

  return pixels;
}

function sampleCoverage(
  x: number,
  y: number,
  scale: number,
  hit: (px: number, py: number) => boolean,
): number {
  let hits = 0;
  for (let sy = 0; sy < SUBSAMPLES; sy += 1) {
    for (let sx = 0; sx < SUBSAMPLES; sx += 1) {
      const px = (x + (sx + 0.5) / SUBSAMPLES) / scale;
      const py = (y + (sy + 0.5) / SUBSAMPLES) / scale;
      if (hit(px, py)) hits += 1;
    }
  }
  return hits / (SUBSAMPLES * SUBSAMPLES);
}

/* ---------------------------------------------------------------------------
 * Minimal PNG encoder (8-bit RGBA, no interlace)
 * ------------------------------------------------------------------------ */

const CRC_TABLE: readonly number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = bytes.readUInt8(i);
    const slot = CRC_TABLE[(crc ^ byte) & 0xff] ?? 0;
    crc = slot ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typed = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed), 0);
  return Buffer.concat([length, typed, crc]);
}

export function encodePng(size: number, pixels: Uint8Array): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.writeUInt8(8, 8); // bit depth
  header.writeUInt8(6, 9); // colour type: RGBA
  header.writeUInt8(0, 10); // deflate
  header.writeUInt8(0, 11); // adaptive filtering
  header.writeUInt8(0, 12); // no interlace

  // One filter byte (0 = None) in front of each scanline. Filtering would
  // shrink the file, but these icons are a few kB and predictability beats
  // bytes here.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw.writeUInt8(0, y * (stride + 1));
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Every icon the manifest declares, keyed by filename. */
export function renderAppIcons(): ReadonlyMap<string, Buffer> {
  const out = new Map<string, Buffer>();
  for (const icon of APP_ICON_FILES) {
    const size = Number(icon.sizes.split("x")[0]);
    const variant: IconVariant = icon.purpose === "maskable" ? "maskable" : "any";
    out.set(icon.file, encodePng(size, renderIcon(size, variant)));
  }
  return out;
}

export function writeAppIcons(targetDir: string = iconsDir): readonly string[] {
  mkdirSync(targetDir, { recursive: true });
  const written: string[] = [];
  for (const [file, bytes] of renderAppIcons()) {
    const path = join(targetDir, file);
    writeFileSync(path, bytes);
    written.push(`${file} (${bytes.length} bytes)`);
  }
  return written;
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return resolve(fileURLToPath(import.meta.url)) === resolve(entry);
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  for (const line of writeAppIcons()) {
    process.stdout.write(`Wrote icons/${line}\n`);
  }
}
