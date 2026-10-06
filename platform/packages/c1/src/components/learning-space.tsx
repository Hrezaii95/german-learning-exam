'use client';
import { c1Path, updateC1History } from '../lib/navigation.js';
import { translate, localize, supportText } from '../lib/i18n.js';

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Explicit status regions announce feedback and preserve block layout. */
/* oxlint-disable react/react-compiler -- Browser storage and capability detection intentionally run after SSR hydration. */
import { useEffect, useState } from 'react';
import Link from './site-link.js';
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Check,
  RotateCcw,
  Lightbulb,
  ChevronUp,
  ChevronDown,
  Headphones,
  PenLine,
  Mic,
  Target,
  Bookmark,
} from 'lucide-react';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Textarea } from './ui/textarea.js';
import { Checkbox } from './ui/checkbox.js';
import { Progress } from './ui/progress.js';
import {
  bookMap,
  skillNames,
  grade,
  latestAttempts,
  lessonProgress,
  wordCount,
  type Lesson,
  type Exercise,
} from '../lib/learning.js';
import type { Locale } from '../lib/catalog.js';
import { lessons, activityCount } from '../lib/course.js';
import { studySources } from '../lib/study-sources.js';
import bookIndex from '../lib/data/book-index.json';
import sourceCourseIndex from '../lib/data/source-course-index.json';
import {groupTitle,sourceResponse} from '../lib/source-course.js';
import { parseAssignment, type Draft } from '../lib/study-state.js';
import { useStudy, type StudyStore, downloadFile } from './study-store.js';
import { ListeningPlayer, SpeakingRecorder } from './study-media.js';
import { VocabularyRoom, ProgressRoom, TeacherRoom } from './study-workspaces.js';
import { SaveReview } from './flow-controls.js';
import { exerciseItem, lessonMatches } from '../lib/study-flow.js';
const icons = {
  lesen: BookOpen,
  hoeren: Headphones,
  schreiben: PenLine,
  sprechen: Mic,
};
export function HomeLearning({ lang }: { lang: Locale }) {
  const store = useStudy();
  const { state, ready } = store;
  const t = (de: string, en: string) => translate(de, en, lang);
  const count = lessons.reduce(
    (n, l) => n + lessonProgress(state.attempts, l),
    0,
  );
  const current = lessons.find((l) => l.id === state.activeLesson)!;
  return (
    <section className="study-home">
      <div>
        <span className="eyebrow">
          {t('DEIN LERNPFAD', 'YOUR LEARNING PATH')}
        </span>
        <h2>
          {count
            ? localize(current.title, lang)
            : t(
                'Ausprobieren. Verstehen. Weiterlernen.',
                'Try it. Understand it. Keep going.',
              )}
        </h2>
        <p>
          {lessons.length} {t('geführte Lektionen', 'guided lessons')} · {activityCount} {t('Aufgaben', 'activities')} · {studySources.length} {t('Quelleneinheiten', 'source units')}
        </p>
      </div>
      <div>
        <strong>
          {ready ? count : 0} / {activityCount}
        </strong>
        <span>{t('bearbeitet und überprüft', 'completed and reviewed')}</span>
        <Progress
          value={(count / activityCount) * 100}
          aria-label={t('Lernfortschritt', 'Study progress')}
        />
      </div>
      <Link className="primary-link" href={'/practice?lesson=' + current.id}>
        {count
          ? t('Weiterlernen', 'Continue learning')
          : t('Erste Lektion starten', 'Start your first lesson')}
        <ArrowRight size={17} />
      </Link>
    </section>
  );
}
export function NotebookLearning({ lang }: { lang: Locale }) {
  const { state } = useStudy();
  const t = (de: string, en: string) => translate(de, en, lang);
  const drafts = lessons.flatMap((l) =>
    l.exercises
      .filter((e) => state.drafts[e.id]?.text || state.drafts[e.id]?.outline)
      .map((e) => ({ lesson: l, exercise: e, draft: state.drafts[e.id] })),
  );
  return (
    <section className="panel study-notebook">
      <h2>{t('Meine Arbeit aus den Lektionen', 'My lesson work')}</h2>
      {sourceCourseIndex.groups.filter(g=>state.bookWork['activity:'+g.id]).sort((a,b)=>(state.bookWork['activity:'+b.id].updatedAt||0)-(state.bookWork['activity:'+a.id].updatedAt||0)).map(g=>{const work=state.bookWork['activity:'+g.id];return <article className="note-entry" key={g.id}><h3 lang="de">{groupTitle(g)}</h3><p lang="de">{sourceResponse(work.answers)}</p>{work.notes&&<p>{work.notes}</p>}<p className="caption">{work.reviewed&&work.revision===g.revision?t('Selbst verglichen','Self-compared'):t('In Bearbeitung','In progress')}</p><Link className="text-link" href={'/course?activity='+encodeURIComponent(g.id)}>{t('Aufgabe fortsetzen','Continue activity')}<ArrowRight size={15}/></Link></article>;})}
      {bookIndex.units
        .filter((u) => state.bookWork[u.id])
        .map((u) => (
          <article className="note-entry" key={u.id}>
            <h3>
              {t('Buch · PDF-Seite', 'Book · PDF page')} {u.pageIndex + 1}
            </h3>
            <p>{state.bookWork[u.id].notes}</p>
            <p>
              {
                Object.values(state.bookWork[u.id].answers).filter(Boolean)
                  .length
              }{' '}
              {t('gespeicherte Antworten', 'saved responses')}
            </p>
            <Link
              className="text-link"
              href={'/book?page=' + (u.pageIndex + 1)}
            >
              {t('Antworten öffnen', 'Open responses')}
            </Link>
          </article>
        ))}
      {studySources
        .filter((s) => state.sourceWork[s.section_id])
        .map((s) => (
          <article className="note-entry" key={s.section_id}>
            <h3>{s.heading_text}</h3>
            <p>
              {state.sourceWork[s.section_id].summary ||
                state.sourceWork[s.section_id].notes}
            </p>
            <Link
              className="text-link"
              href={'/studio?section=' + encodeURIComponent(s.section_id)}
            >
              {t('Im Quellenstudio öffnen', 'Open in source studio')}
            </Link>
          </article>
        ))}
      {drafts.length ? (
        drafts.map(({ lesson, exercise, draft }) => (
          <article className="note-entry" key={exercise.id}>
            <h3>{localize(lesson.title, lang)}</h3>
            {draft.outline && <p>{draft.outline}</p>}
            {draft.text && <p lang="de">{draft.text}</p>}
            <Link className="text-link" href={'/practice?lesson=' + lesson.id}>
              {t('In der Lektion weiterarbeiten', 'Continue in the lesson')}
              <ArrowRight size={15} />
            </Link>
          </article>
        ))
      ) : (
        <p>
          {t(
            'Deine Gliederungen und Schreibentwürfe werden hier gesammelt, sobald du in einer Lektion arbeitest.',
            'Your outlines and writing drafts appear here as you work through lessons.',
          )}
        </p>
      )}
      <Link className="text-link" href="/progress">
        {t(
          'Lerndaten sichern und Fortschritt ansehen',
          'Back up study data and view progress',
        )}
        <ArrowRight size={15} />
      </Link>
    </section>
  );
}
export default function LearningSpace({
  lang,
  view,
  initialSkill,
  role,
}: {
  lang: Locale;
  view: string;
  initialSkill: string;
  role: string;
}) {
  const store = useStudy();
  const [active, setActive] = useState('');
  const [filter, setFilter] = useState('all');
  const [assignment, setAssignment] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const t = (de: string, en: string) => translate(de, en, lang);
  useEffect(() => {
    const sync = () => { const query = new URLSearchParams(window.location.search);
      const id = query.get('lesson'); setActive(lessons.some(l => l.id === id) ? id! : ''); };
    sync(); window.addEventListener('popstate', sync);
    const query = new URLSearchParams(window.location.search);
    if (query.has('skill')) setFilter(initialSkill);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.has('assignment'))
      try {
        setAssignment(parseAssignment(hash.get('assignment')!));
      } catch {
        setNotice('invalid-assignment');
      }
    return () => window.removeEventListener('popstate', sync);
  }, [initialSkill]);
  function start(id: string) {
    setActive(id);
    store.setState((s) => ({ ...s, activeLesson: id }));
    updateC1History('/practice', {lesson: id});
  }
  function back() {
    setActive('');
    updateC1History('/practice', {lesson: null});
  }
  if (!store.ready)
    return (
      <section className="panel" role="status">
        {t('Dein Lernraum wird geladen …', 'Loading your study space…')}
      </section>
    );
  const lesson = lessons.find((l) => l.id === active);
  const content =
    view === 'vocabulary' ? (
      <VocabularyRoom lang={lang} store={store} />
    ) : view === 'progress' ? (
      <ProgressRoom lang={lang} store={store} />
    ) : view === 'teacher' ? (
      <TeacherRoom lang={lang} store={store} />
    ) : lesson ? (
      <LessonSession
        key={lesson.id}
        lesson={lesson}
        lang={lang}
        store={store}
        back={back}
        teacher={role === 'teacher'}
        start={start}
      />
    ) : (
      <>
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              {t(
                'VOM VERSTEHEN ZUM ANWENDEN',
                'FROM UNDERSTANDING TO PRACTICE',
              )}
            </p>
            <h1>{t('Dein Lernpfad', 'Your learning path')}</h1>
            <p>
              {t(
                'Kurze Lektionen, ehrliches Feedback und ein nächster Schritt.',
                'Short lessons, useful feedback and a clear next step.',
              )}
            </p>
          </div>
          <Link className="text-link" href="/progress">
            {t('Mein Fortschritt', 'My progress')} <ArrowRight size={16} />
          </Link>
        </div>
        <div className="study-disclosure">
          {t(
            '8 eigenständige Demolektionen und 4 vorläufige Quellenlektionen. Aufgaben und Lösungen von Lingovo, keine offiziellen Buchlösungen oder Prüfungsbewertungen.',
            '8 original demo lessons and 4 provisional source lessons. Activities and answers are by Lingovo, not official book answers or exam scores.',
          )}
        </div>
        {notice && (
          <p role="alert">
            {t(
              'Der geteilte Lernplan ist ungültig. Alle Lektionen bleiben verfügbar.',
              'The shared assignment is invalid. All lessons remain available.',
            )}
          </p>
        )}
        {assignment.length > 0 && (
          <section className="assignment-strip">
            <strong>
              {t('Dein geteilter Lernplan', 'Your shared assignment')}
            </strong>
            <Button
              variant="outline"
              onClick={() =>
                store.setState((s) => ({
                  ...s,
                  flow: {
                    ...s.flow,
                    scope: { ...s.flow.scope, mode: 'assignment', assignment },
                  },
                }))
              }
            >
              {t('Als Lernauswahl verwenden', 'Use as study selection')}
            </Button>
            <div className="study-actions">
              {assignment.map((id, i) => (
                <Button variant="outline" key={i} onClick={() => start(id)}>
                  {i + 1}.{' '}
                  {localize(lessons.find((l) => l.id === id)!.title, lang)}
                </Button>
              ))}
            </div>
            <small>
              {t(
                'Fortschritt bleibt auf diesem Gerät. Ergebnisse werden nicht an die Lehrkraft gesendet.',
                'Progress stays on this device. Results are not sent to the teacher.',
              )}
            </small>
          </section>
        )}
        <div
          className="study-filters"
          aria-label={t('Fertigkeit auswählen', 'Choose a skill')}
        >
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            aria-pressed={filter === 'all'}
            onClick={() => {
              setFilter('all');
              store.setState((s) => ({
                ...s,
                flow: { ...s.flow, scope: { ...s.flow.scope, mode: 'all' } },
              }));
            }}
          >
            {t('Alle Lektionen', 'All lessons')}
          </Button>
          {Object.entries(skillNames).map(([id, name]) => (
            <Button
              key={id}
              aria-pressed={filter === id}
              variant={filter === id ? 'default' : 'outline'}
              onClick={() => {
                setFilter('all');
                store.setState((s) => ({
                  ...s,
                  flow: {
                    ...s.flow,
                    scope: {
                      ...s.flow.scope,
                      mode: 'skill',
                      skill: id as typeof s.flow.scope.skill,
                    },
                  },
                }));
              }}
            >
              {localize(name, lang)}
            </Button>
          ))}
        </div>
        {!lessons.some(
          (l) =>
            (filter === 'all' || l.skill === filter) &&
            lessonMatches(store.state.flow.scope, l),
        ) && (
          <p className="panel">
            {t(
              'Keine geführte Lektion ist mit dieser Auswahl verknüpft. Wähle einen anderen Fokus oder öffne den gewählten Buchabschnitt.',
              'No guided lesson is linked to this selection. Choose another focus or open the selected book section.',
            )}{' '}
            <Link href="/book">{t('Zum Buch', 'Open book')} →</Link>
          </p>
        )}
        <div className="lesson-grid">
          {lessons
            .filter(
              (l) =>
                (filter === 'all' || l.skill === filter) &&
                lessonMatches(store.state.flow.scope, l),
            )
            .map((l) => {
              const done = lessonProgress(store.state.attempts, l);
              const Icon = icons[l.skill];
              return (
                <article className="lesson-card" key={l.id}>
                  <div className="lesson-card-top">
                    <span className={'lesson-icon ' + l.skill}>
                      <Icon size={23} />
                    </span>
                    <span>
                      {l.minutes} {t('Min. Übungszeit', 'min practice')}
                    </span>
                  </div>
                  <p className="eyebrow">
                    {localize(skillNames[l.skill], lang)} ·{' '}
                    {t('LEKTION', 'LESSON')} {lessons.indexOf(l) + 1}
                  </p>
                  <small>
                    {l.origin === 'provisional-source'
                      ? t(
                          'Vorläufig · mit Originalquelle',
                          'Provisional · linked to source',
                        )
                      : l.origin === 'reviewed-source'
                        ? t('Geprüfte Quelle', 'Reviewed source')
                        : t('Eigene Demo', 'Original demo')}
                  </small>
                  <h2>{localize(l.title, lang)}</h2>
                  {l.audio && !l.audioUrl && <p className="caption">{t('Transkriptübung · Audio fehlt','Transcript practice · audio unavailable')}</p>}
                  <p>{localize(l.objective, lang)}</p>
                  <div className="lesson-card-foot">
                    <span>
                      {done}/{l.exercises.length} {t('überprüft', 'reviewed')}
                    </span>
                    <Progress
                      value={(done / l.exercises.length) * 100}
                      aria-label={localize(l.title, lang)}
                    />
                  </div>
                  <Button onClick={() => start(l.id)}>
                    {done === l.exercises.length
                      ? t('Erneut üben', 'Practise again')
                      : done
                        ? t('Fortsetzen', 'Continue')
                        : t('Lektion öffnen', 'Open lesson')}
                    <ArrowRight size={16} />
                  </Button>
                </article>
              );
            })}
        </div>
        <details className="panel book-roadmap">
          <summary>
            {t('So ist dein Buch aufgebaut', 'How your book is organised')}
          </summary>
          <p>
            {t(
              'Aus dem Inhaltsverzeichnis. Gedruckte Seitenzahlen sind Orientierungspunkte, keine verifizierten Verknüpfungen zwischen Demoaufgaben und Buchseiten.',
              'From the table of contents. Printed page numbers are navigation landmarks, not verified links between demo exercises and book pages.',
            )}
          </p>
          {bookMap.map((b) => (
            <div className="roadmap-row" key={b.skill}>
              <strong>
                {localize(skillNames[b.skill], lang)}{' '}
                <small>
                  {t('ab S.', 'from p.')} {b.page}
                </small>
              </strong>
              <p>{localize(b.tasks, lang)}</p>
            </div>
          ))}
          <Link className="text-link" href="/library?collection=book">
            {t('Originalbuch öffnen', 'Open the original book')}
            <ArrowRight size={16} />
          </Link>
        </details>
      </>
    );
  return (
    <div className="learning-space">
      <Link className="studio-entry" href="/studio">
        <Headphones size={22} />
        <span>
          <strong>
            {t('Mit dem Buchmaterial lernen', 'Study with the book material')}
          </strong>
          <span>
            {t(
              '115 Audios · 4 Videos · 119 Transkripteinheiten mit Lern- und Lehrwerkzeugen',
              '115 audio tracks · 4 videos · 119 transcript units with study and teaching tools',
            )}
          </span>
        </span>
        <ArrowRight size={20} />
      </Link>
      {store.error && (
        <p className="notice" role="alert">
          {t(
            'Lokales Speichern ist fehlgeschlagen. Exportiere deine Arbeit im Fortschrittsbereich.',
            'Local saving failed. Export your work from Progress.',
          )}
        </p>
      )}
      {content}
      <p className="local-note">
        {t(
          'Auf diesem Gerät gespeichert · DE / EN / HY / RU Lernhilfe · Originaltexte auf Deutsch',
          'Saved on this device · DE / EN / HY / RU learning support · Original texts in German',
        )}
      </p>
    </div>
  );
}
function LessonSession({
  lesson,
  lang,
  store,
  back,
  teacher,
  start,
}: {
  lesson: Lesson;
  lang: Locale;
  store: StudyStore;
  back: () => void;
  teacher: boolean;
  start: (id: string) => void;
}) {
  const { state, setState } = store;
  const [index, setIndex] = useState(
    Math.min(state.positions[lesson.id] || 0, lesson.exercises.length),
  );
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('exercise');
    const n = lesson.exercises.findIndex((e) => e.id === id);
    if (n >= 0) setIndex(n);
  }, [lesson]);
  const [supportOverride, setSupportOverride] = useState<{
    locale: Locale;
    enabled: boolean;
  } | null>(null);
  const support =
    supportOverride?.locale === lang ? supportOverride.enabled : lang !== 'de';
  const [showText, setShowText] = useState(!lesson.audio);
  const t = (de: string, en: string) => translate(de, en, lang);
  const done = lessonProgress(state.attempts, lesson);
  const last = latestAttempts(state.attempts, lesson);
  function move(i: number) {
    setIndex(i);
    setState((s) => ({ ...s, positions: { ...s.positions, [lesson.id]: i } }));
  }
  const ex = lesson.exercises[index];
  return (
    <>
      <Button variant="ghost" onClick={back}>
        <ArrowLeft size={16} />
        {t('Alle Lektionen', 'All lessons')}
      </Button>
      <div className="session-heading">
        <div>
          <span className="eyebrow">
            {localize(skillNames[lesson.skill], lang)} ·{' '}
            {lesson.origin === 'app-demo'
              ? t('EIGENSTÄNDIGE DEMOLEKTION', 'ORIGINAL DEMO LESSON')
              : lesson.origin === 'provisional-source'
                ? t('VORLÄUFIGE QUELLENLEKTION', 'PROVISIONAL SOURCE LESSON')
                : t('GEPRÜFTER QUELLENINHALT', 'REVIEWED SOURCE CONTENT')}
          </span>
          <h1>{localize(lesson.title, lang)}</h1>
          <p>{localize(lesson.objective, lang)}</p>
        </div>
        <span className="session-count">
          {done}/{lesson.exercises.length} <Check size={18} />
        </span>
      </div>
      <div
        className="session-steps"
        aria-label={t('Aufgabennavigation', 'Activity navigation')}
      >
        {lesson.exercises.map((e, i) => (
          <Button
            key={e.id}
            variant={index === i ? 'default' : 'outline'}
            aria-current={index === i ? 'step' : undefined}
            onClick={() => move(i)}
          >
            {last[e.id]?.correct === true || last[e.id]?.selfReviewed ? (
              <Check size={15} />
            ) : (
              i + 1
            )}{' '}
            {e.kind === 'write'
              ? t('Schreibwerkstatt', 'Write')
              : e.kind === 'speak'
                ? t('Sprechstudio', 'Speak')
                : t('Aufgabe', 'Activity') + ' ' + (i + 1)}
          </Button>
        ))}
        <Button
          variant={index === lesson.exercises.length ? 'default' : 'outline'}
          onClick={() => move(lesson.exercises.length)}
        >
          {t('Rückblick', 'Review')}
        </Button>
      </div>
      <div className="session-layout">
        <aside className="session-source">
          <section className="panel strategy-panel">
            <h2>
              <Lightbulb size={19} />
              {t('Deine Strategie', 'Your strategy')}
            </h2>
            <p>{localize(lesson.strategy, lang)}</p>
          </section>
          <section className="panel passage-panel">
            <div className="section-heading">
              <h2>
                {lesson.audio
                  ? t('Hörtext', 'Listening text')
                  : t('Arbeitsmaterial', 'Working material')}
              </h2>
              <span className="pill">
                {lesson.origin === 'app-demo'
                  ? 'DEMO'
                  : lesson.origin === 'provisional-source'
                    ? t('VORLÄUFIG', 'PROVISIONAL')
                    : t('GEPRÜFT', 'REVIEWED')}
              </span>
            </div>
            {lesson.audioUrl && (
              <audio
                controls
                preload="metadata"
                src={lesson.audioUrl}
                aria-label={t('Quellenaufnahme', 'Source recording')}
                style={{ width: '100%' }}
              />
            )}
            {lesson.audio && !lesson.audioUrl && (
              <ListeningPlayer text={lesson.passage} lang={lang} />
            )}{' '}
            {lesson.audio && (
              <Button
                variant="outline"
                onClick={() => setShowText(!showText)}
                aria-expanded={showText}
              >
                {showText
                  ? t('Transkript ausblenden', 'Hide transcript')
                  : t('Transkript anzeigen', 'Show transcript')}
              </Button>
            )}
            {showText && (
              <p className="german-passage" lang="de">
                {lesson.passage}
              </p>
            )}
            <label className="check-label">
              <Checkbox
                checked={support}
                onCheckedChange={(v) =>
                  setSupportOverride({ locale: lang, enabled: Boolean(v) })
                }
              />
              {t(
                'Lernhilfe in deiner Sprache',
                'Learning support in your language',
              )}
            </label>
            {support && (!lesson.audio || showText) && (
              <p className="english-support" lang={lang === 'de' ? 'en' : lang}>
                {supportText(lesson.support, lang)}
              </p>
            )}
            <Link
              href={
                lesson.sectionId
                  ? '/studio?section=' + encodeURIComponent(lesson.sectionId)
                  : '/library?collection=' + (lesson.audio ? 'course' : 'book')
              }
              className="text-link"
            >
              {t(
                'Originalmaterial in der Bibliothek',
                'Original material in the library',
              )}
              <ArrowRight size={15} />
            </Link>
          </section>
          {lesson.provenance && (
            <details className="panel">
              <summary>{t('Quelle & Freigabe', 'Source & approval')}</summary>
              <p>{lesson.provenance.unitId}</p>
              <code className="hash">{lesson.provenance.sourceSha256}</code>
              <p>{lesson.provenance.revision}</p>
              <p>{lesson.provenance.status}</p>
              {lesson.origin === 'provisional-source' && (
                <p>
                  {t(
                    'Aufgaben, Lernhilfen und Lösungen von Lingovo erstellt; noch nicht redaktionell geprüft. Keine offiziellen Buchlösungen.',
                    'Activities, support and answers authored by Lingovo; not editorially reviewed. These are not official book answers.',
                  )}
                </p>
              )}
              {lesson.provenance.sectionId && (
                <code className="hash">{lesson.provenance.sectionId}</code>
              )}
              {lesson.provenance.textSha256 && (
                <code className="hash">{lesson.provenance.textSha256}</code>
              )}
              <Link
                className="text-link"
                href={
                  '/library?source=' +
                  encodeURIComponent(lesson.provenance.sourceId)
                }
              >
                {t('Quelle öffnen', 'Open source')}
              </Link>
            </details>
          )}
          {teacher && <TeacherGuide lesson={lesson} lang={lang} />}
        </aside>
        <section className="session-main">
          {ex ? (
            <ExerciseCard
              key={ex.id}
              ex={ex}
              lesson={lesson}
              lang={lang}
              store={store}
              next={() => move(index + 1)}
              previous={index ? () => move(index - 1) : undefined}
            />
          ) : (
            <section className="panel session-result">
              <span className="lesson-icon">
                <Target size={30} />
              </span>
              <h2>
                {done === lesson.exercises.length
                  ? t(
                      'Lektion bearbeitet. Gut reflektiert.',
                      'Lesson completed. Take a moment to reflect.',
                    )
                  : t('Dein Rückblick', 'Your lesson review')}
              </h2>
              <p>
                {done}/{lesson.exercises.length}{' '}
                {t(
                  'Aufgaben richtig gelöst oder selbst überprüft.',
                  'activities answered correctly or self-reviewed.',
                )}
              </p>
              {lesson.exercises.map((e, i) => (
                <div className="review-row" key={e.id}>
                  <span>
                    {i + 1}. {localize(e.prompt, lang)}
                  </span>
                  <Button variant="outline" onClick={() => move(i)}>
                    {last[e.id]?.correct === true
                      ? t('Richtig', 'Correct')
                      : last[e.id]?.selfReviewed
                        ? t('Selbst überprüft', 'Self-reviewed')
                        : t('Noch einmal', 'Try again')}
                  </Button>
                </div>
              ))}
              <p>
                {t(
                  'Offene Aufgaben werden durch Selbstreflexion abgeschlossen. Dies ist keine Sprachkompetenz- oder Prüfungsbewertung.',
                  'Open-ended tasks are completed through self-review. This is not a proficiency or exam score.',
                )}
              </p>
              <div className="study-actions">
                <Link className="primary-link" href="/vocabulary">
                  {t('Wortschatz festigen', 'Review vocabulary')}
                  <ArrowRight size={15} />
                </Link>
                <Button
                  variant="outline"
                  onClick={() =>
                    start(
                      lessons[(lessons.indexOf(lesson) + 1) % lessons.length]
                        .id,
                    )
                  }
                >
                  {t('Nächste Lektion', 'Next lesson')}
                  <ArrowRight size={15} />
                </Button>
              </div>
            </section>
          )}
        </section>
      </div>
    </>
  );
}
export function ExerciseCard({
  ex,
  lesson,
  lang,
  store,
  next,
  previous,
}: {
  ex: Exercise;
  lesson: Lesson;
  lang: Locale;
  store: StudyStore;
  next: () => void;
  previous?: () => void;
}) {
  const last = latestAttempts(store.state.attempts, lesson)[ex.id];
  const [response, setResponse] = useState<string[]>(
    last?.response ||
      (ex.kind === 'order' ? ex.options!.map((_, i) => String(i)) : []),
  );
  const [result, setResult] = useState<boolean | null | undefined>(
    last?.correct,
  );
  const [checked, setChecked] = useState(Boolean(last));
  const [hint, setHint] = useState(false);
  const [model, setModel] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const t = (de: string, en: string) => translate(de, en, lang);
  const open = ex.kind === 'write' || ex.kind === 'speak';
  const draft: Draft = store.state.drafts[ex.id] || {
    text: '',
    outline: '',
    checks: [],
    versions: [],
  };
  const updateDraft = (patch: Partial<Draft>) => {
    store.setState((s) => {
      const previous = latestAttempts(s.attempts, lesson)[ex.id];
      const edited =
        patch.text !== undefined ||
        patch.outline !== undefined ||
        patch.checks !== undefined;
      return {
        ...s,
        drafts: {
          ...s.drafts,
          [ex.id]: { ...(s.drafts[ex.id] || draft), ...patch },
        },
        attempts:
          edited && previous?.selfReviewed
            ? [
                ...s.attempts,
                {
                  ...previous,
                  at: Date.now(),
                  selfReviewed: false,
                  response: [],
                },
              ].slice(-5000)
            : s.attempts,
      };
    });
    setChecked(false);
    setResult(undefined);
  };
  const submit = () => {
    const correct = grade(ex, response);
    setResult(correct);
    setChecked(true);
    store.setState((s) => ({
      ...s,
      attempts: [
        ...s.attempts,
        {
          exerciseId: ex.id,
          lessonId: lesson.id,
          revision: lesson.revision,
          response: open ? [draft.text] : response,
          correct,
          at: Date.now(),
          selfReviewed: open,
        },
      ].slice(-5000),
    }));
  };
  function swap(i: number, d: number) {
    const a = [...response];
    [a[i], a[i + d]] = [a[i + d], a[i]];
    setResponse(a);
  }
  const enough = open
    ? draft.checks.length === (ex.checklist?.length || 0) &&
      (ex.kind === 'speak' || wordCount(draft.text) > 0)
    : response.length > 0 && (ex.kind !== 'gap' || !!response[0]?.trim());
  return (
    <article className="panel exercise-card">
      <p className="eyebrow">
        {ex.kind === 'multi'
          ? t('MEHRFACHAUSWAHL', 'MULTIPLE SELECT')
          : ex.kind === 'order'
            ? t('REIHENFOLGE', 'SEQUENCE')
            : ex.kind === 'gap'
              ? t('KURZANTWORT', 'SHORT ANSWER')
              : ex.kind === 'write'
                ? t('SCHREIBWERKSTATT', 'WRITING WORKSHOP')
                : ex.kind === 'speak'
                  ? t('SPRECHSTUDIO', 'SPEAKING STUDIO')
                  : t('EINFACHAUSWAHL', 'SINGLE CHOICE')}
      </p>
      <h2>{localize(ex.prompt, lang)}</h2>
      <SaveReview item={exerciseItem(lesson, ex)} lang={lang} />
      {(ex.kind === 'choice' || ex.kind === 'multi') && (
        <fieldset className="exercise-options" disabled={checked}>
          <legend className="sr-only">{localize(ex.prompt, lang)}</legend>
          {ex.options!.map((option, i) => (
            <label
              key={i}
              className={response.includes(String(i)) ? 'selected' : ''}
            >
              <input
                type={ex.kind === 'multi' ? 'checkbox' : 'radio'}
                name={ex.id}
                value={i}
                checked={response.includes(String(i))}
                onChange={() =>
                  setResponse(
                    ex.kind === 'multi'
                      ? response.includes(String(i))
                        ? response.filter((x) => x !== String(i))
                        : [...response, String(i)]
                      : [String(i)],
                  )
                }
              />
              <span lang="de">{option}</span>
            </label>
          ))}
        </fieldset>
      )}
      {ex.kind === 'gap' && (
        <label className="study-field">
          {t('Deine Antwort', 'Your answer')}
          <Input
            lang="de"
            autoComplete="off"
            disabled={checked}
            value={response[0] || ''}
            onChange={(e) => setResponse([e.target.value])}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && enough && !checked) submit();
            }}
          />
        </label>
      )}
      {ex.kind === 'order' && (
        <ol className="order-list">
          {response.map((id, i) => (
            <li key={id}>
              <span className="order-number">{i + 1}</span>
              <p lang="de">{ex.options![Number(id)]}</p>
              <div>
                <Button
                  variant="ghost"
                  aria-label={t('Satz nach oben', 'Move sentence up')}
                  disabled={checked || i === 0}
                  onClick={() => swap(i, -1)}
                >
                  <ChevronUp size={18} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={t('Satz nach unten', 'Move sentence down')}
                  disabled={checked || i === response.length - 1}
                  onClick={() => swap(i, 1)}
                >
                  <ChevronDown size={18} />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {open && (
        <>
          <label className="study-field">
            {t('Planung & Stichwörter', 'Outline & keywords')}
            <Textarea
              value={draft.outline}
              maxLength={10000}
              onChange={(e) => updateDraft({ outline: e.target.value })}
              placeholder={t(
                'Position · Begründung · Beispiel · Schluss',
                'Position · reason · example · conclusion',
              )}
            />
          </label>
          {ex.kind === 'write' ? (
            <>
              <label className="study-field">
                {t('Dein Text auf Deutsch', 'Your text in German')}
                <Textarea
                  lang="de"
                  className="writing-canvas"
                  value={draft.text}
                  maxLength={50000}
                  onChange={(e) => updateDraft({ text: e.target.value })}
                />
              </label>
              <div className="writing-meter">
                <span>
                  {wordCount(draft.text)} {t('Wörter', 'words')} ·{' '}
                  {t('Übungsziel ab', 'practice target from')} {ex.minWords}
                </span>
                <span>
                  {t(
                    'Entwurf automatisch gespeichert',
                    'Draft saved automatically',
                  )}
                </span>
              </div>
              <div className="study-actions">
                <Button
                  variant="outline"
                  disabled={!draft.text.trim()}
                  onClick={() => {
                    updateDraft({
                      versions: [
                        ...draft.versions,
                        { text: draft.text, at: Date.now() },
                      ].slice(-10),
                    });
                    setSavedMessage(true);
                  }}
                >
                  <Bookmark size={16} />
                  {t('Version merken', 'Save a version')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => downloadFile(ex.id + '.txt', draft.text)}
                >
                  {t('Text exportieren', 'Export text')}
                </Button>
              </div>
              {savedMessage && (
                <small role="status">
                  {t('Version gespeichert.', 'Version saved.')}
                </small>
              )}
              {draft.versions.length > 0 && (
                <details>
                  <summary>
                    {t('Frühere Versionen', 'Earlier versions')} (
                    {draft.versions.length})
                  </summary>
                  {draft.versions.map((v, i) => (
                    <div className="version-row" key={i}>
                      <span>
                        {new Date(v.at).toLocaleString(lang)} ·{' '}
                        {wordCount(v.text)} {t('Wörter', 'words')}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() =>
                          updateDraft({
                            text: v.text,
                            versions: [
                              ...draft.versions,
                              { text: draft.text, at: Date.now() },
                            ].slice(-10),
                          })
                        }
                      >
                        {t('Wiederherstellen', 'Restore')}
                      </Button>
                    </div>
                  ))}
                </details>
              )}
            </>
          ) : (
            <SpeakingRecorder lang={lang} recordingId={'exercise:'+ex.id} />
          )}
          <div className="self-review">
            <h3>{t('Selbst überprüfen', 'Review your own work')}</h3>
            <p>
              {ex.kind === 'speak'
                ? t(
                    'Sprich deine Antwort laut. Höre eine Aufnahme an oder reflektiere deinen Vortrag, bevor du die Punkte bestätigst.',
                    'Say your answer aloud. Listen to a recording or reflect on your delivery before confirming these points.',
                  )
                : t(
                    'Lies deinen Text noch einmal und bestätige die erfüllten Punkte.',
                    'Read your text again and confirm the points you have met.',
                  )}
            </p>
            {ex.checklist!.map((c, i) => (
              <label className="check-label" key={i}>
                <Checkbox
                  checked={draft.checks.includes(i)}
                  onCheckedChange={(v) =>
                    updateDraft({
                      checks: v
                        ? [...new Set([...draft.checks, i])]
                        : draft.checks.filter((x) => x !== i),
                    })
                  }
                />
                {localize(c, lang)}
              </label>
            ))}
          </div>
        </>
      )}
      <div className="study-actions">
        <Button
          variant="ghost"
          onClick={() => setHint(!hint)}
          aria-expanded={hint}
        >
          <Lightbulb size={16} />
          {t('Tipp', 'Hint')}
        </Button>
        {open && (
          <Button
            variant="ghost"
            onClick={() => setModel(!model)}
            aria-expanded={model}
          >
            {t('Beispielantwort', 'Sample response')}
          </Button>
        )}
      </div>
      {hint && <p className="hint-box">{localize(ex.hint, lang)}</p>}
      {model && (
        <div className="model-answer">
          <strong>
            {t(
              'Eine mögliche Antwort · Übungsbeispiel von Lingovo',
              'One possible response · Lingovo practice example',
            )}
          </strong>
          <p lang="de">{ex.model}</p>
        </div>
      )}
      {checked && (
        <div
          className={
            'exercise-feedback ' + (result === false ? 'try-again' : 'success')
          }
          role="status"
        >
          <h3>
            {result === true
              ? t(
                  'Richtig. Hier ist der Zusammenhang.',
                  'Correct. Here is why.',
                )
              : result === false
                ? t('Noch nicht ganz.', 'Not quite yet.')
                : t('Selbstreflexion gespeichert.', 'Self-review saved.')}
          </h3>
          <p>{localize(ex.explanation, lang)}</p>
          {result === false && ex.answer && (
            <p>
              <strong>{t('Lösung: ', 'Answer: ')}</strong>
              <span lang="de">
                {ex.kind === 'gap'
                  ? ex.answer[0]
                  : ex.answer
                      .map((a) => ex.options![Number(a)])
                      .join(ex.kind === 'order' ? ' → ' : ' · ')}
              </span>
            </p>
          )}
        </div>
      )}
      <div className="exercise-footer">
        {previous && (
          <Button variant="ghost" onClick={previous}>
            <ArrowLeft size={16} />
            {t('Zurück', 'Back')}
          </Button>
        )}
        {checked ? (
          <>
            <Button
              variant="outline"
              onClick={() => {
                setChecked(false);
                setResult(undefined);
                if (!open)
                  setResponse(
                    ex.kind === 'order'
                      ? ex.options!.map((_, i) => String(i))
                      : [],
                  );
              }}
            >
              <RotateCcw size={16} />
              {t('Erneut versuchen', 'Try again')}
            </Button>
            <Button onClick={next}>
              {t('Weiter', 'Continue')}
              <ArrowRight size={16} />
            </Button>
          </>
        ) : (
          <Button disabled={!enough} onClick={submit}>
            {open
              ? t('Selbstreflexion abschließen', 'Complete self-review')
              : t('Antwort prüfen', 'Check answer')}
            <Check size={16} />
          </Button>
        )}
      </div>
    </article>
  );
}
export function TeacherGuide({
  lesson,
  lang,
}: {
  lesson: Lesson;
  lang: Locale;
}) {
  return (
    <details className="panel teacher-guide" open>
      <summary>
        {translate('Leitfaden für Lehrkräfte', 'Teacher guide', lang)}
      </summary>
      {(['warmup', 'teach', 'support', 'challenge', 'exit'] as const).map(
        (key, i) => (
          <div key={key}>
            <h3>
              {translate(
                [
                  'Einstieg',
                  'Durchführung',
                  'Unterstützung',
                  'Vertiefung',
                  'Abschlussfrage',
                ][i],
                [
                  'Warm-up',
                  'Facilitation',
                  'Scaffolding',
                  'Extension',
                  'Exit question',
                ][i],
                lang,
              )}
            </h3>
            <p>{key==='teach'&&lesson.audio&&!lesson.audioUrl?translate('Lest das Transkript und sammelt wichtige Informationen. Für Hörübungen eine verfügbare Quellenaufnahme wählen. Diese Übung nicht als Hörprüfung verwenden.', 'Read the transcript and identify key information. Choose an available source recording for listening practice. Do not use this activity as a listening assessment.',lang):localize(lesson.teacher[key], lang)}</p>
          </div>
        ),
      )}
    </details>
  );
}
