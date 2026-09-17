export const pastPeople=[{de:'ich',en:'I',have:'habe'},{de:'du',en:'you',have:'hast'},{de:'er',en:'he',have:'hat'},{de:'wir',en:'we',have:'haben'},{de:'ihr',en:'you',have:'habt'},{de:'Sie',en:'you',have:'haben'}] as const;
export const pastActivities=[
 {verb:'arbeiten',part:'gearbeitet',detail:'',past:'worked',base:'work',group:'regular'},
 {verb:'machen',part:'gemacht',detail:'einen Spaziergang',past:'went for a walk',base:'go for a walk',group:'regular'},
 {verb:'kochen',part:'gekocht',detail:'Nudeln',past:'cooked noodles',base:'cook noodles',group:'regular'},
 {verb:'lernen',part:'gelernt',detail:'Deutsch',past:'studied German',base:'study German',group:'regular'},
 {verb:'lesen',part:'gelesen',detail:'Zeitung',past:'read the newspaper',base:'read the newspaper',group:'strong'},
 {verb:'trinken',part:'getrunken',detail:'Kaffee',past:'drank coffee',base:'drink coffee',group:'strong'},
 {verb:'schreiben',part:'geschrieben',detail:'Nachrichten',past:'wrote messages',base:'write messages',group:'strong'},
 {verb:'schlafen',part:'geschlafen',detail:'lange',past:'slept for a long time',base:'sleep for a long time',group:'strong'},
 {verb:'waschen',part:'gewaschen',detail:'Wäsche',past:'did the laundry',base:'do the laundry',group:'strong'},
 {verb:'aufräumen',part:'aufgeräumt',detail:'den Schreibtisch',past:'tidied the desk',base:'tidy the desk',group:'separable'},
 {verb:'einkaufen',part:'eingekauft',detail:'Brot',past:'bought bread',base:'buy bread',group:'separable'},
 {verb:'einladen',part:'eingeladen',detail:'Freunde',past:'invited friends',base:'invite friends',group:'separable'},
 {verb:'fernsehen',part:'ferngesehen',detail:'',past:'watched television',base:'watch television',group:'separable'},
 {verb:'abwaschen',part:'abgewaschen',detail:'',past:'washed the dishes',base:'wash the dishes',group:'separable'},
 {verb:'telefonieren',part:'telefoniert',detail:'lange',past:'talked on the phone for a long time',base:'talk on the phone for a long time',group:'ieren'},
 {verb:'fotografieren',part:'fotografiert',detail:'Vögel',past:'photographed birds',base:'photograph birds',group:'ieren'},
] as const;
export const pastGroups=[{id:'regular',label:'ge- … -t',cue:'Two bookends',example:'ge-mach-t',note:'Regular verbs often use ge- and -t. After some stems use -et: gearbeitet, gechattet.'},{id:'strong',label:'ge- … -en',cue:'Learn the new middle',example:'ge-trunk-en',note:'Many strong verbs end in -en; the vowel may change. Learn the complete participle.'},{id:'separable',label:'prefix + ge- …',cue:'Ge goes inside',example:'ein-ge-kauft',note:'The separable prefix comes first. Ge follows it. Keep the whole participle together at the end.'},{id:'ieren',label:'-iert',cue:'No ge!',example:'telefon-iert',note:'Verbs ending in -ieren have no ge- in the participle.'}] as const;
export const pastModes=[{id:'statement',label:'Person first'},{id:'time-first',label:'Yesterday first'},{id:'question',label:'Yes / no question'}] as const;
export type PastMode=typeof pastModes[number]['id'];
const capital=(s:string)=>s[0]!.toLocaleUpperCase('de')+s.slice(1);
export function pastParts(activity:number,person:number,mode:PastMode){
 const a=pastActivities[activity],p=pastPeople[person];if(!a||!p)throw new RangeError('Choose an available activity and person.');
 const part=(text:string,role:string)=>({text,role});
 const start=mode==='question'?[part(capital(p.have),'auxiliary'),part(p.de,'person'),part('gestern','time')]:mode==='time-first'?[part('Gestern','time'),part(p.have,'auxiliary'),part(p.de,'person')]:[part(capital(p.de),'person'),part(p.have,'auxiliary'),part('gestern','time')];
 return [...start,...(a.detail?[part(a.detail,'detail')]:[]),part(a.part,'participle')];
}
export function pastSentence(a:number,p:number,m:PastMode){return pastParts(a,p,m).map(x=>x.text).join(' ')+(m==='question'?'?':'.');}
export function pastMeaning(activity:number,person:number,mode:PastMode){const a=pastActivities[activity],p=pastPeople[person];if(!a||!p)throw new RangeError('Choose an available activity and person.');return mode==='question'?`Did ${p.en} ${a.base} yesterday?`:mode==='time-first'?`Yesterday ${p.en} ${a.past}.`:`${capital(p.en)} ${a.past} yesterday.`;}
const shared:Record<string,string>={'Ich habe gestern gearbeitet.':'l11-phrase-1','Hast du gestern lange geschlafen?':'l11-phrase-10'};
export function pastSaveId(a:number,p:number,m:PastMode){return shared[pastSentence(a,p,m)]??`l11-past-${a}-${p}-${m}`;}
export const openingHours=[{id:'point',de:'Der Kurs beginnt um acht Uhr.',en:'The course starts at eight.',label:'um',cue:'One clock time',start:8,end:8},{id:'interval',de:'Die Praxis ist von acht bis dreizehn Uhr geöffnet.',en:'The practice is open from eight until one p.m.',label:'von … bis',cue:'Start AND end',start:8,end:13},{id:'start',de:'Die Praxis ist ab acht Uhr geöffnet.',en:'The practice is open from eight onward.',label:'ab',cue:'Start; no end stated',start:8,end:null}] as const;
export const lastTimeChunks=[{de:'letzten Samstag',article:'der Samstag',tone:'male',en:'last Saturday'},{de:'letztes Wochenende',article:'das Wochenende',tone:'neuter',en:'last weekend'},{de:'letzte Woche',article:'die Woche',tone:'female',en:'last week'},{de:'letztes Jahr',article:'das Jahr',tone:'neuter',en:'last year'}] as const;
export const pastSpeech=[...pastActivities.flatMap((a,i)=>[a.part,...pastPeople.flatMap((_,p)=>pastModes.map(m=>pastSentence(i,p,m.id)))]),...openingHours.map(h=>h.de),...lastTimeChunks.map(c=>c.de),'Was hast du gestern gemacht?','Wann ist die Praxis geöffnet?','Ab wann ist die Praxis wieder geöffnet?'];
