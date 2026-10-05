"use client";
import { LAside, LB, LButton, LDialog, LDiv, LFooter, LH1, LH2, LH3, LHeader, LInput, LLabel, LOption, LP, LSection, LSelect, LSmall, LSpan, LStrong } from "@/components/i18n/LocalizedElements";


import Link from "@/components/i18n/LocalizedLink";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { withPagesBaseAssetPath } from "@/lib/content/pages-base-path";
import { courseChapters } from "@/lib/study/lesson-four";
import type {
  BookLine,
  BookManifest,
  BookPage,
} from "@/lib/study/types";
import {OriginalTrack} from "./BookRecording";
import {bookContextHref} from "@/lib/study/book-reading";
import "./BookLearning.css";
import { GermanText, MeaningButton, SaveButton, useStudy } from "./StudyProvider";
import { LineAudio, stopStudyAudio } from "./StudyAudio";
import { BookAnswers } from "./BookAnswers";
import { AudioSpeedControl, useAudioSpeed } from "@/components/audio/AudioSpeedControl";

export {OriginalTrack} from "./BookRecording";

function OriginalPage({
  page,
  zoom,
  setZoom,
  selected,
  select,
}: {
  page: BookPage;
  zoom: number;
  setZoom: (value: number) => void;
  selected: string | null;
  select: (id: string) => void;
}) {
  const study = useStudy();
  return (
    <LSection
      className="book-original"
      aria-label={`Original ${page.kind} ${page.pageLabel??`page ${page.printedPage}`}`}
    >
      <LDiv className="book-page-toolbar">
        <LSpan>{page.printedPage>0?`Printed page ${page.printedPage}`:page.pageLabel}</LSpan>
        <LLabel>
          Zoom{" "}
          <LSelect
            aria-label="Page zoom"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          >
            <LOption value={0}>Fit width</LOption>
            <LOption value={100}>100% · Readable</LOption>
            <LOption value={125}>125%</LOption>
            <LOption value={150}>150%</LOption>
            <LOption value={200}>200%</LOption>
            <LOption value={250}>250%</LOption>
            <LOption value={300}>300%</LOption>
          </LSelect>
        </LLabel>
      </LDiv>
      <LP className="book-gesture-hint">{zoom?"Swipe within the page to pan. Choose Read text to select words and phrases.":"Whole page overview. Increase zoom to read, or choose Read text."}</LP>
      <LDiv
        className="book-page-scroll"
        tabIndex={0}
        role="region"
        aria-label="Book page. Scroll to read the enlarged page."
      >
        <LDiv
          className="book-paper"
          style={{
            width: zoom ? `${zoom}%` : "100%",
            minWidth: zoom ? `${(900 * zoom) / 100}px` : 0,
          }}
        >
          <img
            key={page.image}
            src={withPagesBaseAssetPath(page.image)}
            width={page.width}
            height={page.height}
            alt={`Momente A1 ${page.kind}, ${page.section??`Lesson ${page.lesson}`}, ${page.pageLabel??`printed page ${page.printedPage}`}`}
          />
          {page.lines.map((value) => (
            <LButton
              key={value.id}
              type="button"
              className={`book-hotspot${selected === value.id ? " is-selected" : ""}`}
              style={{
                left: `${value.box[0]}%`,
                top: `${value.box[1]}%`,
                width: `${value.box[2]}%`,
                height: `${value.box[3]}%`,
              }}
              aria-label={`Select line: ${value.text}`}
              title={value.text}
              onClick={() => { select(value.id); study?.lookup(value.text); }}
            />
          ))}
        </LDiv>
      </LDiv>
      <LP className="book-page-caption">
        © Hueber Verlag · Tap a line for its meaning.
      </LP>
    </LSection>
  );
}

import {useStudyScope,StudyScopeNotice} from "./StudyScope";
import {tagsForLesson,matchesStudyScope,LAST_AVAILABLE_LESSON,defaultStudyScope} from "@/lib/study/scope";

