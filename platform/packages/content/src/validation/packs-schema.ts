import type { PackValidationIssue } from "./packs.js";

type Schema = {
  $ref?: string;
  $defs?: Record<string, Schema>;
  type?: string;
  const?: unknown;
  enum?: unknown[];
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean | Schema;
  items?: Schema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  oneOf?: Schema[];
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** A deliberately small evaluator for the checked-in, dependency-free pack schemas. */
export function checkPackSchema(value: unknown, schema: unknown): PackValidationIssue[] {
  const root = schema as Schema;
  const issue = (path: string, message: string): PackValidationIssue => ({ code: "SCHEMA", path, message });
  function visit(input: unknown, rule: Schema, path: string): PackValidationIssue[] {
    if (rule.$ref) {
      const name = rule.$ref.replace(/^#\/\$defs\//, "");
      const target = root.$defs && Object.prototype.hasOwnProperty.call(root.$defs, name) ? root.$defs[name] : undefined;
      return target ? visit(input, target, path) : [issue(path, "Schema reference is unavailable")];
    }
    if (rule.oneOf) {
      // Discriminated unions retain exact field diagnostics instead of a vague union error.
      if (isRecord(input) && typeof input.type === "string") {
        const branch = rule.oneOf.find(candidate => candidate.properties?.type?.const === input.type);
        if (branch) return visit(input, branch, path);
      }
      const outcomes = rule.oneOf.map(candidate => visit(input, candidate, path));
      if (outcomes.filter(outcome => outcome.length === 0).length === 1) return [];
      const shape = rule.oneOf.find(candidate => candidate.type === (typeof input === "object" ? "object" : typeof input));
      return shape ? visit(input, shape, path) : [issue(path, "Expected one supported content shape")];
    }
    const issues: PackValidationIssue[] = [];
    if ("const" in rule && input !== rule.const) issues.push(issue(path, `Expected ${JSON.stringify(rule.const)}`));
    if (rule.enum && !rule.enum.includes(input)) issues.push(issue(path, `Expected one of ${rule.enum.join(", ")}`));
    if (rule.type === "object") {
      if (!isRecord(input)) return [...issues, issue(path, "Expected an object")];
      for (const key of rule.required ?? []) {
        if (!Object.prototype.hasOwnProperty.call(input, key)) issues.push(issue(`${path}.${key}`, "Required field is missing"));
      }
      for (const [key, item] of Object.entries(input)) {
        const propertyRule = rule.properties && Object.prototype.hasOwnProperty.call(rule.properties, key) ? rule.properties[key] : undefined;
        if (propertyRule) issues.push(...visit(item, propertyRule, `${path}.${key}`));
        else if (rule.additionalProperties === false) issues.push(issue(`${path}.${key}`, "Unknown field"));
        else if (isRecord(rule.additionalProperties)) issues.push(...visit(item, rule.additionalProperties, `${path}.${key}`));
      }
    } else if (rule.type === "array") {
      if (!Array.isArray(input)) return [...issues, issue(path, "Expected an array")];
      if (rule.minItems !== undefined && input.length < rule.minItems) issues.push(issue(path, `Expected at least ${rule.minItems} entries`));
      if (rule.maxItems !== undefined && input.length > rule.maxItems) issues.push(issue(path, `Expected at most ${rule.maxItems} entries`));
      if (rule.uniqueItems && new Set(input).size !== input.length) issues.push(issue(path, "Duplicate entries are not allowed"));
      if (rule.items) input.forEach((item, index) => issues.push(...visit(item, rule.items!, `${path}[${index}]`)));
    } else if (rule.type === "string") {
      if (typeof input !== "string") return [...issues, issue(path, "Expected a string")];
      if (rule.minLength !== undefined && input.length < rule.minLength) issues.push(issue(path, "Expected a non-empty string"));
      if (rule.pattern && !new RegExp(rule.pattern, "u").test(input)) issues.push(issue(path, "String does not match the required pattern"));
    } else if (rule.type === "number" || rule.type === "integer") {
      if (typeof input !== "number" || !Number.isFinite(input) || (rule.type === "integer" && !Number.isInteger(input))) return [...issues, issue(path, `Expected a finite ${rule.type}`)];
      if (rule.minimum !== undefined && input < rule.minimum) issues.push(issue(path, `Must be at least ${rule.minimum}`));
      if (rule.maximum !== undefined && input > rule.maximum) issues.push(issue(path, `Must be at most ${rule.maximum}`));
      if (rule.exclusiveMinimum !== undefined && input <= rule.exclusiveMinimum) issues.push(issue(path, `Must be greater than ${rule.exclusiveMinimum}`));
    } else if (rule.type === "boolean" && typeof input !== "boolean") issues.push(issue(path, "Expected a boolean"));
    return issues;
  }
  return visit(value, root, "$");
}
