"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { ContentPack, LanguageProfile, PackManifest } from "../../../../packages/content/src/types/packs.js";
import { CSV_MAX_BYTES, type CsvImportPreview } from "../../../../packages/wortwerk/src/csv.js";
import { createPersonalImportId, personalPackJson, previewPersonalCsv, savePersonalPack } from "@/lib/wortwerk/personal-import";
import { wortwerkStore, type WortwerkStore } from "@/lib/wortwerk/store";
export type PersonalImportProps = {
    manifest: PackManifest;
    language: LanguageProfile;
    book?: string;
    lesson?: number;
    store?: WortwerkStore;
    onSaved?: (pack: ContentPack, enabledForTesting: boolean) => void;
};
const target = { minHeight: 44, minWidth: 44 };
export function PersonalImport({ manifest, language, book, lesson, store = wortwerkStore, onSaved }: PersonalImportProps) {
    const id = useId();
    const namespace = useRef<string | null>(null);
    const report = useRef<HTMLDivElement>(null);
    const [csv, setCsv] = useState("");
    const [title, setTitle] = useState("My words");
    const [bookValue, setBook] = useState(book ?? "");
    const [lessonValue, setLesson] = useState(lesson?.toString() ?? "");
    const [preview, setPreview] = useState<CsvImportPreview | null>(null);
    const [enabled, setEnabled] = useState(false);
    const [message, setMessage] = useState("");
    const [saved, setSaved] = useState(false);
    useEffect(() => { if (preview || message)
        report.current?.focus(); }, [preview, message]);
    function clear() { setPreview(null); setMessage(""); setSaved(false); }
    function inspect() {
        clear();
        namespace.current ??= createPersonalImportId();
        if (lessonValue && (!/^\d+$/u.test(lessonValue) || Number(lessonValue) < 1)) {
            setMessage("Lesson must be a positive whole number.");
            return;
        }
        setPreview(previewPersonalCsv(csv, { manifest, language, id: namespace.current, title, ...(bookValue.trim() ? { book: bookValue.trim() } : {}), ...(lessonValue ? { lesson: Number(lessonValue) } : {}) }));
    }
    function save() {
        if (!preview?.pack || saved)
            return;
        try {
            const document = savePersonalPack(preview.pack, language, { enabledForTesting: enabled, store });
            setSaved(true);
            setMessage(store.getSnapshot().storageStatus === "persistent" ? "Personal pack saved on this device." : "Personal pack kept in memory for this tab. Export it to keep a copy.");
            onSaved?.(document.pack, document.enabledForTesting);
        }
        catch (error) {
            setMessage(error instanceof Error ? error.message : "The personal pack could not be saved.");
        }
    }
    function download() {
        if (!preview?.pack)
            return;
        let url: string | undefined;
        try {
            url = URL.createObjectURL(new Blob([personalPackJson(preview.pack, language)], { type: "application/json" }));
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `${preview.pack.id}.json`;
            anchor.click();
        }
        catch {
            setMessage("Download is unavailable in this browser. Your preview remains available.");
        }
        finally {
            if (url) {
                const completedUrl = url;
                setTimeout(() => { try {
                    URL.revokeObjectURL(completedUrl);
                }
                catch { /* Download cleanup is best effort. */ } }, 1000);
            }
        }
    }
    return <section className="ww-panel" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>Your own words</h2>
    <p>Paste or upload a CSV. Use lemma and meaning (or German and English), plus lesson and optional page, tags, gender, plural and pos. Separate tags or plural variants with |. A book and lesson may also come from the fields below or the selected pack’s authored units.</p>
    <p>New personal content stays pending review and is off by default. It is stored on this device and can be exported as a mini-pack.</p>
    <div className="ww-grid">
      <label>Pack title <input value={title} onChange={event => { setTitle(event.target.value); clear(); }} style={target}/></label>
      <label>Book <input value={bookValue} onChange={event => { setBook(event.target.value); clear(); }} style={target}/></label>
      <label>Lesson <input type="number" min={1} step={1} value={lessonValue} onChange={event => { setLesson(event.target.value); clear(); }} style={target}/></label>
    </div>
    <label htmlFor={`${id}-csv`}>CSV text</label>
    <textarea id={`${id}-csv`} value={csv} onChange={event => { setCsv(event.target.value); clear(); }} rows={8} style={{ width: "100%", minHeight: 120 }} spellCheck={false}/>
    <label>Or choose a CSV file <input type="file" accept=".csv,text/csv" style={target} onChange={event => {
            const file = event.target.files?.[0];
            if (!file)
                return;
            clear();
            if (file.size > CSV_MAX_BYTES) {
                setMessage(`CSV must be at most ${CSV_MAX_BYTES} UTF-8 bytes.`);
                return;
            }
            void file.text().then(text => { setCsv(text); clear(); }).catch(() => setMessage("The CSV file could not be read."));
        }}/></label>
    <button type="button" className="ww-button" style={target} disabled={!csv.trim()} onClick={inspect}>Preview words</button>
    <div ref={report} tabIndex={-1} role="status" aria-live="polite">
      {message ? <p>{message}</p> : null}
      {preview?.issues.length ? <ul>{preview.issues.map((value, index) => <li key={`${value.row}:${value.code}:${index}`}>Row {value.row}{value.column ? `, ${value.column}` : ""}: {value.message}</li>)}</ul> : null}
      {preview?.pack ? <>
        <h3>{preview.pack.items.length} words ready to import</h3>
        <p>Pending review · Personal extras</p>
        <ul>{preview.pack.items.slice(0, 20).map(item => <li key={item.id}>{item.type === "lexeme" ? <><span lang={language.locale}>{item.lemma}</span> — {item.meaning}</> : null}</li>)}</ul>
        {preview.pack.items.length > 20 ? <p>Showing the first 20 words; all {preview.pack.items.length} validated rows will be saved.</p> : null}
      </> : null}
    </div>
    {preview?.pack ? <>
      <label><input type="checkbox" checked={enabled} disabled={saved} onChange={event => setEnabled(event.target.checked)} style={target}/> Enable this pending pack for testing</label>
      <button type="button" className="ww-button" style={target} disabled={saved} onClick={save}>Save personal pack</button>{" "}
      <button type="button" className="ww-button" style={target} onClick={download}>Export mini-pack JSON</button>
    </> : null}
  </section>;
}
