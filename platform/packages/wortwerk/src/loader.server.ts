import { existsSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import type { ContentPack, DifficultyProfile, LanguageProfile } from "../../content/src/types/packs.js";
import { assertContentPack, validateDifficultyProfile, validateLanguageProfile } from "../../content/src/validation/packs.js";
import { assertPackResource } from "../../content/src/validation/pack-resources.js";
import { buildCapabilityIndex, type CapabilityIndex } from "./capabilities.js";

export type LoadedPack = { pack: ContentPack; language: LanguageProfile; difficulty: DifficultyProfile; capabilities: CapabilityIndex; directory: string; enabledByDefault: boolean; resources: Partial<Record<"story" | "exam", Record<string, unknown>>> };
export type PackRegistry = { packs: LoadedPack[]; languages: Map<string, LanguageProfile>; difficulties: Map<string, DifficultyProfile> };
function read(path: string): unknown {
  try { return JSON.parse(readFileSync(path, "utf8")) as unknown; }
  catch (error) { throw new Error(`Cannot read pack JSON at ${path}: ${error instanceof Error ? error.message : String(error)}`); }
}
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }

/** A content filename cannot escape its pack through traversal or symbolic links. */
export function packFile(directory: string, filename: string): string {
  if (!filename || isAbsolute(filename) || filename.includes("\\") || filename.split("/").includes("..")) throw new Error(`Invalid pack file path: ${filename}`);
  const root = realpathSync(directory);
  const path = realpathSync(resolve(directory, filename));
  const offset = relative(root, path);
  if (offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset)) throw new Error(`Pack file must stay within its directory: ${filename}`);
  return path;
}

function profiles<T extends { id: string }>(directory: string, validate: (value: unknown) => { path: string; message: string }[]): Map<string, T> {
  const result = new Map<string, T>();
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const path = join(directory, entry.name);
    const value = read(path);
    const issues = validate(value);
    if (issues.length) throw new Error(`${path}: ${issues.map(issue => `${issue.path}: ${issue.message}`).join("; ")}`);
    const profile = value as T;
    if (basename(entry.name, ".json") !== profile.id || result.has(profile.id)) throw new Error(`Duplicate or mismatched profile id in ${path}`);
    result.set(profile.id, profile);
  }
  return result;
}

export function loadPackRegistry(contentDirectory: string): PackRegistry {
  const languages = profiles<LanguageProfile>(join(contentDirectory, "languages"), validateLanguageProfile);
  const difficulties = profiles<DifficultyProfile>(join(contentDirectory, "difficulty"), validateDifficultyProfile);
  const packs: LoadedPack[] = [];
  const ids = new Set<string>();
  for (const entry of readdirSync(join(contentDirectory, "packs"), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    if (!entry.isDirectory()) continue;
    const directory = join(contentDirectory, "packs", entry.name);
    if (!existsSync(join(directory, "pack.json"))) continue;
    const manifest = read(join(directory, "pack.json"));
    if (!object(manifest)) throw new Error(`Invalid pack manifest: ${directory}`);
    const value: Record<string, unknown> = { ...manifest };
    if (manifest.itemFiles !== undefined) {
      if (!Array.isArray(manifest.itemFiles) || manifest.itemFiles.some(path => typeof path !== "string")) throw new Error(`Invalid itemFiles: ${directory}`);
      if (manifest.items !== undefined) throw new Error(`Pack cannot contain both items and itemFiles: ${directory}`);
      const items: unknown[] = [];
      for (const filename of manifest.itemFiles as string[]) {
        const file = read(packFile(directory, filename));
        if (!Array.isArray(file)) throw new Error(`Pack item file must be an array: ${filename}`);
        items.push(...file);
      }
      value.items = items;
    }
    const language = languages.get(String(value.language));
    const difficulty = difficulties.get(String(value.difficulty));
    if (!language || !difficulty) throw new Error(`Missing language or difficulty profile: ${directory}`);
    assertContentPack(value, language);
    if (value.id !== entry.name || ids.has(value.id)) throw new Error(`Duplicate or mismatched pack id: ${directory}`);
    const resources: LoadedPack["resources"] = {};
    for (const kind of ["story", "exam"] as const) {
      const filename = value[kind];
      if (filename === undefined) continue;
      const resource = read(packFile(directory, filename));
      if (!object(resource)) throw new Error(`Pack ${kind} resource must be a JSON object: ${filename}`);
      assertPackResource(resource, kind, value);
      resources[kind] = resource;
    }
    ids.add(value.id);
    packs.push({ pack: value, language, difficulty, capabilities: buildCapabilityIndex(value), directory, enabledByDefault: value.review.status === "reviewed", resources });
  }
  return { packs, languages, difficulties };
}
