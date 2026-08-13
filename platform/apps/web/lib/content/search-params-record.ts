/**
 * Convert `URLSearchParams` (client `useSearchParams`) into the record shape
 * already consumed by hub/search parsers. Duplicate keys become string[].
 */
export function searchParamsToRecord(
  params: URLSearchParams,
): Record<string, string | string[] | undefined> {
  const out: Record<string, string | string[] | undefined> = {};
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key);
    if (all.length === 0) continue;
    out[key] = all.length === 1 ? all[0] : all;
  }
  return out;
}
