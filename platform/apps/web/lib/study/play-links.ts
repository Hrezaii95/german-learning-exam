import {encodeScope,playHref,type PlayScope} from "../wortwerk/links";
import {defaultStudyScope,matchesPlayScope,selectedLessons,type StudyScope} from "./scope";
import {A1_PLAY_ITEMS,A1_PLAY_PACK_ID,type A1PlayItem} from "./play-catalogue.generated";
import {sheetDestination,type SheetDestinationId} from "./sheet-navigation";

export type PlaySelection=
  | {href:string;scope:PlayScope;itemCount:number;unavailableItemCount:number}
  | {href:null;scope:null;itemCount:0;unavailableItemCount:number;reason:string};

const byId=new Map(A1_PLAY_ITEMS.map(item=>[item.id,item]));

export function unavailablePlaySelection(reason="No matching words are available in the A1 practice catalogue.",unavailableItemCount=0):PlaySelection{
  return {href:null,scope:null,itemCount:0,unavailableItemCount,reason};
}

/** Only active selection data enters a link. Legacy URL/Back contexts are not inputs. */
export function vocabularyPlaySelection(scope:StudyScope|null,itemIds:readonly string[]|null):PlaySelection{
  if(scope===null||itemIds===null)return unavailablePlaySelection("Choose a study selection before starting practice.");
  const lessons=scope.mode==="all"?undefined:selectedLessons(scope);
  if((lessons!==undefined&&!lessons.length)||!itemIds.length)return unavailablePlaySelection();
  const ids=[...new Set(itemIds)];
  const filter:PlayScope={v:1,book:"momente-a1",...(lessons!==undefined?{lessons}:{}),
    ...(scope.concepts.length?{tags:[...scope.concepts]}:{}),
    ...(scope.source!=="all"?{sources:[scope.source]}:{}),
  };
  // Use the game's actual predicate, including sourceRef membership and lessons.
  const items=ids.flatMap(id=>{const item=byId.get(id);return item&&matchesPlayScope(item,filter)?[item.id]:[];});
  const unavailableItemCount=ids.length-items.length;
  if(!items.length)return unavailablePlaySelection(undefined,unavailableItemCount);
  const selected=new Set(items);
  const matching=A1_PLAY_ITEMS.filter(item=>matchesPlayScope(item,filter));
  // A complete predicate match needs no row list. Narrowed/AND selections do.
  const exactPredicate=matching.length===selected.size&&matching.every(item=>selected.has(item.id));
  const playScope:PlayScope=exactPredicate?filter:{...filter,items};
  // Do not truncate IDs or drop filters to make an oversized URL appear usable.
  const fitsDecoder=items.length<=2000&&encodeScope(playScope).length<=30000;
  const href=fitsDecoder?playHref(playScope,{pack:A1_PLAY_PACK_ID}):null;
  // Bound the complete relative URL before exposing a link to an HTTP server.
  if(href===null||new TextEncoder().encode(href).byteLength>8000)return unavailablePlaySelection("This selection is too large for a practice link. Choose fewer words.",unavailableItemCount);
  return {href,scope:playScope,itemCount:items.length,unavailableItemCount};
}

/** A workshop topic AND the active global tags are retained by the explicit IDs. */
export function sheetPlaySelection(current:SheetDestinationId,scope:StudyScope|null):PlaySelection{
  if(scope===null)return vocabularyPlaySelection(null,null);
  const destination=sheetDestination(current);
  if(destination.kind!=="workshop"){
    const resolved=destination.kind==="subject"?{...scope,concepts:[destination.subject]}:scope;
    return vocabularyPlaySelection(resolved,A1_PLAY_ITEMS.map(item=>item.id));
  }
  const resolved:StudyScope={...scope,
    concepts:scope.concepts.length?[...scope.concepts]:[destination.subject],
  };
  const ids=A1_PLAY_ITEMS.filter(item=>item.tags.includes(destination.subject)).map(item=>item.id);
  return vocabularyPlaySelection(resolved,ids);
}

function explicitWordSelection(items:readonly A1PlayItem[]):PlaySelection{
  // The displayed word is an explicit choice, independent of global/Back filters.
  return vocabularyPlaySelection(defaultStudyScope(),items.map(item=>item.id));
}

export function wordFamilyPlaySelection(cardId:string):PlaySelection{
  return explicitWordSelection(A1_PLAY_ITEMS.filter(item=>item.cardId===cardId));
}

/** Collection filters choose complete displayed families, before pagination. */
export function familyPlaySelection(scope:StudyScope|null,cardIds:readonly string[]|null):PlaySelection{
  if(cardIds===null)return vocabularyPlaySelection(scope,null);
  const selected=new Set(cardIds);
  const result=vocabularyPlaySelection(scope,A1_PLAY_ITEMS.filter(item=>selected.has(item.cardId)).map(item=>item.id));
  const unavailableItemCount=scope===null?0:[...selected].filter(id=>!A1_PLAY_ITEMS.some(item=>item.cardId===id&&result.scope!==null&&matchesPlayScope(item,result.scope))).length;
  return {...result,unavailableItemCount};
}

/** Country links match actual pack sourceRef.href, never guessed row IDs. */
export function cardPathsPlaySelection(scope:StudyScope|null,paths:readonly (readonly (string|undefined)[])[]|null):PlaySelection{
  if(paths===null)return vocabularyPlaySelection(scope,null);
  const selected=new Set(paths.flat().filter((path):path is string=>typeof path==="string"));
  const result=vocabularyPlaySelection(scope,A1_PLAY_ITEMS.filter(item=>selected.has(item.cardPath)).map(item=>item.id));
  // Each displayed country has alternative canonical/authored paths, not two words.
  const unavailableItemCount=scope===null?0:paths.filter(alternatives=>!A1_PLAY_ITEMS.some(item=>alternatives.includes(item.cardPath)&&result.scope!==null&&matchesPlayScope(item,result.scope))).length;
  return {...result,unavailableItemCount};
}

export function wordPlaySelection(itemId:string,scope?:StudyScope|null):PlaySelection{
  if(scope!==undefined)return vocabularyPlaySelection(scope,[itemId]);
  const item=byId.get(itemId);
  return explicitWordSelection(item?[item]:[]);
}
