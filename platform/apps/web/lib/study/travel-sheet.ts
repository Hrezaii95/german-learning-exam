export const travelPeople=[{de:'ich',en:'I'},{de:'du',en:'you'},{de:'er',en:'he'},{de:'wir',en:'we'},{de:'ihr',en:'you'},{de:'Sie',en:'you'}] as const;
export const travelVerbs=[
 {verb:'ankommen',prefix:'an',stems:['komme','kommst','kommt','kommen','kommt','kommen'],detail:'um acht Uhr',en:'arrive at eight',third:'arrives at eight',question:'Wann',tail:'',questionEn:'When',askEn:'arrive',icon:'🛬'},
 {verb:'abfliegen',prefix:'ab',stems:['fliege','fliegst','fliegt','fliegen','fliegt','fliegen'],detail:'um neun Uhr',en:'depart by plane at nine',third:'departs by plane at nine',question:'Wann',tail:'',questionEn:'When',askEn:'depart by plane',icon:'🛫'},
 {verb:'abholen',prefix:'ab',stems:['hole','holst','holt','holen','holt','holen'],detail:'Anna am Flughafen',en:'pick Anna up at the airport',third:'picks Anna up at the airport',question:'Wann',tail:'Anna',questionEn:'When',askEn:'pick Anna up',icon:'🤝'},
 {verb:'anrufen',prefix:'an',stems:['rufe','rufst','ruft','rufen','ruft','rufen'],detail:'Anna',en:'call Anna',third:'calls Anna',question:'Wann',tail:'Anna',questionEn:'When',askEn:'call Anna',icon:'📞'},
 {verb:'einsteigen',prefix:'ein',stems:['steige','steigst','steigt','steigen','steigt','steigen'],detail:'in die U-Bahn',en:'get on the underground train',third:'gets on the underground train',question:'Wann',tail:'in die U-Bahn',questionEn:'When',askEn:'get on the underground train',icon:'🚇'},
 {verb:'umsteigen',prefix:'um',stems:['steige','steigst','steigt','steigen','steigt','steigen'],detail:'in Hamburg',en:'change trains in Hamburg',third:'changes trains in Hamburg',question:'Wo',tail:'',questionEn:'Where',askEn:'change trains',icon:'🔀'},
 {verb:'aussteigen',prefix:'aus',stems:['steige','steigst','steigt','steigen','steigt','steigen'],detail:'am Hauptbahnhof',en:'get off at the main station',third:'gets off at the main station',question:'Wo',tail:'',questionEn:'Where',askEn:'get off',icon:'🚶'},
 {verb:'einkaufen',prefix:'ein',stems:['kaufe','kaufst','kauft','kaufen','kauft','kaufen'],detail:'heute Brot',en:'buy bread today',third:'buys bread today',question:'Was',tail:'heute',questionEn:'What',askEn:'buy today',icon:'🛒'},
 {verb:'abfahren',prefix:'ab',stems:['fahre','fährst','fährt','fahren','fahrt','fahren'],detail:'um zehn Uhr',en:'depart at ten',third:'departs at ten',question:'Wann',tail:'',questionEn:'When',askEn:'depart',icon:'🚆'},
 {verb:'fernsehen',prefix:'fern',stems:['sehe','siehst','sieht','sehen','seht','sehen'],detail:'heute Abend',en:'watch television this evening',third:'watches television this evening',question:'Wann',tail:'',questionEn:'When',askEn:'watch television',icon:'📺'},
] as const;
export type TravelMode='statement'|'w-question'|'yes-no'|'modal';
export const travelModes=[{id:'statement',label:'Statement'},{id:'w-question',label:'W-question'},{id:'yes-no',label:'Yes / no question'},{id:'modal',label:'With können'}] as const;
export type TravelPart={text:string;role:'question'|'person'|'stem'|'detail'|'prefix'|'infinitive'};
const capital=(s:string)=>s[0]!.toLocaleUpperCase('de')+s.slice(1);
export function travelParts(verb:number,person:number,mode:TravelMode):TravelPart[]{
 const v=travelVerbs[verb],p=travelPeople[person];if(!v||!p)throw new RangeError('Choose an available verb and person.');
 const part=(text:string,role:TravelPart['role']):TravelPart=>({text,role});
 if(mode==='modal')return [part(capital(p.de),'person'),part(['kann','kannst','kann','können','könnt','können'][person]!,'stem'),part(v.detail,'detail'),part(v.verb,'infinitive')];
 if(mode==='w-question')return [part(v.question,'question'),part(v.stems[person]!,'stem'),part(p.de,'person'),...(v.tail?[part(v.tail,'detail')]:[]),part(v.prefix,'prefix')];
 if(mode==='yes-no')return [part(capital(v.stems[person]!),'stem'),part(p.de,'person'),part(v.detail,'detail'),part(v.prefix,'prefix')];
 return [part(capital(p.de),'person'),part(v.stems[person]!,'stem'),part(v.detail,'detail'),part(v.prefix,'prefix')];
}
export function travelSentence(verb:number,person:number,mode:TravelMode){return travelParts(verb,person,mode).map(p=>p.text).join(' ')+(mode==='w-question'||mode==='yes-no'?'?':'.');}
export function travelMeaning(verb:number,person:number,mode:TravelMode){
 const v=travelVerbs[verb],p=travelPeople[person];if(!v||!p)throw new RangeError('Choose an available verb and person.');
 if(mode==='modal')return `${capital(p.en)} can ${v.en}.`;
 if(mode==='w-question')return `${v.questionEn} ${person===2?'does':'do'} ${p.en} ${v.askEn}?`;
 if(mode==='yes-no')return `${person===2?'Does':'Do'} ${p.en} ${v.en}?`;
 return `${capital(p.en)} ${person===2?v.third:v.en}.`;
}
const shared:Record<string,string>={'Wann kommst du an?':'l10-phrase-0','Ich komme um acht Uhr an.':'l10-phrase-1','Wo steigst du um?':'l10-phrase-15','Wir steigen in Hamburg um.':'l10-phrase-16'};
export function travelSaveId(v:number,p:number,m:TravelMode){return shared[travelSentence(v,p,m)]??`l10-travel-${v}-${p}-${m}`;}
export const travelBoard=[
 {de:'der Zug',en:'train',tone:'male',icon:'🚆'},{de:'der Bus',en:'bus',tone:'male',icon:'🚌'},{de:'der Bahnhof',en:'station',tone:'male',icon:'🚉'},
 {de:'die U-Bahn',en:'underground',tone:'female',icon:'🚇'},{de:'die S-Bahn',en:'urban / suburban rail',tone:'female',icon:'🚈'},{de:'die Straßenbahn',en:'tram',tone:'female',icon:'🚊'},
 {de:'das Taxi',en:'taxi',tone:'neuter',icon:'🚕'},{de:'das Flugzeug',en:'plane',tone:'neuter',icon:'✈️'},{de:'das Gepäck',en:'luggage',tone:'neuter',icon:'🧳'},
] as const;
export const announcementModels=[
 {de:'Der Intercity fährt von Bahnsteig drei ab.',en:'The intercity train departs from platform three.',question:'Which platform?',choices:['Bahnsteig 3','Bahnsteig 5','Gleis 2'],answer:'Bahnsteig 3'},
 {de:'Die U-Bahn fährt an Gleis zwei ein.',en:'The underground train is pulling in at track two.',question:'Which track?',choices:['Gleis 2','Gleis 3','Gleis 5'],answer:'Gleis 2'},
 {de:'Die Fahrt endet an der Turmstraße.',en:'The journey ends at Turmstraße.',question:'What happens at Turmstraße?',choices:['The journey ends.','The journey begins.','The train is delayed.'],answer:'The journey ends.'},
 {de:'Das Flugzeug steht am Ausgang B48.',en:'The plane is at gate B48.',question:'Which airport gate?',choices:['B48','B84','B18'],answer:'B48'},
 {de:'Wir haben dreißig Minuten Verspätung.',en:'We are thirty minutes late.',question:'How long is the delay?',choices:['30 minutes','13 minutes','15 minutes'],answer:'30 minutes'},
 {de:'Der Zug kommt auf Gleis fünfzehn an, nicht auf Gleis fünf.',en:'The train arrives at track fifteen, not track five.',question:'Which is the correct arrival track?',choices:['Gleis 15','Gleis 5','Gleis 50'],answer:'Gleis 15'},
] as const;
export const travelSpeech=[...travelVerbs.flatMap((v,i)=>[v.verb,...travelPeople.flatMap((_,p)=>travelModes.map(m=>travelSentence(i,p,m.id)))]),...travelBoard.map(w=>w.de),...announcementModels.map(a=>a.de),'einsteigen','umsteigen','aussteigen'];
