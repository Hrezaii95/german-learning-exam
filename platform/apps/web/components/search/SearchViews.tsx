"use client";
import {useStudyScope} from "@/components/study/StudyScope";
import {useStudy} from "@/components/study/StudyProvider";
import {LineAudio} from "@/components/study/StudyAudio";
import {wordCardSearchKey} from "@/lib/content/word-card-types";
import {numericLessons,tagsForLesson} from "@/lib/study/scope";
import Link from "next/link";
import type { NavigationContext } from "@/lib/content/navigation-context";
import {
  appendNavigationContext,
  buildSearchNavigationContext,
  isSafeNavigationPath,
  resolveBackHref,
} from "@/lib/content/navigation-context";
import {
  groupSearchHits,
  lessonMembershipLabel,
  matchMetaLabel,
  parseSearchQueryParam,
  searchLearnerContent,
  sourcePriorityLabel,
} from "@/lib/content/search-query";
import type { LearnerSearchHit, LearnerSearchProjection, LearnerSearchDocument } from "@/lib/content/search-types";
import { BackLink } from "@/components/nav/BackLink";
import { withPagesBasePath } from "@/lib/content/pages-base-path";

/**
 * Defense in depth: only link when canonicalHref is an allowlisted internal path.
 * Tampered / protocol-relative / external / traversal values render as non-links.
 */
function linkableResultHref(
  hit: LearnerSearchHit,
  query: string,
  page:number,
): string | null {
  const href = hit.canonicalHref;
  if (href == null || typeof href !== "string") return null;
  if (!isSafeNavigationPath(href)) return null;
  const result=appendNavigationContext(
    href,
    buildSearchNavigationContext(query, hit.id,page),
  );
  return hit.id.startsWith("course:")?`${result}#${hit.kind==="Verb"?"verbs":hit.kind==="GrammarConcept"?"grammar":"phrases"}`:result;
}

function SearchResultCard({
  hit,
  query,
  document:doc,
  page,
}: {
  hit: LearnerSearchHit;
  query: string;
  document:LearnerSearchDocument;
  page:number;
}) {
  const study=useStudy();
  const meaning=doc.fields.find(field=>field.field==="meaning")?.displayText;
  const entry=study?.dictionary.find(entry=>entry.de===hit.displayLabel||entry.forms.includes(hit.displayLabel)||(!hit.id.startsWith("course:")&&entry.href===hit.canonicalHref));
  const spoken=entry?.de??doc.fields.find(field=>field.field==="lemma"||field.field==="infinitive")?.displayText;
  const matchesQuery=(text:string)=>wordCardSearchKey(text).includes(wordCardSearchKey(query));
  const context=(doc.fields.find(field=>field.field==="form"&&matchesQuery(field.displayText))??doc.fields.find(field=>field.field===hit.match.field&&matchesQuery(field.displayText)))?.displayText;
  const label=<span className="german" lang="de">{hit.displayLabel.split(" / ").map((form,index)=><span key={`${index}-${form}`}>{index>0?" / ":""}<span className={`study-tone-${entry?.displayForms?.find(display=>display.text===form)?.tone??"plain"}`}>{form}</span></span>)}</span>;
  const names:Record<string,string>={Lexeme:"Word",Verb:"Verb",GrammarConcept:"Grammar",PhrasePattern:"Phrase",QAPair:"Question & answer",LearningActivity:"Activity",ListeningAsset:"Recording",Lesson:"Lesson",Dialogue:"Dialogue",Collection:"Collection"};
  const meta = (
    <>
      <div className="meta-row">
        <span className="meta-chip">{hit.kind}</span>
        <span className="meta-chip">{lessonMembershipLabel(hit.lessonIds)}</span>
        <span className="meta-chip">{hit.id.startsWith("course:")?"Lesson study aid":sourcePriorityLabel(hit.sourcePriority)}</span>
        <span className="meta-chip">{matchMetaLabel(hit.match)}</span>
      </div>
    </>
  );

  const href = linkableResultHref(hit, query,page);
  return <article className="hub-card panel search-learning-result" id={`search-result-${hit.id}`}>
    <p className="study-eyebrow">{names[hit.kind]??hit.kind} · {lessonMembershipLabel(hit.lessonIds)}</p>
    <h4 className="hub-card__title">{href?<Link href={href} className="search-result-link">{label}</Link>:label}</h4>
    {(meaning||entry?.en)&&<p>{meaning??entry?.en}</p>}
    {context&&context!==hit.displayLabel&&context!==meaning&&(context.length>240?<details><summary>Show matching context</summary><p className="search-match-context">{context}</p></details>:<p className="search-match-context">Matched text: {context}</p>)}
    {spoken&&<LineAudio text={spoken} src={entry?.audio} compact/>}
    <details><summary>About this result</summary>{meta}</details>
  </article>;
}

