import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSubjectVocabulary } from "../../../apps/web/lib/study/subject-sheets.server";
import { loadWordCards } from "../../../apps/web/lib/content/word-cards";
import type { ContentPack, DifficultyProfile, LanguageProfile } from "../../content/src/types/packs.js";
import { assertContentPack, validateDifficultyProfile, validateLanguageProfile } from "../../content/src/validation/packs.js";
import { migrateA1Vocabulary } from "./migration.js";
import migrationConfig from "../../../content/packs/a1-migration.json";

/** The CLI's only source is the existing learner vocabulary; it does not edit it. */
export function buildA1Pack(): ContentPack {
  const pack = migrateA1Vocabulary(loadSubjectVocabulary());
  const cards = new Map(loadWordCards().cards.map(card => [card.id, card]));
  for (const item of pack.items) {
    const card = item.sourceRef ? cards.get(item.sourceRef.cardId) : undefined;
    if (!card || !item.sourceRef) continue;
    item.sourceRef.sourceIds = [...card.sourceIds];
    item.sourceRef.citations = [...card.sources];
    item.sourceRef.teacherRows = [...card.teacherRows];
    if (card.image) item.image = card.image.path;
  }
  return pack;
}

export function runA1Migration(args: readonly string[] = process.argv.slice(2)): void {
  if (args.some(arg => arg !== "--write")) throw new Error("Usage: packs:migrate-a1 [--write]. Without --write, validate and report only.");
  const platformRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const language: unknown = JSON.parse(readFileSync(join(platformRoot, "content", migrationConfig.profileFile), "utf8"));
  const profileIssues = validateLanguageProfile(language);
  if (profileIssues.length) throw new Error(profileIssues.map(issue => `${issue.path}: ${issue.message}`).join("\n"));
  const difficulty: unknown = JSON.parse(readFileSync(join(platformRoot, "content", migrationConfig.difficultyFile), "utf8"));
  const difficultyIssues = validateDifficultyProfile(difficulty);
  if (difficultyIssues.length) throw new Error(difficultyIssues.map(issue => `${issue.path}: ${issue.message}`).join("\n"));
  if ((difficulty as DifficultyProfile).id !== migrationConfig.manifest.difficulty) throw new Error("Migration difficulty does not match its manifest.");
  const pack = buildA1Pack();
  assertContentPack(pack, language as LanguageProfile);
  if (!args.includes("--write")) {
    process.stdout.write(`${migrationConfig.manifest.title} migration validated: ${pack.items.length} rows, ${pack.units.length} lessons. Pending German review; off by default. Re-run with --write to save.\n`);
    return;
  }
  const output = join(platformRoot, "content/packs", pack.id);
  const staging = `${output}.migration-staging`;
  const { items, ...manifest } = pack;
  // All content validation happens before touching the destination. The final
  // directory rename publishes the manifest and rows together on first write.
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(join(staging, "items"), { recursive: true });
  try {
    writeFileSync(join(staging, "pack.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    writeFileSync(join(staging, "items/lexemes.json"), `${JSON.stringify(items, null, 2)}\n`);
    // A migration is deliberately create-only: overwriting an edited/reviewed
    // pack needs an explicit content-authoring change, not this migration tool.
    renameSync(staging, output);
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }
  process.stdout.write(`${migrationConfig.manifest.title} migration saved ${items.length} rows to ${output}. Pending German review; off by default.\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runA1Migration();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
