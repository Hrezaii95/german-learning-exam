import { describe, expect, it } from "vitest";
import { readFileSync,statSync } from "node:fs";
import {createHash} from "node:crypto";
import { resolve } from "node:path";
import { bookTranscript, workbookTranscript } from "../../apps/web/lib/audio/listening-transcripts";

const book = JSON.parse(readFileSync(resolve("apps/web/generated/interactive-book.json"), "utf8")) as {audio: {id:string;kind:string;lesson:number;exercise:number}[];pages:{width:number}[]};
describe("source transcript mapping", () => {
  it("covers every original track in the twelve-lesson book", () => {
    expect(book.audio).toHaveLength(208);
    for (const track of book.audio) {
      const transcript = bookTranscript(track.id)!;
      expect(transcript, track.id).toBeDefined();
      expect(transcript.lines.length).toBeGreaterThan(0);
      expect(transcript.sourcePages.length).toBeGreaterThan(0);
      expect(transcript.credit).toContain("Hueber");
      for (const line of transcript.lines) expect(line.text).not.toMatch(/[\ue000-\uf8ff]/);
    }
  });
  it("keeps recorded fallback aligned to every source line and ships each audio file",()=>{
    const bytes=readFileSync(resolve("apps/web/generated/audio/listening-transcripts.json"));
    const source=JSON.parse(bytes.toString()) as {tracks:Record<string,{lines:{text:string}[]}>;workbook:Record<string,{lines:{text:string}[]}>};
    const speech=JSON.parse(readFileSync(resolve("apps/web/generated/audio/transcript-speech.json"),"utf8")) as {sourceSha256:string;tracks:Record<string,string[]>;workbook:Record<string,string[]>};
    expect(speech.sourceSha256).toBe(createHash("sha256").update(bytes.toString().replace(/^\uFEFF/,"").replace(/\r\n/g,"\n")).digest("hex"));
    for(const section of ["tracks","workbook"] as const)for(const [id,transcript] of Object.entries(source[section])){
      const mapped=section==="tracks"?bookTranscript(id):workbookTranscript(id);
      expect(speech[section][id]).toHaveLength(transcript.lines.length);
      expect(mapped?.lines.map(line=>line.text)).toEqual(transcript.lines.map(line=>line.text));
      for(const line of mapped!.lines){
        expect(line.audio).toMatch(/^\/(?:book|audio|word-cards)\//);
        expect(statSync(resolve("apps/web/public",line.audio!.slice(1))).size).toBeGreaterThan(1000);
        if(line.audio!.startsWith("/book/transcript-speech/"))expect(line.audio).toBe(`/book/transcript-speech/${createHash("sha256").update(line.text).digest("hex").slice(0,20)}.mp3`);
      }
    }
  });
  it("maps the workbook's shifted Lesson 4 numbering by exercise", () => {
    const nine = book.audio.find(a => a.kind === "workbook" && a.lesson === 4 && a.exercise === 9)!;
    expect(bookTranscript(nine.id)?.sourceTrack).toBe("1_32");
    expect(workbookTranscript("1_31")?.lines[0]?.text).toContain("100, 200, 300");
    expect(workbookTranscript("1_32")?.lines[0]?.text).toBe("Der Sessel ist so schön.");
  });
  it("preserves coursebook dialogue continued across source pages", () => {
    const track = book.audio.find(a => a.kind === "coursebook" && a.lesson === 4 && a.exercise === 3)!;
    const transcript = bookTranscript(track.id)!;
    expect(transcript.sourcePages).toEqual([4, 5]);
    expect(transcript.lines[0]?.text).toContain("Der Stuhl ist so schön");
    expect(transcript.lines.map(line => line.text).join(" ")).toContain("nur 59 Euro");
    expect(transcript.lines.at(-1)?.text).toBe("Ja, er ist wirklich sehr schön.");
  });
  it("provides the existing listening activities with the correct transcript", () => {
    expect(workbookTranscript("1_01")?.lines[1]?.text).toBe("Ich bin Paco Perez.");
    expect(workbookTranscript("1_14")?.lines[0]?.text).toBe("0163 / 21 53 79 56");
    expect(workbookTranscript("missing")).toBeUndefined();
  });
  it("ships source pages sharp enough for the enlarged reader", () => {
    for (const page of book.pages) expect(page.width).toBeGreaterThanOrEqual(1900);
  });
});
