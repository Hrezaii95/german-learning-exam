import {germanNumber} from './sheet-topics';
export const weekDays=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'] as const;
export const weekDaysEnglish=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] as const;
export const dayParts=[{de:'am Morgen',en:'in the morning'},{de:'am Vormittag',en:'in the morning (before noon)'},{de:'am Mittag',en:'at midday'},{de:'am Nachmittag',en:'in the afternoon'},{de:'am Abend',en:'in the evening'},{de:'in der Nacht',en:'at night'}] as const;
export const timePlaces=[
 {de:'das Kino',to:'ins Kino',en:'the cinema',tone:'neuter'},
 {de:'das Museum',to:'ins Museum',en:'the museum',tone:'neuter'},
 {de:'das Theater',to:'ins Theater',en:'the theatre',tone:'neuter'},
 {de:'das Café',to:'ins Café',en:'the cafe',tone:'neuter'},
 {de:'das Schwimmbad',to:'ins Schwimmbad',en:'the swimming pool',tone:'neuter'},
 {de:'das Konzert',to:'ins Konzert',en:'the concert',tone:'neuter'},
 {de:'das Restaurant',to:'ins Restaurant',en:'the restaurant',tone:'neuter'},
 {de:'das Fitnessstudio',to:'ins Fitnessstudio',en:'the gym',tone:'neuter'},
 {de:'die Ausstellung',to:'in eine Ausstellung',en:'an exhibition',tone:'female'},
 {de:'die Disco',to:'in eine Disco',en:'a disco',tone:'female'},
 {de:'die Bar',to:'in eine Bar',en:'a bar',tone:'female'},
 {de:'der Klub',to:'in einen Klub',en:'a club',tone:'male'},
] as const;
export type ClockMode='official'|'everyday';
export const clockMinutes=Array.from({length:12},(_,i)=>i*5);
export const clockHours=Array.from({length:24},(_,i)=>i);
function checkTime(hour:number,minute:number){if(!Number.isInteger(hour)||hour<0||hour>23||!Number.isInteger(minute)||minute<0||minute>55||minute%5!==0)throw new RangeError('Choose an hour from 0 to 23 and minutes in five-minute steps.');}
export function clockWords(hour:number,minute:number,mode:ClockMode):string{
 checkTime(hour,minute);
 if(mode==='official')return `${hour===1?'ein':germanNumber(hour)} Uhr${minute?' '+germanNumber(minute):''}`;
 const h=hour%12||12,next=(hour+1)%12||12;
 const now=germanNumber(h),then=germanNumber(next);
 if(minute===0)return `${h===1?'ein':now} Uhr`;
 if(minute===15)return `Viertel nach ${now}`;
 if(minute===25)return `fünf vor halb ${then}`;
 if(minute===30)return `halb ${then}`;
 if(minute===35)return `fünf nach halb ${then}`;
 if(minute===45)return `Viertel vor ${then}`;
 return minute<30?`${germanNumber(minute)} nach ${now}`:`${germanNumber(60-minute)} vor ${then}`;
}
export function clockSentence(hour:number,minute:number,mode:ClockMode){return `Es ist ${clockWords(hour,minute,mode)}.`;}
export function digitalTime(hour:number,minute:number){checkTime(hour,minute);return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;}
export function clockMeaning(hour:number,minute:number,mode:ClockMode){const digital=digitalTime(hour,minute);return mode==='official'?`It is ${digital}.`:`It is ${digitalTime(hour%12,minute)} or ${digitalTime(hour%12+12,minute)}, depending on context.`;}
export function planParts(day:number,place:number,timeFirst:boolean){const d=weekDays[day]!,p=timePlaces[place]!;return timeFirst?[`Am ${d}`,'gehen','wir',p.to+'.']:['Wir','gehen',`am ${d}`,p.to+'.'];}
export function planSentence(day:number,place:number,timeFirst:boolean){return planParts(day,place,timeFirst).join(' ');}
export function planMeaning(day:number,place:number){return `We are going to ${timePlaces[place]!.en} on ${weekDaysEnglish[day]}.`;}
export const timeSpeech=[
 ...clockHours.flatMap(h=>clockMinutes.flatMap(m=>(['official','everyday'] as const).map(mode=>clockSentence(h,m,mode)))),
 ...weekDays.flatMap((_,d)=>timePlaces.flatMap((_,p)=>[false,true].map(front=>planSentence(d,p,front)))),
 ...timePlaces.map(p=>`Gehen wir ${p.to}?`),
 ...dayParts.map(p=>p.de),...weekDays.map(d=>`am ${d}`),
 'am Wochenende','um vier','heute Abend','in der Nacht','Wie spät ist es?','Wie viel Uhr ist es?',
 'Ich habe am Montag Zeit.','Am Montag habe ich Zeit.','Gute Idee!','Tut mir leid, ich habe keine Zeit.','Das weiß ich noch nicht.',
];

// These two clock sentences already have stable IDs in the Lesson 8 phrase deck.
const clockPhraseIds:Record<string,string>={'Es ist halb vier.':'l8-phrase-13','Es ist fünfzehn Uhr fünfzehn.':'l8-phrase-14'};
export function clockSaveId(hour:number,minute:number,mode:ClockMode){return clockPhraseIds[clockSentence(hour,minute,mode)]??`l8-clock-${mode==='everyday'?hour%12:hour}-${minute}-${mode}`;}
