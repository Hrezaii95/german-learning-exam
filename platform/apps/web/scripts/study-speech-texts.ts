import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  lessonFourWords,
  lessonFourConcepts,
  lessonFourPhrases,
  lessonFourVerbs,
} from "../lib/study/lesson-four";
import { loadBook } from "../lib/study/catalog";
const texts = [
  ...new Set([
    ...loadBook().pages.flatMap((page) => page.lines.map((line) => line.text)),
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
writeFileSync(
  new URL("../generated/study-speech-texts.json", import.meta.url),
  `${JSON.stringify(texts, null, 2)}\n`,
);
console.log(`${texts.length} study utterances`);
if (process.argv.includes("--manifest")) {
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
  writeFileSync(
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
