import type { ContentPack, LanguageProfile, PackItem } from "../../content/src/types/packs.js";
import type { RandomSource } from "./tasks.js";
import { shuffle } from "./random.js";

/** Conservative equality: hint aliases are also excluded from a wrong-answer pool. */
export function comparisonKey(value: string, profile: LanguageProfile): string {
  let result = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  for (const rule of profile.normalization.equivalences) result = result.split(rule.from).join(rule.to);
  return result.toLocaleLowerCase(profile.locale);
}

/** Supports the authored field paths used by pack.maps; never evaluates code. */
// Distractor ranking compares every candidate pair, so cache field reads per item.
const fieldValueCache = new WeakMap<PackItem, Map<string, string[]>>();

export function mapFieldValues(item: PackItem, path: string): string[] {
  let cached = fieldValueCache.get(item);
  if (!cached) fieldValueCache.set(item, cached = new Map());
  let values = cached.get(path);
  if (!values) cached.set(path, values = readFieldValues(item, path));
  return values;
}

function readFieldValues(item: PackItem, path: string): string[] {
  let value: unknown = item;
  for (const part of path.split(".")) {
    if (!value || typeof value !== "object" || !Object.hasOwn(value, part)) return [];
    value = (value as Record<string, unknown>)[part];
  }
  return (Array.isArray(value) ? value : [value]).filter((entry): entry is string => typeof entry === "string");
}

function overlaps(left: readonly string[], right: readonly string[]): boolean {
  return left.some(value => right.includes(value));
}

function priority(item: PackItem, candidate: PackItem, pack: ContentPack): number {
  const sameCell = pack.maps.some(map => overlaps(mapFieldValues(item, map.rows), mapFieldValues(candidate, map.rows)) && overlaps(mapFieldValues(item, map.cols), mapFieldValues(candidate, map.cols)));
  if (sameCell) return 0;
  if (item.unitId === candidate.unitId) return 1;
  if (overlaps(item.tags, candidate.tags)) return 2;
  return 3;
}

/** Returns authored items, with all variants checked. It never invents wrong forms. */
export function chooseDistractors(
  item: PackItem, pack: ContentPack, profile: LanguageProfile,
  answers: (candidate: PackItem) => readonly string[], accepted: readonly string[],
  count: number, random: RandomSource,
): PackItem[] {
  const used = new Set(accepted.map(value => comparisonKey(value, profile)));
  const result: PackItem[] = [];
  for (let tier = 0; tier <= 2 && result.length < count; tier++) {
    const eligible = pack.items.filter(candidate => candidate.id !== item.id && priority(item, candidate, pack) === tier)
      .sort((a, b) => a.id.localeCompare(b.id, "en"));
    for (const candidate of shuffle(eligible, random)) {
      const variants = answers(candidate).filter(Boolean);
      if (!variants.length || variants.some(value => used.has(comparisonKey(value, profile)))) continue;
      result.push(candidate);
      for (const variant of variants) used.add(comparisonKey(variant, profile));
      if (result.length === count) break;
    }
  }
  return result;
}
