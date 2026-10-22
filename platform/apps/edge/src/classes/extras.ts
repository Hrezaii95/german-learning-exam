import { identifier, integer, invalid, record, stringList, text } from "./validation.js";

/** Teacher CSV imports are deliberately the lexeme subset of the shared ContentPack v1 schema. */
export function validateExtraPack(input: unknown, classId: string, packId: string): { pack: Record<string, unknown>; warnings: string[] } {
  const value = record(input);
  if (value.schemaVersion !== 1 || value.language !== "de" || !["A1", "A2", "B1", "B2", "C1", "C2"].includes(String(value.cefr))) invalid("Unsupported pack");
  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 500) invalid("A pack needs 1–500 items");
  if (!Array.isArray(value.units) || value.units.length < 1 || value.units.length > 100) invalid("A pack needs units");
  const units = value.units.map(raw => { const unit = record(raw); return { id: identifier(unit.id), title: text(unit.title), canDo: unit.canDo === undefined ? [] : stringList(unit.canDo, 50) }; });
  const unitIds = new Set(units.map(unit => unit.id));
  if (unitIds.size !== units.length) invalid("Duplicate units");
  const warnings: string[] = [], seen = new Set<string>(), ids = new Set<string>();
  const items = value.items.map((raw, index) => {
    const item = record(raw), ref = record(item.bookRef);
    if (item.type !== "lexeme" || item.source !== "teacher-extra") invalid("Teacher extras must be labelled lexemes");
    const itemId = identifier(item.id), unitId = identifier(item.unitId);
    if (ids.has(itemId) || !unitIds.has(unitId)) invalid("Invalid item identity");
    ids.add(itemId);
    const lemma = text(item.lemma, "German", 300), meaning = text(item.meaning, "English", 1000), key = lemma.toLocaleLowerCase("de");
    if (seen.has(key)) warnings.push(`Row ${index + 1}: duplicate German headword ${lemma}`);
    seen.add(key);
    if (/[ÃÂ�]/u.test(lemma) || /[ÃÂ�]/u.test(meaning)) invalid(`Row ${index + 1}: text encoding needs correction`);
    if (/(ae|oe|ue)/iu.test(lemma)) warnings.push(`Row ${index + 1}: check whether an umlaut is intended; text is preserved`);
    const bookRef: Record<string, unknown> = { book: identifier(ref.book), lesson: integer(ref.lesson, 1, 100) };
    if (ref.page !== undefined) bookRef.page = integer(ref.page, 1, 5_000);
    const result: Record<string, unknown> = { id: `teacher-extra:${classId}:${itemId}`, unitId, type: "lexeme", bookRef, source: "teacher-extra",
      tags: item.tags === undefined ? [] : stringList(item.tags), lemma, pos: text(item.pos, "part of speech", 40), meaning, review: { status: "pending-german-review" } };
    if (item.gender !== undefined) result.gender = text(item.gender, "gender", 30);
    if (item.article !== undefined) result.article = text(item.article, "article", 20);
    if (item.forms !== undefined) {
      const forms = record(item.forms), safe: Record<string, string[]> = {};
      for (const [form, entries] of Object.entries(forms)) safe[identifier(form)] = stringList(entries, 20);
      result.forms = safe;
    }
    return result;
  });
  const pack = { schemaVersion: 1, id: `teacher-extra:${classId}:${packId}`, language: "de", cefr: value.cefr,
    title: text(value.title, "pack title"), units, maps: [], difficulty: typeof value.difficulty === "string" ? text(value.difficulty) : "teacher-extra",
    review: { status: "pending-german-review" }, items };
  return { pack, warnings };
}
