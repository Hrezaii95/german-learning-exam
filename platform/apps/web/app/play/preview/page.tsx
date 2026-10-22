import { notFound } from "next/navigation";
import { TaskPreview } from "@/components/wortwerk/TaskPreview";

export const dynamic="force-static";
export const metadata={title:"Wortwerk task preview",robots:{index:false,follow:false}};
/** An opt-in build tool; the default static render is Next's not-found route. */
export default function PreviewPage(){
  if(process.env.WORTWERK_PREVIEW!=="1")notFound();
  return <TaskPreview/>;
}
