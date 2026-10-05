'use client';
import { translate, localize } from '../lib/i18n.js';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Headphones,
  BookOpen,
  Check,
  Search,
} from 'lucide-react';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Textarea } from './ui/textarea.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.js';
import Link from './site-link.js';
import { SpeakingRecorder } from './study-media.js';
import { useStudy, downloadFile, type StudyStore } from './study-store.js';
import { studySources, type StudySection } from '../lib/study-sources.js';
import { wordCount } from '../lib/learning.js';
import type { Locale } from '../lib/catalog.js';
import type { SourceWork } from '../lib/study-state.js';
import { SaveReview } from './flow-controls.js';
import { contextMatches } from '../lib/study-flow.js';
import { bi } from '../lib/learning.js';
import sourceCourseIndex from '../lib/data/source-course-index.json';

export default function SourceStudio({
  lang,
  role,
}: {
  lang: Locale;
  role: string;
}) {
  const store = useStudy();
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState('all');
  const [kind, setKind] = useState('all');
  const t = (de: string, en: string) => (translate(de, en, lang));
  useEffect(() => {
    setSelected(new URLSearchParams(location.search).get('section') || '');
  }, []);
  function open(id: string) {
    setSelected(id);
    history.replaceState(
      null,
      '',
      id ? '/studio?section=' + encodeURIComponent(id) : '/studio',
    );
    window.scrollTo({ top: 0 });
  }
  if (!store.ready)
    return (
      <p role="status">
        {t('Lernstudio wird geladen …', 'Loading the study studio…')}
      </p>
    );
  const section = studySources.find((s) => s.section_id === selected);
  const filtered = studySources.filter(
    (s) =>
      contextMatches(store.state.flow.scope, { sectionId: s.section_id }) &&
      (collection === 'all' || s.collection === collection) &&
      (kind === 'all' || s.transcript_kind === kind) &&
      `${s.heading_text} ${s.studyText}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  return (
    <div className="source-studio">
      {store.error && (
        <p className="notice" role="alert">
          {t(
            'Speichern fehlgeschlagen. Exportiere deine Arbeit.',
            'Saving failed. Export your work.',
          )}
        </p>
      )}
      {section ? (
        <SourceSession
          key={section.section_id}
          section={section}
          lang={lang}
          role={role}
          store={store}
          back={() => open('')}
          next={() =>
            open(
              filtered.length
                ? filtered[
                    (Math.max(-1, filtered.indexOf(section)) + 1) %
                      filtered.length
                  ].section_id
                : '',
            )
          }
        />
      ) : (
        <>
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {t('MIT DEINEM MATERIAL ARBEITEN', 'WORK WITH YOUR MATERIAL')}
              </p>
              <h1>{t('Das Quellenstudio', 'The source studio')}</h1>
              <p>
                {t(
                  'Hören, lesen, zusammenfassen und sprechen. Mit den Aufnahmen und Transkripten deines Buchs.',
                  'Listen, read, summarise and speak with your book’s recordings and transcripts.',
                )}
              </p>
            </div>
          </div>
          <p className="study-disclosure">
            {t(
              'Vorläufige Transkripte und Medienzuordnungen. Die Lernaufgaben und Lehrhinweise sind von Wortweg ergänzt und bearbeitbar.',
              'Provisional transcripts and media links. Study activities and teaching guidance are added by Wortweg and can be revised.',
            )}
          </p>
          <div className="studio-toolbar">
            <label className="study-field">
              <span>
                <Search size={16} />{' '}
                {t(
                  'In Überschriften und Texten suchen',
                  'Search headings and text',
                )}
              </span>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t(
                  'z. B. Vorlesung, Klima, Track 2',
                  'e.g. Vorlesung, Klima, Track 2',
                )}
              />
            </label>
            <label className="study-field">
              {t('Sammlung', 'Collection')}
              <select
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
              >
                <option value="all">
                  {t('Alle Sammlungen', 'All collections')}
                </option>
                <option value="course">
                  {t('Kursmaterial', 'Course materials')}
                </option>
                <option value="mock-exam-1">
                  {t('Modellprüfung 1', 'Mock exam 1')}
                </option>
              </select>
            </label>
            <label className="study-field">
              {t('Medienart', 'Media type')}
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="all">
                  {t('Audio und Video', 'Audio and video')}
                </option>
                <option value="audio">Audio</option>
                <option value="video">Video</option>
              </select>
            </label>
          </div>
          <p role="status">
            {filtered.length} / {studySources.length}{' '}
            {t('Lerneinheiten', 'study units')}
          </p>
          {!filtered.length && (
            <Button
              variant="outline"
              onClick={() => {
                setQuery('');
                setCollection('all');
                setKind('all');
              }}
            >
              {t('Filter zurücksetzen', 'Clear filters')}
            </Button>
          )}
          <div className="studio-grid">
            {filtered.map((s) => (
              <article className="panel studio-card" key={s.section_id}>
                <span className="eyebrow">
                  {s.collection === 'course'
                    ? t('Kursmaterial', 'Course materials')
                    : t('Modellprüfung 1', 'Mock exam 1')}{' '}
                  · {s.transcript_kind === 'audio' ? 'Audio' : 'Video'}
                </span>
                <h2 lang="de">{s.heading_text}</h2>
                <p className="studio-excerpt" lang="de">
                  {s.studyText.split('\n').slice(1).join(' ')}
                </p>
                <div className="studio-card-bottom">
                  <span>
                    {store.state.sourceWork[s.section_id]?.reviewed &&
                    store.state.sourceWork[s.section_id]?.revision ===
                      s.studyRevision ? (
                      <>
                        <Check size={16} />
                        {t('Selbst überprüft', 'Self-reviewed')}
                      </>
                    ) : (
                      t('Vorläufig', 'Provisional')
                    )}
                  </span>
                  <Button onClick={() => open(s.section_id)}>
                    {t('Einheit öffnen', 'Open unit')}
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SourceSession({
  section: s,
  lang,
  role,
  store,
  back,
  next,
}: {
  section: StudySection;
  lang: Locale;
  role: string;
  store: StudyStore;
  back: () => void;
  next: () => void;
}) {
  const t = (de: string, en: string) => (translate(de, en, lang));
  const [tab, setTab] = useState(role === 'teacher' ? 'teach' : 'listen');
  const [showText, setShowText] = useState(false);
  const [compare, setCompare] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [mediaError, setMediaError] = useState(false);
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [saved, setSaved] = useState(false);
  const player = useRef<HTMLMediaElement | null>(null);
  const media = s.media[mediaIndex];
  const work: SourceWork = store.state.sourceWork[s.section_id] ?? {
    revision: s.studyRevision,
    notes: '',
    summary: '',
    dictation: '',
    teacherNotes: '',
    reviewed: false,
    updatedAt: 0,
  };
  function patch(change: Partial<SourceWork>) {
    store.setState((state) => ({
      ...state,
      sourceWork: {
        ...state.sourceWork,
        [s.section_id]: { ...work, ...change, updatedAt: Date.now() },
      },
    }));
  }
  function exportWork() {
    downloadFile(
      'wortweg-' + s.section_id + '.json',
      JSON.stringify(
        {
          section: s,
          work,
          guidance:
            'Wortweg app-authored study activities; not publisher exercises or official assessment.',
        },
        null,
        2,
      ),
      'application/json',
    );
  }
  const excerpt = s.studyText.split('\n').slice(1).join(' ').trim();
  const dictationTarget = excerpt
    .split(/(?<=[.!?])\s+/u)
    .slice(0, 2)
    .join(' ');
  const mediaProps = {
    controls: true,
    preload: 'metadata',
    src: media?.url,
    onError: () => setMediaError(true),
    onLoadedMetadata: () => {
      if (player.current) player.current.playbackRate = speed;
    },
    onTimeUpdate: () => {
      if (
        player.current &&
        loopStart !== null &&
        loopEnd !== null &&
        player.current.currentTime >= loopEnd
      )
        player.current.currentTime = loopStart;
    },
  };
  return (
    <>
      <Button variant="ghost" onClick={back}>
        <ArrowLeft size={16} />
        {t('Alle Quellen', 'All sources')}
      </Button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {s.collection === 'course'
              ? t('KURSMATERIAL', 'COURSE MATERIALS')
              : t('MODELLPRÜFUNG 1', 'MOCK EXAM 1')}
          </p>
          <h1 lang="de">{s.heading_text}</h1>
          <SaveReview
            lang={lang}
            item={{
              id: 'transcript:' + s.section_id,
              kind: 'excerpt',
              title: bi(s.heading_text, s.heading_text),
              answer: bi(s.studyText, s.studyText),
              href: '/studio?section=' + encodeURIComponent(s.section_id),
              origin: 'source-transcript',
              sectionId: s.section_id,
              sourceId: s.transcript_source_id,
              revision: s.studyRevision,
              savedAt: 0,
            }}
          />
          <p>
            {t(
              'Quellengeprüftes Transkript · eigene Lernhilfen · verknüpfte Buchaufgaben mit Verlagslösungen',
              'Source-reviewed transcript · app-authored study aids · linked book activities with publisher solutions',
            )}
          </p>
        </div>
        <Button variant="outline" onClick={exportWork}>
          <Download size={16} />
          {t('Arbeit exportieren', 'Export work')}
        </Button>
      </div>
      <div className="panel source-backlinks"><h3>{t('Zugehörige Buchseiten', 'Linked book pages')}</h3><div className="study-actions">{[...new Set(sourceCourseIndex.edges.filter(e => sourceCourseIndex.bindings.some(b => b.id === e.bindingId && b.sectionId === s.section_id)).map(e => e.page))].map(page => <Link key={page} className="text-link" href={'/book?page=' + page}>{t('Buchseite', 'Book page')} PDF {page}</Link>)}</div></div>
      {work.revision !== s.studyRevision && (
        <p className="notice">
          {t(
            'Diese Quelle wurde überarbeitet. Deine bisherigen Antworten bleiben erhalten.',
            'This source has been revised. Your earlier responses have been preserved.',
          )}{' '}
          <Button
            variant="outline"
            onClick={() =>
              patch({ revision: s.studyRevision, reviewed: false })
            }
          >
            {t(
              'Mit neuer Fassung weiterarbeiten',
              'Continue with new revision',
            )}
          </Button>
        </p>
      )}
      <div className="studio-session">
        <aside>
          <section className="panel studio-player">
            <h2>
              <Headphones size={20} />
              {t('Aufnahme', 'Recording')}
            </h2>
            {s.media.length > 1 && (
              <label className="study-field">
                {t(
                  'Vorläufige Videozuordnung auswählen',
                  'Choose a candidate video link',
                )}
                <select
                  value={mediaIndex}
                  onChange={(e) => {
                    setMediaIndex(Number(e.target.value));
                    setLoopStart(null);
                    setLoopEnd(null);
                    setMediaError(false);
                  }}
                >
                  {s.media.map((m, i) => (
                    <option key={m.sourceId} value={i}>
                      {
                        s.media_candidates.find(
                          (c) => c.source_id === m.sourceId,
                        )?.filename
                      }
                    </option>
                  ))}
                </select>
              </label>
            )}
            {media &&
              (s.transcript_kind === 'video' ? (
                <video
                  key={media.url}
                  ref={(el) => {
                    player.current = el;
                  }}
                  {...mediaProps}
                  aria-label={t('Quellenvideo', 'Source video')}
                />
              ) : (
                <audio
                  key={media.url}
                  ref={(el) => {
                    player.current = el;
                  }}
                  {...mediaProps}
                  aria-label={t('Quellenaudio', 'Source audio')}
                />
              ))}
            {mediaError && (
              <p role="alert">
                {t(
                  'Aufnahme konnte nicht geladen werden. Öffne die Datei direkt oder arbeite mit dem Transkript.',
                  'The recording could not load. Open the file directly or use the transcript.',
                )}
              </p>
            )}
            <div className="study-actions">
              <label>
                {t('Tempo', 'Speed')}{' '}
                <select
                  value={speed}
                  onChange={(e) => {
                    setSpeed(Number(e.target.value));
                    if (player.current)
                      player.current.playbackRate = Number(e.target.value);
                  }}
                >
                  {[0.75, 1, 1.25, 1.5].map((v) => (
                    <option key={v} value={v}>
                      {v}×
                    </option>
                  ))}
                </select>
              </label>
              <Button
                variant="outline"
                onClick={() => {
                  if (player.current)
                    player.current.currentTime = Math.max(
                      0,
                      player.current.currentTime - 10,
                    );
                }}
              >
                −10 s
              </Button>
            </div>
            <div className="study-actions">
              <Button
                variant="outline"
                onClick={() => {
                  setLoopStart(player.current?.currentTime ?? 0);
                  setLoopEnd(null);
                }}
              >
                {t('A setzen', 'Set A')}
                {loopStart !== null && ` (${Math.floor(loopStart)}s)`}
              </Button>
              <Button
                variant="outline"
                disabled={loopStart === null}
                onClick={() => {
                  const now = player.current?.currentTime ?? 0;
                  if (loopStart !== null && now > loopStart + 0.5) {
                    setLoopEnd(now);
                    if (player.current) player.current.currentTime = loopStart;
                  }
                }}
              >
                {t('B setzen', 'Set B')}
                {loopEnd !== null && ` (${Math.floor(loopEnd)}s)`}
              </Button>
              <Button
                variant="ghost"
                disabled={loopStart === null}
                onClick={() => {
                  setLoopStart(null);
                  setLoopEnd(null);
                }}
              >
                {t('Schleife löschen', 'Clear loop')}
              </Button>
            </div>
            <small>
              {t(
                'A am Anfang und B später während der Wiedergabe setzen, um einen Abschnitt zu wiederholen.',
                'Set A at the start and B later during playback to repeat a section.',
              )}
            </small>
            <p className="caption">
              {media?.kind === 'original'
                ? t('Originaldatei', 'Original file')
                : t(
                    'Komprimierte Webfassung der Originalaufnahme',
                    'Compressed web rendition of the source recording',
                  )}{' '}
              · {t('Ganzaufnahme zugeordnet; keine Satz-Zeitmarken', 'Whole-track identity linked; no sentence timestamps')}
            </p>
            {media && (
              <a
                className="text-link"
                href={media.url}
                target="_blank"
                rel="noreferrer"
              >
                {t('Mediendatei öffnen', 'Open media file')}
              </a>
            )}
          </section>
          <section className="panel">
            <h2>{t('Mein Wortschatz', 'My vocabulary')}</h2>
            <label className="study-field">
              {t('Wort oder Ausdruck', 'Word or phrase')}
              <Input
                value={word}
                onChange={(e) => {
                  setWord(e.target.value);
                  setSaved(false);
                }}
              />
            </label>
            <label className="study-field">
              {t('Bedeutung in deiner Sprache', 'Meaning in your language')}
              <Input
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
              />
            </label>
            <Button
              disabled={!word.trim() || !meaning.trim()}
              onClick={() => {
                const id = crypto.randomUUID();
                store.setState((state) => ({
                  ...state,
                  customWords: [
                    ...state.customWords,
                    {
                      id,
                      de: word.trim(),
                      en: meaning.trim(),
                      example: s.heading_text,
                      tag: s.section_id,
                    },
                  ],
                  savedWords: [...state.savedWords, id],
                }));
                setWord('');
                setMeaning('');
                setSaved(true);
              }}
            >
              {t('Zur Wiederholung speichern', 'Save for review')}
            </Button>
            {saved && (
              <p role="status">
                {t('Im Wortschatz gespeichert.', 'Saved to Vocabulary.')}
              </p>
            )}
            <Link className="text-link" href="/vocabulary">
              {t('Wörter wiederholen', 'Review words')}
            </Link>
          </section>
        </aside>
        <section className="panel studio-work">
          <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
            <TabsList className="studio-tabs">
              <TabsTrigger value="listen">
                {t('Verstehen', 'Understand')}
              </TabsTrigger>
              <TabsTrigger value="recall">
                {t('Schreiben', 'Write')}
              </TabsTrigger>
              <TabsTrigger value="speak">{t('Sprechen', 'Speak')}</TabsTrigger>
              <TabsTrigger value="teach">{t('Lehren', 'Teach')}</TabsTrigger>
            </TabsList>
            <TabsContent value="listen">
              <h2>
                {t('Erst hören, dann nachlesen', 'Listen first, then read')}
              </h2>
              <p>
                {t(
                  'Notiere Thema, Beteiligte und drei wichtige Informationen. Lies anschließend nach und ergänze Belege.',
                  'Note the topic, speakers and three important details. Then read the transcript and add supporting evidence.',
                )}
              </p>
              <label className="study-field">
                {t('Meine Hörnotizen', 'My listening notes')}
                <Textarea
                  rows={6}
                  value={work.notes}
                  onChange={(e) =>
                    patch({ notes: e.target.value, reviewed: false })
                  }
                />
              </label>
              <Button
                variant="outline"
                aria-expanded={showText}
                onClick={() => setShowText(!showText)}
              >
                <BookOpen size={16} />
                {showText
                  ? t('Transkript ausblenden', 'Hide transcript')
                  : t('Transkript anzeigen', 'Show transcript')}
              </Button>
              {showText && (
                <div className="transcript-text" lang="de">
                  {s.studyText}
                </div>
              )}
            </TabsContent>
            <TabsContent value="recall">
              <h2>
                {t(
                  'Den Inhalt in eigene Worte fassen',
                  'Put the content into your own words',
                )}
              </h2>
              <p>
                {t(
                  'Schreibe eine kurze Zusammenfassung auf Deutsch. Nenne das Thema, zwei Details und eine Schlussfolgerung. Vergleiche sie anschließend mit der Quelle.',
                  'Write a short German summary. Include the topic, two details and a conclusion. Then compare it with the source.',
                )}
              </p>
              <label className="study-field">
                {t('Meine Zusammenfassung', 'My summary')}
                <Textarea
                  rows={8}
                  value={work.summary}
                  onChange={(e) =>
                    patch({ summary: e.target.value, reviewed: false })
                  }
                />
              </label>
              <p>
                {wordCount(work.summary)} {t('Wörter', 'words')}
              </p>
              <details>
                <summary>
                  {t('Strukturhilfe in deiner Sprache', 'Structure support in your language')}
                </summary>
                <p>
                  {t('Thema: Worum geht es? Belege: Welche zwei Details stützen dein Verständnis? Schluss: Was folgt daraus? Formuliere auf Deutsch in eigenen Worten und ergänze keine unbelegten Fakten.', 'Topic: What is this about? Evidence: Which two details support your understanding? Conclusion: What follows from those details? Use your own German wording; do not add facts absent from the source.')}
                </p>
              </details>
              <h3>{t('Mini-Diktat', 'Mini dictation')}</h3>
              <p>
                {t(
                  'Höre den Anfang. Schreibe die ersten zwei Sätze nach der Überschrift auf und vergleiche anschließend mit dem abgeleiteten Text.',
                  'Listen to the opening. Write the first two sentences after the heading, then compare with the extracted text.',
                )}
              </p>
              <Textarea
                aria-label={t('Mein Diktat', 'My dictation')}
                value={work.dictation}
                onChange={(e) => {
                  patch({ dictation: e.target.value, reviewed: false });
                  setCompare(false);
                }}
                rows={4}
              />
              <Button variant="outline" onClick={() => setCompare(!compare)}>
                {t('Mit Quellentext vergleichen', 'Compare with source text')}
              </Button>
              {compare && (
                <div className="transcript-text" lang="de">
                  {dictationTarget}
                </div>
              )}
            </TabsContent>
            <TabsContent value="speak">
              <h2>
                {t(
                  'Zusammenfassen und Stellung nehmen',
                  'Summarise and respond',
                )}
              </h2>
              <p>
                {t(
                  'Fasse die Quelle mündlich zusammen. Nenne einen Beleg und formuliere anschließend eine Frage an deine Lerngruppe. Die Dauer ist frei wählbar.',
                  'Summarise the source aloud. Give one supporting detail, then ask your study group a question. Choose your own practice duration.',
                )}
              </p>
              <SpeakingRecorder lang={lang} />
              <p>
                {t(
                  'Prüfe: klare Struktur, verständliche Aussprache, ein passender Beleg. Aufnahmen vor dem Verlassen herunterladen.',
                  'Review: clear structure, understandable pronunciation, one relevant detail. Download recordings before leaving this page.',
                )}
              </p>
            </TabsContent>
            <TabsContent value="teach">
              <h2>
                {t('Mit dieser Quelle unterrichten', 'Teach with this source')}
              </h2>
              <p>
                {t(
                  'Wortweg-Unterrichtsvorschlag, frei anpassbar. Keine Verlagslehrerhandreichung.',
                  'An adaptable Wortweg teaching suggestion, not a publisher teacher manual.',
                )}
              </p>
              <ol className="studio-teacher-steps">
                <li>
                  {t(
                    'Einstieg: Überschrift zeigen. Lernende formulieren zwei Erwartungen.',
                    'Warm-up: show the heading. Learners make two predictions.',
                  )}
                </li>
                <li>
                  {t(
                    'Erstes Hören: Thema und Beteiligte notieren. Zu zweit vergleichen.',
                    'First listening: note the topic and speakers. Compare in pairs.',
                  )}
                </li>
                <li>
                  {t(
                    'Zweites Hören: Drei Informationen mit Belegen sammeln. Schwierige Stellen wiederholen.',
                    'Second listening: gather three details with evidence. Replay difficult sections.',
                  )}
                </li>
                <li>
                  {t(
                    'Textarbeit: Hörnotizen am Transkript überprüfen; unbekannte Ausdrücke klären.',
                    'Text work: check listening notes against the transcript; clarify unfamiliar phrases.',
                  )}
                </li>
                <li>
                  {t(
                    'Transfer: Eine Zusammenfassung schreiben oder aufnehmen. Partnerfeedback zu Inhalt und Verständlichkeit.',
                    'Transfer: write or record a summary. Give partner feedback on content and clarity.',
                  )}
                </li>
              </ol>
              <h3>{t('Differenzierung', 'Differentiate')}</h3>
              <p>
                {t(
                  'Unterstützung: Transkript früher zeigen, langsamer abspielen, Satzanfänge anbieten. Vertiefung: Ohne Text zusammenfassen und eine kritische Rückfrage formulieren.',
                  'Support: reveal the transcript earlier, reduce playback speed, provide sentence starters. Extend: summarise without text and formulate a critical follow-up question.',
                )}
              </p>
              <label className="study-field">
                {t(
                  'Meine Lehrnotizen und Zeitplanung',
                  'My teaching notes and timings',
                )}
                <Textarea
                  rows={6}
                  value={work.teacherNotes}
                  onChange={(e) => patch({ teacherNotes: e.target.value })}
                />
              </label>
              <div className="study-actions">
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadFile(
                      'wortweg-source-worksheet.md',
                      `# ${s.heading_text}\n\n${t('Vorläufige Quelle. Aufgaben von Wortweg.', 'Provisional source. Activities by Wortweg.')}\n\n1. ${t('Thema und drei Details notieren.', 'Note the topic and three details.')}\n2. ${t('Zusammenfassung schreiben.', 'Write a summary.')}\n3. ${t('Mündlich zusammenfassen.', 'Summarise aloud.')}\n\n${work.teacherNotes}\n\nSource: ${s.section_id}\nRevision: ${s.studyRevision}\n${location.origin}/studio?section=${encodeURIComponent(s.section_id)}`,
                    )
                  }
                >
                  {t('Arbeitsblatt exportieren', 'Export worksheet')}
                </Button>
                <Button variant="outline" onClick={() => window.print()}>
                  {t('Drucken', 'Print')}
                </Button>
              </div>
              <label className="study-field">
                {t('Link für die Lerngruppe', 'Link for learners')}
                <Input
                  readOnly
                  value={`${typeof location === 'undefined' ? '' : location.origin}/studio?section=${encodeURIComponent(s.section_id)}`}
                  onFocus={(e) => e.target.select()}
                />
              </label>
            </TabsContent>
          </Tabs>
          <div className="studio-review">
            <label>
              <input
                type="checkbox"
                checked={work.reviewed && work.revision === s.studyRevision}
                disabled={!work.notes.trim() && !work.summary.trim()}
                onChange={(e) =>
                  patch({
                    reviewed: e.target.checked,
                    revision: s.studyRevision,
                  })
                }
              />{' '}
              {t(
                'Ich habe meine Antworten mit der Quelle verglichen.',
                'I have compared my responses with the source.',
              )}
            </label>
            <small>
              {t(
                'Selbstkontrolle, keine automatische Sprachbewertung. Auf diesem Gerät gespeichert.',
                'Self-review, not automated language assessment. Saved on this device.',
              )}
            </small>
          </div>
        </section>
      </div>
      <details className="panel studio-provenance">
        <summary>
          {t(
            'Quelle, Bearbeitung und spätere Aktualisierung',
            'Source, editing and future replacement',
          )}
        </summary>
        <p>
          {t(
            'Quellengeprüfter Text mit ausgewiesenen Einschränkungen. Die Zuordnung zur Ganzaufnahme ist belegt; Hörvergleich und Satz-Zeitmarken sind nicht bestätigt. Jeder Export enthält Text, Fundstelle und Fassung.',
            'Source-reviewed text with declared limits. Whole-track identity is bound; listening comparison and sentence timing are not certified. Exports include text, source anchors and revision.',
          )}
        </p>
        <dl>
          <dt>ID</dt>
          <dd>{s.section_id}</dd>
          <dt>{t('Bearbeitungsstand', 'Editorial status')}</dt>
          <dd>
            {s.editorialStatus} · {s.status}
          </dd>
          <dt>{t('Quellenpfad', 'Source path')}</dt>
          <dd>{s.sourcePath}</dd>
          <dt>{t('PDF-Seiten / Zeilen', 'PDF pages / lines')}</dt>
          <dd>
            {s.pdf_pages.join(', ')} / {s.pdf_global_line_start}–
            {s.pdf_global_line_end}
          </dd>
          <dt>{t('Textfassung', 'Text revision')}</dt>
          <dd>{s.studyRevision}</dd>
          <dt>SHA-256</dt>
          <dd>{s.transcript_source_sha256}</dd>
          <dt>{t('Paket', 'Package')}</dt>
          <dd>{s.bundleManifest}</dd>
          {s.updateManifest && (
            <>
              <dt>{t('Aktualisierung', 'Update')}</dt>
              <dd>{s.updateManifest}</dd>
              <dt>{t('Prüfumfang', 'Review scope')}</dt>
              <dd>
                {s.editorialNote} · {s.reviewEvidence}
              </dd>
            </>
          )}
        </dl>
        {s.sourceUnits.map((unit) => (
          <div className="job" key={unit.unit_id}>
            <code>{unit.unit_id}</code>
            {unit.jobs.map((job) => (
              <p key={job.job_id}>
                <code>{job.job_id}</code> · {job.status} · {job.revision || '—'}
              </p>
            ))}
          </div>
        ))}
        <p className="caption">
          {t(
            'Verarbeitungsstatus ist keine Freigabe der Lernaufgaben oder Medienzuordnung.',
            'Processing status does not approve the study activities or media relationship.',
          )}
        </p>
        <Link
          className="text-link"
          href={'/library?source=' + encodeURIComponent(s.transcript_source_id)}
        >
          {t('Originalquelle öffnen', 'Open original source')}
        </Link>
      </details>
      <Button onClick={next}>
        {t('Nächste Quelle', 'Next source')}
        <ArrowRight size={16} />
      </Button>
    </>
  );
}
