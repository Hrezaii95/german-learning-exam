'use client';
import { translate, localize, wordMeaning } from '../lib/i18n.js';

/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Explicit status regions announce feedback and preserve block layout. */
import { useEffect, useState } from 'react';
import Link from './site-link.js';
import { studySources } from '../lib/study-sources.js';
import bookIndex from '../lib/data/book-index.json';
import sourceCourseIndex from '../lib/data/source-course-index.json';
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Bookmark,
  Check,
  Plus,
  RotateCcw,
  Volume2,
  Download,
  Trash2,
  Printer,
  Presentation,
  X,
  Link2,
  Target,
} from 'lucide-react';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Textarea } from './ui/textarea.js';
import { Checkbox } from './ui/checkbox.js';
import { Progress } from './ui/progress.js';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog.js';
import {
  words,
  skillNames,
  latestAttempts,
  lessonProgress,
  scheduleCard,
  type Lesson,
} from '../lib/learning.js';
import { parseStudy } from '../lib/study-state.js';
import type { Locale } from '../lib/catalog.js';
import { lessons, activityCount } from '../lib/course.js';
import { type StudyStore, downloadFile } from './study-store.js';
import { ListeningPlayer } from './study-media.js';
import { wordMatches } from '../lib/study-flow.js';
type Props = { lang: Locale; store: StudyStore };
export function VocabularyRoom({
  lang,
  store,
}: {
  lang: Locale;
  store: StudyStore;
}) {
  const { state, setState } = store;
  const isCustom = (id: string) =>
    state.customWords.some((word) => word.id === id);
  const t = (de: string, en: string) => translate(de, en, lang);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [queue, setQueue] = useState<string[] | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [de, setDe] = useState('');
  const [en, setEn] = useState('');
  const [example, setExample] = useState('');
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const all = [...words, ...state.customWords].filter((w) =>
    wordMatches(state.flow.scope, w),
  );
  const due = all.filter(
    (w) => !state.reviews[w.id] || state.reviews[w.id].due <= now,
  );
  const filtered = all.filter(
    (w) =>
      (filter === 'all' ||
        (filter === 'due' && due.some((d) => d.id === w.id)) ||
        (filter === 'saved' && state.savedWords.includes(w.id))) &&
      (
        w.de +
        ' ' +
        w.en +
        ' ' +
        wordMeaning(w, lang, isCustom(w.id)) +
        ' ' +
        w.example
      )
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  const card = queue?.length ? all.find((w) => w.id === queue[0]) : undefined;
  const save = (id: string) =>
    setState((s) => ({
      ...s,
      savedWords: s.savedWords.includes(id)
        ? s.savedWords.filter((x) => x !== id)
        : [...s.savedWords, id],
    }));
  function rate(rating: 'again' | 'hard' | 'good') {
    if (!card) return;
    setState((s) => ({
      ...s,
      reviews: {
        ...s.reviews,
        [card.id]: scheduleCard(s.reviews[card.id], rating, Date.now()),
      },
    }));
    setQueue((q) => q!.slice(1));
    setFlipped(false);
    setReviewed((n) => n + 1);
    setNow(Date.now());
  }
  function pronounce(_text: string) { setMessage('speech'); }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {t('WÖRTER, DIE BLEIBEN', 'WORDS THAT STAY')}
          </p>
          <h1>{t('Dein Wortschatz', 'Your vocabulary')}</h1>
          <p>
            {t(
              'Mit Beispielen lernen und zum richtigen Zeitpunkt wiederholen.',
              'Learn with examples and revisit words when they are due.',
            )}
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="outline">
          <Plus size={16} />
          {t('Eigenes Wort', 'Add your own word')}
        </Button>
      </div>
      <div className="study-disclosure">
        {t(
          '24 eigene Demoeinträge plus deine Wörter. Aussprache über die synthetische Browserstimme.',
          '24 original demo entries plus your own words. Pronunciation uses your browser’s synthetic voice.',
        )}
      </div>
      <div className="vocab-summary">
        <div>
          <strong>{due.length}</strong>
          <span>{t('jetzt fällig', 'due now')}</span>
        </div>
        <div>
          <strong>{Object.keys(state.reviews).length}</strong>
          <span>{t('schon wiederholt', 'reviewed before')}</span>
        </div>
        <div>
          <strong>{state.savedWords.length}</strong>
          <span>{t('gemerkt', 'saved')}</span>
        </div>
        <Button
          disabled={!due.length}
          onClick={() => {
            setQueue(due.map((w) => w.id));
            setFlipped(false);
            setReviewed(0);
          }}
        >
          {t('Fällige Wörter wiederholen', 'Review due words')}
          <ArrowRight size={16} />
        </Button>
      </div>
      {showForm && (
        <form
          className="panel add-word"
          onSubmit={(e) => {
            e.preventDefault();
            if (!de.trim() || !en.trim()) return;
            setState((s) => ({
              ...s,
              customWords: [
                ...s.customWords,
                {
                  id: 'custom-' + crypto.randomUUID(),
                  de: de.trim(),
                  en: en.trim(),
                  example: example.trim(),
                  tag: 'custom',
                },
              ],
            }));
            setDe('');
            setEn('');
            setExample('');
            setShowForm(false);
          }}
        >
          <h2>{t('Ein Wort aus deinem Alltag', 'A word from your life')}</h2>
          <label className="study-field" htmlFor="new-word-de">
            Deutsch
            <Input
              id="new-word-de"
              required
              maxLength={150}
              value={de}
              onChange={(e) => setDe(e.target.value)}
            />
          </label>
          <label className="study-field" htmlFor="new-word-en">
            {t('Bedeutung in deiner Sprache', 'Meaning in your language')}
            <Input
              id="new-word-en"
              required
              maxLength={200}
              value={en}
              onChange={(e) => setEn(e.target.value)}
            />
          </label>
          <label className="study-field">
            {t(
              'Deutscher Beispielsatz (optional)',
              'German example sentence (optional)',
            )}
            <Input
              maxLength={500}
              value={example}
              onChange={(e) => setExample(e.target.value)}
            />
          </label>
          <Button type="submit">{t('Wort speichern', 'Save word')}</Button>
        </form>
      )}
      {queue !== null && (
        <section className="panel flashcard-session">
          {card ? (
            <>
              <div className="section-heading">
                <span>
                  {reviewed} {t('wiederholt', 'reviewed')} · {queue.length}{' '}
                  {t('übrig', 'left')}
                </span>
                <Button variant="ghost" onClick={() => setQueue(null)}>
                  {t('Beenden', 'Finish')}
                </Button>
              </div>
              <button
                className="large-flashcard"
                aria-label={t('Karte umdrehen', 'Flip card')}
                aria-expanded={flipped}
                onClick={() => setFlipped(!flipped)}
              >
                <span className="eyebrow">
                  {flipped
                    ? t('BEDEUTUNG & BEISPIEL', 'MEANING & EXAMPLE')
                    : t('ERINNERST DU DICH?', 'CAN YOU RECALL IT?')}
                </span>
                <strong
                  lang={
                    flipped
                      ? isCustom(card.id)
                        ? undefined
                        : lang === 'de'
                          ? 'en'
                          : lang
                      : 'de'
                  }
                >
                  {flipped
                    ? wordMeaning(card, lang, isCustom(card.id))
                    : card.de}
                </strong>
                {flipped ? (
                  <p lang="de">{card.example}</p>
                ) : (
                  <small>
                    {t(
                      'Klicken oder Enter: Bedeutung aufdecken',
                      'Click or press Enter to reveal the meaning',
                    )}
                  </small>
                )}
              </button>
              {flipped ? (
                <div className="review-ratings">
                  <Button variant="outline" onClick={() => rate('again')}>
                    {t('Noch einmal', 'Again')}
                    <small>1 min</small>
                  </Button>
                  <Button variant="outline" onClick={() => rate('hard')}>
                    {t('Schwierig', 'Hard')}
                    <small>{t('1 Tag', '1 day')}</small>
                  </Button>
                  <Button onClick={() => rate('good')}>
                    {t('Gewusst', 'Got it')}
                    <small>
                      {Math.max(
                        2,
                        Math.min(
                          60,
                          (state.reviews[card.id]?.interval || 1) * 2,
                        ),
                      )}{' '}
                      {t('Tage', 'days')}
                    </small>
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setFlipped(true)}>
                  {t('Antwort aufdecken', 'Reveal answer')}
                </Button>
              )}
            </>
          ) : (
            <>
              <Check size={32} />
              <h2>
                {t('Wiederholungsrunde beendet', 'Review round complete')}
              </h2>
              <p>
                {reviewed}{' '}
                {t(
                  'Karten wiederholt. Schwierige Wörter kommen früher zurück.',
                  'cards reviewed. Difficult words return sooner.',
                )}
              </p>
              <Button onClick={() => setQueue(null)}>
                {t('Zur Wortsammlung', 'Back to your words')}
              </Button>
            </>
          )}
        </section>
      )}
      <div className="study-filters">
        <Input
          aria-label={t('Wortschatz durchsuchen', 'Search vocabulary')}
          placeholder={t(
            'Wort, Bedeutung oder Beispiel suchen …',
            'Search word, meaning or example…',
          )}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {[
          ['all', t('Alle', 'All')],
          ['due', t('Fällig', 'Due')],
          ['saved', t('Gemerkt', 'Saved')],
        ].map(([id, label]) => (
          <Button
            key={id}
            variant={filter === id ? 'default' : 'outline'}
            onClick={() => setFilter(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      {message && (
        <p role="status">
          {t(
            'Die Sprachausgabe ist auf diesem Gerät nicht verfügbar.',
            'Speech playback is unavailable on this device.',
          )}
        </p>
      )}
      <div className="word-grid">
        {filtered.map((w) => (
          <article key={w.id} className="word-card">
            <div className="section-heading">
              <span className="eyebrow">
                {w.tag === 'custom'
                  ? t('DEIN WORT', 'YOUR WORD')
                  : t('DEMOWORTSCHATZ', 'DEMO VOCABULARY')}
              </span>
              <Button
                variant="ghost"
                onClick={() => save(w.id)}
                aria-pressed={state.savedWords.includes(w.id)}
                aria-label={t('Wort merken', 'Save word')}
              >
                <Bookmark
                  size={17}
                  fill={
                    state.savedWords.includes(w.id) ? 'currentColor' : 'none'
                  }
                />
              </Button>
            </div>
            <h2 lang="de">{w.de}</h2>
            <p
              lang={isCustom(w.id) ? undefined : lang === 'de' ? 'en' : lang}
              className="word-translation"
            >
              {wordMeaning(w, lang, isCustom(w.id))}
            </p>
            <p lang="de">{w.example}</p>
            <div className="word-card-foot">
              <Button
                variant="ghost"
                onClick={() => pronounce(w.de.split(',')[0])}
                aria-label={t('Wort anhören', 'Hear word')}
              >
                <Volume2 size={17} />
              </Button>
              <small>
                {!state.reviews[w.id]
                  ? t('Neu', 'New')
                  : state.reviews[w.id].due <= now
                    ? t('Jetzt fällig', 'Due now')
                    : t('Nächste Wiederholung: ', 'Next review: ') +
                      new Date(state.reviews[w.id].due).toLocaleDateString(
                        lang,
                      )}
              </small>
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <p className="panel">
          {t(
            'Keine Wörter in dieser Auswahl. Ändere die Suche oder füge ein eigenes Wort hinzu.',
            'No words in this selection. Change the search or add your own word.',
          )}
        </p>
      )}
    </>
  );
}
export function ProgressRoom({ lang, store }: Props) {
  const { state, setState } = store;
  const t = (de: string, en: string) => translate(de, en, lang);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<ReturnType<typeof parseStudy> | null>(
    null,
  );
  const reviewed = lessons.reduce(
    (n, l) => n + lessonProgress(state.attempts, l),
    0,
  );
  const closed = state.attempts.filter((a) => a.correct !== null);
  const today = new Date().toDateString();
  const todayIds = new Set(
    state.attempts
      .filter(
        (a) =>
          new Date(a.at).toDateString() === today &&
          (a.correct === true || a.selfReviewed),
      )
      .map((a) => a.exerciseId),
  );
  for (const group of sourceCourseIndex.groups) {
    const work=state.bookWork['activity:'+group.id];
    if(work?.reviewed && work.revision===group.revision && work.reviewedAt && new Date(work.reviewedAt).toDateString()===today) todayIds.add('activity:'+group.id);
  }
  const needs = lessons.flatMap((l) => {
    const last = latestAttempts(state.attempts, l);
    return l.exercises
      .filter((e) => last[e.id]?.correct === false)
      .map((e) => ({ lesson: l, exercise: e }));
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {t('DEIN WEG WIRD SICHTBAR', 'SEE YOUR LEARNING TAKE SHAPE')}
          </p>
          <h1>{t('Fortschritt & Wiederholung', 'Progress & review')}</h1>
          <p>
            {t(
              'Deine tatsächlichen Übungsversuche auf diesem Gerät.',
              'Your actual practice attempts on this device.',
            )}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            downloadFile(
              'wortweg-study-backup.json',
              JSON.stringify(state, null, 2),
              'application/json',
            )
          }
        >
          <Download size={16} />
          {t('Lerndaten exportieren', 'Export study data')}
        </Button>
      </div>
      <div className="progress-stats">
        <div className="panel"><strong>{sourceCourseIndex.groups.filter(g=>state.bookWork['activity:'+g.id]?.reviewed && state.bookWork['activity:'+g.id]?.revision===g.revision).length} / {sourceCourseIndex.groups.length}</strong><p>{t('Buchaufgabengruppen selbst verglichen','Book activity groups self-reviewed')}</p><Link className="text-link" href="/course">{t('Buchkurs öffnen','Open book course')}</Link></div>
        <div className="panel">
          <strong>
            {
              bookIndex.units.filter(
                (u) =>
                  state.bookWork[u.id]?.reviewed &&
                  state.bookWork[u.id].revision === u.revision,
              ).length
            }{' '}
            / {bookIndex.pages}
          </strong>
          <p>{t('Buchseiten selbst überprüft', 'Book pages self-reviewed')}</p>
          <Link className="text-link" href="/book">
            {t('Im Buch weiterarbeiten', 'Continue in the book')}
          </Link>
        </div>
        <div className="panel">
          <strong>
            {
              studySources.filter(
                (s) =>
                  state.sourceWork[s.section_id]?.reviewed &&
                  state.sourceWork[s.section_id].revision === s.studyRevision,
              ).length
            }{' '}
            / 119
          </strong>
          <p>
            {t(
              'Quelleneinheiten selbst überprüft',
              'Source units self-reviewed',
            )}
          </p>
          <Link className="text-link" href="/studio">
            {t(
              'Im Quellenstudio weiterlernen',
              'Continue in the source studio',
            )}
          </Link>
        </div>
        <div className="panel">
          <strong>
            {reviewed}/{activityCount}
          </strong>
          <p>
            {t(
              'Aufgaben richtig / selbst überprüft',
              'Activities correct / self-reviewed',
            )}
          </p>
        </div>
        <div className="panel">
          <strong>
            {
              lessons.filter(
                (l) => lessonProgress(state.attempts, l) === l.exercises.length,
              ).length
            }
            /{lessons.length}
          </strong>
          <p>{t('Lektionen abgeschlossen', 'Lessons completed')}</p>
        </div>
        <div className="panel">
          <strong>
            {closed.length
              ? Math.round(
                  (closed.filter((a) => a.correct).length / closed.length) *
                    100,
                ) + '%'
              : '—'}
          </strong>
          <p>
            {t(
              'Richtige geschlossene Versuche, inkl. Wiederholungen',
              'Correct closed-task attempts, including retries',
            )}
          </p>
        </div>
      </div>
      <section className="panel daily-goal">
        <div>
          <h2>
            <Target size={20} />
            {t('Dein Tagesziel', 'Your daily goal')}
          </h2>
          <p>
            {todayIds.size} / {state.dailyGoal}{' '}
            {t(
              'unterschiedliche Aufgaben heute überprüft',
              'different activities reviewed today',
            )}
          </p>
          <Progress
            value={Math.min(100, (todayIds.size / state.dailyGoal) * 100)}
            aria-label={t('Tagesziel', 'Daily goal')}
          />
        </div>
        <label className="study-field">
          {t('Aufgaben pro Tag', 'Activities per day')}
          <Input
            type="number"
            min={1}
            max={20}
            value={state.dailyGoal}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 1 && v <= 20)
                setState((s) => ({ ...s, dailyGoal: Math.round(v) }));
            }}
          />
        </label>
      </section>
      <div className="progress-columns">
        <section className="panel">
          <h2>{t('Deine Fertigkeiten', 'Your skills')}</h2>
          {Object.entries(skillNames).map(([id, label]) => {
            const count = lessons
              .filter((l) => l.skill === id && (id !== 'hoeren' || Boolean(l.audioUrl)))
              .reduce((n, l) => n + lessonProgress(state.attempts, l), 0);
            const total = lessons
              .filter((l) => l.skill === id && (id !== 'hoeren' || Boolean(l.audioUrl)))
              .reduce((n, l) => n + l.exercises.length, 0);
            return (
              <div className="skill-progress" key={id}>
                <div>
                  <strong>{localize(label, lang)}</strong>
                  <span>
                    {count}/{total}
                  </span>
                </div>
                <Progress
                  value={total ? (count / total) * 100 : 0}
                  aria-label={localize(label, lang)}
                />
              </div>
            );
          })}
          <p>
            {t(
              'Fortschritt zeigt bearbeitete Aufgaben. Er ist keine TestDaF-Prognose.',
              'Progress measures completed activities. It is not a TestDaF prediction.',
            )}
          </p>
          <p className="caption">{t('Reine Transkriptübungen zählen zu den bearbeiteten Aufgaben, nicht zum Hörfortschritt.', 'Transcript-only practice counts toward activity totals, not listening progress.')}</p>
        </section>
        <section className="panel">
          <h2>{t('Noch einmal ansehen', 'Worth another look')}</h2>
          {needs.length ? (
            needs.map((n) => (
              <Link
                className="review-link"
                key={n.exercise.id}
                href={'/practice?lesson=' + n.lesson.id}
              >
                <span>
                  {localize(n.lesson.title, lang)}
                  <small>{localize(n.exercise.prompt, lang)}</small>
                </span>
                <RotateCcw size={17} />
              </Link>
            ))
          ) : (
            <p>
              {t(
                'Hier erscheinen Aufgaben nach einem falschen letzten Versuch. Starte eine Lektion, um deinen Lernstand zu sehen.',
                'Activities with an incorrect latest attempt appear here. Start a lesson to build your study record.',
              )}
            </p>
          )}
        </section>
      </div>
      <section className="panel">
        <h2>{t('Letzte Aktivitäten', 'Recent activity')}</h2>
        {state.attempts.length ? (
          <div className="activity-history">
            {state.attempts
              .slice(-12)
              .reverse()
              .map((a, i) => (
                <div className="review-row" key={i}>
                  <span>
                    {localize(
                      lessons.find((l) => l.id === a.lessonId)?.title,
                      lang,
                    ) || a.lessonId}
                    <small>{new Date(a.at).toLocaleString(lang)}</small>
                  </span>
                  <span className="status-chip">
                    {a.selfReviewed
                      ? t('Selbst überprüft', 'Self-reviewed')
                      : a.correct
                        ? t('Richtig', 'Correct')
                        : t('Wiederholen', 'Review')}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <p>
            {t(
              'Noch keine Versuche. Dein erster Schritt zählt.',
              'No attempts yet. Your first step counts.',
            )}
          </p>
        )}
      </section>
      <details className="panel">
        <summary>
          {t(
            'Sicherung auf diesem Gerät wiederherstellen',
            'Restore a backup on this device',
          )}
        </summary>
        <p>
          {t(
            'Eine Wiederherstellung ersetzt Lernversuche, Entwürfe, Wortkarten und den Unterrichtsplan auf diesem Gerät. Exportiere vorher deine aktuelle Sicherung. Bibliotheksnotizen bleiben separat erhalten.',
            'Restoring replaces study attempts, drafts, flashcards and the lesson plan on this device. Export your current backup first. Library notes remain separately stored.',
          )}
        </p>
        <label className="study-field">
          {t('Lingovo-Sicherungsdatei', 'Lingovo backup file')}
          <Input
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              setPending(null);
              setError('');
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 5000000) {
                setError('invalid');
                return;
              }
              try {
                const text = await f.text();
                setPending(parseStudy(JSON.parse(text)));
              } catch {
                setError('invalid');
              }
            }}
          />
        </label>
        {error && (
          <p role="alert">
            {t(
              'Diese Datei ist keine gültige Lingovo-Sicherung (max. 5 MB).',
              'This is not a valid Lingovo backup (maximum 5 MB).',
            )}
          </p>
        )}
        {pending && (
          <div>
            <p>
              {pending.attempts.length} {t('Versuche', 'attempts')} ·{' '}
              {Object.keys(pending.drafts).length} {t('Entwürfe', 'drafts')}
            </p>
            <Button
              onClick={() => {
                store.restore(pending);
                setPending(null);
              }}
            >
              {t(
                'Aktuelle Lerndaten durch diese Sicherung ersetzen',
                'Replace current study data with this backup',
              )}
            </Button>
          </div>
        )}
      </details>
    </>
  );
}
function Guide({ lesson, lang }: { lesson: Lesson; lang: Locale }) {
  return (
    <div className="teacher-guide">
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
            <p>{localize(lesson.teacher[key], lang)}</p>
          </div>
        ),
      )}
    </div>
  );
}
export function TeacherRoom({ lang, store }: Props) {
  const { state, setState } = store;
  const t = (de: string, en: string) => translate(de, en, lang);
  const [selected, setSelected] = useState(lessons[0].id);
  const [answers, setAnswers] = useState(false);
  const [present, setPresent] = useState(false);
  const [slide, setSlide] = useState(-1);
  const [share, setShare] = useState('');
  const [copy, setCopy] = useState(false);
  const lesson = lessons.find((l) => l.id === selected)!;
  const plan = state.plan;
  const total = plan.items.reduce((n, i) => n + i.minutes, 0);
  const update = (patch: Partial<typeof plan>) => {
    setState((s) => ({ ...s, plan: { ...s.plan, ...patch } }));
    setShare('');
  };
  useEffect(() => {
    if (!present) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresent(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [present]);
  const add = (l: Lesson) =>
    update({
      items: [
        ...plan.items,
        {
          id: crypto.randomUUID(),
          lessonId: l.id,
          minutes: l.minutes,
          notes: '',
        },
      ],
    });
  function shift(index: number, delta: number) {
    const items = [...plan.items];
    [items[index], items[index + delta]] = [items[index + delta], items[index]];
    update({ items });
  }
  function exportPlan() {
    downloadFile(
      'wortweg-teaching-plan.md',
      `# ${plan.title || t('Mein Unterrichtsplan', 'My lesson plan')}\n\n${plan.objective}\n\n${t('Eigene Demoaktivitäten; vorgeschlagene Übungszeiten, keine Prüfungszeiten.', 'Original demo activities; suggested practice durations, not exam timings.')}\n\n` +
        plan.items
          .map((item, i) => {
            const l = lessons.find((l) => l.id === item.lessonId)!;
            return (
              `## ${i + 1}. ${localize(l.title, lang)} (${item.minutes} min)\n${localize(l.objective, lang)}\n\n${item.notes}\n\nOrigin: ${l.origin}\nLesson: ${l.id}\nRevision: ${l.revision}\nSource: ${l.provenance?.sectionId || 'app-authored'}\n\n` +
              Object.values(l.teacher)
                .map((v) => localize(v, lang))
                .join('\n\n')
            );
          })
          .join('\n\n'),
    );
  }
  async function sharePlan() {
    const url = new URL((process.env.NEXT_PUBLIC_GL_PAGES_BASE_PATH || '') + '/prepare/c1/practice', window.location.origin);
    url.hash = new URLSearchParams({
      assignment: JSON.stringify(plan.items.map((i) => i.lessonId)),
    }).toString();
    setShare(url.href);
    setCopy(false);
    try {
      await navigator.clipboard.writeText(url.href);
      setCopy(true);
    } catch {
      /* A selectable link remains available when clipboard permission is unavailable. */
    }
  }
  const exercise = lesson.exercises[slide];
  return (
    <>
      <div className="page-heading no-print">
        <div>
          <p className="eyebrow">
            {t('GUT VORBEREITET IN DEN UNTERRICHT', 'WALK INTO CLASS PREPARED')}
          </p>
          <h1>{t('Deine Unterrichtswerkstatt', 'Your teaching workspace')}</h1>
          <p>
            {t(
              'Lektionen auswählen, differenzieren und zu einem Ablauf verbinden.',
              'Select lessons, adapt the support and build a teaching sequence.',
            )}
          </p>
        </div>
      </div>
      <div className="study-disclosure no-print">
        {t(
          'Eigene Übungen und vorläufige Quellenlektionen mit Lösungshinweisen. Im Quellenstudio findest du außerdem anpassbare Lehrvorschläge für alle 119 Transkripteinheiten.',
          'Original practice and provisional source lessons with answer guidance. The source studio also offers adaptable teaching suggestions for all 119 transcript units.',
        )}
      </div>
      <div className="teacher-layout">
        <aside className="panel teacher-picker no-print">
          <h2>{t('Lektionsbausteine', 'Lesson building blocks')}</h2>
          {lessons.map((l) => (
            <button
              className={
                selected === l.id ? 'teacher-pick active' : 'teacher-pick'
              }
              key={l.id}
              onClick={() => {
                setSelected(l.id);
                setAnswers(false);
              }}
            >
              <span>{localize(skillNames[l.skill], lang)}</span>
              <strong>{localize(l.title, lang)}</strong>
              <small>
                {l.minutes} min · {l.exercises.length}{' '}
                {t('Aufgaben', 'activities')}
              </small>
            </button>
          ))}
        </aside>
        <div className="teacher-detail">
          <section className="panel no-print">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  {localize(skillNames[lesson.skill], lang)}
                </span>
                <h2>{localize(lesson.title, lang)}</h2>
              </div>
              <Button
                onClick={() => add(lesson)}
                disabled={plan.items.length >= 40}
              >
                <Plus size={17} />
                {t('Zum Ablauf', 'Add to plan')}
              </Button>
            </div>
            <p>{localize(lesson.objective, lang)}</p>
            {lesson.provenance && (
              <p className="study-disclosure">
                {lesson.origin === 'provisional-source'
                  ? t(
                      'Vorläufige Quellenanreicherung · Aufgaben und Lösungshinweise von Lingovo.',
                      'Provisional source enrichment · activities and answer guidance by Lingovo.',
                    )
                  : t('Geprüfte Quellenlektion', 'Reviewed source lesson')}{' '}
                <Link
                  href={
                    '/studio?section=' +
                    encodeURIComponent(lesson.sectionId || '')
                  }
                >
                  {t(
                    'Quelle und Bearbeitungsstand',
                    'Source and editorial status',
                  )}
                </Link>
              </p>
            )}
            <Guide lesson={lesson} lang={lang} />
            <div className="study-actions">
              <Button
                variant="outline"
                onClick={() => {
                  setSlide(-1);
                  setPresent(true);
                  setAnswers(false);
                }}
              >
                <Presentation size={16} />
                {t('Im Unterricht zeigen', 'Present in class')}
              </Button>
              <Link
                className="text-link"
                href={'/practice?lesson=' + lesson.id}
              >
                {t('Als Lernende ausprobieren', 'Try as a learner')}
                <ArrowRight size={15} />
              </Link>
            </div>
            <details className="answer-key">
              <summary>
                {t(
                  'Aufgaben & Lösungshinweise',
                  'Activities & answer guidance',
                )}
              </summary>
              {lesson.exercises.map((e) => (
                <div key={e.id}>
                  <h3>{localize(e.prompt, lang)}</h3>
                  <p>{localize(e.explanation, lang)}</p>
                  <p lang="de">
                    {e.model ||
                      e.answer
                        ?.map((a) =>
                          e.options?.length ? e.options[Number(a)] : a,
                        )
                        .join(e.kind === 'order' ? ' → ' : ' · ')}
                  </p>
                </div>
              ))}
            </details>
          </section>
          <section className="panel lesson-plan">
            <div className="section-heading">
              <h2>{t('Mein Unterrichtsablauf', 'My teaching sequence')}</h2>
              <span className="pill">{total} min</span>
            </div>
            <label className="study-field">
              {t('Titel', 'Title')}
              <Input
                value={plan.title}
                maxLength={200}
                placeholder={t(
                  'z. B. Argumentieren im Hochschulalltag',
                  'e.g. Academic argumentation',
                )}
                onChange={(e) => update({ title: e.target.value })}
              />
            </label>
            <label className="study-field">
              {t(
                'Lernziel für diese Gruppe',
                'Learning objective for this group',
              )}
              <Textarea
                value={plan.objective}
                maxLength={3000}
                onChange={(e) => update({ objective: e.target.value })}
              />
            </label>
            {!plan.items.length && (
              <div className="plan-empty">
                <Plus size={28} />
                <p>
                  {t(
                    'Wähle oben eine Lektion und füge sie deinem Ablauf hinzu.',
                    'Choose a lesson above and add it to your plan.',
                  )}
                </p>
              </div>
            )}
            {plan.items.map((item, i) => {
              const l = lessons.find((l) => l.id === item.lessonId)!;
              return (
                <div className="plan-item" key={item.id}>
                  <div className="plan-item-head">
                    <span className="order-number">{i + 1}</span>
                    <strong>{localize(l.title, lang)}</strong>
                    <div className="study-actions no-print">
                      <Button
                        variant="ghost"
                        disabled={!i}
                        aria-label={t('Nach oben', 'Move up')}
                        onClick={() => shift(i, -1)}
                      >
                        <ArrowUp size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={i === plan.items.length - 1}
                        aria-label={t('Nach unten', 'Move down')}
                        onClick={() => shift(i, 1)}
                      >
                        <ArrowDown size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={t(
                          'Aus Ablauf entfernen',
                          'Remove from plan',
                        )}
                        onClick={() =>
                          update({
                            items: plan.items.filter((x) => x.id !== item.id),
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                  <label className="study-field">
                    {t(
                      'Geplante Minuten (anpassbar)',
                      'Planned minutes (editable)',
                    )}
                    <Input
                      type="number"
                      min={1}
                      max={180}
                      value={item.minutes}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (n >= 1 && n <= 180)
                          update({
                            items: plan.items.map((x) =>
                              x.id === item.id
                                ? { ...x, minutes: Math.round(n) }
                                : x,
                            ),
                          });
                      }}
                    />
                  </label>
                  <label className="study-field">
                    {t(
                      'Meine Durchführung / Anpassungen',
                      'My facilitation notes / adaptations',
                    )}
                    <Textarea
                      value={item.notes}
                      maxLength={5000}
                      onChange={(e) =>
                        update({
                          items: plan.items.map((x) =>
                            x.id === item.id
                              ? { ...x, notes: e.target.value }
                              : x,
                          ),
                        })
                      }
                    />
                  </label>
                </div>
              );
            })}
            <div className="study-actions no-print">
              <Button
                variant="outline"
                disabled={!plan.items.length}
                onClick={exportPlan}
              >
                <Download size={16} />
                {t('Plan exportieren', 'Export plan')}
              </Button>
              <Button disabled={!plan.items.length} onClick={sharePlan}>
                <Link2 size={16} />
                {t('Lernfolge teilen', 'Share lesson sequence')}
              </Button>
            </div>
            {share && (
              <div className="share-result no-print">
                <p role="status">
                  {copy
                    ? t('Link kopiert.', 'Link copied.')
                    : t('Link zum Kopieren:', 'Link to copy:')}
                </p>
                <Input
                  readOnly
                  value={share}
                  aria-label={t('Geteilter Lernplan', 'Shared assignment')}
                  onFocus={(e) => e.target.select()}
                />
                <small>
                  {t(
                    'Teilt nur die Reihenfolge der Lektionen. Persönliche Notizen, Zeiten und Lernergebnisse werden nicht geteilt.',
                    'Shares only the lesson sequence. Personal notes, timings and learner results are not shared.',
                  )}
                </small>
              </div>
            )}
          </section>
          <section className="panel worksheet">
            <div className="section-heading no-print">
              <h2>{t('Arbeitsblatt', 'Worksheet')}</h2>
              <Button
                variant="outline"
                onClick={() => {
                  document.body.classList.add('print-worksheet');
                  window.print();
                  document.body.classList.remove('print-worksheet');
                }}
              >
                <Printer size={16} />
                {t('Arbeitsblatt drucken', 'Print worksheet')}
              </Button>
            </div>
            <label className="check-label no-print">
              <Checkbox
                checked={answers}
                onCheckedChange={(v) => setAnswers(Boolean(v))}
              />
              {t(
                'Lösungen im Arbeitsblatt anzeigen',
                'Include answers in worksheet',
              )}
            </label>
            <div className="worksheet-content">
              <span className="eyebrow">
                WORTWEG ·{' '}
                {lesson.origin === 'provisional-source'
                  ? t('VORLÄUFIGE QUELLENÜBUNG', 'PROVISIONAL SOURCE PRACTICE')
                  : t('EIGENE ÜBUNG', 'ORIGINAL PRACTICE')}
              </span>
              <h2>{localize(lesson.title, lang)}</h2>
              <p>{localize(lesson.objective, lang)}</p>
              <p lang="de">{lesson.passage}</p>
              {lesson.exercises.map((e, i) => (
                <div className="worksheet-question" key={e.id}>
                  <h3>
                    {i + 1}. {localize(e.prompt, lang)}
                  </h3>
                  {e.options?.map((o, j) => (
                    <p lang="de" key={j}>
                      {String.fromCharCode(65 + j)}. {o}
                    </p>
                  ))}
                  {answers ? (
                    <div className="worksheet-answer">
                      <p>{localize(e.explanation, lang)}</p>
                      <p lang="de">
                        {e.model ||
                          e.answer
                            ?.map((a) =>
                              e.options?.length ? e.options[Number(a)] : a,
                            )
                            .join(' · ')}
                      </p>
                    </div>
                  ) : (
                    <div className="answer-lines" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <Dialog open={present} onOpenChange={setPresent}>
        <DialogContent
          className="classroom-view"
          showCloseButton={false}
          style={{ top: 0, left: 0, translate: 'none', transform: 'none' }}
        >
          <DialogTitle className="sr-only">
            {t('Unterrichtsansicht', 'Classroom view')}
          </DialogTitle>
          <header>
            <span>Lingovo · {localize(lesson.title, lang)}</span>
            <Button variant="outline" onClick={() => setPresent(false)}>
              <X size={18} />
              {t('Schließen', 'Close')}
            </Button>
          </header>
          <main>
            {slide === -1 ? (
              <>
                <p className="eyebrow">
                  {t('GEMEINSAM LESEN / HÖREN', 'READ / LISTEN TOGETHER')}
                </p>
                <h1>{localize(lesson.title, lang)}</h1>
                {lesson.audioUrl ? (
                  <audio
                    controls
                    src={lesson.audioUrl}
                    aria-label={t('Quellenaufnahme', 'Source recording')}
                  />
                ) : lesson.audio ? (
                  <ListeningPlayer text={lesson.passage} lang={lang} />
                ) : null}
                <p lang="de" className="classroom-passage">
                  {lesson.passage}
                </p>
              </>
            ) : (
              <>
                <p className="eyebrow">
                  {t('AUFGABE', 'ACTIVITY')} {slide + 1}/
                  {lesson.exercises.length}
                </p>
                <h1>{localize(exercise.prompt, lang)}</h1>
                {exercise.options?.map((o, i) => (
                  <p key={i} lang="de" className="classroom-option">
                    {String.fromCharCode(65 + i)}. {o}
                  </p>
                ))}
                {answers && (
                  <div className="model-answer">
                    <p>{localize(exercise.explanation, lang)}</p>
                    <p lang="de">
                      {exercise.model ||
                        exercise.answer
                          ?.map((a) =>
                            exercise.options?.length
                              ? exercise.options[Number(a)]
                              : a,
                          )
                          .join(' → ')}
                    </p>
                  </div>
                )}
              </>
            )}
          </main>
          <footer>
            <Button
              variant="outline"
              disabled={slide === -1}
              onClick={() => {
                setSlide((n) => n - 1);
                setAnswers(false);
              }}
            >
              {t('Zurück', 'Back')}
            </Button>
            {slide >= 0 && (
              <Button variant="outline" onClick={() => setAnswers(!answers)}>
                {answers
                  ? t('Lösung ausblenden', 'Hide answer')
                  : t('Lösung zeigen', 'Show answer')}
              </Button>
            )}
            <Button
              disabled={slide === lesson.exercises.length - 1}
              onClick={() => {
                setSlide((n) => n + 1);
                setAnswers(false);
              }}
            >
              {t('Weiter', 'Next')}
              <ArrowRight size={16} />
            </Button>
          </footer>
        </DialogContent>
      </Dialog>
    </>
  );
}