export function SearchView({
  projection,
  searchParams,
  navigation = null,
}: {
  projection: LearnerSearchProjection;
  searchParams: Record<string, string | string[] | undefined>;
  navigation?: NavigationContext | null;
}) {
  const {matches}=useStudyScope();
  const study=useStudy();
  const query = parseSearchQueryParam(searchParams);
  const trimmed = query.trim();
  const hits = trimmed.length > 0 ? searchLearnerContent(projection, trimmed,{limit:projection.documentCount}).filter(hit=>{const tags=projection.documentsById[hit.id]?.studyTags??study?.dictionary.find(e=>e.id===hit.id||(!hit.id.startsWith("course:")&&e.href===hit.canonicalHref))?.studyTags;return tags?matches(tags):numericLessons(hit.lessonIds).some(n=>matches(tagsForLesson(n)));}) : [];
  const rawPage=Number(searchParams.page);
  const pageCount=Math.max(1,Math.ceil(hits.length/20));
  const page=Number.isInteger(rawPage)&&rawPage>0?Math.min(rawPage,pageCount):1;
  const groups = groupSearchHits(hits.slice((page-1)*20,page*20));
  const backHref = navigation ? resolveBackHref(navigation, "hub") : null;

  return (
    <div className="stack">
      <header className="page-header">
        {backHref ? <BackLink href={backHref} /> : null}
        <p className="dense">Global search</p>
        <h1>Search</h1>
        <p className="lede">
          Search everything you are learning by German form, meaning, or label.
          Umlaut-free spellings match quietly; results always show correct
          German spelling.
        </p>
      </header>

      <section className="panel hub-filters" aria-labelledby="search-form-heading">
        <h2 id="search-form-heading">Find content</h2>
        <form
          className="hub-filter-form"
          method="get"
          action={withPagesBasePath("/search")}
        >
          <label className="hub-field" htmlFor="global-search-q">
            <span className="hub-field__label">Query</span>
            <input
              id="global-search-q"
              className="hub-input"
              type="search"
              name="q"
              defaultValue={query}
              key={query}
              placeholder="e.g. heißen, Ingenieur, sein"
              autoComplete="off"
              aria-label="Search learning content"
            />
          </label>
          <div className="hub-filter-actions">
            <button className="btn btn-primary" type="submit">
              Search
            </button>
            <Link className="btn btn-secondary" href="/search">
              Clear
            </Link>
          </div>
        </form>
      </section>

      {trimmed.length === 0 ? (
        <div className="panel hub-empty" role="status">
          <h2>Enter a search</h2>
          <p className="muted">
            Type a German word, meaning, or label to see grouped results.
          </p>
        </div>
      ) : hits.length === 0 ? (
        <div className="panel hub-empty" role="status">
          <h2>No matches</h2>
          <p className="muted">
            Nothing matches “{trimmed}”. Try another spelling or clear the
            query.
          </p>
        </div>
      ) : (
        <section aria-labelledby="search-results-heading">
          <h2 id="search-results-heading" className="dense">
            Results ({hits.length})
          </h2>
          <div className="search-groups">
            {groups.map((group) => (
              <section
                key={group.kind}
                className="search-group"
                aria-labelledby={`search-group-${group.kind}`}
              >
                <h3 id={`search-group-${group.kind}`} className="search-group__title">
                  {group.label}
                  <span className="dense"> ({group.hits.length})</span>
                </h3>
                <div className="card-grid hub-results">
                  {group.hits.map((hit) => (
                    <SearchResultCard key={hit.id} hit={hit} query={trimmed} document={projection.documentsById[hit.id]!} page={page}/>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <nav className="library-pagination" aria-label="Search results pages"><p role="status">Showing {(page-1)*20+1}–{Math.min(page*20,hits.length)} of {hits.length} · Page {page} of {pageCount}</p><div className="study-row">{page>1&&<Link className="study-secondary" href={`/search?q=${encodeURIComponent(trimmed)}&page=${page-1}#search-results-heading`}>← Previous page</Link>}{page<pageCount&&<Link className="study-primary" href={`/search?q=${encodeURIComponent(trimmed)}&page=${page+1}#search-results-heading`}>Next page →</Link>}</div></nav>
        </section>
      )}
    </div>
  );
}
