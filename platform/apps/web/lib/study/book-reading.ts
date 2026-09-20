export function bookContextHref(pageId:string,context:{line?:string;track?:string;transcriptLine?:number}={}){
 const params=new URLSearchParams({page:pageId});
 if(context.line)params.set("line",context.line);
 if(context.track)params.set("track",context.track);
 if(context.transcriptLine!==undefined)params.set("transcriptLine",String(context.transcriptLine));
 return `/book?${params.toString()}`;
}
export function recordingTime(seconds:number){const value=Math.max(0,Math.floor(seconds));return `${Math.floor(value/60)}:${String(value%60).padStart(2,"0")}`;}
