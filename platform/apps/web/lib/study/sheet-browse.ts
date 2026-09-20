import type {NavigationContext} from "../content/navigation-context";
export type SheetBrowse={query:string;category:string;saved:boolean;page:number};
export const initialSheetBrowse:SheetBrowse={query:"",category:"all",saved:false,page:1};
export function readSheetBrowse(params:URLSearchParams):SheetBrowse{
  const page=Number(params.get("page"));
  return {query:(params.get("q")??"").slice(0,120),category:(params.get("category")??"all").slice(0,80),saved:params.get("saved")==="1",page:Number.isInteger(page)&&page>0&&page<=500?page:1};
}
export function sheetBrowseQuery(browse:SheetBrowse){
  const params=new URLSearchParams();
  if(browse.query)params.set("q",browse.query);
  if(browse.category!=="all")params.set("category",browse.category);
  if(browse.saved)params.set("saved","1");
  if(browse.page>1)params.set("page",String(browse.page));
  return params.size?`?${params}`:"";
}
export function sheetNavigationContext(returnPath:string,browse:SheetBrowse,resultId?:string):NavigationContext{
  return {entryContext:"hub",returnPath,q:browse.query,category:browse.category,page:browse.page,onlySaved:browse.saved,...(resultId?{resultId}:{})};
}
