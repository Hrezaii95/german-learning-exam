import twelve from '../../generated/lesson-twelve-study.json';
import {germanNumber} from './sheet-topics';
export const seasons=[{name:'Frühling',en:'spring',icon:'🌱',months:['März','April','Mai']},{name:'Sommer',en:'summer',icon:'☀️',months:['Juni','Juli','August']},{name:'Herbst',en:'autumn',icon:'🍂',months:['September','Oktober','November']},{name:'Winter',en:'winter',icon:'❄️',months:['Dezember','Januar','Februar']}] as const;
export const monthEnglish:Record<string,string>={Januar:'January',Februar:'February',März:'March',April:'April',Mai:'May',Juni:'June',Juli:'July',August:'August',September:'September',Oktober:'October',November:'November',Dezember:'December'};
export const journeyPeople=[{de:'ich',en:'I',have:'habe',be:'bin'},{de:'du',en:'you',have:'hast',be:'bist'},{de:'er',en:'he',have:'hat',be:'ist'},{de:'wir',en:'we',have:'haben',be:'sind'},{de:'ihr',en:'you',have:'habt',be:'seid'},{de:'Sie',en:'you',have:'haben',be:'sind'}] as const;
export const journeyActivities=[
 {verb:'fahren',aux:'sein',part:'gefahren',detail:'nach Hamburg',past:'traveled to Hamburg',base:'travel to Hamburg'},
 {verb:'fliegen',aux:'sein',part:'geflogen',detail:'nach Österreich',past:'flew to Austria',base:'fly to Austria'},
 {verb:'gehen',aux:'sein',part:'gegangen',detail:'ins Café',past:'went to the café',base:'go to the café'},
 {verb:'laufen',aux:'sein',part:'gelaufen',detail:'zum Hafen',past:'walked to the harbor',base:'walk to the harbor'},
 {verb:'ankommen',aux:'sein',part:'angekommen',detail:'am Montag',past:'arrived on Monday',base:'arrive on Monday'},
 {verb:'abfahren',aux:'sein',part:'abgefahren',detail:'um acht Uhr',past:'departed at eight',base:'depart at eight'},
 {verb:'bleiben',aux:'sein',part:'geblieben',detail:'lange dort',past:'stayed there for a long time',base:'stay there for a long time'},
 {verb:'wandern',aux:'sein',part:'gewandert',detail:'in den Alpen',past:'hiked in the Alps',base:'hike in the Alps'},
 {verb:'segeln',aux:'sein',part:'gesegelt',detail:'',past:'went sailing',base:'go sailing'},
 {verb:'springen',aux:'sein',part:'gesprungen',detail:'vom Zehn-Meter-Brett',past:'jumped from the ten-meter diving board',base:'jump from the ten-meter diving board'},
 {verb:'besuchen',aux:'haben',part:'besucht',detail:'Anna',past:'visited Anna',base:'visit Anna'},
 {verb:'feiern',aux:'haben',part:'gefeiert',detail:'Silvester',past:"celebrated New Year's Eve",base:"celebrate New Year's Eve"},
 {verb:'fotografieren',aux:'haben',part:'fotografiert',detail:'Schiffe',past:'photographed ships',base:'photograph ships'},
 {verb:'machen',aux:'haben',part:'gemacht',detail:'eine Radtour',past:'went on a cycling tour',base:'go on a cycling tour'},
 {verb:'abholen',aux:'haben',part:'abgeholt',detail:'Anna am Bahnhof',past:'picked Anna up at the station',base:'pick Anna up at the station'},
] as const;
const capital=(s:string)=>s[0]!.toLocaleUpperCase('de')+s.slice(1);
export function journeyParts(activity:number,person:number,question:boolean){const a=journeyActivities[activity],p=journeyPeople[person];if(!a||!p)throw new RangeError('Choose an available activity and person.');const aux=a.aux==='sein'?p.be:p.have;return [...(question?[{text:capital(aux),role:'auxiliary'},{text:p.de,role:'person'}]:[{text:capital(p.de),role:'person'},{text:aux,role:'auxiliary'}]),...(a.detail?[{text:a.detail,role:'detail'}]:[]),{text:a.part,role:'participle'}];}
export function journeySentence(a:number,p:number,q:boolean){return journeyParts(a,p,q).map(x=>x.text).join(' ')+(q?'?':'.');}
export function journeyMeaning(activity:number,person:number,question:boolean){const a=journeyActivities[activity],p=journeyPeople[person];if(!a||!p)throw new RangeError('Choose an available activity and person.');return question?`Did ${p.en} ${a.base}?`:`${capital(p.en)} ${a.past}.`;}
const shared=Object.fromEntries(twelve.phrases.map((p,i)=>[p.de,`l12-phrase-${i}`]));
export function journeySaveId(a:number,p:number,q:boolean){return shared[journeySentence(a,p,q)]??`l12-journey-${a}-${p}-${q}`;}
export function seasonSentence(month:string){if(!Object.hasOwn(monthEnglish,month))throw new RangeError('Choose a month.');return `Im ${month} bin ich nach Hamburg gefahren.`;}
export function spokenYear(year:number){if(!Number.isInteger(year)||year<1900||year>2099)throw new RangeError('Choose a year from 1900 to 2099.');return year<2000?`neunzehnhundert${year%100?germanNumber(year%100):''}`:`zweitausend${year%100?germanNumber(year%100):''}`;}
export const auxiliaryCases=[{de:'Wir ___ nach Berlin gefahren.',answer:'sind',choices:['sind','haben'],why:'Traveling to Berlin uses sein in this example.'},{de:'Wir ___ unsere Eltern besucht.',answer:'haben',choices:['sind','haben'],why:'Besuchen uses haben, even on a journey.'},{de:'Was ___ passiert?',answer:'ist',choices:['ist','hat'],why:'Passieren meaning happen uses sein.'},{de:'Ich ___ drei Tage geblieben.',answer:'bin',choices:['bin','habe'],why:'Bleiben uses sein although you stay in one place.'},{de:'Wir ___ eine Radtour gemacht.',answer:'haben',choices:['sind','haben'],why:'The verb is machen: haben gemacht. Moving during the activity does not change that.'},{de:'Er ___ Anna am Bahnhof abgeholt.',answer:'hat',choices:['ist','hat'],why:'Abholen uses haben; arriving or traveling there is not the verb in this sentence.'}] as const;
export const journeySpeech=[...journeyActivities.flatMap((_,a)=>journeyPeople.flatMap((_,p)=>[false,true].map(q=>journeySentence(a,p,q)))),...seasons.flatMap(s=>[`der ${s.name}`,`im ${s.name}`,...s.months.flatMap(m=>[`der ${m}`,`im ${m}`,seasonSentence(m)])]),...Array.from({length:200},(_,i)=>spokenYear(i+1900)),...auxiliaryCases.map(c=>c.de.replace('___',c.answer)),'ist geblieben','ist passiert','ist gewesen','war','hatte'];
