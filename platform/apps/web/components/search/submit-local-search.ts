import type {FormEvent} from "react";

/** These static pages already contain their search data; keep GET URLs and Back without another download. */
export function submitLocalSearch(event:FormEvent<HTMLFormElement>) {
 const form=event.currentTarget;
 const target=new URL(form.action,window.location.href);
 if(target.origin!==window.location.origin || target.pathname.replace(/\/$/,"")!==window.location.pathname.replace(/\/$/,""))return;
 event.preventDefault();
 const query=new URLSearchParams();
 for(const [key,value] of new FormData(form))if(typeof value==="string")query.append(key,value);
 target.search=query.toString();
 window.history.pushState(null,"",`${target.pathname}${target.search}`);
}
