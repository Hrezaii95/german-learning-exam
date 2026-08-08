#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAndValidatePublication } from "../publication/load.js";
import { PUBLICATION_FRAGMENT_FILES } from "../publication/fragment.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PLATFORM_ROOT = resolve(HERE, "../../../../");
const DEFAULT_PUBLISHED_DIR = resolve(PLATFORM_ROOT, "content/published");

function printIssue(issue: {
  severity: string;
  code: string;
  objectId?: string;
  field?: string;
  assertionId?: string;
  gapId?: string;
  message: string;
}): void {
  const sev = issue.severity.toUpperCase();
  const object = issue.objectId ?? "-";
  const field = issue.field ?? "-";
  const assertion = issue.assertionId ? `\tassertion=${issue.assertionId}` : "";
  const gap = issue.gapId ? `\tgap=${issue.gapId}` : "";
  console.log(
    `${sev}\t${issue.code}\tobject=${object}\tfield=${field}${assertion}${gap}\t${issue.message}`,
  );
}

function main(): void {
  const argDir = process.argv[2];
  const publishedDir = argDir ? resolve(process.cwd(), argDir) : DEFAULT_PUBLISHED_DIR;

  console.log(`PUBLICATION_DIR\t${publishedDir}`);
  console.log(`REQUIRED_FRAGMENTS\t${PUBLICATION_FRAGMENT_FILES.join(",")}`);

  const result = loadAndValidatePublication({ publishedDir });

  for (const issue of result.issues) {
    printIssue(issue);
  }

  const missing = result.issues.filter((i) => i.code === "MISSING_FRAGMENT");
  if (missing.length > 0) {
    console.error(
      `VALIDATION_FAILED\tcode=MISSING_FRAGMENT\tcount=${missing.length}`,
    );
    process.exit(1);
  }

  if (!result.ok) {
    console.error(
      `VALIDATION_FAILED\terrors=${result.issues.filter((i) => i.severity === "error").length}`,
    );
    process.exit(1);
  }

  console.log("VALIDATION_OK");
  process.exit(0);
}

main();
