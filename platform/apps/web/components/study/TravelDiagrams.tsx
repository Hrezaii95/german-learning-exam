
import { LAside, LB, LDiv, LH3, LP, LSmall, LStrong } from "@/components/i18n/LocalizedElements";
import {travelVerbs,travelParts,type TravelMode} from "@/lib/study/travel-sheet";
import "./TravelLearning.css";

export function TravelScene({step}:{step:number}){
 const train=(x:number,y:number)=><g transform={`translate(${x} ${y})`}><rect x="0" y="0" width="104" height="56" rx="9" fill="#f8f0da" stroke="#426657"/><path d="M8 56v9m85-9v9M-6 65h118"/><rect x="10" y="10" width="23" height="17" fill="#dceaf4"/><rect x="68" y="10" width="23" height="17" fill="#dceaf4"/><path d="M41 56V8h20v48"/></g>;
 const person=(x:number,y:number)=><g transform={`translate(${x} ${y})`}><circle cy="0" r="6" fill="#263d38"/><path d="M0 7v18m0-13-10 9m10-9 10 9M0 25l-9 14m9-14 9 14" stroke="#263d38"/></g>;
 return <svg className="travel-scene" viewBox="0 0 250 135" fill="none" stroke="#426657" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{step===1?<>{train(6,12)}{train(139,58)}{person(121,56)}<path d="M99 105h51m-10-9 10 9-10 9" stroke="#765194" strokeWidth="5"/></>:<>{train(117,26)}{person(step===0?54:57,67)}<path d={step===0?"M78 92h62m-10-9 10 9-10 9":"M139 92H79m10-9-10 9 10 9"} stroke="#765194" strokeWidth="5"/></>}</svg>;
}

export function PrefixBridge({verb,person,mode}:{verb:number;person:number;mode:TravelMode}){
 const word=travelVerbs[verb]!,parts=travelParts(verb,person,mode),finite=parts.find(part=>part.role==="stem")!.text;
 return <LAside className="travel-prefix-bridge"><LH3>One verb, two possible shapes.</LH3><LDiv className="travel-whole-verb" lang="de"><LB>{word.prefix}</LB><LB>{word.verb.slice(word.prefix.length)}</LB><LSmall>The dictionary form: {word.verb}</LSmall></LDiv><LDiv className="travel-bridge-parts"><LDiv><LSmall>{mode==="modal"?"KÖNNEN CHANGES":"CONJUGATED VERB"}</LSmall><LStrong lang="de">{finite}</LStrong></LDiv><LDiv><LSmall>{mode==="modal"?"WHOLE INFINITIVE · END":"PREFIX · END"}</LSmall><LStrong lang="de">{mode==="modal"?word.verb:word.prefix}</LStrong></LDiv></LDiv><LP>{mode==="modal"?"After können, keep the activity infinitive together at the end.":"The purple line connects the two parts around the sentence details. In a statement the conjugated verb is second; in a yes/no question it comes first."}</LP></LAside>;
}