export function BookReader({
  book,
  speech,
}: {
  book: BookManifest;
  speech: Record<string, string>;
}) {
  const study = useStudy();
  const {scope,setScope}=useStudyScope();
  const selectedPages=useMemo(()=>book.pages.filter(p=>matchesStudyScope({...tagsForLesson(p.lesson),lessons:p.lessons??[p.lesson]},scope)),[book,scope]);
  const chapters=courseChapters.filter(c=>matchesStudyScope(tagsForLesson(c.number),scope));
  const params = useSearchParams();
  function replaceContext(href: string) {
    // All book pages and recordings are already loaded. Keep the current path
    // (including the Pages base) so changing a selection also works offline.
    window.history.replaceState(null, "", `${window.location.pathname}?${href.split("?")[1]}`);
  }
  const [view, setView] = useState<"read" | "page" | "split">("page");
  const [expanded, setExpanded] = useState(false);
  const fullscreen = useRef<HTMLDialogElement>(null);
  const audioSpeed = useAudioSpeed();
  const rate = audioSpeed.speed;
  const [zoom, setZoom] = useState(100);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedLineRef=useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [showContents, setShowContents] = useState(false);
  useEffect(()=>{if(study?.ready){setView(study.state.reader?.view??"page");setZoom(study.state.reader?.zoom??100);}},[study?.ready,study?.state.reader]);
  function changeView(next:"read"|"page"|"split"){setView(next);study?.update(old=>({...old,reader:{view:next,zoom}}));}
  function changeZoom(next:number){setZoom(next);study?.update(old=>({...old,reader:{view,zoom:next}}));}
  useEffect(() => {
    if (!expanded) {
      fullscreen.current?.close();
      return;
    }
    fullscreen.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);
  const pageId = params.get("page") ?? study?.state.resume ?? "coursebook-29";
  const page =
    (params.has("page")?book.pages:selectedPages).find((p) => p.id === pageId) ?? selectedPages[0] ??
    book.pages.find((p) => p.id === "coursebook-29")!;
  const chapter = courseChapters.find((c) => c.number === page.lesson)!;
  const allKindPages = selectedPages.filter((p) => p.kind === page.kind);
  const index = allKindPages.findIndex((p) => p.id === page.id);
  const nearbyPages = allKindPages.slice(Math.max(0,index-2),Math.min(allKindPages.length,index+3));
  const tracks = book.audio.filter((track) => page.audioIds.includes(track.id));
  const activeTrack=tracks.find(track=>track.id===params.get("track"))??tracks[0];
  const requestedTranscriptLine=Number(params.get("transcriptLine"));
  const transcriptLine=params.has("transcriptLine")&&Number.isInteger(requestedTranscriptLine)&&requestedTranscriptLine>=0&&requestedTranscriptLine<(activeTrack?.transcript?.lines.length??0)?requestedTranscriptLine:undefined;
  useEffect(()=>{const lineId=params.get("line");setSelected(page.lines.some(line=>line.id===lineId)?lineId:null);},[page,params]);
  const line = page.lines.find((l) => l.id === selected);
  useEffect(()=>{if(line&&!expanded&&!showContents)selectedLineRef.current?.scrollIntoView({block:"center"});},[line,expanded,showContents]);
  function selectLine(id:string){setSelected(id);replaceContext(bookContextHref(page.id,{line:id,...(activeTrack?{track:activeTrack.id}:{})}));}
  const marked = study?.state.bookmarks.includes(page.id) ?? false;
  const done = study?.state.completedPages.includes(page.id) ?? false;
  const results = useMemo(
    () =>
      search.trim().length < 2
        ? []
        : selectedPages
            .flatMap((p) =>
              p.lines
                .filter((l) =>
                  l.text
                    .toLocaleLowerCase("de")
                    .includes(search.trim().toLocaleLowerCase("de")),
                )
                .slice(0, 3)
                .map((l) => ({ page: p, line: l })),
            )
            .slice(0, 18),
    [search, selectedPages],
  );
  const update = study?.update;
  const ready = study?.ready;
  useEffect(() => {
    if (ready)
      update?.((old) =>
        old.resume === page.id ? old : { ...old, resume: page.id },
      );
    return () => stopStudyAudio();
  }, [page.id, ready, update]);
  function go(id: string,lineId?:string) {
    stopStudyAudio();
    setSelected(lineId??null);
    replaceContext(bookContextHref(id,lineId?{line:lineId}:{}));
  }
  if(!selectedPages.length)return <LDiv className="book-workspace"><LH1>Your interactive book</LH1><LP role="status">No book pages match this selection. Book pages are course material, grouped by the concepts taught in each lesson.</LP><LButton type="button" className="study-primary" onClick={()=>setScope(defaultStudyScope())}>Show all book pages</LButton></LDiv>;
  function lineMeaning(value: BookLine) {
    const match = study?.dictionary.find(
      (entry) => entry.example === value.text || entry.de === value.text,
    );
    return match
      ? match.example === value.text
        ? match.translation
        : match.en
      : `${page.kind === "coursebook" ? "Coursebook" : "Workbook"}, page ${page.printedPage}. Recall the meaning; add your own translation in My review.`;
  }
  const renderLine = (value: BookLine) => (
    <LDiv
      key={value.id}
      data-line-id={value.id}
      className={`book-line${selected === value.id ? " is-active" : ""}`}
    >
      <LP>
        <GermanText text={value.text} />
      </LP>
      <LDiv className="book-line-actions">
        <MeaningButton text={value.text} />
        <LineAudio
          text={value.text}
          src={speech[value.text]}
          rate={rate}
          compact
        />
        <SaveButton
          compact
          item={{
            id: value.id,
            title: value.text,
            meaning: lineMeaning(value),
            kind: "line",
            href: bookContextHref(page.id,{line:value.id}),
            lesson: page.lesson,
            studyTags:{...tagsForLesson(page.lesson),lessons:page.lessons??[page.lesson]},
            audio: speech[value.text] ?? null,
          }}
        />
      </LDiv>
    </LDiv>
  );
  return (
    <LDiv className="book-workspace">
      <StudyScopeNotice tags={{...tagsForLesson(page.lesson),lessons:page.lessons??[page.lesson]}}/>
      <LHeader className="book-header">
        <LDiv>
          <LP className="study-eyebrow">Momente A1 · Lessons 1–{LAST_AVAILABLE_LESSON}</LP>
          <LH1>{page.kind==="coursebook"?"Coursebook":"Workbook"} · {page.pageLabel??`Page ${page.printedPage}`}</LH1>
          <LP className="book-current-topic" lang="de">{chapter.title}</LP>
        </LDiv>
        <LButton
          type="button"
          className="study-secondary"
          aria-expanded={showContents}
          onClick={() => setShowContents(!showContents)}
        >
          ☷ Contents & search
        </LButton>
      </LHeader>
      {showContents&&<LDiv className="book-source-picker"><Link className="study-secondary" href="/saved">My review</Link><Link className="study-secondary" href="/cheat-sheets">Cheat sheets →</Link>
        <LDiv className="study-segmented" role="group" aria-label="Book type">
          {["coursebook", "workbook"].map((kind) => (
            <LButton
              type="button"
              key={kind}
              aria-pressed={page.kind === kind}
              onClick={() =>
                go(`${kind}-${kind === "coursebook" ? chapter.kb : chapter.ab}`)
              }
            >
              {kind === "coursebook" ? "Coursebook" : "Workbook"}
            </LButton>
          ))}
        </LDiv>
        <LLabel className="study-inline-field">
          Lesson
          <LSelect
            value={page.lesson}
            onChange={(e) => {
              const next = courseChapters.find(
                (c) => c.number === Number(e.target.value),
              )!;
              go(
                `${page.kind}-${page.kind === "coursebook" ? next.kb : next.ab}`,
              );
            }}
          >
            {chapters.map((c) => (
              <LOption key={c.number} value={c.number}>
                {c.number} · {c.topic}
              </LOption>
            ))}
          </LSelect>
        </LLabel>
      </LDiv>}
      {showContents && (
        <LAside className="book-contents" aria-label="Book contents">
          <LDiv>
            <LLabel className="study-field">
              Find text in the book
              <LInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${selectedPages.length} selected pages…`}
              />
            </LLabel>
            {search.trim().length >= 2 ? (
              <LDiv className="book-search-results" aria-live="polite">
                {!results.length && <LP>No matching lines.</LP>}
                {results.map((result) => (
                  <LButton
                    type="button"
                    key={result.line.id}
                    onClick={() => {
                      go(result.page.id,result.line.id);
                      setSearch("");
                      setShowContents(false);
                    }}
                  >
                    <LSmall>
                      {result.page.kind} · p. {result.page.printedPage}
                    </LSmall>
                    <LSpan lang="de">{result.line.text}</LSpan>
                  </LButton>
                ))}
              </LDiv>
            ) : (
              <LDiv className="book-chapters">
                <LButton type="button" onClick={()=>{go(`${page.kind}-cover`);setShowContents(false);}}><LB>↖</LB><LSpan><LStrong>Start of the book</LStrong><LSmall>Cover, map, contents & introduction</LSmall></LSpan></LButton>
                {chapters.map((c) => (
                  <LButton
                    type="button"
                    key={c.number}
                    aria-pressed={c.number === page.lesson}
                    onClick={() => {
                      go(
                        `${page.kind}-${page.kind === "coursebook" ? c.kb : c.ab}`,
                      );
                      setShowContents(false);
                    }}
                  >
                    <LB>{String(c.number).padStart(2,"0")}</LB>
                    <LSpan>
                      <LStrong lang="de">{c.title}</LStrong>
                      <LSmall>{c.topic}</LSmall>
                    </LSpan>
                  </LButton>
                ))}
              </LDiv>
            )}
          </LDiv>
          <LDiv>
            <LH3>Bookmarked pages</LH3>
            {!study?.state.bookmarks.length && (
              <LP className="muted">Use Bookmark on any page to keep it here.</LP>
            )}
            {study?.state.bookmarks.map((id) => {
              const p = selectedPages.find((candidate) => candidate.id === id);
              return (
                p && (
                  <LButton
                    type="button"
                    className="study-secondary"
                    key={id}
                    onClick={() => go(id)}
                  >
                    {p.kind === "coursebook" ? "Coursebook" : "Workbook"} ·{" "}
                    {p.pageLabel??p.printedPage}
                  </LButton>
                )
              );
            })}
            <LP className="dense">
              {selectedPages.filter(p=>study?.state.completedPages.includes(p.id)).length} of {selectedPages.length}{" "}
              pages marked studied
            </LP>
          </LDiv>
        </LAside>
      )}
      {showContents&&<LSection className="book-chapter-title">
        <LDiv>
          <LSpan className="book-chapter-number">{page.section?.startsWith("Getting")?"A1":page.section?.startsWith("Module")?`M${page.section.match(/^Module (\d+)/)?.[1]??1}`:String(page.lesson).padStart(2,"0")}</LSpan>
          <LDiv>
            <LP className="study-eyebrow">{page.section??chapter.topic}</LP>
            <LH2 lang={page.section?.startsWith("Lesson")?"de":"en"}>{page.section?.startsWith("Lesson")?chapter.title:page.section??chapter.title}</LH2>
          </LDiv>
        </LDiv>
        <Link href={page.section?.startsWith("Lesson")?`/lessons/${String(page.lesson).padStart(2,"0")}`:"/lessons"}>{page.section?.startsWith("Lesson")?"Study lesson":"Explore lessons"} →</Link>
      </LSection>}
      <LDiv className="book-reading-tools">
        <LLabel className="study-inline-field book-page-picker">Go to page<LSelect aria-label="Go to page" value={page.id} onChange={event=>go(event.target.value)}>{allKindPages.map(p=><LOption value={p.id} key={p.id}>{p.pageLabel??`Page ${p.printedPage}`} · {p.section??`Lesson ${p.lesson}`}</LOption>)}</LSelect></LLabel>
        <LLabel className="study-inline-field">View<LSelect aria-label="Reading view" value={view} onChange={event=>changeView(event.target.value as "read"|"page"|"split")}><LOption value="page">Page</LOption><LOption value="read">Read text</LOption><LOption value="split">Both</LOption></LSelect></LLabel>
        <LButton
          type="button"
          className="study-secondary"
          onClick={() => setExpanded(true)}
        >
          Full screen ↗
        </LButton>
        <AudioSpeedControl control={audioSpeed}/>
        <LButton
          type="button"
          className="study-secondary"
          aria-pressed={marked}
          onClick={() =>
            study?.update((old) => ({
              ...old,
              bookmarks: marked
                ? old.bookmarks.filter((id) => id !== page.id)
                : [...old.bookmarks, page.id],
            }))
          }
        >
          {marked ? "★ Bookmarked" : "☆ Bookmark"}
        </LButton>
      </LDiv>
      <LDiv className={`book-reading-grid book-view-${view}`}>
        {view !== "read" && (
          <OriginalPage
            page={page}
            zoom={zoom}
            setZoom={changeZoom}
            selected={selected}
            select={selectLine}
          />
        )}
        <LSection
          id="book-listening"
          className="book-text-panel"
          aria-label="Page study tools"
        >
          {tracks.length > 0 && (
            <LDiv className="book-original-audio">
              <LH3>Listen to the book</LH3>
              {tracks.length>1&&<LLabel className="study-field">Recording<LSelect aria-label="Page recording" value={activeTrack!.id} onChange={event=>replaceContext(bookContextHref(page.id,{track:event.target.value}))}>{tracks.map(track=><LOption key={track.id} value={track.id}>{track.label}</LOption>)}</LSelect></LLabel>}
              {activeTrack&&<><OriginalTrack key={activeTrack.id} track={activeTrack} rate={rate} {...(transcriptLine!==undefined?{transcriptLine}:{})}/><Link href={`/listening?track=${encodeURIComponent(activeTrack.id)}`}>Open focused listening →</Link></>}
            </LDiv>
          )}
          {line && (
            <LDiv className="book-selected-line" ref={selectedLineRef}>
              <LDiv className="study-row">
                <LStrong>Selected line</LStrong>
                <LButton
                  className="study-icon-button"
                  type="button"
                  aria-label="Clear selected line"
                  onClick={() => {setSelected(null);replaceContext(bookContextHref(page.id));}}
                >
                  ✕
                </LButton>
              </LDiv>
              {renderLine(line)}
            </LDiv>
          )}
          {view !== "page" ? (
            <>
              <LDiv className="book-text-heading">
                <LH3>Read & explore</LH3>
                <LP>
                  Tap a word, or highlight a phrase for its meaning.{" "}
                  <LSpan>Synthesized line audio</LSpan>
                </LP>
              </LDiv>
              <LDiv className="book-readable-lines">
                {page.lines.map(renderLine)}
              </LDiv>
            </>
          ) : (
            !line && (
              <LP className="muted">
                Select a line on the original page to hear it, look up words, or
                save it.
              </LP>
            )
          )}
        </LSection>
      </LDiv>
      <BookAnswers key={page.id} page={page} speech={speech} rate={rate}/>
      <LFooter className="book-page-nav">
        <LButton
          type="button"
          className="study-secondary"
          disabled={index <= 0}
          onClick={() => go(allKindPages[index - 1]!.id)}
        >
          ← Previous
        </LButton>
        <LDiv role="group" className="book-page-dots" aria-label="Nearby pages">
          {nearbyPages.map((p) => (
            <LButton
              type="button"
              key={p.id}
              aria-label={p.pageLabel??`Page ${p.printedPage}`}
              aria-current={p.id === page.id ? "page" : undefined}
              onClick={() => go(p.id)}
            >
              {p.printedPage>0?p.printedPage:p.printedPage===-1?"Cover":"Map"}
              {study?.state.completedPages.includes(p.id) && (
                <LSpan aria-hidden="true"> ✓</LSpan>
              )}
            </LButton>
          ))}
        </LDiv>
        <LButton
          type="button"
          className="study-primary"
          disabled={index === allKindPages.length - 1}
          onClick={() => go(allKindPages[index + 1]!.id)}
        >
          Next page →
        </LButton>
      </LFooter>
      <LDiv className="study-row book-complete">
        <LButton
          type="button"
          className="study-secondary"
          aria-pressed={done}
          onClick={() =>
            study?.update((old) => ({
              ...old,
              completedPages: done
                ? old.completedPages.filter((id) => id !== page.id)
                : [...old.completedPages, page.id],
            }))
          }
        >
          {done ? "✓ Page studied" : "Mark page studied"}
        </LButton>
        <LP className="muted">
          Your place, bookmarks, and review selections are saved on this device.
        </LP>
      </LDiv>
      <LDialog
        className="book-fullscreen"
        ref={fullscreen}
        aria-labelledby="fullscreen-book-title"
        onCancel={() => setExpanded(false)}
        onClose={() => setExpanded(false)}
      >
        {expanded && (
          <>
            <LDiv className="book-fullscreen-header">
              <LH2 id="fullscreen-book-title">
                {page.kind === "coursebook" ? "Coursebook" : "Workbook"} · {page.pageLabel??`Page ${page.printedPage}`}
              </LH2>
              <LButton
                className="study-secondary"
                type="button"
                onClick={() => setExpanded(false)}
              >
                Close full screen
              </LButton>
            </LDiv>
            <BookAnswers key={`fullscreen-${page.id}`} page={page} speech={speech} rate={rate}/>
            {line && (
              <LDiv className="book-selected-line">{renderLine(line)}</LDiv>
            )}
            <OriginalPage
              page={page}
              zoom={zoom}
              setZoom={changeZoom}
              selected={selected}
              select={selectLine}
            />
          </>
        )}
      </LDialog>
      <LP className="book-credit">
        Momente A1 · © Hueber Verlag.{" "}
        <Link href="/references">Sources & credits</Link>
      </LP>
    </LDiv>
  );
}
