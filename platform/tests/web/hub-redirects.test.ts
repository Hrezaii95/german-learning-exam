import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalHubPath, hubRedirectHref, hubRedirectScript, PROFESSIONS_REDIRECT_DEFAULTS,
  PROFESSIONS_SHEET_PATH, retiredHubDestination, withMissingHubDefaults, withProfessionReturnContext,
} from "../../apps/web/lib/content/hub-redirects";
import { decideLearnerPathRequest, resolveLearnerRoute } from "../../apps/web/lib/content/routes";
import { loadExtraProfessionsProjection } from "../../apps/web/lib/content/extra-professions";
import { wordCardForPath } from "../../apps/web/lib/content/word-cards";
import { projectPublishedLearnerWeb } from "../../apps/web/lib/content/project";
import { parseNavigationContextParam, resolveBackHref, serializeNavigationContext } from "../../apps/web/lib/content/navigation-context";

const platformRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const projection = projectPublishedLearnerWeb(join(platformRoot,"content","published"));

describe("retired hub URLs", () => {
  it.each(["", "/german-learning-exam"])("preserves exact query and fragment bytes under base %s", base => {
    const search = "?q=Elektriker%20oder+Installateur&source=&q=second&tags=";
    const hash = "#profession-list%3A1";
    for (const [old, target] of [["/vocabulary","/cheat-sheets/vocabulary"],["/hubs","/cheat-sheets"],["/concepts","/grammar"],["/collections/professions",PROFESSIONS_SHEET_PATH]]) {
      const destination = retiredHubDestination(old!)!;
      expect(destination.href).toBe(target);
      const expected = `${base}${target}/${search}${hash}`;
      expect(hubRedirectHref(destination.href,search,hash,base,destination.defaults)).toBe(expected);
      const replace = vi.fn();
      runInNewContext(hubRedirectScript(destination.href,base,destination.defaults),{URLSearchParams,window:{location:{search,hash,replace}}});
      expect(replace).toHaveBeenCalledExactlyOnceWith(expected);
    }
  });

  it("adds the optional-profession source only when absent, retaining existing encoding and empty choices", () => {
    expect(withMissingHubDefaults("",PROFESSIONS_REDIRECT_DEFAULTS)).toBe("?source=teacher-extra");
    expect(withMissingHubDefaults("?q=Elektriker%20oder+Installateur&tags=",PROFESSIONS_REDIRECT_DEFAULTS)).toBe("?q=Elektriker%20oder+Installateur&tags=&source=teacher-extra");
    for (const source of ["", "course", "study-extra", "teacher-extra"]) {
      const query = `?q=Arzt%20oder+Lehrer&source=${source}`;
      expect(withMissingHubDefaults(query,PROFESSIONS_REDIRECT_DEFAULTS)).toBe(query);
    }
  });

  it("only retires exact indexes, leaving their canonical details and unknown paths alone", () => {
    for (const path of ["/vocabulary/w122","/grammar/concept%3Aword-order","/concepts/extra","/hubs/extra","/collections/professions/unknown"]) {
      expect(retiredHubDestination(path)).toBeUndefined();
      expect(canonicalHubPath(path)).toBe(path);
    }
    for (const [path,target] of [["/vocabulary","/cheat-sheets/vocabulary"],["/concepts","/grammar"],["/hubs","/cheat-sheets"]]) {
      expect(resolveLearnerRoute(path!,projection)).toMatchObject({kind:"canonical-redirect",canonicalPath:target,status:308});
    }
    expect(decideLearnerPathRequest("/collections/professions/","?q=Arzt%20oder+Lehrer",projection)).toEqual({action:"redirect",location:`${PROFESSIONS_SHEET_PATH}?q=Arzt%20oder+Lehrer&source=teacher-extra`,status:308});
    expect(decideLearnerPathRequest("/collections/professions","?source=course",projection)).toEqual({action:"redirect",location:`${PROFESSIONS_SHEET_PATH}?source=course`,status:308});
  });

  it("maps every existing profession row to its actual canonical word family", () => {
    const rows = loadExtraProfessionsProjection().rows;
    expect(rows).toHaveLength(48);
    for (const row of rows) {
      const card = wordCardForPath(row.detailPath)!;
      expect(card).toBeTruthy();
      expect(resolveLearnerRoute(row.detailPath,projection)).toMatchObject({kind:"canonical-redirect",canonicalPath:card.path,status:308});
      expect(decideLearnerPathRequest(`${row.detailPath}/`,"?q=Elektriker%20oder+Arzt&nav=unchanged",projection)).toEqual({action:"redirect",location:`${card.path}?q=Elektriker%20oder+Arzt&nav=unchanged`,status:308});
    }
    for (const path of ["/collections/professions/00","/collections/professions/49","/collections/professions/1","/collections/professions/001","/collections/professions/01/extra"]) expect(resolveLearnerRoute(path,projection).kind).toBe("not-found");
  });

  it("adds a safe People return context for legacy profession details only when nav is absent", () => {
    const search = "?q=Arzt%20oder+Lehrer&pattern=umlaut&alternatives=1&limit=48";
    const target = hubRedirectHref("/vocabulary/w122",search,"#word-forms","/german-learning-exam",{},true);
    expect(target.startsWith(`/german-learning-exam/vocabulary/w122/${search}&nav=`)).toBe(true);
    expect(target.endsWith("#word-forms")).toBe(true);
    const nav = new URL(target,"https://local.test").searchParams.get("nav");
    const context = parseNavigationContextParam(nav);
    expect(resolveBackHref(context)).toBe(`${PROFESSIONS_SHEET_PATH}?q=Arzt+oder+Lehrer&pattern=umlaut&alternatives=1&limit=48&source=teacher-extra`);
    const replace = vi.fn();
    runInNewContext(hubRedirectScript("/vocabulary/w122","/german-learning-exam",{},true),{URLSearchParams,window:{location:{search,hash:"#word-forms",replace}}});
    expect(replace).toHaveBeenCalledExactlyOnceWith(target);
    const existing = "?q=unchanged%20bytes&nav=%7Bexisting%7D&pattern=e";
    expect(withProfessionReturnContext(existing)).toBe(existing);
    const malicious = withProfessionReturnContext("?pattern=%3Cscript%3E&limit=999&alternatives=yes&source=unknown");
    const safe = parseNavigationContextParam(new URLSearchParams(malicious).get("nav"));
    expect(safe).not.toHaveProperty("professionPattern");
    expect(safe).not.toHaveProperty("professionLimit");
    expect(safe).not.toHaveProperty("professionAlternatives");
    expect(safe).not.toHaveProperty("sheetSource");
  });

  it("keeps old hub contexts readable and returns directly to canonical views with safe filters", () => {
    for (const [hubId,path] of [["vocabulary","/cheat-sheets/vocabulary"],["concepts","/grammar"]]) {
      const context = parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:`/${hubId}`,hubId,q:"Arzt",lesson:"02",category:"noun",page:2,onlySaved:true,resultId:"lex:architekt"}));
      expect(resolveBackHref(context)).toBe(`${path}?q=Arzt&lesson=02&category=noun&page=2&saved=1`);
    }
    expect(resolveBackHref(parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:"/hubs"})))).toBe("/cheat-sheets");
    expect(resolveBackHref(parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:"/collections/professions",q:"Elektriker"})))).toBe(`${PROFESSIONS_SHEET_PATH}?q=Elektriker&source=teacher-extra`);
    expect(resolveBackHref(null,"hub")).toBe("/cheat-sheets");
    const redirectedHub = parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:"/cheat-sheets/subjects/home",hubId:"vocabulary",sheetView:"plurals",sheetGender:false,sheetSource:"teacher-extra",sheetTags:["objects"],resultId:"W466-0"}));
    expect(resolveBackHref(redirectedHub)).toBe("/cheat-sheets/vocabulary");
    for (const path of ["/cheat-sheets","/cheat-sheets/countries"]) {
      const country = parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:path,resultId:"country-DE"}));
      expect(resolveBackHref(country)).toBe("/cheat-sheets/countries#country-DE");
    }
    expect(resolveBackHref(parseNavigationContextParam(JSON.stringify({entryContext:"review",returnPath:"/review"})))).toBe("/saved#guided-review");
  });

  it("restores validated local source filters on infographic Back links only", () => {
    for (const source of ["course","teacher-extra","study-extra"] as const) {
      const context = parseNavigationContextParam(serializeNavigationContext({entryContext:"hub",returnPath:PROFESSIONS_SHEET_PATH,q:"Arzt",sheetSource:source,resultId:"W122-0"}));
      expect(context?.sheetSource).toBe(source);
      expect(resolveBackHref(context)).toBe(`${PROFESSIONS_SHEET_PATH}?q=Arzt&source=${source}#sheet-card-W122-0`);
    }
    for (const path of ["/grammar","/hubs","/cheat-sheets","/saved"]) expect(parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:path,sheetSource:"teacher-extra"}))).not.toHaveProperty("sheetSource");
    for (const source of ["all","bad","Teacher-extra",[],null]) expect(parseNavigationContextParam(JSON.stringify({entryContext:"hub",returnPath:PROFESSIONS_SHEET_PATH,sheetSource:source}))).not.toHaveProperty("sheetSource");
    const large = {entryContext:"hub" as const,returnPath:PROFESSIONS_SHEET_PATH,q:"a".repeat(120),category:"b".repeat(80),resultId:`word-${"c".repeat(110)}`,onlySaved:true,page:500,sheetView:"plurals" as const,sheetGender:false,sheetSubjects:true,sheetLessons:true,sheetSource:"teacher-extra" as const};
    const serialized = serializeNavigationContext(large);
    expect(serialized.length).toBeGreaterThan(512);
    expect(parseNavigationContextParam(serialized)?.sheetSource).toBe("teacher-extra");
  });
});
