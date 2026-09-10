import {mkdirSync,writeFileSync} from "node:fs";
import {homeWords,homeSpeechTexts,homeAdjectives,homePhrases} from "../platform/apps/web/lib/study/home";
const root=new URL("../",import.meta.url);
mkdirSync(new URL("research/home-cheatsheet",root),{recursive:true});
writeFileSync(new URL("platform/apps/web/generated/home-speech-texts.json",root),JSON.stringify(homeSpeechTexts,null,2)+"\n");
writeFileSync(new URL("research/home-cheatsheet/coverage.json",root),JSON.stringify({reference:"User-supplied easydeutsch home vocabulary image, including its Zuhause heading",book:"Momente A1.1 Lessons 1–4; KB printed pages 11–22, 29–32; AB 6–17, 26–29; glossary pages 1–6",words:homeWords.map(({id,de,plural,image,book})=>({id,de,plural,image,book})),adjectives:homeAdjectives,phrases:homePhrases,speechTexts:homeSpeechTexts.length},null,2)+"\n");
console.log(JSON.stringify({words:homeWords.length,speechTexts:homeSpeechTexts.length}));
