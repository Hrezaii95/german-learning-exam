import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  projectPublishedLearnerWeb,
  serializeProjectionDeterministic,
} from "../lib/content/project.js";
import {
  projectPublishedLearnerHubs,
  serializeHubProjectionDeterministic,
} from "../lib/content/hub-project.js";
import {
  projectPublishedLearnerSearch,
  serializeSearchProjectionDeterministic,
} from "../lib/content/search-project.js";
import { assertLearnerDetailProjection } from "../lib/content/access.js";
import {
  projectPublishedLearnerDetails,
  serializeDetailProjectionDeterministic,
} from "../lib/content/detail-project.js";
import {
  projectPublishedExtraProfessions,
  serializeExtraProfessionsProjection,
} from "../lib/content/extra-professions.js";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "..");
const platformRoot = resolve(webRoot, "..", "..");
const publishedDir = join(platformRoot, "content", "published");
const outPath = join(webRoot, "generated", "learner-projection.json");
const hubsOutPath = join(webRoot, "generated", "learner-hubs.json");
const searchOutPath = join(webRoot, "generated", "learner-search.json");
const detailsOutPath = join(webRoot, "generated", "learner-details.json");
const extraProfessionsOutPath = join(
  webRoot,
  "generated",
  "learner-extra-professions.json",
);

function main(): void {
  const projection = projectPublishedLearnerWeb(publishedDir);
  const json = serializeProjectionDeterministic(projection);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, json, "utf8");
  process.stdout.write(
    `Wrote learner projection: ${projection.lessonCount} lessons, ${projection.activityCount} activities → ${outPath}\n`,
  );

  const hubs = projectPublishedLearnerHubs(publishedDir);
  const hubsJson = serializeHubProjectionDeterministic(hubs);
  writeFileSync(hubsOutPath, hubsJson, "utf8");
  const counts = hubs.hubs.map((hub) => `${hub.id}=${hub.itemCount}`).join(", ");
  process.stdout.write(
    `Wrote learner hubs: ${hubs.hubCount} hubs (${counts}) → ${hubsOutPath}\n`,
  );

  const search = projectPublishedLearnerSearch(publishedDir);
  const searchJson = serializeSearchProjectionDeterministic(search);
  writeFileSync(searchOutPath, searchJson, "utf8");
  process.stdout.write(
    `Wrote learner search: ${search.documentCount} documents → ${searchOutPath}\n`,
  );

  const details = projectPublishedLearnerDetails(publishedDir);
  assertLearnerDetailProjection(details);
  const detailsJson = serializeDetailProjectionDeterministic(details);
  writeFileSync(detailsOutPath, detailsJson, "utf8");
  process.stdout.write(
    `Wrote learner details: ${details.detailCount} published records (${details.representativeCount} rich representatives) → ${detailsOutPath}\n`,
  );

  const extraProfessions = projectPublishedExtraProfessions(publishedDir);
  writeFileSync(
    extraProfessionsOutPath,
    serializeExtraProfessionsProjection(extraProfessions),
    "utf8",
  );
  process.stdout.write(
    `Wrote optional professions: ${extraProfessions.collection.sourceRowCount} source rows, ${extraProfessions.collection.sourceFormLexemeCount} form lexemes → ${extraProfessionsOutPath}\n`,
  );
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`CONTENT_PROJECTION_FAILED: ${message}`);
  process.exit(1);
}
