/** Spreadsheet exports retain text without allowing cells to execute as formulas. */
export function csvCell(value: unknown): string {
  let text = typeof value === "object" ? JSON.stringify(value) ?? "" : String(value ?? "");
  if (/^\s*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function serializeCsv(rows: Record<string, unknown>[]): string {
  const keys = [...new Set(rows.flatMap(row => Object.keys(row)))];
  return [keys.map(csvCell).join(","), ...rows.map(row => keys.map(key => csvCell(row[key])).join(","))].join("\r\n");
}
