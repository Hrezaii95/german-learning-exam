import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync, unlinkSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { illustrationForDetail } from "../lib/content/illustrations";
import { wordCardSearchKey, type WordCard, type WordCardCatalog, type WordForm } from "../lib/content/word-card-types";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const web = resolve(root, "platform/apps/web");
const json = <T,>(path: string): T => JSON.parse(readFileSync(resolve(root, path), "utf8")) as T;
type Entry = { id: string; lesson: string; priority: string; category: string; german: string; english: string; plural: string; notes: string; source: string };
type NumberEntry = { number: number; german: string; english: string; lesson: string; source: string };
type Verb = { infinitive: string; example: string; translation: string; notes: string; forms: Record<string, string> };
type Detail = { id: string; canonicalPath: string; displayText: string; kind: string };
type Teacher = { sourceRow: number; detailPath: string; masculine: { singular: string }[]; feminine: { singular: string }[] };
type Clip = { spokenText: string; path: string; sha256: string; bytes: number };
const stripArticle = (text: string) => text.replace(/^(der|die|das) /, "");
const baseMeaning = (text: string) => text.replace(/\s*\((male|female)\)/gi, "").trim();
const compareLabel = (text: string) => ["sie", "Sie", "ihr", "Ihr"].includes(text) ? text : text.replace(/[.!?]+$/, "").trim().toLocaleLowerCase("de-DE");
const unique = <T,>(values: T[]) => [...new Set(values)];
const toneFor = (text: string): WordForm["tone"] => text.startsWith("der ") ? "male" : text.startsWith("die ") ? "female" : text.startsWith("das ") ? "neuter" : "plain";

