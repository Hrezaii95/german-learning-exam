export const sheetLinks = [
  {id:"countries",number:"01",title:"Countries & languages",href:"/cheat-sheets"},
  {id:"home",number:"02",title:"Home & furniture",href:"/cheat-sheets/home"},
  {id:"people",number:"03",title:"People, family & work",href:"/cheat-sheets/people"},
  {id:"verbs",number:"04",title:"Verbs & sentences",href:"/cheat-sheets/verbs"},
  {id:"numbers",number:"05",title:"Numbers & prices",href:"/cheat-sheets/numbers"},
  {id:"conversation",number:"06",title:"Conversation & spelling",href:"/cheat-sheets/conversation"},
] as const;
export type SheetId = typeof sheetLinks[number]["id"];
export type ExtendedSheetId = Exclude<SheetId,"countries"|"home">;
export type SheetQuiz = {q:string;options:string[];answer:string;why:string};
export const sheetTitles:Record<ExtendedSheetId,{title:string;subtitle:string;eyebrow:string}>={
  people:{title:"Put a face to the word.",subtitle:"Family connections, work roles, and the words that describe you.",eyebrow:"The people around you · Lessons 2–3"},
  verbs:{title:"Give every sentence a backbone.",subtitle:"Choose the person. Change the verb. Keep it in the right place.",eyebrow:"Your sentence workshop · Lessons 1–4"},
  numbers:{title:"Make numbers click.",subtitle:"Build the word, hear the number, and read the price with confidence.",eyebrow:"Small steps to a million · Lessons 1–4"},
  conversation:{title:"Keep the conversation moving.",subtitle:"A friendly route from hello to a clear answer — and help when you need it.",eyebrow:"Your pocket conversation guide · Lessons 1–4"},
};
export const grammarPatterns = [
  {id:"statement",title:"A statement: the verb is second",de:"Ich wohne in Berlin.",en:"I live in Berlin.",parts:["Ich","wohne","in Berlin."],cue:"One idea comes first, then the conjugated verb. Count sentence parts, not individual words."},
  {id:"question",title:"W-question: question word + verb",de:"Wo wohnst du?",en:"Where do you live?",parts:["Wo","wohnst","du?"],cue:"Wo, woher, wie, wer and was open the question. The verb follows."},
  {id:"yes-no",title:"Yes/no question: verb first",de:"Wohnst du in Berlin?",en:"Do you live in Berlin?",parts:["Wohnst","du","in Berlin?"],cue:"Move the conjugated verb to the first position."},
  {id:"negative",title:"nicht: negate the statement",de:"Ich arbeite im Moment nicht.",en:"I am not working at the moment.",parts:["Ich","arbeite","im Moment nicht."],cue:"nicht is a negative word. Its position depends on what you negate; learn the whole model sentence."},
  {id:"kein",title:"kein: no / not a before a noun",de:"Ich habe keine Kinder.",en:"I have no children.",parts:["Ich","habe","keine Kinder."],cue:"Use kein with a noun that would have ein or no article. Plural: keine Kinder."},
  {id:"possessive",title:"mein / meine: match the noun",de:"Das ist meine Schwester.",en:"That is my sister.",parts:["Das","ist","meine Schwester."],cue:"In these subject forms: mein Vater, mein Kind; meine Mutter, meine Eltern. dein/deine works the same way."},
  {id:"profession",title:"A profession normally needs no article",de:"Ich bin Ärztin.",en:"I am a doctor.",parts:["Ich","bin","Ärztin."],cue:"Say Ich bin Lehrer / Lehrerin. English uses a; this ordinary German profession statement does not."},
  {id:"origin",title:"Origin and residence are different",de:"Ich komme aus dem Iran.",en:"I come from Iran.",parts:["Ich","komme","aus dem Iran."],cue:"Origin: kommen aus. Residence: wohnen in. See the country sheet for articles after aus."},
];
export const verbModels = [
  {verb:"sein",meaning:"to be",forms:["bin","bist","ist","sind","seid","sind"],tip:"Learn sein as a six-part rhythm: bin · bist · ist / sind · seid · sind."},
  {verb:"haben",meaning:"to have",forms:["habe","hast","hat","haben","habt","haben"],tip:"du and er/sie/es lose the b: hast, hat."},
  {verb:"heißen",meaning:"to be called",forms:["heiße","heißt","heißt","heißen","heißt","heißen"],tip:"The stem ends in ß. du heißt has no extra s."},
  {verb:"kommen",meaning:"to come",forms:["komme","kommst","kommt","kommen","kommt","kommen"],tip:"A regular pattern: -e, -st, -t, -en, -t, -en."},
  {verb:"wohnen",meaning:"to live / reside",forms:["wohne","wohnst","wohnt","wohnen","wohnt","wohnen"],tip:"Keep wohn- and change the ending. Wo wohnst du?"},
  {verb:"leben",meaning:"to live",forms:["lebe","lebst","lebt","leben","lebt","leben"],tip:"leben describes living; wohnen names where you reside."},
  {verb:"zusammenleben",meaning:"to live together",forms:["lebe zusammen","lebst zusammen","lebt zusammen","leben zusammen","lebt zusammen","leben zusammen"],tip:"In a simple main clause the prefix goes to the end: Wir leben zusammen."},
  {verb:"lernen",meaning:"to learn",forms:["lerne","lernst","lernt","lernen","lernt","lernen"],tip:"A regular model: Ich lerne Deutsch."},
  {verb:"machen",meaning:"to do / make",forms:["mache","machst","macht","machen","macht","machen"],tip:"Ich mache eine Ausbildung. Learn a useful whole sentence."},
  {verb:"arbeiten",meaning:"to work",forms:["arbeite","arbeitest","arbeitet","arbeiten","arbeitet","arbeiten"],tip:"An extra e makes the ending easier to say: arbeitest, arbeitet."},
  {verb:"sammeln",meaning:"to collect",forms:["sammle","sammelst","sammelt","sammeln","sammelt","sammeln"],tip:"ich sammle is common; ich sammele is also accepted. The plural ends in -n."},
  {verb:"studieren",meaning:"to study at university",forms:["studiere","studierst","studiert","studieren","studiert","studieren"],tip:"studieren means university study; lernen means learning more generally."},
  {verb:"glauben",meaning:"to think / believe",forms:["glaube","glaubst","glaubt","glauben","glaubt","glauben"],tip:"Ich glaube … introduces what you think or believe."},
  {verb:"planen",meaning:"to plan",forms:["plane","planst","plant","planen","plant","planen"],tip:"Regular endings: planen → du planst."},
  {verb:"sprechen",meaning:"to speak",forms:["spreche","sprichst","spricht","sprechen","sprecht","sprechen"],tip:"e → i only in du and er/sie/es: sprichst, spricht."},
  {verb:"gehen",meaning:"to go / be going",forms:["gehe","gehst","geht","gehen","geht","gehen"],tip:"Learn the greeting chunk Wie geht es dir? — How are you?"},
  {verb:"kosten",meaning:"to cost",forms:["koste","kostest","kostet","kosten","kostet","kosten"],tip:"For prices: one object kostet; several objects kosten."},
  {verb:"finden",meaning:"to find / have an opinion",forms:["finde","findest","findet","finden","findet","finden"],tip:"Extra e after d: findest, findet. Das finde ich auch."},
  {verb:"kennen",meaning:"to know / be familiar with",forms:["kenne","kennst","kennt","kennen","kennt","kennen"],tip:"Know a person or thing: Kennen Sie das Hotel?"},
  {verb:"schauen",meaning:"to look",forms:["schaue","schaust","schaut","schauen","schaut","schauen"],tip:"The useful request Schau mal! means Have a look!"},
  {verb:"shoppen",meaning:"to shop",forms:["shoppe","shoppst","shoppt","shoppen","shoppt","shoppen"],tip:"Keep the double p when you change the ending."},
];
export const verbPersons=["ich","du","er / sie / es","wir","ihr","sie / Sie"];
export function spokenVerb(index:number,form:string){return `${["ich","du","er","wir","ihr","sie"][index]} ${form}`;}
const units=["null","eins","zwei","drei","vier","fünf","sechs","sieben","acht","neun","zehn","elf","zwölf","dreizehn","vierzehn","fünfzehn","sechzehn","siebzehn","achtzehn","neunzehn"];
const tens=["","","zwanzig","dreißig","vierzig","fünfzig","sechzig","siebzig","achtzig","neunzig"];
export function germanNumber(value:number):string {
  if(!Number.isInteger(value)||value<0||value>1000000)throw new RangeError("Use a whole number from 0 to 1,000,000.");
  if(value===1000000)return "eine Million";
  if(value<20)return units[value]!;
  if(value<100)return value%10?`${value%10===1?"ein":units[value%10]}und${tens[Math.floor(value/10)]}`:tens[Math.floor(value/10)]!;
  if(value<1000)return `${Math.floor(value/100)===1?"ein":units[Math.floor(value/100)]}hundert${value%100?germanNumber(value%100):""}`;
  return `${Math.floor(value/1000)===1?"ein":germanNumber(Math.floor(value/1000))}tausend${value%1000?germanNumber(value%1000):""}`;
}
export function germanPrice(raw:string):string|null{
  if(!/^\d{1,4}(?:[,.]\d{1,2})?$/.test(raw.trim()))return null;
  const [whole,fraction=""]=raw.trim().split(/[,.]/);const euros=Number(whole),cents=Number(fraction.padEnd(2,"0"));
  const euroText=`${euros===1?"ein":germanNumber(euros)} Euro`;
  const centText=`${cents===1?"ein":germanNumber(cents)} Cent`;
  return euros===0&&cents>0?centText:cents===0?euroText:`${euroText} ${centText}`;
}
export const conversationFrames=[
  {id:"name",label:"Your name",casual:"Wie heißt du?",formal:"Wie heißen Sie?",en:"What is your name?",answer:"Ich heiße Sara.",answerEn:"My name is Sara.",cue:"heißen = to be called. Use a capital S in formal Sie."},
  {id:"origin",label:"Where from",casual:"Woher kommst du?",formal:"Woher kommen Sie?",en:"Where are you from?",answer:"Ich komme aus dem Iran.",answerEn:"I come from Iran.",cue:"Woher? → aus. Iran also allows aus Iran."},
  {id:"home",label:"Where you live",casual:"Wo wohnst du?",formal:"Wo wohnen Sie?",en:"Where do you live?",answer:"Ich wohne in Berlin.",answerEn:"I live in Berlin.",cue:"Wo? → in. Your home town and your origin can be different."},
  {id:"work",label:"Your work",casual:"Was bist du von Beruf?",formal:"Was sind Sie von Beruf?",en:"What do you do for a living?",answer:"Ich bin Ingenieurin.",answerEn:"I am an engineer.",cue:"No article in this ordinary profession statement."},
  {id:"age",label:"Your age",casual:"Wie alt bist du?",formal:"Wie alt sind Sie?",en:"How old are you?",answer:"Ich bin einundzwanzig Jahre alt.",answerEn:"I am twenty-one years old.",cue:"German uses sein for age: Ich bin … Jahre alt."},
  {id:"languages",label:"Your languages",casual:"Welche Sprachen sprichst du?",formal:"Welche Sprachen sprechen Sie?",en:"Which languages do you speak?",answer:"Ich spreche Persisch und ein bisschen Deutsch.",answerEn:"I speak Persian and a little German.",cue:"du sprichst has a vowel change. Formal Sie sprechen uses the infinitive-shaped form."},
  {id:"wellbeing",label:"How you are",casual:"Wie geht’s dir?",formal:"Wie geht’s Ihnen?",en:"How are you?",answer:"Gut, danke. Und dir?",formalAnswer:"Gut, danke. Und Ihnen?",answerEn:"Well, thank you. And you?",cue:"Use dir with du; use Ihnen with formal Sie."},
  {id:"family",label:"Introduce someone",casual:"Wer ist das?",formal:"Wer ist das?",en:"Who is that?",answer:"Das ist meine Schwester.",answerEn:"That is my sister.",cue:"Wer asks about a person. meine agrees with the feminine noun Schwester."},
];
export const spellingLetters=[...[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map(de=>({de,en:`Letter ${de}`})),{de:"Ä",en:"A with umlaut"},{de:"Ö",en:"O with umlaut"},{de:"Ü",en:"U with umlaut"},{de:"ß",en:"Eszett / sharp S"}];
export const sheetQuizzes:Record<ExtendedSheetId,SheetQuiz[]>={
  people:[
    {q:"___ Mutter",options:["der","die","das"],answer:"die",why:"die Mutter is feminine; her plural is die Mütter."},
    {q:"Several brothers",options:["die Bruder","die Brüder","die Brudern"],answer:"die Brüder",why:"Bruder → Brüder changes the vowel but adds no ending."},
    {q:"My sister: ___ Schwester",options:["mein","meine","meinen"],answer:"meine",why:"In this subject form, feminine Schwester takes meine."},
    {q:"One female doctor",options:["die Arztin","die Ärztin","das Ärztin"],answer:"die Ärztin",why:"Arzt → Ärztin adds both an umlaut and -in."},
    {q:"Ich bin ___ Lehrer.",options:["ein","der","— no article —"],answer:"— no article —",why:"Use Ich bin Lehrer for an ordinary statement of profession."},
    {q:"Die Eltern ___ in Berlin.",options:["wohnt","wohnen","wohnst"],answer:"wohnen",why:"Eltern is plural, so use wohnen."},
    {q:"Female teachers",options:["die Lehrerins","die Lehrerinnen","die Lehrerin"],answer:"die Lehrerinnen",why:"Feminine profession nouns in -in form their plural with -innen."},
    {q:"das Kind becomes …",options:["er","es","sie (singular)"],answer:"es",why:"The grammatical gender of Kind is neuter: das Kind → es."},
  ],
  verbs:[
    {q:"Du ___ Deutsch.",options:["spreche","sprichst","sprechen"],answer:"sprichst",why:"sprechen changes e to i in du sprichst and er/sie/es spricht."},
    {q:"Ihr ___ in Berlin.",options:["wohnen","wohnst","wohnt"],answer:"wohnt",why:"ihr takes the -t form: ihr wohnt."},
    {q:"Er ___ zwei Kinder.",options:["habt","hat","hast"],answer:"hat",why:"haben loses b in er hat."},
    {q:"A yes/no question",options:["Du wohnst in Berlin?","Wohnst du in Berlin?","Wo du wohnst?"],answer:"Wohnst du in Berlin?",why:"The basic yes/no question taught here begins with the verb."},
    {q:"Du ___ als Lehrer.",options:["arbeitst","arbeitest","arbeiten"],answer:"arbeitest",why:"The -t stem needs the extra e: arbeitest."},
    {q:"Ich habe ___ Kinder.",options:["nicht","keine","kein"],answer:"keine",why:"Negate the plural noun Kinder with keine."},
    {q:"Wir ___ zusammen.",options:["lebt","leben","lebst"],answer:"leben",why:"wir takes leben. zusammen comes at the end in this simple main clause."},
    {q:"Formal you: Sie ___ Ärztin.",options:["bist","seid","sind"],answer:"sind",why:"Formal Sie takes the plural-shaped verb form sind."},
  ],
  numbers:[
    {q:"21",options:["einsundzwanzig","einundzwanzig","zwanzigundeins"],answer:"einundzwanzig",why:"Say the one before the twenty: ein + und + zwanzig."},
    {q:"16",options:["sechszehn","sechzehn","sechzig"],answer:"sechzehn",why:"The s disappears in sechzehn."},
    {q:"30",options:["dreizig","dreißig","dreizehn"],answer:"dreißig",why:"Thirty is dreißig, with ß."},
    {q:"452",options:["vierhundertzweiundfünfzig","vierhundertfünfundzwanzig","zweihundertvierundfünfzig"],answer:"vierhundertzweiundfünfzig",why:"400 first, then 2-and-50."},
    {q:"1,00 €",options:["eins Euro","ein Euro","eine Euro"],answer:"ein Euro",why:"Before Euro, say ein rather than standalone eins."},
    {q:"0,50 €",options:["fünfzig Euro","fünf Cent","fünfzig Cent"],answer:"fünfzig Cent",why:"The decimal comma separates euros and cents."},
    {q:"1.000.000",options:["ein million","eine Million","eins Million"],answer:"eine Million",why:"Million is a feminine noun with a capital M."},
    {q:"A telephone number starts 017…",options:["null eins sieben","siebzehn","einhundertsieben"],answer:"null eins sieben",why:"Say phone digits separately and keep the initial zero."},
  ],
  conversation:[
    {q:"Ask WHERE FROM",options:["Wo wohnst du?","Woher kommst du?","Wer ist das?"],answer:"Woher kommst du?",why:"Woher asks about origin; wo asks about location."},
    {q:"Formal: What is your name?",options:["Wie heißt du?","Wie heißen Sie?","Wer heißen Sie?"],answer:"Wie heißen Sie?",why:"Formal Sie uses heißen, and Sie keeps its capital S."},
    {q:"Reply to Wie geht’s dir?",options:["Gut, danke.","Ich bin Lehrer.","Aus dem Iran."],answer:"Gut, danke.",why:"The question asks how you are feeling."},
    {q:"Introduce your sister",options:["Das ist mein Schwester.","Das ist meine Schwester.","Das sind meine Schwester."],answer:"Das ist meine Schwester.",why:"Schwester is feminine and singular: meine Schwester, ist."},
    {q:"Good night",options:["Guten Nacht!","Gute Nacht!","Gute Abend!"],answer:"Gute Nacht!",why:"Learn this whole greeting: Gute Nacht!"},
    {q:"You DO live in Berlin. Reply to Wohnst du nicht in Berlin?",options:["Doch, ich wohne in Berlin.","Nein, ich wohne in Berlin.","Bitte, ich wohne in Berlin."],answer:"Doch, ich wohne in Berlin.",why:"Doch contradicts the negative assumption."},
    {q:"Formal: And you? after asking how someone is",options:["Und dir?","Und Ihnen?","Und Sie dir?"],answer:"Und Ihnen?",why:"Use Ihnen in the formal wellbeing exchange."},
    {q:"Ask someone to spell their name",options:["Wie schreibt man das?","Wie alt ist das?","Wo wohnt das?"],answer:"Wie schreibt man das?",why:"This asks how something is written; it is useful for names and spelling."},
  ],
};
