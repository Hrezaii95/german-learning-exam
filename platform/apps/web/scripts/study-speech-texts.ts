import { readFileSync, readdirSync, writeFileSync, renameSync, existsSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  lessonFourWords,
  lessonFourConcepts,
  lessonFourPhrases,
  lessonFourVerbs,
} from "../lib/study/lesson-four";
import { loadBook, loadBookAnswers,loadDictionary } from "../lib/study/catalog";
import {studyUnits} from "../lib/study/course-lessons";
import {objectSheetSpeech} from "../lib/study/object-sheet";
import {officeSheetSpeech} from "../lib/study/office-sheet";
import {hobbiesSpeech} from "../lib/study/hobbies-sheet";
import {questionSpeechTexts} from "../lib/study/questions";
function writeSnapshot(target:string|URL,text:string){
  const path=target instanceof URL?fileURLToPath(target):target;
  const temporary=`${path}.${process.pid}.tmp`;
  try{writeFileSync(temporary,text,"utf8");renameSync(temporary,path);}
  finally{if(existsSync(temporary))unlinkSync(temporary);}
}
const texts = [
  ...new Set([
    ...objectSheetSpeech,
    ...officeSheetSpeech,
    ...hobbiesSpeech,
    ...questionSpeechTexts(),
    ...studyUnits.flatMap(u=>[...(u.words?.flatMap(w=>[w.de,w.plural,w.example]).filter(t=>Boolean(t)&&t!=="plural only")??[]),...u.concepts.flatMap(c=>[c.de,...c.examples]),...u.phrases.map(p=>p.de),...u.verbs.flatMap(v=>v.forms.map((f,i)=>`${["ich","du","er","wir","ihr","sie"][i]} ${f}`))]),
    ...loadBook().pages.flatMap((page) => page.lines.map((line) => line.text)),
    ...loadBookAnswers().flatMap(answer=>answer.text.split(/\n+/)),
    ...lessonFourWords.flatMap((word) => [
      word.de,
      word.example,
      ...(word.plural && word.plural !== "plural only" ? [word.plural] : []),
    ]),
    ...lessonFourConcepts.flatMap((concept) => [
      concept.de,
      ...concept.examples,
    ]),
    ...lessonFourPhrases.map(([de]) => de),
    ...lessonFourVerbs.flatMap((verb) =>
      verb.forms.map(
        (form, i) => `${["ich", "du", "er", "wir", "ihr", "sie"][i]} ${form}`,
      ),
    ),
  ]),
];
writeSnapshot(
  new URL("../generated/study-speech-texts.json", import.meta.url),
  `${JSON.stringify(texts, null, 2)}\n`,
);
console.log(`${texts.length} study utterances`);
if (process.argv.includes("--manifest")) {
  writeSnapshot(new URL("../generated/study-dictionary.json",import.meta.url),JSON.stringify(loadDictionary())+"\n");
  const web = join(dirname(fileURLToPath(import.meta.url)), "..");
  const assets = ["audio", "speech"].flatMap((kind) =>
    readdirSync(join(web, "public/book", kind))
      .filter((name) => name.endsWith(".mp3"))
      .sort()
      .map((name) => {
        const bytes = readFileSync(join(web, "public/book", kind, name));
        return {
          publicRelativePath: `book/${kind}/${name}`,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          bytes: bytes.length,
          kind:
            kind === "audio"
              ? "original-course-recording"
              : "synthesized-speech",
        };
      }),
  );
  writeSnapshot(
    join(web, "../../../media/manifests/interactive-book-public-audio-v1.json"),
    JSON.stringify(
      {
        version: 1,
        authorization:
          "SO-002, owner request 2026-09-10; existing Momente distribution grant and attribution preserved",
        wordCardPaths: lessonFourWords.map((word) => `/vocabulary/${word.id}`),
        assets,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`${assets.length} book audio files registered`);
}