export function projectWordCards() {
  const source = json<{ entries: Entry[]; numbers: NumberEntry[] }>("research/lesson-03-study-pack/vocabulary.json");
  const supplements = json<Record<string, { plural: string; notes: string; sourceUrl: string }>>("platform/content/study-cards/lexical-supplements.json");
  source.entries = source.entries.map(e => supplements[e.id] ? { ...e, plural: supplements[e.id]!.plural, notes: supplements[e.id]!.notes } : e);
  const verbs = json<{ entries: Verb[] }>("research/lesson-03-study-pack/verbs.json").entries;
  const details = json<{ details: Detail[] }>("platform/apps/web/generated/learner-details.json").details.filter(d => d.kind === "Lexeme");
  const teachers = json<{ rows: Teacher[] }>("platform/apps/web/generated/learner-extra-professions.json").rows;
  const authored = new Map(readFileSync(resolve(root, "platform/content/study-cards/examples.tsv"), "utf8").split(/\r?\n/).filter(l => l && !l.startsWith("#")).map(line => {
    const [id, de, en, cue = ""] = line.split("|");
    if (!id || !de || !en) throw new Error(`Invalid example: ${line}`);
    return [id, { de, en, cue }];
  }));
  const audio = new Map<string, string>();
  const audioFiles = new Map<string, string>();
  const publicAudio = new Map<string, { spokenText: string; publicRelativePath: string; sha256: string; bytes: number }>();
  for (const manifest of ["media/manifests/alpha-tts-manifest.json", "media/manifests/word-cards-tts-v1.json"]) {
    if (!existsSync(resolve(root, manifest))) continue;
    for (const clip of json<{ assets: Clip[] }>(manifest).assets) {
      const file = resolve(root, clip.path);
      if (!existsSync(file)) throw new Error(`Missing audio: ${clip.path}`);
      const bytes = readFileSync(file);
      if (createHash("sha256").update(bytes).digest("hex") !== clip.sha256 || bytes.length !== clip.bytes) throw new Error(`Audio integrity: ${clip.path}`);
      const dest = `/audio/word-cards-v1/${file.split(/[\\/]/).at(-1)}`;
      if (!/^\/audio\/word-cards-v1\/(?:word|tts)-[a-f0-9]{16}\.mp3$/.test(dest)) throw new Error(`Invalid card audio filename: ${dest}`);
      audioFiles.set(dest, file);
      audio.set(clip.spokenText, dest);
      publicAudio.set(dest, { spokenText: clip.spokenText, publicRelativePath: dest.slice(1), sha256: clip.sha256, bytes: clip.bytes });
    }
  }
  const parents = new Map(source.entries.map(e => [e.id, e.id]));
  function find(id: string): string { const p = parents.get(id)!; return p === id ? id : find(p); }
  function union(a: string, b: string) { const x = find(a), y = find(b); if (x !== y) parents.set(y, x < y ? x : y), parents.set(x, x < y ? x : y); }
  const byGerman = new Map(source.entries.map(e => [e.german, e]));
  for (const e of source.entries) {
    if (!e.english.includes("(male)")) continue;
    const female = source.entries.find(f => f.english.includes("(female)") && baseMeaning(f.english).toLowerCase() === baseMeaning(e.english).toLowerCase());
    if (female) union(e.id, female.id);
  }
  // Pair forms whose English labels in the inventory use a shorter masculine gloss.
  for (const [m, f] of [["der Partner", "die Partnerin"], ["der Enkel", "die Enkelin"]] as const) {
    const a = byGerman.get(m), b = byGerman.get(f); if (a && b) union(a.id, b.id);
  }
  for (const row of teachers) {
    const entries = [...row.masculine, ...row.feminine].map(f => byGerman.get(f.singular));
    if (entries.some(e => !e)) throw new Error(`Teacher row ${row.sourceRow} has an unmapped form`);
    for (const e of entries.slice(1)) union(entries[0]!.id, e!.id);
  }
  const groups = new Map<string, Entry[]>();
  for (const e of source.entries) { const id = find(e.id); groups.set(id, [...(groups.get(id) ?? []), e]); }
  const cards: WordCard[] = [];
  const missing: string[] = [];
  for (const [id, entries] of groups) {
    const first = entries[0]!;
    const isNoun = entries.some(e => /^(der|die|das) /.test(e.german) && !!e.plural);
    const isJob = first.category === "Profession";
    const isCountry = first.category === "Country";
    const isLanguage = first.category === "Language";
    const aliases = details.filter(d => entries.some(e => compareLabel(e.german) === compareLabel(d.displayText))).map(d => d.canonicalPath);
    const teacherRows = teachers.filter(t => [...t.masculine, ...t.feminine].some(f => entries.some(e => e.german === f.singular)));
    const meanings = new Map<string, string>();
    entries.forEach(e => { const meaning = baseMeaning(e.english); if (!meanings.has(meaning.toLowerCase())) meanings.set(meaning.toLowerCase(), meaning); });
    const title = [...meanings.values()].join(" / ");
    const verb = verbs.find(v => v.infinitive === first.german);
    let example = authored.get(id);
    if (!example && isJob) {
      const forms = entries.filter(e => /^(der|die) /.test(e.german));
      const firstMeaning = title.split(" / ")[0]!.toLowerCase();
      example = { de: forms.map(e => `Ich bin ${stripArticle(e.german)}.`).join(" / "), en: `I am ${/^[aeiou]/i.test(firstMeaning) ? "an" : "a"} ${firstMeaning}.`, cue: "After “Ich bin”, a profession usually has no article." };
    }
    if (!example && isCountry) {
      const origin = first.german === "die USA" ? "den USA" : first.german === "die Niederlande" ? "den Niederlanden" : first.german.startsWith("die ") ? first.german.replace(/^die /, "der ") : first.german.startsWith("der ") ? first.german.replace(/^der /, "dem ") : first.german;
      example = { de: `Ich komme aus ${origin}.`, en: `I come from ${title}.`, cue: first.german.startsWith("die ") || first.german.startsWith("der ") ? `Learn the whole origin phrase: aus ${origin}. The article changes after aus.` : `Use aus ${first.german} for origin. This country name needs no article.` };
    }
    if (!example && isLanguage) example = { de: `Ich spreche ${first.german}.`, en: `I speak ${title}.`, cue: `Name the language with a capital letter: ${first.german}. Use sprechen to say which language you speak.` };
    if (!example && verb) example = { de: verb.example, en: verb.translation, cue: verb.notes };
    if (!example) { missing.push(`${id}|${first.german}|${first.english}`); continue; }
    const rows = entries.map(e => {
      const pluralOnly = /^(plural only|usually plural|plural name)$/.test(e.plural);
      const plurals = e.plural.startsWith("die ") ? e.plural.split(/\s*;\s*/).map(text => ({ text, label: "Plural", tone: "plural" as const, audio: audio.get(text) ?? null })) : [];
      const gender = isNoun ? toneFor(e.german) : "plain";
      const label = pluralOnly ? "Plural" : gender === "male" ? "Masculine" : gender === "female" ? "Feminine" : gender === "neuter" ? "Neuter" : "German";
      return { label, meaning: e.english, singular: { text: e.german, label, tone: pluralOnly ? "plural" as const : gender, audio: audio.get(e.german) ?? null }, plurals, usage: plurals.length ? "" : e.plural };
    });
    const fem = entries.find(e => e.german.startsWith("die ") && e.german.endsWith("in"));
    const male = entries.find(e => e.german.startsWith("der "));
    let pattern: string[];
    let tip: string;
    if (male && fem && stripArticle(fem.german) === `${stripArticle(male.german)}in`) {
      pattern = [stripArticle(male.german), stripArticle(fem.german), stripArticle(fem.plural)];
      tip = "Feminine: add -in. Feminine plural: use -innen. Learn the masculine plural separately.";
    } else if (isNoun && rows.some(r => r.plurals.length)) {
      pattern = [first.german, first.plural];
      tip = `Learn ${first.german} together with ${first.plural}. ${entries.length > 1 ? "Notice the stem changes in the other forms, too." : "The plural article is die."}`;
    } else if (verb) {
      pattern = [verb.infinitive, `ich ${verb.forms.ich}`, `du ${verb.forms.du}`];
      tip = example.cue;
    } else {
      pattern = [first.german];
      tip = example.cue || first.notes || `Remember ${first.german} in the example below.`;
    }
    const linkedDetail = details.find(d => entries.some(e => d.displayText === e.german));
    const illustration = linkedDetail ? illustrationForDetail(linkedDetail.id) : null;
    const imageFile = illustration?.responsive?.detail.fallback.find(r => r.width === 512)?.path ?? illustration?.responsive?.detail.intrinsic.path ?? illustration?.filename;
    const image = illustration && imageFile ? { path: imageFile.startsWith("/illustrations/") ? imageFile : `/illustrations/${imageFile.replace(/^\//, "")}`, alt: illustration.alt } : null;
    if (image && !existsSync(resolve(web, `public${image.path}`))) throw new Error(`Image not found: ${image.path}`);
    const prompts = rows.flatMap((row, index) => [{ question: entries.length > 1 ? `Say “${baseMeaning(entries[index]!.english)}” — ${row.label.toLowerCase()}, singular.` : `How do you say “${title}”?`, answers: [row.singular.text], hint: row.usage || example.cue }, ...row.plurals.map(p => ({ question: `Give the plural of “${title}”${entries.length > 1 ? ` — ${row.label.toLowerCase()}` : ""}.`, answers: [p.text], hint: "Include die and pay attention to the ending and any umlaut." }))]);
    cards.push({ id, path: `/vocabulary/${id.toLowerCase()}`, aliases: unique([...aliases, ...teacherRows.map(t => t.detailPath)]), sourceIds: entries.map(e => e.id), teacherRows: teacherRows.map(t => t.sourceRow), title, category: first.category, lessons: unique(entries.map(e => e.lesson)), priorities: unique(entries.map(e => e.priority)), rows, pattern, tip, examples: [{ de: example.de, en: example.en, audio: audio.get(example.de) ?? null }], note: unique([example.cue, ...entries.map(e => e.notes)]).filter(Boolean).join(" "), sources: unique(entries.map(e => e.source)), image, visual: isJob ? "profession" : isCountry ? "origin" : isLanguage ? "language" : first.category === "Family" ? "family" : first.category === "Verb" ? "action" : "meaning", prompts, searchText: wordCardSearchKey([title, ...entries.flatMap(e => [e.german, e.plural, e.english]), first.category].join(" ")) });
  }
  for (const n of source.numbers) {
    const spelling = n.german;
    const parts = spelling.includes("und") ? spelling.split("und") : null;
    const cue = parts ? `${parts[0]} + und + ${parts[1]}: say the units before the tens. Write the number as one word.` : `Learn ${n.number} as a whole: ${spelling}.`;
    cards.push({ id: `N${String(n.number).padStart(3, "0")}`, path: `/vocabulary/number-${n.number}`, aliases: [], sourceIds: [], teacherRows: [], title: `${n.number} · ${n.english}`, category: "Number", lessons: ["2"], priorities: ["Core"], rows: [{ label: "Number", meaning: n.english, singular: { text: spelling, label: "German", tone: "plain", audio: audio.get(spelling) ?? null }, plurals: [], usage: "" }], pattern: parts ? [parts[0]!, "und", parts[1]!] : [spelling], tip: cue, examples: [{ de: `Die Zahl ist ${spelling}.`, en: `The number is ${n.english}.`, audio: audio.get(`Die Zahl ist ${spelling}.`) ?? null }], note: n.number === 1 ? "eins when counting on its own; ein before a masculine or neuter noun." : "Numbers are normally lowercase inside a sentence.", sources: [n.source], image: null, visual: String(n.number), prompts: [{ question: `Write ${n.number} in German.`, answers: n.number === 100 ? [spelling, "einhundert"] : [spelling], hint: cue }], searchText: `${n.number} ${wordCardSearchKey(`${n.english} ${spelling}`)}` });
  }
  const letters = "A:a|B:be|C:ce|D:de|E:e|F:ef|G:ge|H:ha|I:i|J:jot|K:ka|L:el|M:em|N:en|O:o|P:pe|Q:ku|R:er|S:es|T:te|U:u|V:vau|W:we|X:iks|Y:ypsilon|Z:zett|Ä:A-Umlaut|Ö:O-Umlaut|Ü:U-Umlaut|ß:Eszett / scharfes S".split("|");
  for (const [index, pair] of letters.entries()) {
    const [letter, name] = pair.split(":") as [string, string];
    const id = `A${String(index + 1).padStart(2, "0")}`;
    cards.push({ id, path: `/vocabulary/letter-${index + 1}`, aliases: [], sourceIds: [], teacherRows: [], title: `Letter ${letter}`, category: "Alphabet", lessons: ["1"], priorities: ["Core"], rows: [{ label: "Letter name", meaning: letter, singular: { text: name, label: "Spelling cue", tone: "plain", audio: audio.get(name) ?? null }, plurals: [], usage: "Letter-name spelling cue, not phonetic transcription." }], pattern: [letter, name], tip: `When spelling a name, use the German letter name: ${name}.`, examples: [{ de: `Der Buchstabe ist ${letter}.`, en: `The letter is ${letter}.`, audio: audio.get(`Der Buchstabe ist ${letter}.`) ?? null }], note: "A–Z letter names and special-character cues follow the vocabulary guide. Use the Lesson 1 alphabet recording to practise the sounds.", sources: ["Vocabulary guide: Alphabet and spelling; KB printed p.12, Lesson 1 alphabet recording."], image: null, visual: letter, prompts: [{ question: `What is the German letter-name spelling cue for ${letter}?`, answers: name.split(" / "), hint: "These are German letter-name spellings, not English pronunciations." }], searchText: wordCardSearchKey(`alphabet ${letter} ${name}`) });
  }
  const phraseFamilies: Record<string, string> = { "lex:auch-super": "W042", "lex:es-geht": "W507", "lex:gut-danke": "W041", "lex:nicht-so-gut": "W041", "lex:sehr-gut-danke": "W041", "lex:und-dir": "W009", "lex:wie-bitte": "W044" };
  for (const detail of details) {
    if (cards.some(c => c.aliases.includes(detail.canonicalPath))) continue;
    const card = cards.find(c => c.sourceIds.includes(phraseFamilies[detail.id] ?? ""));
    if (!card) throw new Error(`Old vocabulary route has no family: ${detail.id} (${detail.displayText})`);
    card.aliases.push(detail.canonicalPath);
    card.rows.push({ label: "Phrase", meaning: ({ "lex:auch-super": "also great", "lex:es-geht": "so-so / not bad", "lex:gut-danke": "fine, thank you", "lex:nicht-so-gut": "not so good", "lex:sehr-gut-danke": "very well, thank you", "lex:und-dir": "and you? (informal)", "lex:wie-bitte": "pardon?" } as Record<string, string>)[detail.id]!, singular: { text: detail.displayText, label: "Related phrase", tone: "plain", audio: audio.get(detail.displayText) ?? null }, plurals: [], usage: "Related expression from the existing lesson vocabulary." });
    card.searchText += ` ${wordCardSearchKey(detail.displayText)}`;
  }
  if (missing.length) throw new Error(`Missing authored examples (${missing.length}):\n${missing.join("\n")}`);
  for (const card of cards) {
    for (const id of card.sourceIds) if (supplements[id]) card.sources.push(supplements[id]!.sourceUrl);
    const determiners: Record<string, [string, string, string]> = {
      W011: ["meine", "my", "Feminine / plural"], W172: ["deine", "your (informal)", "Feminine / plural"],
      W418: ["Ihre", "your (formal)", "Feminine / plural"], W075: ["keine", "no / not any", "Feminine / plural"],
      W178: ["eine", "a / an", "Feminine"],
    };
    const variant = determiners[card.id];
    if (variant) {
      card.rows[0]!.label = "Masculine / neuter";
      card.prompts[0]!.question = `Say “${variant[1]}” — masculine/neuter, nominative.`;
      card.rows.push({ label: variant[2], meaning: variant[1], singular: { text: variant[0], label: variant[2], tone: "plain", audio: audio.get(variant[0]) ?? null }, plurals: [], usage: "Nominative form in the Lesson 1–3 patterns." });
      card.pattern = [card.rows[0]!.singular.text, variant[0]];
      card.tip = `In the nominative, use ${card.rows[0]!.singular.text} with masculine/neuter nouns; ${variant[0]} with ${card.id === "W178" ? "feminine nouns" : "feminine or plural nouns"}.`;
      card.sources.push("KB Module 1 grammar summary, printed p.27; Lesson 2 negation and Lesson 3 possessives.");
      card.prompts.push({ question: `Say “${variant[1]}” — ${variant[2].toLowerCase()}, nominative.`, answers: [variant[0]], hint: card.tip });
    }
    for (const row of card.rows) if (!card.prompts.some(p => p.answers.includes(row.singular.text))) card.prompts.push({ question: `How do you say “${row.meaning}”?`, answers: [row.singular.text], hint: row.usage });
  }
  const usedAudio = new Set(cards.flatMap(c => [...c.rows.flatMap(r => [r.singular.audio, ...r.plurals.map(p => p.audio)]), ...c.examples.map(e => e.audio)]).filter((p): p is string => p !== null));
  const publicManifest = resolve(root, "media/manifests/word-cards-public-audio-v1.json");
  if (existsSync(publicManifest)) {
    const previous = JSON.parse(readFileSync(publicManifest, "utf8")) as { assets: { publicRelativePath: string }[] };
    for (const asset of previous.assets) {
      if (!/^audio\/word-cards-v1\/(?:word|tts)-[a-f0-9]{16}\.mp3$/.test(asset.publicRelativePath)) throw new Error("Unsafe stale card audio path");
      const path = resolve(web, "public", asset.publicRelativePath);
      if (!usedAudio.has(`/${asset.publicRelativePath}`) && existsSync(path)) unlinkSync(path);
    }
  }
  for (const dest of usedAudio) {
    mkdirSync(dirname(resolve(web, `public${dest}`)), { recursive: true });
    copyFileSync(audioFiles.get(dest)!, resolve(web, `public${dest}`));
  }
  writeFileSync(publicManifest, `${JSON.stringify({ version: 1, authorization: "Owner requested complete website cards on 2026-09-03; generated preview speech, not human-approved pronunciation.", assets: [...publicAudio.values()].filter(a => usedAudio.has(`/${a.publicRelativePath}`)).sort((a, b) => a.publicRelativePath.localeCompare(b.publicRelativePath)) }, null, 2)}\n`);
  const catalog: WordCardCatalog = { version: 1, sourcePdfSha256: createHash("sha256").update(readFileSync(resolve(root, "study-guides/lessons-01-03/01-vocabulary.pdf"))).digest("hex"), vocabularyCount: source.entries.length, numberCount: source.numbers.length, spellingCount: letters.length, teacherRowCount: teachers.length, cards };
  writeFileSync(resolve(web, "generated/word-cards.json"), `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Word families: ${cards.length} cards; ${source.entries.length} vocabulary entries, ${source.numbers.length} numbers, ${letters.length} spelling cards, ${teachers.length} teacher rows.`);
}
