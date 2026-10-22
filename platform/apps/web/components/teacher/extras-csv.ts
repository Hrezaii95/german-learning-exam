export type ExtraItem = { id: string; unitId: string; type: "lexeme"; bookRef: { book: string; lesson: number; page?: number }; source: "teacher-extra"; tags: string[]; lemma: string; pos: string; meaning: string; gender?: string; article?: string; forms?: { plural: string[] } };
export type ExtraPack = { schemaVersion: 1; id: string; title: string; language: "de"; cefr: "A1"; units: { id: string; title: string; canDo: string[] }[]; maps: never[]; difficulty: "a1"; review: { status: "pending-german-review" }; items: ExtraItem[] };
/** CSV parser accepts quoted commas/newlines and escaped quotes; malformed rows fail. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], field = "", quoted = false, afterQuote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) { if (char === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; afterQuote = true; } } else field += char; continue; }
    if (char === ',' || char === '\n' || char === '\r') { row.push(field); field = ""; afterQuote = false; if (char !== ',') { if (char === '\r' && text[i + 1] === '\n') i++; if (row.some(v => v.trim())) rows.push(row); row = []; } continue; }
    if (afterQuote) { if (char === ' ' || char === '\t') continue; throw new Error("Unexpected text after a quoted CSV field."); }
    if (char === '"') { if (field) throw new Error("Quotes must start a CSV field."); quoted = true; } else field += char;
  }
  if (quoted) throw new Error("A CSV quote is not closed.");
  row.push(field); if (row.some(v => v.trim())) rows.push(row);
  return rows;
}
export function teacherPackFromCsv(text: string, classId: string, title: string): { pack: ExtraPack; warnings: string[] } {
  if (text.length > 1_000_000) throw new Error("This CSV exceeds 1 MB.");
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  const headers = rows.shift()?.map(v => v.trim().replace(/\?$/, "").toLowerCase()) ?? [];
  if (!headers.includes("german") || !headers.includes("english") || !headers.includes("lesson")) throw new Error("CSV headers must include German, English and Lesson. Optional: Page, Tags, Gender, Plural.");
  if (!rows.length || rows.length > 500) throw new Error("Choose between 1 and 500 vocabulary rows.");
  const seen = new Set<string>(); const warnings: string[] = [];
  const packId = `teacher-extra:${classId}:csv`;
  const items = rows.map((row, index): ExtraItem => {
    if (row.length !== headers.length) throw new Error(`Row ${index + 2}: column count does not match the header.`);
    const get = (key: string) => (row[headers.indexOf(key)] ?? "").trim().normalize("NFC");
    const german = get("german"), meaning = get("english"), lesson = Number(get("lesson")), page = get("page");
    if (!german || !meaning || german.length > 250 || meaning.length > 1000 || !Number.isInteger(lesson) || lesson < 1 || lesson > 100) throw new Error(`Row ${index + 2}: German, English and a valid lesson are required.`);
    if (page && (!Number.isInteger(Number(page)) || Number(page) < 1 || Number(page) > 5000)) throw new Error(`Row ${index + 2}: invalid page.`);
    const prefix = /^(der|die|das)\s+(.+)$/i.exec(german);
    const article = prefix?.[1]?.toLowerCase(); const lemma = prefix?.[2] ?? german;
    const genderMap: Record<string, string> = { der: "m", die: "f", das: "n", m: "m", f: "f", n: "n", masculine: "m", feminine: "f", neuter: "n" };
    const suppliedGender = get("gender").toLowerCase(); const gender = genderMap[suppliedGender || article || ""];
    if (suppliedGender && !gender) throw new Error(`Row ${index + 2}: use m, f or n for gender.`);
    if (article && suppliedGender && genderMap[article] !== gender) throw new Error(`Row ${index + 2}: German article and Gender disagree.`);
    const key = lemma.toLocaleLowerCase("de"); if (seen.has(key)) warnings.push(`Row ${index + 2}: duplicate “${lemma}”. Check whether a second meaning is intended.`); seen.add(key);
    if (/[\uFFFD]|Ã[¤¶¼Ÿ]/.test(german + meaning)) warnings.push(`Row ${index + 2}: possible encoding problem. Save the CSV as UTF-8.`);
    if (/\b(?:ae|oe|ue)/i.test(lemma)) warnings.push(`Row ${index + 2}: check whether “${lemma}” needs an umlaut.`);
    const plural = get("plural");
    return { id: `${packId}:word-${index + 1}`, unitId: `${packId}:lesson-${lesson}`, type: "lexeme", bookRef: { book: "momente-a1", lesson, ...(page ? { page: Number(page) } : {}) }, source: "teacher-extra", tags: get("tags").split(/[;|]/).map(v => v.trim()).filter(Boolean), lemma, pos: gender ? "noun" : "other", meaning, ...(gender ? { gender } : {}), ...(article ? { article } : {}), ...(plural ? { forms: { plural: plural.split("|").map(v => v.trim()).filter(Boolean) } } : {}) };
  });
  const lessons = [...new Set(items.map(item => item.bookRef.lesson))].sort((a, b) => a - b);
  return { pack: { schemaVersion: 1, id: packId, title: title.trim() || "Teacher extra", language: "de", cefr: "A1", units: lessons.map(lesson => ({ id: `${packId}:lesson-${lesson}`, title: `Lektion ${lesson}`, canDo: [] })), maps: [], difficulty: "a1", review: { status: "pending-german-review" }, items }, warnings };
}
