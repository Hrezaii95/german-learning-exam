import { copyFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Next 16.3's exporter retains Windows separators inside segment filenames.
 * Supply the dot-separated filenames requested by the browser; Linux is a no-op.
 * Keep originals and refuse conflicting content rather than overwriting it.
 */
export function normalizeExportSegments(root: string): number {
  let copied = 0;
  function walk(directory: string, segmentRoot?: string, parts: string[] = []): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (segmentRoot) walk(file, segmentRoot, [...parts, entry.name]);
        else if (entry.name.startsWith("__next.")) walk(file, directory, [entry.name]);
        else walk(file);
      } else if (segmentRoot && entry.isFile() && entry.name.endsWith(".txt")) {
        const target = join(segmentRoot, [...parts, entry.name].join("."));
        if (existsSync(target)) {
          if (!readFileSync(target).equals(readFileSync(file))) throw new Error(`Conflicting RSC segment: ${target}`);
        } else { copyFileSync(file, target); copied++; }
      }
    }
  }
  walk(root);
  return copied;
}
