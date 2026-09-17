export const hobbyModels=[
 {id:"swim",de:"schwimmen",en:"swim",ing:"swimming",icon:"🏊",forms:["schwimme","schwimmst","schwimmt","schwimmen","schwimmt","schwimmen"],tail:""},
 {id:"cook",de:"kochen",en:"cook",ing:"cooking",icon:"🍳",forms:["koche","kochst","kocht","kochen","kocht","kochen"],tail:""},
 {id:"dance",de:"tanzen",en:"dance",ing:"dancing",icon:"💃",forms:["tanze","tanzt","tanzt","tanzen","tanzt","tanzen"],tail:""},
 {id:"sing",de:"singen",en:"sing",ing:"singing",icon:"🎤",forms:["singe","singst","singt","singen","singt","singen"],tail:""},
 {id:"read",de:"lesen",en:"read",ing:"reading",icon:"📖",forms:["lese","liest","liest","lesen","lest","lesen"],tail:""},
 {id:"cycle",de:"Rad fahren",en:"cycle",ing:"cycling",icon:"🚲",forms:["fahre","fährst","fährt","fahren","fahrt","fahren"],tail:"Rad"},
 {id:"ride",de:"reiten",en:"ride a horse",ing:"horse riding",icon:"🏇",forms:["reite","reitest","reitet","reiten","reitet","reiten"],tail:""},
 {id:"guitar",de:"Gitarre spielen",en:"play the guitar",ing:"playing the guitar",icon:"🎸",forms:["spiele","spielst","spielt","spielen","spielt","spielen"],tail:"Gitarre"},
] as const;
export const hobbyPeople=[{de:"ich",en:"I",modal:"kann"},{de:"du",en:"you",modal:"kannst"},{de:"er",en:"he",modal:"kann"},{de:"wir",en:"we",modal:"können"},{de:"ihr",en:"you (plural)",modal:"könnt"},{de:"Sie",en:"you (formal)",modal:"können"}] as const;
export const abilityLevels=[{de:"sehr gut",en:"very well"},{de:"gut",en:"well"},{de:"ein bisschen",en:"a little"},{de:"nicht so gut",en:"not very well"},{de:"gar nicht",en:"not at all"}] as const;
export const frequencyWords=[{de:"immer",en:"always"},{de:"oft",en:"often"},{de:"manchmal",en:"sometimes"},{de:"nie",en:"never"}] as const;
const capitalize=(s:string)=>s[0]!.toLocaleUpperCase('de')+s.slice(1);
export function abilityParts(hobby:number,person:number,level:number,question:boolean):string[]{
 const h=hobbyModels[hobby]!,p=hobbyPeople[person]!,a=abilityLevels[level]!;
 const verb=h.de.split(' ').at(-1)!;
 const middle=[a.de,h.tail].filter(Boolean).join(' ');
 return question?[capitalize(p.modal),p.de,middle,verb+'?']:[capitalize(p.de),p.modal,middle,verb+'.'];
}
export function abilitySentence(hobby:number,person:number,level:number,question:boolean){return abilityParts(hobby,person,level,question).join(' ');}
export function abilityMeaning(hobby:number,person:number,level:number,question:boolean){
 const h=hobbyModels[hobby]!,p=hobbyPeople[person]!,a=abilityLevels[level]!;
 // Negated questions retain their literal negative meaning without implying an answer.
 const neg=level>=3,skill=level===3?'very well':level===4?'at all':a.en;
 return question?`Can ${p.en} ${neg?'not ':''}${h.en} ${skill}?`:`${capitalize(p.en)} ${neg?'cannot':'can'} ${h.en} ${skill}.`;
}
export function frequencySentence(hobby:number,frequency:number){const h=hobbyModels[hobby]!;return ['Ich',h.forms[0],frequencyWords[frequency]!.de,h.tail].filter(Boolean).join(' ')+'.';}
export function frequencyMeaning(hobby:number,frequency:number){return `I ${frequencyWords[frequency]!.en} ${hobbyModels[hobby]!.en}.`;}
export const hobbiesSpeech=[...hobbyModels.flatMap((h,i)=>[...hobbyPeople.flatMap((_,p)=>abilityLevels.flatMap((_,a)=>[false,true].map(q=>abilitySentence(i,p,a,q)))),...frequencyWords.map((_,f)=>frequencySentence(i,f)),`Ich ${h.forms[0]} gern${h.tail?' '+h.tail:''}.`]),...hobbyPeople.map(p=>`${p.de} ${p.modal}`),'Ich kann gut kochen.','Ich koche gern.','Ich koche oft.','Du kannst lesen.','Du kannst Freunde treffen.','Du kannst fahren.'];
