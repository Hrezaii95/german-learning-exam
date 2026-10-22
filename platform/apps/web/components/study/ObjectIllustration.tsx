import type {ObjectShape} from "@/lib/study/object-learning";
import type {ObjectVocabularyIcon} from "@/lib/study/object-vocabulary";
import {objectDescriptionPaths as paths,objectVocabularyDrawings,officeIllustrationPaths} from "@/lib/study/object-illustrations";
import {SubjectVocabularyVisual} from "./SubjectIllustration";

// Keep the existing public export for source-bounded object callers.
export {objectVocabularyDrawings} from "@/lib/study/object-illustrations";

/** The outline follows article tone; selected paint and shape remain teaching cues. */
export function ObjectIllustration({index,colour,shape="plain"}:{index:number;colour:string;shape?:ObjectShape}){
 return <SubjectVocabularyVisual className="object-illustration" de="" category="Object description" cardId={`object-${index}`} subject="objects" drawing={{kind:`object-description:${index}`,viewBox:"0 0 200 150",disc:{cx:100,cy:75,r:69},children:<>
  {index===0&&<><path d={paths.tableLegs} fill={colour}/>{shape==="rund"?<ellipse cx="100" cy="63" rx="78" ry="29" fill={colour}/>:<path d={paths.tableTop} fill={colour}/>}<path d={paths.tableDetail}/></>}
  {index===1&&<><path d={paths.book} fill={colour}/><path d={paths.bookDetail}/><path d={paths.bookPages} stroke="var(--paper)"/></>}
  {index===2&&<><path d={paths.watchStrap} fill={colour}/>{shape==="eckig"?<rect x="66" y="42" width="68" height="65" rx="8" fill={colour}/>:<circle cx="100" cy="74" r="38" fill={colour}/>}<circle cx="100" cy="74" r="29" fill="var(--paper)"/><path d={paths.watchDetail}/></>}
  {index===3&&<><path d={paths.bottle} fill={colour}/><path d={paths.bottleCap} fill="var(--ink-muted)"/><path d={paths.bottleLabel} fill="var(--paper)"/><path d={paths.bottleHighlight} stroke="var(--paper)"/></>}
  {index===4&&<><path d={paths.key} fill={colour}/><circle cx="62" cy="53" r="9" fill="var(--paper)"/></>}
 </>}}/>;
}

export function OfficeIllustration({index}:{index:number}){
 return <SubjectVocabularyVisual className="office-illustration" de="" category="Office" cardId={`office-${index}`} subject="office" drawing={{kind:`office:${index}`,path:officeIllustrationPaths[index]}}/>;
}

/** Original line drawings for the existing Lesson 5 vocabulary. */
export function ObjectVocabularyIllustration({icon}:{icon:ObjectVocabularyIcon}){
 return <SubjectVocabularyVisual className="object-vocabulary-illustration" de="" category="Object" cardId={icon} subject="objects" drawing={{kind:`object:${icon}`,path:objectVocabularyDrawings[icon]}}/>;
}
