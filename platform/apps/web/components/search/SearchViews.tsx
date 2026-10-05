"use client";
import { LArticle, LButton, LDetails, LDiv, LForm, LH1, LH2, LH3, LH4, LHeader, LInput, LLabel, LNav, LP, LSection, LSpan, LSummary } from "@/components/i18n/LocalizedElements";

import {submitLocalSearch} from "./submit-local-search";
import {useStudyScope} from "@/components/study/StudyScope";
import {useStudy} from "@/components/study/StudyProvider";
import {LineAudio} from "@/components/study/StudyAudio";
import {wordCardSearchKey} from "@/lib/content/word-card-types";
import {numericLessons,tagsForLesson} from "@/lib/study/scope";
import Link from "@/components/i18n/LocalizedLink";
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
  const label=<LSpan className="german" lang="de">{hit.displayLabel.split(" / ").map((form,index)=><LSpan key={`${index}-${form}`}>{index>0?" / ":""}<LSpan className={`study-tone-${entry?.displayForms?.find(display=>display.text===form)?.tone??"plain"}`}>{form}</LSpan></LSpan>)}</LSpan>;
  const names:Record<string,string>={Lexeme:"Word",Verb:"Verb",GrammarConcept:"Grammar",PhrasePattern:"Phrase",QAPair:"Question & answer",LearningActivity:"Activity",ListeningAsset:"Recording",Lesson:"Lesson",Dialogue:"Dialogue",Collection:"Collection"};
  const meta = (
    <>
      <LDiv className="meta-row">
        <LSpan className="meta-chip">{hit.kind}</LSpan>
        <LSpan className="meta-chip">{lessonMembershipLabel(hit.lessonIds)}</LSpan>
        <LSpan className="meta-chip">{hit.id.startsWith("course:")?"Lesson study aid":sourcePriorityLabel(hit.sourcePriority)}</LSpan>
        <LSpan className="meta-chip">{matchMetaLabel(hit.match)}</LSpan>
      </LDiv>
    </>
  );

  const href = linkableResultHref(hit, query,page);
  return <LArticle className="hub-card panel search-learning-result" id={`search-result-${hit.id}`}>
    <LP className="study-eyebrow">{names[hit.kind]??hit.kind} · {lessonMembershipLabel(hit.lessonIds)}</LP>
    <LH4 className="hub-card__title">{href?<Link href={href} className="search-result-link">{label}</Link>:label}</LH4>
    {(meaning||entry?.en)&&<LP>{meaning??entry?.en}</LP>}
    {context&&context!==hit.displayLabel&&context!==meaning&&(context.length>240?<LDetails><LSummary>Show matching context</LSummary><LP className="search-match-context">{context}</LP></LDetails>:<LP className="search-match-context">Matched text: {context}</LP>)}
    {spoken&&<LineAudio text={spoken} src={entry?.audio} compact/>}
    <LDetails><LSummary>About this result</LSummary>{meta}</LDetails>
  </LArticle>;
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
    <LDiv className="stack">
      <LHeader className="page-header">
        {backHref ? <BackLink href={backHref} /> : null}
        <LP className="dense">Global search</LP>
        <LH1>Search</LH1>
        <LP className="lede">
          Search everything you are learning by German form, meaning, or label.
          Umlaut-free spellings match quietly; results always show correct
          German spelling.
        </LP>
      </LHeader>

      <LSection className="panel hub-filters" aria-labelledby="search-form-heading">
        <LH2 id="search-form-heading">Find content</LH2>
        <LForm
          className="hub-filter-form"
          method="get"
          action={withPagesBasePath("/search")}
          onSubmit={submitLocalSearch}
        >
          <LLabel className="hub-field" htmlFor="global-search-q">
            <LSpan className="hub-field__label">Query</LSpan>
            <LInput
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
          </LLabel>
          <LDiv className="hub-filter-actions">
            <LButton className="btn btn-primary" type="submit">
              Search
            </LButton>
            <Link className="btn btn-secondary" href="/search">
              Clear
            </Link>
          </LDiv>
        </LForm>
      </LSection>

      {trimmed.length === 0 ? (
        <LDiv className="panel hub-empty" role="status">
          <LH2>Enter a search</LH2>
          <LP className="muted">
            Type a German word, meaning, or label to see grouped results.
          </LP>
        </LDiv>
      ) : hits.length === 0 ? (
        <LDiv className="panel hub-empty" role="status">
          <LH2>No matches</LH2>
          <LP className="muted">
            Nothing matches “{trimmed}”. Try another spelling or clear the
            query.
          </LP>
        </LDiv>
      ) : (
        <LSection aria-labelledby="search-results-heading">
          <LH2 id="search-results-heading" className="dense">
            Results ({hits.length})
          </LH2>
          <LDiv className="search-groups">
            {groups.map((group) => (
              <LSection
                key={group.kind}
                className="search-group"
                aria-labelledby={`search-group-${group.kind}`}
              >
                <LH3 id={`search-group-${group.kind}`} className="search-group__title">
                  {group.label}
                  <LSpan className="dense"> ({group.hits.length})</LSpan>
                </LH3>
                <LDiv className="card-grid hub-results">
                  {group.hits.map((hit) => (
                    <SearchResultCard key={hit.id} hit={hit} query={trimmed} document={projection.documentsById[hit.id]!} page={page}/>
                  ))}
                </LDiv>
              </LSection>
            ))}
          </LDiv>
          <LNav className="library-pagination" aria-label="Search results pages"><LP role="status">Showing {(page-1)*20+1}–{Math.min(page*20,hits.length)} of {hits.length} · Page {page} of {pageCount}</LP><LDiv className="study-row">{page>1&&<Link className="study-secondary" href={`/search?q=${encodeURIComponent(trimmed)}&page=${page-1}#search-results-heading`}>← Previous page</Link>}{page<pageCount&&<Link className="study-primary" href={`/search?q=${encodeURIComponent(trimmed)}&page=${page+1}#search-results-heading`}>Next page →</Link>}</LDiv></LNav>
        </LSection>
      )}
    </LDiv>
  );
}
