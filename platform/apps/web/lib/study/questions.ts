export type QuestionWord = {
  id:string;word:string;meaning:string;cue:string;icon:string;
  question:string;translation:string;answer:string;answerMeaning:string;
  lesson:number|null;sourceLabel?:string;family:"person"|"place"|"detail"|"time"|"reason";
};
/** Core membership advances with source-checked lessons; extension items remain labelled separately. */
export const questionWords:QuestionWord[]=[
  {id:"wer",word:"Wer?",meaning:"Who?",cue:"A person: put a face in the answer.",icon:"☺",question:"Wer ist das?",translation:"Who is that?",answer:"Das ist meine Schwester.",answerMeaning:"That is my sister.",lesson:1,family:"person"},
  {id:"was",word:"Was?",meaning:"What?",cue:"A thing, an activity or a role. Learn Was … von Beruf? as a whole question.",icon:"◇",question:"Was bist du von Beruf?",translation:"What do you do for a living?",answer:"Ich bin Ingenieur.",answerMeaning:"I am an engineer.",lesson:2,family:"detail"},
  {id:"wie",word:"Wie?",meaning:"How?",cue:"German asks HOW you are called: Wie heißt du? English asks WHAT your name is.",icon:"≈",question:"Wie heißt du?",translation:"What is your name?",answer:"Ich heiße Sara.",answerMeaning:"My name is Sara.",lesson:1,family:"detail"},
  {id:"wo",word:"Wo?",meaning:"Where?",cue:"A location: imagine a pin standing still.",icon:"●",question:"Wo wohnst du?",translation:"Where do you live?",answer:"Ich wohne in Berlin.",answerMeaning:"I live in Berlin.",lesson:2,family:"place"},
  {id:"woher",word:"Woher?",meaning:"Where from?",cue:"Origin: draw an arrow FROM the starting point. kommen aus …",icon:"↗",question:"Woher kommst du?",translation:"Where are you from?",answer:"Ich komme aus dem Iran.",answerMeaning:"I come from Iran.",lesson:1,family:"place"},
  {id:"wie-alt",word:"Wie alt?",meaning:"How old?",cue:"Ask for age. German answers with sein: Ich bin … Jahre alt.",icon:"#",question:"Wie alt bist du?",translation:"How old are you?",answer:"Ich bin 26 Jahre alt.",answerMeaning:"I am 26 years old.",lesson:2,family:"detail"},
  {id:"wie-viel",word:"Wie viel?",meaning:"How much?",cue:"An amount or price. The whole phrase takes the first position.",icon:"€",question:"Wie viel kostet der Stuhl?",translation:"How much does the chair cost?",answer:"Der Stuhl kostet 59 Euro.",answerMeaning:"The chair costs 59 euros.",lesson:4,family:"detail"},
  {id:"wie-viele",word:"Wie viele?",meaning:"How many?",cue:"Count plural things: wie viele Kinder? Notice the final -e. The workbook uses wie viele in the Module 1 review.",icon:"•••",question:"Wie viele Kinder hast du?",translation:"How many children do you have?",answer:"Ich habe zwei Kinder.",answerMeaning:"I have two children.",lesson:3,sourceLabel:"Module 1 review",family:"detail"},
  {id:"welche",word:"Welche?",meaning:"Which?",cue:"Choose from a set. Welche Sprachen? uses the plural form welche.",icon:"☷",question:"Welche Sprachen sprichst du?",translation:"Which languages do you speak?",answer:"Ich spreche Deutsch und Persisch.",answerMeaning:"I speak German and Persian.",lesson:3,family:"detail"},
  {id:"wohin",word:"Wohin?",meaning:"Where to?",cue:"Destination: draw an arrow TO the finish. nach Berlin, not aus Berlin.",icon:"→",question:"Wohin gehst du?",translation:"Where are you going?",answer:"Ich gehe nach Hause.",answerMeaning:"I am going home.",lesson:null,family:"place"},
  {id:"wie-spaet",word:"Wie spät?",meaning:"What time?",cue:"Read a clock. Also ask Wie viel Uhr ist es?",icon:"◷",question:"Wie spät ist es?",translation:"What time is it?",answer:"Es ist halb vier.",answerMeaning:"It is half past three.",lesson:8,family:"time"},
  {id:"wann",word:"Wann?",meaning:"When?",cue:"A point in time: put a dot on a calendar.",icon:"◷",question:"Wann hast du Zeit?",translation:"When do you have time?",answer:"Am Montag habe ich Zeit.",answerMeaning:"I have time on Monday.",lesson:8,family:"time"},
  {id:"wie-lange",word:"Wie lange?",meaning:"How long?",cue:"Duration: draw a line between a start and an end.",icon:"↔",question:"Wie lange bleibst du?",translation:"How long are you staying?",answer:"Ich bleibe drei Tage.",answerMeaning:"I am staying for three days.",lesson:null,family:"time"},
  {id:"wie-oft",word:"Wie oft?",meaning:"How often?",cue:"Frequency: immer → oft → manchmal → nie. Keep frequency separate from ability.",icon:"↻",question:"Wie oft spielst du Tennis?",translation:"How often do you play tennis?",answer:"Ich spiele manchmal Tennis.",answerMeaning:"I sometimes play tennis.",lesson:7,family:"time"},
  {id:"warum",word:"Warum?",meaning:"Why?",cue:"Ask for a reason. A short reason is enough while you learn longer clauses.",icon:"?",question:"Warum lernst du Deutsch?",translation:"Why are you learning German?",answer:"Für meine Arbeit.",answerMeaning:"For my work.",lesson:null,family:"reason"},
  {id:"wen",word:"Wen?",meaning:"Whom? · direct object",cue:"The person receiving the action in an accusative pattern: Wen siehst du?",icon:"→☺",question:"Wen siehst du?",translation:"Whom do you see?",answer:"Ich sehe meinen Bruder.",answerMeaning:"I see my brother.",lesson:null,family:"person"},
  {id:"wem",word:"Wem?",meaning:"Whom? · dative",cue:"Use with a dative verb or preposition. helfen takes dative: Wem hilfst du?",icon:"⇢☺",question:"Wem hilfst du?",translation:"Whom are you helping?",answer:"Ich helfe meiner Schwester.",answerMeaning:"I am helping my sister.",lesson:null,family:"person"},
  {id:"wessen",word:"Wessen?",meaning:"Whose?",cue:"Ownership: attach a name label to the object.",icon:"⌑",question:"Wessen Buch ist das?",translation:"Whose book is that?",answer:"Das ist Saras Buch.",answerMeaning:"That is Sara’s book.",lesson:null,family:"person"},
];
export const questionBuilders=[
  {id:"preferences",title:"Food preferences",lesson:9,w:["Was","magst","du?"],formal:["Was","mögen","Sie?"],yes:["Magst","du","Tee?"],yesFormal:["Mögen","Sie","Tee?"],meaning:"What do you like?",yesMeaning:"Do you like tea?",answer:"Ich mag Tee.",answerMeaning:"I like tea."},
  {id:"availability",title:"Make a plan",lesson:8,w:["Wann","hast","du Zeit?"],formal:["Wann","haben","Sie Zeit?"],yes:["Hast","du","am Samstag Zeit?"],yesFormal:["Haben","Sie","am Samstag Zeit?"],meaning:"When do you have time?",yesMeaning:"Do you have time on Saturday?",answer:"Am Samstag habe ich Zeit.",answerMeaning:"I have time on Saturday."},
  {id:"ability",title:"What you can do",lesson:7,w:["Was","kannst","du gut?"],formal:["Was","können","Sie gut?"],yes:["Kannst","du","gut schwimmen?"],yesFormal:["Können","Sie","gut schwimmen?"],meaning:"What can you do well?",yesMeaning:"Can you swim well?",answer:"Ich kann gut schwimmen.",answerMeaning:"I can swim well."},
  {id:"objects",title:"Name an object",lesson:5,w:["Was","ist","das?"],formal:["Was","ist","das?"],yes:["Ist","das","ein Buch?"],yesFormal:["Ist","das","ein Buch?"],meaning:"What is that?",yesMeaning:"Is that a book?",answer:"Das ist ein Buch.",answerMeaning:"That is a book."},
  {id:"office",title:"What you need",lesson:6,w:["Was","brauchst","du?"],formal:["Was","brauchen","Sie?"],yes:["Brauchst","du","einen Stift?"],yesFormal:["Brauchen","Sie","einen Stift?"],meaning:"What do you need?",yesMeaning:"Do you need a pen?",answer:"Ich brauche einen Stift.",answerMeaning:"I need a pen."},
  {id:"home",title:"Where you live",lesson:2,w:["Wo","wohnst","du?"],formal:["Wo","wohnen","Sie?"],yes:["Wohnst","du","in Berlin?"],yesFormal:["Wohnen","Sie","in Berlin?"],meaning:"Where do you live?",yesMeaning:"Do you live in Berlin?",answer:"Ich wohne in Berlin.",answerMeaning:"I live in Berlin."},
  {id:"origin",title:"Where you are from",lesson:1,w:["Woher","kommst","du?"],formal:["Woher","kommen","Sie?"],yes:["Kommst","du","aus dem Iran?"],yesFormal:["Kommen","Sie","aus dem Iran?"],meaning:"Where are you from?",yesMeaning:"Are you from Iran?",answer:"Ich komme aus dem Iran.",answerMeaning:"I come from Iran."},
  {id:"age",title:"How old you are",lesson:2,w:["Wie alt","bist","du?"],formal:["Wie alt","sind","Sie?"],yes:["Bist","du","26 Jahre alt?"],yesFormal:["Sind","Sie","26 Jahre alt?"],meaning:"How old are you?",yesMeaning:"Are you 26 years old?",answer:"Ich bin 26 Jahre alt.",answerMeaning:"I am 26 years old."},
  {id:"price",title:"The price",lesson:4,w:["Wie viel","kostet","der Stuhl?"],formal:["Wie viel","kostet","der Stuhl?"],yes:["Kostet","der Stuhl","59 Euro?"],yesFormal:["Kostet","der Stuhl","59 Euro?"],meaning:"How much does the chair cost?",yesMeaning:"Does the chair cost 59 euros?",answer:"Der Stuhl kostet 59 Euro.",answerMeaning:"The chair costs 59 euros."},
];
export function questionWordLessons(word:QuestionWord):number[]{
  const membership:Record<string,number[]>={wer:[1,3,7],was:[2,4,5,6,7,9],wie:[1,2,3,4,5],wo:[2,6],woher:[1,2,3],"wie-alt":[2,3],"wie-viel":[4,5,6,9],"wie-viele":[3,6],welche:[3,5,6]};
  return membership[word.id]??(word.lesson?[word.lesson]:[1,2,3,4,5,6,7,8,9]);
}
export const questionReplyCases=[
  {question:"Kommst du aus dem Iran?",translation:"Are you from Iran?",yes:"Ja, ich komme aus dem Iran.",no:"Nein, ich komme aus Deutschland.",yesMeaning:"Yes, I come from Iran.",noMeaning:"No, I come from Germany.",cue:"An ordinary yes/no question: ja confirms it; nein rejects it."},
  {question:"Kommst du nicht aus dem Iran?",translation:"Aren’t you from Iran?",yes:"Doch, ich komme aus dem Iran.",no:"Nein, ich komme nicht aus dem Iran.",yesMeaning:"Actually yes, I come from Iran.",noMeaning:"No, I do not come from Iran.",cue:"DOCH pushes back against NOT. NEIN confirms the negative. Say the full sentence to make your meaning clear."},
];
export const questionQuiz=[
  {q:"You want a person’s name: ___ heißt du?",options:["Wie","Wer","Wo"],answer:"Wie",why:"Wie heißt du? literally asks how you are called. Keep this whole phrase together."},
  {q:"Origin: ___ kommst du?",options:["Wo","Woher","Wohin"],answer:"Woher",why:"Woher asks where FROM. Ich komme aus dem Iran."},
  {q:"Location: ___ wohnst du?",options:["Woher","Wohin","Wo"],answer:"Wo",why:"Wo asks where you live, a location. Ich wohne in Berlin."},
  {q:"Choose the standard verb-first yes/no question.",options:["Du wohnst in Berlin?","Wohnst du in Berlin?","Wo du wohnst?"],answer:"Wohnst du in Berlin?",why:"The standard yes/no question starts with the conjugated verb. Rising-intonation statement questions exist, but this is the basic pattern to learn."},
  {q:"Count people: Wie ___ Kinder hast du?",options:["viel","viele","alt"],answer:"viele",why:"Kinder is a countable plural: wie viele Kinder. For a price, ask wie viel."},
  {q:"Formal address: Wo ___ Sie?",options:["wohnst","wohnt","wohnen"],answer:"wohnen",why:"Formal Sie takes wohnen and a capital S. Informal du takes wohnst."},
  {q:"Kommst du nicht aus dem Iran? You ARE from Iran.",options:["Doch, ich komme aus dem Iran.","Nein, ich komme nicht aus dem Iran.","Woher komme ich?"],answer:"Doch, ich komme aus dem Iran.",why:"Doch contradicts the negative assumption: actually yes, I am from Iran."},
  {q:"How many first-position blocks are in Wie viel kostet der Stuhl?",options:["One: Wie viel","Two: Wie + viel","None"],answer:"One: Wie viel",why:"Count sentence parts, not individual words. Wie viel is one question phrase; kostet comes next."},
];
export function questionSpeechTexts():string[]{
  return [...new Set([
    ...questionWords.flatMap(w=>[w.word,w.question,w.answer]),
    ...questionBuilders.flatMap(b=>[b.w.join(" "),b.formal.join(" "),b.yes.join(" "),b.yesFormal.join(" "),b.answer]),
    ...questionReplyCases.flatMap(c=>[c.question,c.yes,c.no]),
    "Wer kommt aus dem Iran?","Welche Sprache sprichst du?","Welcher Tisch ist schön?","Welches Buch ist das?",
  ])];
}
