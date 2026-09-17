export const officeModels=[
 {de:"der Kalender",noun:"Kalender",plural:"Kalender",meaning:"calendar",gender:"male"},
 {de:"das Tablet",noun:"Tablet",plural:"Tablets",meaning:"tablet",gender:"neuter"},
 {de:"die Maus",noun:"Maus",plural:"Mäuse",meaning:"mouse",gender:"female"},
 {de:"der Stift",noun:"Stift",plural:"Stifte",meaning:"pen",gender:"male"},
 {de:"das Passwort",noun:"Passwort",plural:"Passwörter",meaning:"password",gender:"neuter"},
 {de:"die Nachricht",noun:"Nachricht",plural:"Nachrichten",meaning:"message",gender:"female"},
 {de:"der Drucker",noun:"Drucker",plural:"Drucker",meaning:"printer",gender:"male"},
] as const;
export type OfficeMode="identify"|"have"|"need"|"find";
export function officeSentence(index:number,mode:OfficeMode,negative:boolean,plural:boolean){
 const item=officeModels[index]??officeModels[0];
 const masculine=item.gender==="male",feminine=item.gender==="female";
 const article=plural?(negative?"keine":""):(negative?"k":"")+(feminine?"eine":masculine&&mode!=="identify"?"einen":"ein");
 const prefix=mode==="identify"?(plural?"Das sind":"Das ist"):mode==="have"?"Ich habe":mode==="need"?"Ich brauche":"Ich suche";
 return `${prefix} ${article?article+" ":""}${plural?item.plural:item.noun}.`;
}
export function officeMeaning(index:number,mode:OfficeMode,negative:boolean,plural:boolean){
 const item=officeModels[index]??officeModels[0];
 const pluralNames:Record<string,string>={calendar:"calendars",tablet:"tablets",mouse:"mice",pen:"pens",password:"passwords",message:"messages",printer:"printers"};
 const noun=plural?pluralNames[item.meaning]:`a ${item.meaning}`;
 if(mode==="identify")return `${plural?"These are":"This is"}${negative?" not":""} ${noun}.`;
 if(mode==="find")return `I am ${negative?"not ":""}looking for ${plural&&negative?"any ":""}${noun}.`;
 return `I ${negative?"do not ":""}${mode==="have"?"have":"need"} ${plural&&negative?"any ":""}${noun}.`;
}
export const pluralFamilies=[
 {ending:"-(e)n",example:"Nachricht → Nachrichten",cue:"Add n or en. Many feminine nouns follow this trail."},
 {ending:"-s",example:"Tablet → Tablets",cue:"A short s. Often used for borrowed words."},
 {ending:"-e / -̈e",example:"Stift → Stifte · Maus → Mäuse",cue:"Add e; some words also change their vowel."},
 {ending:"-er / -̈er",example:"Passwort → Passwörter",cue:"Add er; remember the umlaut with the word."},
 {ending:"– / -̈",example:"Drucker → Drucker · Vater → Väter",cue:"No ending. Some nouns still change their vowel."},
] as const;
export const phoneSteps=[
 {speaker:"Receiver",de:"Firma Weber, hier ist Sara Rahimi. Guten Tag.",en:"Weber company, Sara Rahimi speaking. Hello."},
 {speaker:"Caller",de:"Guten Tag, mein Name ist Tom Berger.",en:"Hello, my name is Tom Berger."},
 {speaker:"Receiver",de:"Was kann ich für Sie tun?",en:"How can I help you?"},
 {speaker:"Caller",de:"Ist Frau Müller da?",en:"Is Ms Müller there?"},
 {speaker:"Receiver",de:"Einen Moment bitte. Frau Müller ist leider nicht da.",en:"One moment, please. Unfortunately, Ms Müller is not here."},
 {speaker:"Caller",de:"Vielen Dank. Auf Wiederhören.",en:"Thank you very much. Goodbye."},
 {speaker:"Receiver",de:"Sehr gern. Auf Wiederhören.",en:"You are welcome. Goodbye."},
];
export const officeSheetSpeech=[...officeModels.flatMap((_,i)=>(["identify","have","need","find"] as const).flatMap(mode=>[false,true].flatMap(negative=>[false,true].map(plural=>officeSentence(i,mode,negative,plural))))),...phoneSteps.map(p=>p.de),...pluralFamilies.map(p=>p.example),"Wo ist der Kalender?","Ich habe den Kalender.","Wo ist das Tablet?","Ich habe das Tablet.","Wo ist die Maus?","Ich habe die Maus.","Wo sind die Stifte?","Ich habe die Stifte."];
