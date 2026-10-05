"use client";
import { LB, LButton, LDiv, LP, LSmall, LSpan, LStrong } from "@/components/i18n/LocalizedElements";

import {seasons,monthEnglish,journeyActivities,journeyPeople} from "@/lib/study/journey-sheet";
import {journeyStages,yearChunks} from "@/lib/study/journey-learning";
import "./JourneyLearning.css";

export function SeasonWheel({month,onChoose}:{month:string;onChoose:(month:string)=>void}){
 const selected=seasons.find(season=>season.months.some(value=>value===month))??seasons[0];
 return <LDiv><LP>A three-month learning calendar for Germany. Colour marks the season; every month and season here uses <LB lang="de">der</LB>.</LP><LDiv className="season-wheel" role="group" aria-label="Choose a season"><svg viewBox="0 0 360 360" aria-hidden="true"><path d="M180 180V20A160 160 0 0 1 340 180Z" fill="#dfecdc"/><path d="M180 180H340A160 160 0 0 1 180 340Z" fill="#fff0be"/><path d="M180 180V340A160 160 0 0 1 20 180Z" fill="#f8e1cf"/><path d="M180 180H20A160 160 0 0 1 180 20Z" fill="#dfecf6"/><circle cx="180" cy="180" r="160" fill="none" stroke="#789aa8" strokeWidth="2"/></svg>{seasons.map((season,index)=><LButton type="button" key={season.name} data-season={index} aria-pressed={selected.name===season.name} onClick={()=>onChoose(season.months[0])}><LB lang="de">der {season.name}</LB><LSpan>{season.en}</LSpan></LButton>)}<LDiv aria-hidden="true"><LB>der</LB><LSmall>im = in dem</LSmall></LDiv></LDiv><LDiv className="season-month-choice" role="group" aria-label={`${selected.en} months`}>{selected.months.map(value=><LButton type="button" key={value} aria-pressed={month===value} onClick={()=>onChoose(value)}><LB lang="de">der {value}</LB><LSpan>{monthEnglish[value]}</LSpan></LButton>)}</LDiv></LDiv>;
}
const tripPaths=[
 "M18 15h64v57H18ZM25 24h19v23H25Zm31 0h19v23H56ZM18 59h64M29 73l-8 15m49-15 8 15M32 63h1m34 0h1",
 "M20 84V16h58L65 32l13 16H20M12 85h34M51 69h33m-10-10 10 10-10 10",
 "M29 18a10 10 0 1 0 .1 0M73 18a10 10 0 1 0 .1 0M29 39v29l-12 20m12-20 13 20M73 39v29L61 88m12-20 13 20M29 46l23 15 21-15",
 "M15 32h70v48H15ZM29 32l7-14h28l7 14M50 42a14 14 0 1 0 .1 0M74 41h3",
];
export function JourneyEventIllustration({index}:{index:number}){return <svg className="journey-event-art" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="50" cy="50" r="47" fill="#eaf2eb" stroke="none"/><path d={tripPaths[index]}/></svg>;}
export function JourneyTimeline({activity,onChoose}:{activity:number;onChoose:(activity:number)=>void}){return <LDiv><LP>A sample trip. Choose an event and follow its verb into the past.</LP><LDiv className="journey-stage-map">{journeyStages.map((stage,index)=><LButton type="button" key={stage.activity} aria-pressed={activity===stage.activity} onClick={()=>onChoose(stage.activity)}><LSmall>{index+1} · {stage.label}</LSmall><JourneyEventIllustration index={index}/><LB lang="de">{journeyActivities[stage.activity]!.verb}</LB></LButton>)}</LDiv></LDiv>;}
export function AuxiliaryTrail({activity,person}:{activity:number;person:number}){const verb=journeyActivities[activity]!,subject=journeyPeople[person]!,aux=verb.aux==="sein"?subject.be:subject.have;return <LDiv><LDiv className="journey-aux-trail" data-aux={verb.aux}><LDiv><LSmall>1 · READ THE EXACT VERB</LSmall><LStrong lang="de">{verb.verb}</LStrong><LSpan>{verb.base}</LSpan></LDiv><LDiv><LSmall>2 · ITS AUXILIARY HERE</LSmall><LStrong lang="de">{verb.aux}</LStrong><LSpan>{verb.verb==="bleiben"?"Learn bleiben separately: staying still uses sein.":"Use this auxiliary with the taught meaning shown here."}</LSpan></LDiv><LDiv><LSmall>3 · MATCH THE PERSON</LSmall><LStrong lang="de">{subject.de} {aux} … {verb.part}</LStrong></LDiv></LDiv><LP>These cues cover the examples here, not every use of every verb. Learn the verb and auxiliary together; movement during an activity alone does not decide.</LP></LDiv>;}
export function YearChunks({year}:{year:number}){return <LDiv role="group" className="year-chunks" aria-label="Year pronunciation chunks">{yearChunks(year).map((chunk,index)=><LSpan key={index} lang="de">{chunk}</LSpan>)}</LDiv>;}
