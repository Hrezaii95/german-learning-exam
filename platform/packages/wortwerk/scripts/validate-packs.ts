import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPackRegistry } from "../src/loader.server.js";

export function validatePacks(args: readonly string[] = process.argv.slice(2)): void {
  const write = args.includes("--write-index");
  const paths = args.filter(arg => arg !== "--write-index");
  if (paths.length > 1 || paths.some(arg => arg.startsWith("--"))) throw new Error("Usage: packs:validate [content-directory] [--write-index]");
  const directory = resolve(paths[0] ?? fileURLToPath(new URL("../../../content", import.meta.url)));
  const registry = loadPackRegistry(directory);
  if (!registry.packs.length) throw new Error("No content pack manifests found. Run packs:migrate-a1; canonical duplicate headwords must be resolved by Lane 1 before the A1 pack can be written.");
  for (const entry of registry.packs) {
    const json = `${JSON.stringify(entry.capabilities, null, 2)}\n`;
    const path = join(entry.directory, "capabilities.json");
    if (write && (!existsSync(path) || readFileSync(path, "utf8") !== json)) writeFileSync(path, json);
    process.stdout.write(`${entry.pack.id}: ${entry.pack.items.length} items; ${Object.values(entry.capabilities.templates).filter(template => template.enabled).length} playable templates; ${entry.enabledByDefault ? "reviewed" : "pending review (off by default)"}\n`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { validatePacks(); }
  catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
