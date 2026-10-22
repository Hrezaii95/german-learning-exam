import {homeIllustrationPath} from "@/lib/study/home-illustrations";
import {SubjectVocabularyVisual} from "./SubjectIllustration";

/** Original line illustrations; preserve the workshop's house fallback. */
export function HomeIllustration({id}:{id:string}) {
  return <SubjectVocabularyVisual className="home-illustration" de="" category="Home" cardId={id} subject="home" drawing={{kind:`home:${id}`,path:homeIllustrationPath(id)}}/>;
}
