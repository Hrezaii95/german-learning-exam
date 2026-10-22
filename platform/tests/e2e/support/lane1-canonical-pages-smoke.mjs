/**
 * Lane 1 canonical Pages checks. Uses an EXISTING static export; builds nothing.
 * Run separately from the shared strict smoke: this helper does not replace or
 * adapt any baseline request, response, assertion, or result.
 */
import {runInNewContext} from "node:vm";
import {startStaticServer,PAGES_BASE} from "./static-server.mjs";

const WORKSHOPS=["countries","home","people","verbs","numbers","conversation","questions","objects","office","hobbies","time","food","travel","past","journeys"];
const SUBJECTS=["introductions","people","countries","numbers","home","objects","colours-materials","office","seasons","past","travel","food","time","hobbies","grammar","verbs","conversation","questions","classroom","descriptions","everyday"];
const requests=[];
function assert(condition,message){if(!condition)throw new Error(message);}
function escapeHtml(value){return value.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");}
function assertAssets(html,label){
 assert(html.includes(`${PAGES_BASE}/_next/`),`${label} missing base-prefixed hydration assets`);
 assert(!html.includes('src="/_next/')&&!html.includes('href="/_next/')&&!html.includes('"/_next/'),`${label} has bare root hydration assets`);
}
async function fetchPage(baseUrl,path,search=""){
 const requested=new URL(`${baseUrl}${path.endsWith("/")?path:`${path}/`}${search}`);
 const response=await fetch(requested,{redirect:"manual"});
 const result={requested:requested.href,url:response.url,status:response.status};
 requests.push(result);
 assert(response.status===200,`${requested.href} expected real 200, got ${response.status}`);
 assert(!response.headers.get("location"),`${requested.href} unexpectedly returned an HTTP redirect`);
 assert(response.url===requested.href,`${requested.href} returned a different response URL: ${response.url}`);
 const text=await response.text();
 assertAssets(text,requested.pathname);
 return {...result,text};
}
function redirectScript(html,label,{beforeFallback=true}={}){
 const match=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .find(([,source])=>source.includes("window.location.replace(")&&source.includes("window.location.search"));
 assert(match,`${label} missing its real parser-time redirect script`);
 if(beforeFallback)assert(html.indexOf("<noscript>")>match.index,`${label} script must precede its no-script fallback`);
 return match[1];
}
function runRedirect(source,pathname,search,hash){
 let destination;
 runInNewContext(source,{URLSearchParams,window:{addEventListener(){},location:{pathname,search,hash,replace(value){destination=value;}}}},{timeout:1000});
 return destination;
}
function assertFallback(html,source,legacy,destination,defaults={}){
 const canonical=new URL(`${PAGES_BASE}${destination}/`,"https://pages.invalid");
 for(const [name,value] of Object.entries(defaults))canonical.searchParams.set(name,value);
 assert(html.includes(`<link rel="canonical" href="${escapeHtml(canonical.pathname+canonical.search)}"`),`${legacy} missing canonical destination`);
 const fallback=runRedirect(source,`${PAGES_BASE}${legacy}/`,"","");
 assert(typeof fallback==="string",`${legacy} did not produce its fallback destination`);
 const fallbackUrl=new URL(fallback,"https://pages.invalid");
 assert(fallbackUrl.pathname===canonical.pathname,`${legacy} fallback targets the wrong canonical pathname`);
 for(const [name,value] of Object.entries(defaults))assert(fallbackUrl.searchParams.get(name)===value,`${legacy} fallback is missing ${name}`);
 const escaped=escapeHtml(fallback);
 assert(html.includes(`<noscript><meta http-equiv="refresh" content="0;url=${escaped}"></noscript>`),`${legacy} missing exact no-script refresh`);
 assert(html.includes(`<a href="${escaped}">Open `),`${legacy} missing matching visible fallback`);
}
function assertVocabularyContent(html,label,{plural=false}={}){
 assert(html.includes('data-subject-entry='),`${label} has no vocabulary entries`);
 assert(html.includes('class="subject-vocabulary-visual"'),`${label} missing shared infographic illustrations`);
 assert(html.includes(`class="${plural?"subject-plural-meaning":"subject-entry-meaning"}"`),`${label} missing visible meanings`);
 assert(html.includes('aria-label="Filter this cheat sheet"'),`${label} missing lesson and tag filters`);
 for(const name of ["Group by lesson","Group by subject tags","Group by gender","Group by plural pattern"])assert(html.includes(`aria-label="${name}"`),`${label} missing ${name}`);
 assert(html.includes('aria-label="Grouping priority"'),`${label} missing grouping order controls`);
 assert(html.includes('aria-label="Word sorting"'),`${label} missing vocabulary sorting controls`);
 if(plural){
  assert(html.includes('data-sheet-view="plurals"'),`${label} must default to plural grouping`);
  for(const id of ["W012-0","W051-0","language-Persisch-0","home-fernseher-0"])assert(html.includes(`data-subject-entry="${id}"`),`${label} missing canonical entry ${id}`);
  assert(!html.includes('data-subject-visual="source-glyph"'),`${label} must not ship text placeholders instead of illustrations`);
  assert(html.includes('data-country-illustration="DE"'),`${label} missing shared country illustration treatment`);
  assert(html.includes('class="subject-plural-pattern-schema"'),`${label} missing singular-to-plural diagrams`);
  assert(html.includes('aria-label="Move Plural pattern earlier"'),`${label} missing accessible grouping order controls`);
  for(const pattern of ["s","e","en-n","unchanged","er","umlaut","umlaut-e","umlaut-er","innen","other"])assert(html.includes(`data-plural-pattern="${pattern}"`),`${label} missing ${pattern}`);
 }
}
async function verifySheets(baseUrl){
 const paths=[...new Set(["/cheat-sheets","/cheat-sheets/vocabulary",...WORKSHOPS.map(id=>`/cheat-sheets/${id}`),...SUBJECTS.map(id=>`/cheat-sheets/subjects/${id}`)])];
 const pages=new Map();
 for(const path of paths){
  const response=await fetchPage(baseUrl,path);
  assert(!/href="\/cheat-sheets(?:[/?#"])/.test(response.text),`${path} contains a bare root sheet link`);
  const subject=SUBJECTS.find(id=>path===`/cheat-sheets/subjects/${id}`);
  if(subject){
   assert(response.text.includes(`data-subject-sheet="${subject}"`),`${path} missing its subject view`);
   assertVocabularyContent(response.text,path);
  }
  pages.set(path,response.text);
 }
 const directory=pages.get("/cheat-sheets");
 assert(/class="[^"]*\bcheat-sheet-directory\b/.test(directory),"canonical sheet root must render its directory");
 assert((directory.match(/data-subject-tile="/g)??[]).length===SUBJECTS.length,"directory must expose every subject once");
 assert((directory.match(/data-workshop-tile="/g)??[]).length===WORKSHOPS.length,"directory must expose every workshop once");
 for(const [ids,kind,prefix] of [[SUBJECTS,"subject","/cheat-sheets/subjects"],[WORKSHOPS,"workshop","/cheat-sheets"]])for(const id of ids){
  const tile=directory.match(new RegExp(`<a\\b[^>]*data-${kind}-tile="${id}"[^>]*>`))?.[0];
  assert(tile?.includes(`href="${PAGES_BASE}${prefix}/${id}`),`directory ${kind} ${id} must link to its real base-prefixed route`);
 }
 assert(directory.includes(`href="${PAGES_BASE}/cheat-sheets/vocabulary`),"directory missing All vocabulary");
 const country=pages.get("/cheat-sheets/countries");
 assert(/class="[^"]*\bcountry-sheet\b/.test(country),"canonical country sheet missing its content");
 const vocabulary=pages.get("/cheat-sheets/vocabulary");
 assert(vocabulary.includes('data-subject-sheet="plurals"'),"canonical vocabulary sheet missing its content");
 assertVocabularyContent(vocabulary,"/cheat-sheets/vocabulary",{plural:true});
 const search="?q=B%C3%BCcher&source=&tags=objects%2Chome",hash="#sheet-card-W466-0";
 for(const [legacy,destination] of [["/cheat-sheets/subjects","/cheat-sheets"],["/cheat-sheets/plurals","/cheat-sheets/vocabulary"]]){
  const response=await fetchPage(baseUrl,legacy,search);
  const source=redirectScript(response.text,legacy);
  assertFallback(response.text,source,legacy,destination);
  for(const suffix of [{search,hash},{search:"",hash:""}]){
   const actual=runRedirect(source,`${PAGES_BASE}${legacy}/`,suffix.search,suffix.hash);
   assert(actual===`${PAGES_BASE}${destination}/${suffix.search}${suffix.hash}`,`${legacy} changed the raw query or fragment`);
  }
 }
 const directoryScript=redirectScript(directory,"country bookmark compatibility",{beforeFallback:false});
 const countryIds=[...new Set([...country.matchAll(/\bdata-country="([A-Z]{2})"/g)].map(([,id])=>id))];
 assert(countryIds.includes("DE"),"canonical country content missing Germany");
 for(const anchor of ["country-overview","country-patterns","country-passport","country-index","country-practice",...countryIds.map(id=>`country-${id}`)]){
  const fragment=`#${anchor}`;
  assert(runRedirect(directoryScript,`${PAGES_BASE}/cheat-sheets/`,search,fragment)===`${PAGES_BASE}/cheat-sheets/countries/${search}${fragment}`,`country bookmark ${fragment} changed its raw query or fragment`);
 }
 for(const fragment of ["","#country-not-published","#another-section"]){
  assert(runRedirect(directoryScript,`${PAGES_BASE}/cheat-sheets/`,search,fragment)===undefined,`ordinary directory visit ${fragment} must remain in the directory`);
 }
 return {canonicalPages:paths.length,subjects:SUBJECTS.length,workshops:WORKSHOPS.length,movedSheetStubs:2,countryBookmarks:countryIds.length+5};
}

const {server,baseUrl}=await startStaticServer({port:0});
try{
 const sheets=await verifySheets(baseUrl);
 console.log(JSON.stringify({gate:"pass",baseUrl,...sheets,realRequests:requests.length}));
}finally{await new Promise(resolve=>server.close(resolve));}
