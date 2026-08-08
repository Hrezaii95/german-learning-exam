#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateContentBundle } from "../validation/validate-bundle.js";

function usage(): never {
  console.error("Usage: validate <path-to-content-bundle.json>");
  process.exit(2);
}

function main(): void {
  const pathArg = process.argv[2];
  if (!pathArg) usage();

  const abs = resolve(pathArg);
  let raw: string;
  try {
    raw = readFileSync(abs, "utf8");
  } catch {
    console.error(`ERROR\tUNREADABLE_PATH\tfield=path`);
    process.exit(1);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    console.error(`ERROR\tINVALID_JSON\tfield=document`);
    process.exit(1);
  }

  const result = validateContentBundle(json);
  for (const issue of result.issues) {
    const sev = issue.severity.toUpperCase();
    const object = issue.objectId ?? "-";
    const field = issue.field ?? "-";
    const assertion = issue.assertionId ? `\tassertion=${issue.assertionId}` : "";
    const gap = issue.gapId ? `\tgap=${issue.gapId}` : "";
    console.log(
      `${sev}\t${issue.code}\tobject=${object}\tfield=${field}${assertion}${gap}\t${issue.message}`,
    );
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
