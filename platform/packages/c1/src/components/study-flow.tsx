'use client';
import { translate, localize, supportText } from '../lib/i18n.js';

import { useEffect, useState } from 'react';
import { useStudy } from './study-store.js';
import { Button } from './ui/button.js';
import Link from './site-link.js';
import { SaveReview } from './flow-controls.js';
import { ExerciseCard } from './learning-space.js';
import { ListeningPlayer } from './study-media.js';
import { lessons } from '../lib/course.js';
import { words, scheduleCard, bi } from '../lib/learning.js';
import { studySources } from '../lib/study-sources.js';
import {
  buildDaily,
  reviewItems,
  reviewText,
  reviewMatches,
  scopeTitle,
  currentRevision,
  wordItem,
} from '../lib/study-flow.js';
import { cheatSheets, sheetRevision } from '../lib/cheat-sheets.js';
import type { ReviewItem, SessionItem } from '../lib/flow-state.js';
import type { StudyState } from '../lib/study-state.js';
import type { Locale } from '../lib/catalog.js';

type Rating = 'again' | 'hard' | 'good';
function rated(
  state: StudyState,
  item: ReviewItem,
  rating: Rating,
): StudyState {
  const schedule = scheduleCard(item.schedule, rating, Date.now());
  if (item.id.startsWith('word:'))
    return {
      ...state,
      reviews: { ...state.reviews, [item.id.slice(5)]: schedule },
    };
  return {
    ...state,
    flow: {
      ...state.flow,
      saved: state.flow.saved.map((i) =>
        i.id === item.id ? { ...i, schedule } : i,
      ),
    },
  };
}
function FlashReview({
  item,
  lang,
  onRate,
}: {
  item: ReviewItem;
  lang: Locale;
  onRate: (rating: Rating) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const t = (de: string, en: string) => translate(de, en, lang);
  const changed = !!item.revision && currentRevision(item) !== item.revision;
  return (
    <article className="panel flow-flash">
      <p className="eyebrow">
        {t('ERINNERN, DANN VERGLEICHEN', 'RECALL, THEN COMPARE')}
      </p>
      <h2>{reviewText(item, 'title', lang)}</h2>
      {changed && (
        <p className="notice">
          {t(
            'Die Quelle wurde überarbeitet. Diese Karte zeigt deine gespeicherte Fassung. Vergleiche sie mit der aktuellen Quelle.',
            'The source has changed. This card shows your saved version. Compare it with the current source.',
          )}
        </p>
      )}
      {!revealed ? (
        <Button onClick={() => setRevealed(true)}>
          {t('Antwort aufdecken', 'Reveal answer')}
        </Button>
      ) : (
        <>
          <div className="flow-answer">{reviewText(item, 'answer', lang)}</div>
          <p>
            {t(
              'Wie sicher konntest du dich erinnern? Das ist eine Selbsteinschätzung.',
              'How confidently could you recall it? This is a self-assessment.',
            )}
          </p>
          <div className="flow-actions">
            {(
              [
                ['again', 'Noch einmal · 1 Min.', 'Again · 1 min'],
                ['hard', 'Schwer · 1 Tag', 'Hard · 1 day'],
                ['good', 'Gut', 'Good'],
              ] as const
            ).map(([rating, de, en]) => (
              <Button
                key={rating}
                variant={rating === 'good' ? 'default' : 'outline'}
                onClick={() => onRate(rating)}
              >
                {t(de, en)}
                {rating === 'good'
                  ? ` · ${Math.max(2, Math.min(60, (item.schedule?.interval || 1) * 2))} ${t('Tage', 'days')}`
                  : ''}
              </Button>
            ))}
          </div>
        </>
      )}
      <Link href={item.href}>
        {t('Im Zusammenhang öffnen', 'Open in context')} ↗
      </Link>
    </article>
  );
}
export function DailyEntry({ lang }: { lang: Locale }) {
  const { state, ready } = useStudy();
  const t = (de: string, en: string) => translate(de, en, lang);
  const active = state.flow.session?.items.some((i) => !i.done && !i.skipped);
  return (
    <section className="flow-start">
      <div>
        <span className="eyebrow">
          {t('DEIN NÄCHSTER SCHRITT', 'YOUR NEXT STEP')}
        </span>
        <h2>{t('Heute ein Stück weiter.', 'A little further today.')}</h2>
        <p>
          {t(
            'Fällige Wiederholungen, schwierige Aufgaben und neue Übung – passend zu deiner Lernauswahl.',
            'Due reviews, difficult questions and fresh practice, tailored to your study selection.',
          )}
        </p>
        <small>{ready ? scopeTitle(state.flow.scope, lang) : '…'}</small>
      </div>
      <Link className="primary-link" href="/today?start=1">
        {active
          ? t('Tagesübung fortsetzen', 'Resume today’s practice')
          : t('Heutige Übung starten', 'Start today’s practice')}{' '}
        →
      </Link>
    </section>
  );
}
export function MyReview({ lang }: { lang: Locale }) {
  const store = useStudy();
  const { state } = store;
  const t = (de: string, en: string) => translate(de, en, lang);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [onlyDue, setOnlyDue] = useState(false);
  const [queue, setQueue] = useState<string[] | null>(null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const all = reviewItems(state);
  const visible = all.filter(
    (i) =>
      reviewMatches(state.flow.scope, i, state) &&
      (kind === 'all' || i.kind === kind) &&
      (!onlyDue || !i.schedule || i.schedule.due <= now) &&
      `${i.title.de} ${i.title.en} ${i.answer.de} ${i.answer.en} ${reviewText(i, 'title', lang)} ${reviewText(i, 'answer', lang)}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  const current = queue?.length ? all.find((i) => i.id === queue[0]) : null;
  return (
    <div className="flow-room">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t('DEINE SAMMLUNG', 'YOUR COLLECTION')}</p>
          <h1>{t('Meine Wiederholung', 'My review')}</h1>
          <p>
            {t(
              'Wörter, Ausdrücke, Fragen und Buchstellen an einem Ort.',
              'Words, expressions, questions and book excerpts in one place.',
            )}
          </p>
        </div>
        <Link href="/today">{t('Heutige Übung', 'Today’s practice')} →</Link>
      </div>
      <div className="flow-actions">
        <label>
          {t('Sammlung durchsuchen', 'Search collection')}
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>
          {t('Art', 'Type')}
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {[
              ['all', 'Alles', 'All'],
              ['word', 'Wörter', 'Words'],
              ['phrase', 'Ausdrücke', 'Expressions'],
              ['question', 'Fragen', 'Questions'],
              ['excerpt', 'Buchstellen', 'Excerpts'],
            ].map(([v, de, en]) => (
              <option key={v} value={v}>
                {t(de, en)}
              </option>
            ))}
          </select>
        </label>
        <label className="flow-check">
          <input
            type="checkbox"
            checked={onlyDue}
            onChange={(e) => setOnlyDue(e.target.checked)}
          />
          {t('Nur fällige', 'Due only')}
        </label>
        <Button
          disabled={!visible.length}
          onClick={() => setQueue(visible.map((i) => i.id))}
        >
          {t('Auswahl wiederholen', 'Review selection')} ({visible.length})
        </Button>
      </div>
      {queue !== null && (
        <section aria-label={t('Wiederholung', 'Review session')}>
          {current ? (
            <FlashReview
              key={current.id}
              item={current}
              lang={lang}
              onRate={(rating) => {
                store.setState((s) => rated(s, current, rating));
                setQueue((q) => q!.slice(1));
                setNow(Date.now());
              }}
            />
          ) : (
            <p role="status" className="panel">
              {t(
                'Diese Wiederholung ist abgeschlossen.',
                'This review session is complete.',
              )}
            </p>
          )}
          <Button variant="ghost" onClick={() => setQueue(null)}>
            {t('Zur Sammlung', 'Back to collection')}
          </Button>
        </section>
      )}
      <p role="status">
        {visible.length}{' '}
        {t('Einträge in deiner Auswahl', 'items in your selection')}
      </p>
      {!visible.length && (
        <section className="panel">
          <h2>
            {t(
              'Sammle, was du wiederholen möchtest.',
              'Collect what you want to revisit.',
            )}
          </h2>
          <p>
            {t(
              'Merke Wörter im Wortschatz, Fragen in Übungen und Textstellen im Buch. Oder beginne mit einem Spickzettel. Bei aktiven Filtern kannst du die Lernauswahl oben zurücksetzen.',
              'Save words in Vocabulary, questions in Practice and excerpts in the book. Or start with a cheat sheet. If filters are active, reset the study selection above.',
            )}
          </p>
          <Link href="/cheat-sheets">
            {t('Spickzettel öffnen', 'Open cheat sheets')} →
          </Link>
        </section>
      )}
      <div className="flow-grid">
        {visible.map((item) => (
          <article className="panel" key={item.id}>
            <small>
              {localize(
                {
                  word: bi('Wort', 'Word'),
                  phrase: bi('Ausdruck', 'Expression'),
                  question: bi('Frage', 'Question'),
                  excerpt: bi('Buchstelle', 'Excerpt'),
                }[item.kind],
                lang,
              )}{' '}
              ·{' '}
              {!item.schedule || item.schedule.due <= now
                ? t('Fällig', 'Due')
                : new Date(item.schedule.due).toLocaleDateString(lang)}
            </small>
            <h2>{reviewText(item, 'title', lang)}</h2>
            <details>
              <summary>{t('Gespeicherte Antwort', 'Saved answer')}</summary>
              <p className="flow-answer">{reviewText(item, 'answer', lang)}</p>
            </details>
            <div className="flow-actions">
              <Link href={item.href}>
                {t('Quelle öffnen', 'Open source')} ↗
              </Link>
              <SaveReview item={item} lang={lang} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
export function TodayRoom({ lang }: { lang: Locale }) {
  const store = useStudy();
  const { state, setState } = store;
  const t = (de: string, en: string) => translate(de, en, lang);
  const [notice, setNotice] = useState('');
  const session = state.flow.session;
  const scopeChanged =
    session &&
    JSON.stringify(session.scope) !== JSON.stringify(state.flow.scope);
  useEffect(() => {
    if (
      store.ready &&
      new URLSearchParams(location.search).get('start') === '1' &&
      (!session || session.items.every((i) => i.done || i.skipped))
    ) {
      const items = buildDaily(state, Date.now());
      if (items.length)
        setState((s) => ({
          ...s,
          flow: {
            ...s.flow,
            session: {
              id: crypto.randomUUID(),
              startedAt: Date.now(),
              scope: s.flow.scope,
              items,
            },
          },
        }));
      history.replaceState(null, '', '/today');
    }
  }, [store.ready]);
  const pending = session?.items.find((i) => !i.done && !i.skipped);
  const completed = session?.items.filter((i) => i.done).length ?? 0;
  const skipped = session?.items.filter((i) => i.skipped).length ?? 0;
  const candidates = buildDaily(state, Date.now());
  const begin = () =>
    setState((s) => ({
      ...s,
      flow: {
        ...s.flow,
        session: {
          id: crypto.randomUUID(),
          startedAt: Date.now(),
          scope: s.flow.scope,
          items: buildDaily(s, Date.now()),
        },
      },
    }));
  function finish(item: SessionItem, skip = false) {
    setNotice('');
    setState((s) => ({
      ...s,
      flow: {
        ...s.flow,
        session: s.flow.session
          ? {
              ...s.flow.session,
              items: s.flow.session.items.map((i) =>
                i.id === item.id
                  ? { ...i, done: skip ? undefined : Date.now(), skipped: skip }
                  : i,
              ),
            }
          : null,
      },
    }));
  }
  const lesson =
    pending?.kind === 'exercise'
      ? lessons.find((l) => l.id === pending.lessonId)
      : null;
  const exercise = lesson?.exercises.find((e) => e.id === pending?.ref);
  const word =
    pending?.kind === 'word'
      ? [...words, ...state.customWords].find((w) => w.id === pending.ref)
      : null;
  const card = word
    ? wordItem(word, state)
    : pending?.kind === 'saved'
      ? reviewItems(state).find((i) => i.id === pending.ref)
      : null;
  const reasons = {
    due: bi('Fällige Wiederholung', 'Due review'),
    mistake: bi('Noch einmal versuchen', 'Try a difficult question again'),
    unfinished: bi('Begonnene Arbeit abschließen', 'Finish work you started'),
    skill: bi('Aktiv üben', 'Practise a skill'),
    new: bi('Etwas Neues festigen', 'Learn something new'),
  };
  return (
    <div className="flow-room">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {t('EIN SCHRITT NACH DEM ANDEREN', 'ONE STEP AT A TIME')}
          </p>
          <h1>{t('Heutige Übung', 'Today’s practice')}</h1>
          <p>{scopeTitle(state.flow.scope, lang)}</p>
        </div>
        <Link href="/review">{t('Meine Wiederholung', 'My review')} →</Link>
      </div>
      {(!session || scopeChanged) && (
        <section className="panel">
          <h2>
            {scopeChanged
              ? t(
                  'Deine Auswahl hat sich geändert.',
                  'Your selection has changed.',
                )
              : t('Eine kurze Runde für dich.', 'A short session for you.')}
          </h2>
          <p>
            {t(
              `${candidates.length} Schritte: Wiederholen, weiterarbeiten, anwenden.`,
              `${candidates.length} steps: review, continue, apply.`,
            )}
          </p>
          <p>
            {t(
              'Deine Antworten bleiben erhalten. Übersprungene Schritte zählen nicht als erledigt.',
              'Your answers are preserved. Skipped steps do not count as completed.',
            )}
          </p>
          <Button disabled={!candidates.length} onClick={begin}>
            {t('Übung starten', 'Start practice')}
          </Button>
          {!candidates.length && (
            <p>
              {t(
                'Für diese Auswahl ist noch keine Aufgabe verknüpft. Erweitere die Lernauswahl.',
                'No tasks are linked to this selection yet. Broaden your study selection.',
              )}
            </p>
          )}
        </section>
      )}
      {session && !scopeChanged && (
        <>
          <div className="flow-session-meta">
            <strong>
              {completed}/{session.items.length} {t('erledigt', 'completed')}
            </strong>
            {skipped > 0 && (
              <span>
                {skipped} {t('übersprungen', 'skipped')}
              </span>
            )}
            <progress
              max={session.items.length || 1}
              value={completed}
              aria-label={t('Tagesfortschritt', 'Daily progress')}
            />
          </div>
          {pending ? (
            <>
              <p className="eyebrow">
                {localize(reasons[pending.reason], lang)}
              </p>
              {card ? (
                <FlashReview
                  key={pending.id}
                  item={card}
                  lang={lang}
                  onRate={(rating) => {
                    setState((s) => rated(s, card, rating));
                    finish(pending);
                  }}
                />
              ) : lesson && exercise ? (
                pending.revision !== lesson.revision ? (
                  <div className="notice">
                    {t(
                      'Die Aufgabe wurde überarbeitet. Starte eine neue Runde mit dem aktuellen Inhalt.',
                      'This activity was revised. Start a new session with the current content.',
                    )}
                    <Button onClick={begin}>
                      {t('Neue Runde starten', 'Start a new session')}
                    </Button>
                  </div>
                ) : (
                  <section>
                    <div className="panel">
                      <h2>{localize(lesson.title, lang)}</h2>
                      {lesson.audio &&
                        (lesson.audioUrl ? (
                          <audio
                            controls
                            preload="metadata"
                            src={lesson.audioUrl}
                          />
                        ) : (
                          <ListeningPlayer text={lesson.passage} lang={lang} />
                        ))}
                      <details open={!lesson.audio}>
                        <summary>
                          {t('Text und Unterstützung', 'Text and support')}
                        </summary>
                        <p lang="de">{lesson.passage}</p>
                        {lang !== 'de' && (
                          <p>{supportText(lesson.support, lang)}</p>
                        )}
                      </details>
                    </div>
                    <ExerciseCard
                      key={session.id + exercise.id}
                      ex={exercise}
                      lesson={lesson}
                      lang={lang}
                      store={store}
                      next={() => {
                        const latest = state.attempts
                          .filter(
                            (a) =>
                              a.exerciseId === exercise.id &&
                              a.revision === lesson.revision,
                          )
                          .at(-1);
                        if (latest && latest.at >= session.startedAt)
                          finish(pending);
                        else
                          setNotice(
                            t(
                              'Beantworte oder überprüfe die Aufgabe in dieser Runde erneut.',
                              'Answer or self-review the activity again in this session.',
                            ),
                          );
                      }}
                    />
                  </section>
                )
              ) : pending.kind === 'book' || pending.kind === 'source' ? (
                <article className="panel">
                  <h2>
                    {pending.kind === 'book'
                      ? `${t('PDF-Seite', 'PDF page')} ${pending.ref}`
                      : studySources.find((s) => s.section_id === pending.ref)
                          ?.heading_text}
                  </h2>
                  <p>
                    {t(
                      'Öffne deine Arbeit, ergänze deine Antwort und kehre zur Tagesübung zurück. Bestätige danach deine eigene Überprüfung.',
                      'Open your work, develop your response and return to today’s practice. Then confirm your own review.',
                    )}
                  </p>
                  <div className="flow-actions">
                    <Link
                      className="primary-link"
                      href={
                        pending.kind === 'book'
                          ? '/book?page=' + pending.ref
                          : '/studio?section=' + encodeURIComponent(pending.ref)
                      }
                    >
                      {t('Arbeit öffnen', 'Open work')} →
                    </Link>
                    <Button variant="outline" onClick={() => finish(pending)}>
                      {t(
                        'Ich habe geübt und selbst überprüft',
                        'I practised and self-reviewed',
                      )}
                    </Button>
                  </div>
                </article>
              ) : (
                <p className="notice">
                  {t(
                    'Dieser gespeicherte Eintrag ist nicht mehr verfügbar. Du kannst ihn überspringen.',
                    'This saved item is no longer available. You can skip it.',
                  )}
                </p>
              )}
              {notice && <p role="status">{notice}</p>}
              <Button variant="ghost" onClick={() => finish(pending, true)}>
                {t('Für heute überspringen', 'Skip for today')}
              </Button>
            </>
          ) : (
            <section className="panel">
              <h2>{t('Runde beendet.', 'Session finished.')}</h2>
              <p>
                {t(
                  `${completed} Schritte erledigt, ${skipped} übersprungen.`,
                  `${completed} steps completed, ${skipped} skipped.`,
                )}
              </p>
              <p>
                {t(
                  'Fällige Einträge kehren nach ihrem Wiederholungsintervall zurück.',
                  'Due items return according to their review interval.',
                )}
              </p>
              <Button disabled={!candidates.length} onClick={begin}>
                {t('Neue Runde zusammenstellen', 'Build another session')}
              </Button>
              <Link href="/cheat-sheets">
                {t(
                  'Mit einem Spickzettel weiterlernen',
                  'Continue with a cheat sheet',
                )}{' '}
                →
              </Link>
            </section>
          )}
          <details>
            <summary>{t('Deine Schritte', 'Your steps')}</summary>
            <ol>
              {session.items.map((i) => (
                <li key={i.id}>
                  {localize(reasons[i.reason], lang)} ·{' '}
                  {i.kind === 'exercise'
                    ? localize(
                        lessons
                          .find((l) => l.id === i.lessonId)
                          ?.exercises.find((e) => e.id === i.ref)?.prompt,
                        lang,
                      )
                    : i.kind === 'word'
                      ? [...words, ...state.customWords].find(
                          (w) => w.id === i.ref,
                        )?.de
                      : i.kind === 'book'
                        ? `${t('Seite', 'Page')} ${i.ref}`
                        : localize(
                            reviewItems(state).find((r) => r.id === i.ref)
                              ?.title,
                            lang,
                          ) ||
                          studySources.find((s) => s.section_id === i.ref)
                            ?.heading_text}{' '}
                  {i.done
                    ? '✓'
                    : i.skipped
                      ? t('(übersprungen)', '(skipped)')
                      : ''}
                </li>
              ))}
            </ol>
          </details>
        </>
      )}
    </div>
  );
}
export function CheatSheetsRoom({ lang }: { lang: Locale }) {
  const store = useStudy();
  const { state } = store;
  const t = (de: string, en: string) => translate(de, en, lang);
  const [active, setActive] = useState('');
  const [recall, setRecall] = useState(false);
  const [revealed, setRevealed] = useState<string[]>([]);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('sheet');
    if (cheatSheets.some((s) => s.id === id)) setActive(id!);
  }, []);
  const scope = state.flow.scope;
  const lesson = lessons.find((l) => l.id === scope.lessonId);
  const focus =
    scope.mode === 'skill'
      ? scope.skill
      : scope.mode === 'lesson'
        ? lesson?.skill
        : undefined;
  const visible = cheatSheets.filter(
    (s) =>
      (!focus || s.skills.includes(focus)) &&
      (scope.mode !== 'assignment' ||
        lessons.some(
          (l) => scope.assignment.includes(l.id) && s.skills.includes(l.skill),
        )),
  );
  const sheet = cheatSheets.find((s) => s.id === active);
  function open(id: string) {
    setActive(id);
    setRevealed([]);
    history.replaceState(
      null,
      '',
      '/cheat-sheets' + (id ? '?sheet=' + id : ''),
    );
  }
  return (
    <div className="flow-room cheat-room">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {t(
              'VERSTEHEN · ERINNERN · ANWENDEN',
              'UNDERSTAND · RECALL · APPLY',
            )}
          </p>
          <h1>{t('TestDaF-Spickzettel', 'TestDaF cheat sheets')}</h1>
          <p>
            {t(
              'Eigene Lernhilfen von Wortweg, keine offiziellen Prüfungsantworten.',
              'Study aids authored by Wortweg, not official exam answers.',
            )}
          </p>
        </div>
        {sheet && (
          <Button
            className="no-print"
            variant="outline"
            onClick={() => window.print()}
          >
            {t('Spickzettel drucken', 'Print cheat sheet')}
          </Button>
        )}
      </div>
      <nav
        className="flow-actions no-print"
        aria-label={t('Spickzettel', 'Cheat sheets')}
      >
        <Button
          variant={!active ? 'default' : 'outline'}
          onClick={() => open('')}
        >
          {t('Übersicht', 'Overview')}
        </Button>
        {visible.map((s) => (
          <Button
            key={s.id}
            variant={s.id === active ? 'default' : 'outline'}
            onClick={() => open(s.id)}
          >
            {localize(s.title, lang)}
          </Button>
        ))}
      </nav>
      {!sheet ? (
        <div className="flow-grid">
          {visible.map((s) => (
            <article className="panel" key={s.id}>
              <h2>{localize(s.title, lang)}</h2>
              <p>{localize(s.intro, lang)}</p>
              <small>
                {s.entries.length} {t('Muster', 'patterns')} ·{' '}
                {s.questions.length} {t('Fragen', 'questions')}
              </small>
              <Button onClick={() => open(s.id)}>
                {t('Öffnen', 'Open')} →
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <section className="sheet-print">
          <h2>{localize(sheet.title, lang)}</h2>
          <p>{localize(sheet.intro, lang)}</p>
          <Button
            className="no-print"
            variant="outline"
            aria-pressed={recall}
            onClick={() => {
              setRecall(!recall);
              setRevealed([]);
            }}
          >
            {recall
              ? t('Alle Antworten zeigen', 'Show all answers')
              : t(
                  'Antworten verbergen und erinnern',
                  'Hide answers and recall',
                )}
          </Button>
          <div className="flow-grid">
            {sheet.entries.map((e) => {
              const hidden = recall && !revealed.includes(e.id);
              const item: ReviewItem = {
                id: 'sheet:' + sheet.id + ':' + e.id,
                kind: 'phrase',
                title: e.prompt,
                answer: bi(
                  e.example.de + '\n' + e.rule.de,
                  e.example.de + '\n' + e.example.en + '\n' + e.rule.en,
                ),
                href: '/cheat-sheets?sheet=' + sheet.id,
                origin: 'wortweg-cheat-sheet',
                revision: sheetRevision,
                skills: sheet.skills,
                lessonId: scope.mode === 'lesson' ? scope.lessonId : undefined,
                savedAt: 0,
              };
              return (
                <article key={e.id} className="panel sheet-pattern">
                  <h3>{localize(e.title, lang)}</h3>
                  <p>{localize(e.prompt, lang)}</p>
                  <div
                    className={
                      hidden ? 'sheet-answer recall-hidden' : 'sheet-answer'
                    }
                  >
                    <p>{localize(e.rule, lang)}</p>
                    <blockquote lang="de">{e.example.de}</blockquote>
                    {lang !== 'de' && <p>{localize(e.example, lang)}</p>}
                  </div>
                  {hidden && (
                    <Button
                      className="no-print"
                      onClick={() => setRevealed([...revealed, e.id])}
                    >
                      {t('Muster aufdecken', 'Reveal pattern')}
                    </Button>
                  )}
                  <div className="no-print">
                    <SaveReview item={item} lang={lang} />
                  </div>
                </article>
              );
            })}
          </div>
          <section className="sheet-quiz">
            <h2>{t('Kurz prüfen', 'Quick check')}</h2>
            {sheet.questions.map((q) => {
              const answer = state.flow.sheetAnswers[q.id];
              return (
                <article className="panel" key={q.id}>
                  <h3>{localize(q.prompt, lang)}</h3>
                  <fieldset className="no-print">
                    <legend className="sr-only">
                      {localize(q.prompt, lang)}
                    </legend>
                    {q.options.map((o, i) => (
                      <label className="flow-check" key={i}>
                        <input
                          type="radio"
                          name={q.id}
                          checked={answer === i}
                          onChange={() =>
                            store.setState((s) => ({
                              ...s,
                              flow: {
                                ...s.flow,
                                sheetAnswers: {
                                  ...s.flow.sheetAnswers,
                                  [q.id]: i,
                                },
                              },
                            }))
                          }
                        />
                        {localize(o, lang)}
                      </label>
                    ))}
                  </fieldset>
                  {answer !== undefined && (
                    <p role="status">
                      {answer === q.answer
                        ? t('Richtig. ', 'Correct. ')
                        : t('Noch nicht. ', 'Not quite. ')}
                      {localize(q.explanation, lang)}
                    </p>
                  )}
                  <p className="print-only">
                    {localize(q.options[q.answer], lang)} —{' '}
                    {localize(q.explanation, lang)}
                  </p>
                  <div className="no-print">
                    <SaveReview
                      lang={lang}
                      item={{
                        id: 'sheet-question:' + q.id,
                        kind: 'question',
                        title: q.prompt,
                        answer: bi(
                          q.options[q.answer].de + '\n' + q.explanation.de,
                          q.options[q.answer].en + '\n' + q.explanation.en,
                        ),
                        href: '/cheat-sheets?sheet=' + sheet.id,
                        origin: 'wortweg-cheat-sheet',
                        revision: sheetRevision,
                        skills: sheet.skills,
                        lessonId:
                          scope.mode === 'lesson' ? scope.lessonId : undefined,
                        savedAt: 0,
                      }}
                    />
                  </div>
                </article>
              );
            })}
          </section>
          <footer>
            {t(
              'Wortweg · Eigene Lernhilfe · Fassung 1 · DE / EN / HY / RU',
              'Wortweg · Original study aid · Revision 1 · DE / EN / HY / RU',
            )}
          </footer>
        </section>
      )}
    </div>
  );
}
