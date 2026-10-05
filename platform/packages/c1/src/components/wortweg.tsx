'use client';
import { translate, languages, isLocale } from '../lib/i18n.js';

/* oxlint-disable next/no-img-element -- These immutable, pre-rendered source scans are served as static images without a runtime image transformer. */
/* oxlint-disable jsx-a11y/media-has-caption -- User recordings have no generated transcript; original media has separate, unaligned source transcripts in the library. Do not fabricate captions. */
/* oxlint-disable react/react-compiler -- Browser storage and capability detection intentionally run after SSR hydration. */
import { useEffect, useState } from 'react';
import SourceStudio from './source-studio.js';
import BookWorkbook from './book-workbook.js';
import SourceCourseRoom, { SourceCourseEntry } from './source-course.js';
import { ScopeControl, DailyReturn } from './flow-controls.js';
import { DailyEntry, TodayRoom, MyReview, CheatSheetsRoom } from './study-flow.js';
import { studySources } from '../lib/study-sources.js';
import LearningSpace, {
  HomeLearning,
  NotebookLearning,
} from './learning-space.js';
import Link from './site-link.js';
import {
  BookOpen,
  Headphones,
  PenLine,
  Mic,
  ArrowUpRight,
  ArrowRight,
  Library,
  LayoutDashboard,
  GraduationCap,
  NotebookPen,
  Bookmark,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Play,
  Info,
  Download,
  ExternalLink,
  Layers,
  Globe,
  CheckCircle2,
  Clock3,
  Lightbulb,
  ChevronDown,
  MoveUpRight,
} from 'lucide-react';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Textarea } from './ui/textarea.js';
import raw from '../lib/data/catalog.json';
import type { Locale, View, Source } from '../lib/catalog.js';
const sources = raw.sources as Source[];
const book = sources.find((s) => s.collection === 'book')!;
const skills = [
  {
    id: 'lesen',
    de: 'Lesen',
    en: 'Reading',
    desc: ['Texte verstehen', 'Understand texts'],
    Icon: BookOpen,
    page: 12,
  },
  {
    id: 'hoeren',
    de: 'Hören',
    en: 'Listening',
    desc: ['Genau hinhören', 'Listen closely'],
    Icon: Headphones,
    page: 53,
  },
  {
    id: 'schreiben',
    de: 'Schreiben',
    en: 'Writing',
    desc: ['Gedanken strukturieren', 'Structure your ideas'],
    Icon: PenLine,
    page: 93,
  },
  {
    id: 'sprechen',
    de: 'Sprechen',
    en: 'Speaking',
    desc: ['Sicher ausdrücken', 'Express yourself'],
    Icon: Mic,
    page: 118,
  },
];
type DeviceState = {
  bookmarks: string[];
  notes: Record<string, string>;
  completed: string[];
  writing: string;
  plan: string;
  goal: string;
};
const empty: DeviceState = {
  bookmarks: [],
  notes: {},
  completed: [],
  writing: '',
  plan: '',
  goal: '',
};
export default function Wortweg({
  locale,
  onLocaleChange,
  view = 'home',
  initialSource = '',
  initialSkill = 'lesen',
  initialCollection = 'all',
}: {
  locale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
  view?: View;
  initialSource?: string;
  initialSkill?: string;
  initialCollection?: string;
}) {
  const [localLang, setLocalLang] = useState<Locale>('hy');
  const lang = locale ?? localLang;
  const setLang = (value: Locale) => { setLocalLang(value); onLocaleChange?.(value); };
  const [role, setRole] = useState<'student' | 'teacher'>(
    view === 'teacher' ? 'teacher' : 'student',
  );
  const [state, setState] = useState<DeviceState>(empty);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState(initialCollection);
  const [format, setFormat] = useState('all');
  const [available, setAvailable] = useState(false);
  const [selected, setSelected] = useState(initialSource);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [preview, setPreview] = useState('source');
  const t = (de: string, en: string) => translate(de, en, lang);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem('wortweg-device-v1') || 'null',
      );
      if (saved && typeof saved === 'object')
        setState({
          bookmarks: Array.isArray(saved.bookmarks)
            ? saved.bookmarks.filter((v: unknown) => typeof v === 'string')
            : [],
          completed: Array.isArray(saved.completed)
            ? saved.completed.filter(
                (v: unknown) =>
                  typeof v === 'string' && skills.some((s) => s.id === v),
              )
            : [],
          notes:
            saved.notes && typeof saved.notes === 'object'
              ? (Object.fromEntries(
                  Object.entries(saved.notes).filter(
                    ([, v]) => typeof v === 'string',
                  ),
                ) as Record<string, string>)
              : {},
          writing: typeof saved.writing === 'string' ? saved.writing : '',
          plan: typeof saved.plan === 'string' ? saved.plan : '',
          goal: typeof saved.goal === 'string' ? saved.goal : '',
        });
      const l = localStorage.getItem('wortweg-language');
      if (!locale && isLocale(l)) setLocalLang(l);
      const r = localStorage.getItem('wortweg-role');
      if (r === 'teacher' && view !== 'teacher') setRole(r);
    } catch {
      setStorageError(true);
    }
    setReady(true);
  }, [view]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem('wortweg-device-v1', JSON.stringify(state));
      localStorage.setItem('wortweg-language', lang);
      localStorage.setItem('wortweg-role', role);
    } catch {
      setStorageError(true);
    }
  }, [state, lang, role, ready]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const patch = (change: Partial<DeviceState>) =>
    setState((s) => ({ ...s, ...change }));
  const toggleBookmark = (id: string) =>
    setState((s) => ({
      ...s,
      bookmarks: s.bookmarks.includes(id)
        ? s.bookmarks.filter((x) => x !== id)
        : [...s.bookmarks, id],
    }));
  const source = sources.find((s) => s.source_id === selected);
  const unit = source?.units[page];
  const filtered = sources
    .filter(
      (s) =>
        (collection === 'all' || s.collection === collection) &&
        (format === 'all' || s.format === format) &&
        (!available || s.url || s.playback || s.pages.length) &&
        s.original_filename
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) =>
      a.collection === 'book'
        ? -1
        : b.collection === 'book'
          ? 1
          : a.original_filename.localeCompare(b.original_filename, undefined, {
              numeric: true,
            }),
    );
  const title = {
    today: t('Heutige Übung', 'Today’s practice'),
    review: t('Meine Wiederholung', 'My review'),
    'cheat-sheets': t('Spickzettel', 'Cheat sheets'),
    home: t('Mein Lernraum', 'My study space'),
    library: t('Materialbibliothek', 'Resource library'),
    studio: t('Quellenstudio', 'Source studio'),
    book: t('Interaktives Buch', 'Interactive book'),
    course: t('Buchkurs', 'Book course'),
    practice: t('Lernpfad', 'Learning path'),
    vocabulary: t('Wortschatz', 'Vocabulary'),
    progress: t('Fortschritt', 'Progress'),
    notebook: t('Mein Notizbuch', 'My notebook'),
    teacher: t('Unterricht planen', 'Teacher workspace'),
    about: t('Über diese Vorschau', 'About this preview'),
  }[view];
  const nav = [
    {
      id: 'today',
      href: '/today',
      Icon: Clock3,
      label: t('Heutige Übung', 'Today’s practice'),
    },
    {
      id: 'review',
      href: '/review',
      Icon: Bookmark,
      label: t('Meine Wiederholung', 'My review'),
    },
    {
      id: 'cheat-sheets',
      href: '/cheat-sheets',
      Icon: Lightbulb,
      label: t('Spickzettel', 'Cheat sheets'),
    },
    {
      id: 'course',
      href: '/course',
      Icon: GraduationCap,
      label: t('Buchkurs', 'Book course'),
    },
    {
      id: 'book',
      href: '/book',
      Icon: BookOpen,
      label: t('Interaktives Buch', 'Interactive book'),
    },
    {
      id: 'studio',
      href: '/studio',
      Icon: Headphones,
      label: t('Quellenstudio', 'Source studio'),
    },
    {
      id: 'home',
      href: '/',
      Icon: LayoutDashboard,
      label: t('Mein Lernraum', 'My study space'),
    },
    {
      id: 'library',
      href: '/library',
      Icon: Library,
      label: t('Materialbibliothek', 'Resource library'),
    },
    {
      id: 'practice',
      href: '/practice',
      Icon: Layers,
      label: t('Lernpfad', 'Learning path'),
    },
    {
      id: 'vocabulary',
      href: '/vocabulary',
      Icon: Layers,
      label: t('Wortschatz', 'Vocabulary'),
    },
    {
      id: 'progress',
      href: '/progress',
      Icon: CheckCircle2,
      label: t('Fortschritt', 'Progress'),
    },
    {
      id: 'notebook',
      href: '/notebook',
      Icon: NotebookPen,
      label: t('Mein Notizbuch', 'My notebook'),
    },
    {
      id: 'teacher',
      href: '/teacher',
      Icon: GraduationCap,
      label: t('Für Lehrkräfte', 'For teachers'),
    },
  ];
  const coll = (value: string) =>
    value === 'book'
      ? t('Das Buch', 'The book')
      : value === 'course'
        ? t('Kursmaterial', 'Course materials')
        : t('Modellprüfung 1', 'Mock exam 1');
  function openSource(s: Source) {
    setSelected(s.source_id);
    setPage(0);
    setPreview('source');
    setZoom(false);
    window.history.replaceState(
      null,
      '',
      '/library?source=' + encodeURIComponent(s.source_id),
    );
  }
  function exportFile(name: string, value: unknown) {
    const blob = new Blob(
      [typeof value === 'string' ? value : JSON.stringify(value, null, 2)],
      {
        type:
          typeof value === 'string'
            ? 'text/plain;charset=utf-8'
            : 'application/json',
      },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const pending = t(
    'Quellentreue Aufbereitung ausstehend',
    'Pending source-faithful ingestion',
  );
  const statusText = (s: string) =>
    s === 'accepted'
      ? t('Angenommen', 'Accepted')
      : s === 'needs_attention'
        ? t('Prüfung nötig', 'Needs attention')
        : s === 'stale'
          ? t('Veraltet', 'Stale')
          : t('Ausstehend', 'Pending');
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {t('Zum Inhalt', 'Skip to content')}
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-icon">L</span> Lingovo C1
          <span className="brand-dot">.</span>
        </Link>
        <p className="eyebrow">
          {t('DEIN TESTDAF-BEGLEITER', 'YOUR TESTDAF COMPANION')}
        </p>
        <nav aria-label={t('Hauptnavigation', 'Main navigation')}>
          {nav.map((n) => (
            <Link
              key={n.id}
              className={view === n.id ? 'active' : ''}
              aria-current={view === n.id ? 'page' : undefined}
              href={n.href}
            >
              <n.Icon size={17} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="nav-divider" />
        <Link className="about-link" href="/about">
          <Info size={16} />
          {t('Über die Vorschau', 'About the preview')}
        </Link>
        <div className="sidebar-bottom">
          <BookOpen size={24} />
          <p>{t('Ein Buch. Dein Weg.', 'One book. Your path.')}</p>
          <small lang="de">Mit Erfolg zum digitalen TestDaF</small>
          <Link href="/book">
            {t('Buch öffnen', 'Open book')} <ArrowUpRight size={15} />
          </Link>
        </div>
        <span className="sidebar-footer">
          LINGOVO · {t('VORSCHAU', 'PREVIEW')}
        </span>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            {title}
            <span className="demo-dot">{t('Vorschau', 'Preview')}</span>
          </div>
          <div className="top-actions">
            <div className="segmented role-switch">
              <button
                disabled={!ready}
                aria-pressed={role === 'student'}
                onClick={() => setRole('student')}
              >
                {t('Lernen', 'Student')}
              </button>
              <button
                disabled={!ready}
                aria-pressed={role === 'teacher'}
                onClick={() => setRole('teacher')}
              >
                {t('Lehren', 'Teacher')}
              </button>
            </div>
            <Globe size={15} />
            <select
              className="language-select"
              aria-label={t('Sprache der Website', 'Website language')}
              value={lang}
              disabled={!ready}
              onChange={(e) => {
                if (isLocale(e.target.value)) setLang(e.target.value);
              }}
            >
              {languages.filter(language=>language.code==='hy'||language.code==='ru'||language.code==='en').map((language) => (
                <option
                  key={language.code}
                  value={language.code}
                  lang={language.code}
                >
                  {language.name}
                </option>
              ))}
            </select>
          </div>
        </header>
        {!ready && (
          <p className="local-note" role="status">
            {t('Lernwerkzeuge werden geladen …', 'Loading study tools…')}
          </p>
        )}
        <main id="main" data-ready={ready} inert={!ready} aria-busy={!ready}>
          <ScopeControl lang={lang} />
          <DailyReturn lang={lang} view={view} />
          {view === 'today' && <TodayRoom lang={lang} />}
          {view === 'review' && <MyReview lang={lang} />}
          {view === 'cheat-sheets' && <CheatSheetsRoom lang={lang} />}
          {storageError && (
            <p role="alert" className="notice">
              {t(
                'Speichern auf diesem Gerät ist nicht verfügbar. Bitte exportiere deine Notizen.',
                'Device storage is unavailable. Please export your notes.',
              )}
            </p>
          )}
          {view === 'home' && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    {t(
                      'SCHRITT FÜR SCHRITT WEITER',
                      'A LITTLE FURTHER, EVERY DAY',
                    )}
                  </p>
                  <h1>
                    {role === 'teacher'
                      ? t(
                          'Raum für guten Unterricht.',
                          'Space for great teaching.',
                        )
                      : t('Dein nächster Schritt.', 'Your next step.')}
                  </h1>
                  <p>
                    {t(
                      'Lernen, verstehen, anwenden. In deinem Tempo.',
                      'Learn, understand, apply. At your own pace.',
                    )}
                  </p>
                </div>
                <span className="quiet-label">
                  <span className="green-dot" />
                  {t(
                    'Deutsch lernen · DE / EN / HY / RU',
                    'Learn German · DE / EN / HY / RU',
                  )}
                </span>
              </div>
              <DailyEntry lang={lang} />
              <SourceCourseEntry lang={lang} teacher={role === 'teacher'} />
              <HomeLearning lang={lang} />
              <Link className="studio-entry" href="/studio">
                <Headphones size={24} />
                <span>
                  <strong>
                    {t(
                      'Dein Buch wird zum Lernstudio',
                      'Turn your book into a study studio',
                    )}
                  </strong>
                  <span>
                    {t(
                      'Alle Aufnahmen anhören, Transkripte lesen und eigene Antworten erarbeiten.',
                      'Play all recordings, read transcripts and develop your own responses.',
                    )}
                  </span>
                </span>
                <ArrowRight size={20} />
              </Link>
              <div className="home-top">
                <section className="feature-card">
                  <div>
                    <span className="pill">
                      {t('DEIN STUDIENBEGLEITER', 'YOUR STUDY COMPANION')}
                    </span>
                    <h2>
                      {t('Vom Buch', 'From the book')}
                      <br />
                      {t('zum Können.', 'to confidence.')}
                    </h2>
                    <p>
                      {t(
                        'Vier Fertigkeiten. Ein persönlicher Lernraum.',
                        'Four skills. A space to make them yours.',
                      )}
                      <br />
                      {t(
                        'Entdecke dein Material und finde deinen Fokus.',
                        'Explore your materials and find your focus.',
                      )}
                    </p>
                    <Link
                      className="primary-link"
                      href={role === 'teacher' ? '/teacher' : '/practice'}
                    >
                      {role === 'teacher'
                        ? t('Unterricht vorbereiten', 'Plan a lesson')
                        : t('Lernpfad öffnen', 'Open learning path')}{' '}
                      <ArrowRight size={17} />
                    </Link>
                  </div>
                  <img
                    className="book-cover"
                    src={book.pages[0]}
                    alt="Mit Erfolg zum digitalen TestDaF — book cover"
                  />
                </section>
                <section className="focus-panel">
                  <span className="icon-box">
                    <Lightbulb size={20} />
                  </span>
                  <p className="eyebrow">
                    {t('DEIN FOKUS HEUTE', 'YOUR FOCUS TODAY')}
                  </p>
                  <h3>{t('Klein anfangen.', 'Start small.')}</h3>
                  <p>
                    {t(
                      'Wähle eine Fertigkeit. Probiere eine Demoübung. Halte fest, was du gelernt hast.',
                      'Choose a skill. Try a demo activity. Capture what you learned.',
                    )}
                  </p>
                  <Link href="/practice">
                    {t('Demoübung starten', 'Try a demo activity')}
                    <MoveUpRight size={16} />
                  </Link>
                </section>
              </div>
              <section>
                <div className="section-heading">
                  <h2>
                    {t(
                      'Woran möchtest du arbeiten?',
                      'What would you like to work on?',
                    )}
                  </h2>
                  <span>{t('4 Fertigkeiten', '4 skills')}</span>
                </div>
                <div className="skill-grid">
                  {skills.map(({ id, de, en, desc, Icon, page: p }, i) => (
                    <Link
                      key={id}
                      href={'/practice?skill=' + id}
                      className={'skill-card tone-' + i}
                    >
                      <Icon size={24} />
                      <h3>{translate(de, en, lang)}</h3>
                      <p>{t(desc[0], desc[1])}</p>
                      <span className="skill-page">
                        {t('Im Buch ab S.', 'Book starts at p.')} {p}
                      </span>
                      <ArrowUpRight size={17} />
                    </Link>
                  ))}
                </div>
              </section>
              <div className="home-bottom">
                <section>
                  <div className="section-heading">
                    <h2>
                      {t(
                        'Dein Material, an einem Ort',
                        'Your materials, in one place',
                      )}
                    </h2>
                    <Link href="/library" className="text-link">
                      {t('Alle ansehen', 'View all')} <ArrowRight size={14} />
                    </Link>
                  </div>
                  <div className="collection-list">
                    {[
                      { id: 'book', Icon: BookOpen, count: 1 },
                      { id: 'course', Icon: Headphones, count: 84 },
                      { id: 'mock-exam-1', Icon: FileText, count: 39 },
                    ].map(({ id, Icon, count }) => (
                      <Link
                        key={id}
                        href={'/library?collection=' + id}
                        className="collection-row"
                      >
                        <span className="icon-box">
                          <Icon size={20} />
                        </span>
                        <div>
                          <h3>{coll(id)}</h3>
                          <p>
                            {count} {t('Quelldateien', 'source files')}
                          </p>
                        </div>
                        <ChevronRight size={17} />
                      </Link>
                    ))}
                  </div>
                </section>
                <section className="note-prompt">
                  <NotebookPen size={21} />
                  <h3>
                    {t(
                      'Was möchtest du erreichen?',
                      'What would you like to achieve?',
                    )}
                  </h3>
                  <p>
                    {t(
                      'Ein persönliches Lernziel gibt deinem nächsten Schritt eine Richtung.',
                      'A personal learning goal gives your next step direction.',
                    )}
                  </p>
                  <label className="sr-only" htmlFor="goal">
                    {t('Mein Lernziel', 'My learning goal')}
                  </label>
                  <Textarea
                    id="goal"
                    value={state.goal}
                    onChange={(e) => patch({ goal: e.target.value })}
                    placeholder={t(
                      'Heute möchte ich …',
                      'Today I would like to …',
                    )}
                  />
                  <small>
                    {t(
                      'Nur auf diesem Gerät gespeichert',
                      'Saved only on this device',
                    )}
                  </small>
                </section>
              </div>
            </>
          )}
          {view === 'library' && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    {t('BUCH · AUDIO · VIDEO', 'BOOK · AUDIO · VIDEO')}
                  </p>
                  <h1>{title}</h1>
                  <p>
                    {t(
                      'Originalquellen entdecken und mit eigenen Notizen verbinden.',
                      'Explore original sources and add your own notes.',
                    )}
                  </p>
                </div>
                <span className="count-label">
                  124 {t('Quellen', 'sources')}
                </span>
              </div>
              <div className="library-filters">
                <div className="search-input">
                  <Search size={17} />
                  <Input
                    aria-label={t('Material suchen', 'Search resources')}
                    placeholder={t('Dateiname suchen …', 'Search file names …')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <label className="sr-only" htmlFor="collection">
                  {t('Sammlung', 'Collection')}
                </label>
                <select
                  id="collection"
                  value={collection}
                  onChange={(e) => setCollection(e.target.value)}
                >
                  <option value="all">
                    {t('Alle Sammlungen', 'All collections')}
                  </option>
                  {['book', 'course', 'mock-exam-1'].map((c) => (
                    <option key={c} value={c}>
                      {coll(c)}
                    </option>
                  ))}
                </select>
                <label className="sr-only" htmlFor="format">
                  {t('Format', 'Format')}
                </label>
                <select
                  id="format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                >
                  <option value="all">
                    {t('Alle Formate', 'All formats')}
                  </option>
                  <option value="pdf">PDF</option>
                  <option value="mp3">Audio</option>
                  <option value="mp4">Video</option>
                </select>
              </div>
              <div
                className={source ? 'library-layout' : 'library-layout full'}
              >
                <section
                  className="resource-list"
                  aria-label={t('Quellen', 'Sources')}
                >
                  <div className="list-caption">
                    {filtered.length} {t('Ergebnisse', 'results')}
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={available}
                        onChange={(e) => setAvailable(e.target.checked)}
                      />
                      {t('In der Demo verfügbar', 'Available in demo')}
                    </label>
                  </div>
                  {!filtered.length ? (
                    <div className="empty-state">
                      <Search />
                      <h3>
                        {t('Keine passenden Quellen', 'No matching sources')}
                      </h3>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setQuery('');
                          setCollection('all');
                          setFormat('all');
                          setAvailable(false);
                        }}
                      >
                        {t('Filter zurücksetzen', 'Clear filters')}
                      </Button>
                    </div>
                  ) : (
                    filtered.map((s) => (
                      <button
                        key={s.source_id}
                        className={
                          'resource-row ' +
                          (selected === s.source_id ? 'selected' : '')
                        }
                        onClick={() => openSource(s)}
                      >
                        <span className="resource-icon">
                          {s.format === 'mp3' ? (
                            <Headphones size={21} />
                          ) : s.format === 'mp4' ? (
                            <Play size={21} />
                          ) : (
                            <FileText size={21} />
                          )}
                        </span>
                        <span className="resource-label">
                          <strong lang="de">{s.original_filename}</strong>
                          <small>
                            {coll(s.collection)} · {s.format.toUpperCase()} ·{' '}
                            {s.units.length} {t('Einheiten', 'units')}
                          </small>
                        </span>
                        <span
                          className={
                            'availability ' +
                            (s.url || s.playback || s.pages.length ? 'yes' : '')
                          }
                        >
                          {s.url || s.playback || s.pages.length
                            ? t('Öffnen', 'Open')
                            : t('Index', 'Index')}
                        </span>
                      </button>
                    ))
                  )}
                </section>
                {source && (
                  <section className="source-detail" key={source.source_id}>
                    {studySources.filter(
                      (s) =>
                        s.transcript_source_id === source.source_id ||
                        s.media_candidates.some(
                          (m) => m.source_id === source.source_id,
                        ),
                    ).length > 0 && (
                      <details className="panel">
                        <summary>
                          {t(
                            'Mit dieser Quelle lernen',
                            'Study with this source',
                          )}
                        </summary>
                        <div className="study-actions">
                          {studySources
                            .filter(
                              (s) =>
                                s.transcript_source_id === source.source_id ||
                                s.media_candidates.some(
                                  (m) => m.source_id === source.source_id,
                                ),
                            )
                            .map((s) => (
                              <Link
                                className="text-link"
                                key={s.section_id}
                                href={
                                  '/studio?section=' +
                                  encodeURIComponent(s.section_id)
                                }
                              >
                                {s.heading_text}
                                <ArrowRight size={14} />
                              </Link>
                            ))}
                        </div>
                      </details>
                    )}
                    <div className="detail-heading">
                      <span className="eyebrow">
                        {coll(source.collection)} ·{' '}
                        {source.format.toUpperCase()}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t(
                          'Lesezeichen umschalten',
                          'Toggle bookmark',
                        )}
                        aria-pressed={state.bookmarks.includes(
                          source.source_id,
                        )}
                        onClick={() => toggleBookmark(source.source_id)}
                      >
                        <Bookmark
                          fill={
                            state.bookmarks.includes(source.source_id)
                              ? 'currentColor'
                              : 'none'
                          }
                          size={18}
                        />
                      </Button>
                      <h2 lang="de">{source.original_filename}</h2>
                    </div>
                    <div className="reader-toolbar">
                      <div className="segmented">
                        <button
                          aria-pressed={preview === 'source'}
                          onClick={() => setPreview('source')}
                        >
                          {t('Quelle', 'Source')}
                        </button>
                        {source.text && (
                          <button
                            aria-pressed={preview === 'text'}
                            onClick={() => setPreview('text')}
                          >
                            {t('Textvorschau', 'Text preview')}
                          </button>
                        )}
                      </div>
                      {source.units.length > 1 && (
                        <div className="pager">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!page}
                            onClick={() => setPage((p) => p - 1)}
                            aria-label={t('Vorherige Seite', 'Previous page')}
                          >
                            <ChevronLeft />
                          </Button>
                          <label className="sr-only" htmlFor="physical">
                            {t(
                              'Physische Seite (ab 0)',
                              'Physical page (zero-based)',
                            )}
                          </label>
                          <select
                            id="physical"
                            value={page}
                            onChange={(e) => setPage(Number(e.target.value))}
                          >
                            {source.units.map((u, i) => (
                              <option value={i} key={u.unit_id}>
                                {t('Physisch', 'Physical')} {u.physical_index}
                              </option>
                            ))}
                          </select>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={page >= source.units.length - 1}
                            onClick={() => setPage((p) => p + 1)}
                            aria-label={t('Nächste Seite', 'Next page')}
                          >
                            <ChevronRight />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="source-preview">
                      {preview === 'text' ? (
                        <>
                          <p className="notice">
                            {t(
                              'Abgeleiteter Text · noch nicht als Kursinhalt freigegeben. Nicht zeitlich ausgerichtet.',
                              'Derivative text · not released as course content. No time alignment.',
                            )}
                          </p>
                          <pre lang="de">{source.text}</pre>
                        </>
                      ) : source.pages.length ? (
                        <>
                          <div className={'scan-view ' + (zoom ? 'zoom' : '')}>
                            <img
                              src={source.pages[page]}
                              alt={
                                t(
                                  'Scanvorschau, physische Seite ',
                                  'Source scan preview, physical page ',
                                ) + page
                              }
                            />
                          </div>
                          <Button
                            variant="ghost"
                            onClick={() => setZoom(!zoom)}
                          >
                            {zoom
                              ? t('An Breite anpassen', 'Fit to width')
                              : t('Vergrößern', 'Zoom in')}
                          </Button>
                          <p className="caption">
                            {t(
                              'Abgeleitete Bildvorschau · Original unverändert · physische Zählung beginnt bei 0',
                              'Derived image preview · original unchanged · physical indices start at 0',
                            )}
                          </p>
                        </>
                      ) : source.url || source.playback ? (
                        <>
                          {source.format === 'mp3' ? (
                            <div className="audio-stage">
                              <Headphones size={38} />
                              <h3>
                                {source.url
                                  ? t('Originalaufnahme', 'Original recording')
                                  : t(
                                      'Webfassung der Aufnahme',
                                      'Web rendition of the recording',
                                    )}
                              </h3>
                              <audio
                                key={source.source_id}
                                aria-label={source.original_filename}
                                controls
                                preload="none"
                                src={source.url || source.playback?.url}
                              />
                            </div>
                          ) : source.format === 'mp4' ? (
                            <video
                              key={source.source_id}
                              aria-label={source.original_filename}
                              controls
                              preload="none"
                              src={source.url || source.playback?.url}
                            />
                          ) : (
                            <iframe
                              key={source.source_id + page}
                              title={source.original_filename}
                              src={source.url + '#page=' + (page + 1)}
                            />
                          )}
                          <a
                            className="text-link"
                            href={source.url || source.playback?.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {source.url
                              ? t('Originaldatei öffnen', 'Open original file')
                              : t(
                                  'Webfassung öffnen',
                                  'Open web rendition',
                                )}{' '}
                            <ExternalLink size={14} />
                          </a>
                          {['mp3', 'mp4'].includes(source.format) && (
                            <p className="caption">
                              {t(
                                'Transkriptverknüpfung, Ausrichtung und Medienqualität sind noch nicht geprüft.',
                                'Transcript relationships, alignment and media quality have not yet been reviewed.',
                              )}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="empty-state">
                          <Layers size={30} />
                          <h3>
                            {t(
                              'Im Quellenindex erfasst',
                              'Registered in the source index',
                            )}
                          </h3>
                          <p>
                            {t(
                              'Diese Originaldatei ist im Datenpaket enthalten. Die öffentliche Demo stellt eine Auswahl bereit.',
                              'This original is in the data package. The public demo hosts a selection of files.',
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="pending-box">
                      <Clock3 size={16} />
                      <div>
                        <strong>{pending}</strong>
                        <p>
                          {t(
                            'Übungen, Lösungen, Übersetzungen und geprüfte Medienverknüpfungen folgen mit dem finalen Paket.',
                            'Exercises, answers, translations and reviewed media relationships will come with the final package.',
                          )}
                        </p>
                      </div>
                    </div>
                    <label className="field-label" htmlFor="source-note">
                      {role === 'teacher'
                        ? t('Meine Unterrichtsnotizen', 'My teaching notes')
                        : t(
                            'Meine Notizen zur Quelle',
                            'My notes on this source',
                          )}
                    </label>
                    <Textarea
                      id="source-note"
                      placeholder={t(
                        'Gedanken, Fragen, neue Wörter …',
                        'Ideas, questions, new words …',
                      )}
                      value={state.notes[source.source_id] || ''}
                      onChange={(e) =>
                        patch({
                          notes: {
                            ...state.notes,
                            [source.source_id]: e.target.value,
                          },
                        })
                      }
                    />
                    <small className="device-note">
                      {t(
                        'Privat auf diesem Gerät · keine Synchronisierung',
                        'Private to this device · no sync',
                      )}
                    </small>
                    <details className="provenance">
                      <summary>
                        <Info size={15} />
                        {t(
                          'Quelle & Bearbeitungsstand',
                          'Source & processing status',
                        )}
                        <ChevronDown size={14} />
                      </summary>
                      <dl>
                        <dt>{t('Sammlung', 'Collection')}</dt>
                        <dd>{source.collection}</dd>
                        <dt>{t('Quellpfad', 'Source path')}</dt>
                        <dd>{source.path}</dd>
                        <dt>SHA-256</dt>
                        <dd>{source.sha256}</dd>
                        <dt>{t('Einheit', 'Unit')}</dt>
                        <dd>{unit?.unit_id}</dd>
                        <dt>
                          {t('Gedruckte Seitenangaben', 'Printed labels')}
                        </dt>
                        <dd>
                          {unit?.printed_labels.length
                            ? unit.printed_labels.join(', ')
                            : t('Noch nicht zugeordnet', 'Not yet mapped')}
                        </dd>
                      </dl>
                      {unit?.jobs.map((j) => (
                        <div className="job" key={j.job_id}>
                          <span className={'status-chip ' + j.status}>
                            {statusText(j.status)}
                          </span>
                          <code>{j.job_id}</code>
                          <small>
                            {t('Revision', 'Revision')}: {j.revision || '—'}
                          </small>
                          <small>
                            {t('Prüfumfang', 'Scopes')}:{' '}
                            {j.required_scopes.join(', ')} ·{' '}
                            {j.required_region_ids.join(', ')}
                          </small>
                        </div>
                      ))}
                      <p className="caption">
                        {t(
                          '„Angenommen“ gilt nur für den genannten Verarbeitungsschritt, nicht für fertige Lerninhalte.',
                          '“Accepted” applies only to the named processing stage, not to finished learning content.',
                        )}
                      </p>
                    </details>
                  </section>
                )}
              </div>
            </>
          )}
          {view === 'course' && <SourceCourseRoom lang={lang} role={role} />}
          {['practice', 'teacher'].includes(view) && (
            <SourceCourseEntry lang={lang} teacher={role === 'teacher'} />
          )}
          {view === 'book' && <BookWorkbook lang={lang} />}
          {view === 'studio' && <SourceStudio lang={lang} role={role} />}
          {['practice', 'teacher', 'vocabulary', 'progress'].includes(view) && (
            <LearningSpace
              lang={lang}
              view={view}
              initialSkill={initialSkill}
              role={role}
            />
          )}
          {view === 'notebook' && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    {t('DEINE GEDANKEN BLEIBEN', 'KEEP YOUR IDEAS')}
                  </p>
                  <h1>{title}</h1>
                  <p>
                    {t(
                      'Persönliche Notizen und Lesezeichen auf diesem Gerät.',
                      'Personal notes and bookmarks on this device.',
                    )}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => exportFile('wortweg-notebook.json', state)}
                >
                  <Download size={16} />
                  {t('Exportieren', 'Export')}
                </Button>
              </div>
              <div className="notebook-grid">
                <section className="panel">
                  <h2>{t('Mein Lernziel', 'My learning goal')}</h2>
                  <label className="sr-only" htmlFor="notebook-goal">
                    {t('Lernziel', 'Learning goal')}
                  </label>
                  <Textarea
                    id="notebook-goal"
                    value={state.goal}
                    onChange={(e) => patch({ goal: e.target.value })}
                    placeholder={t(
                      'Was möchtest du als Nächstes erreichen?',
                      'What would you like to achieve next?',
                    )}
                  />
                  <h2>
                    {t('Lesezeichen', 'Bookmarks')}{' '}
                    <span className="count-label">
                      {state.bookmarks.length}
                    </span>
                  </h2>
                  {state.bookmarks.length ? (
                    sources
                      .filter((s) => state.bookmarks.includes(s.source_id))
                      .map((s) => (
                        <Link
                          className="saved-source"
                          key={s.source_id}
                          href={
                            '/library?source=' + encodeURIComponent(s.source_id)
                          }
                        >
                          <Bookmark size={17} />
                          {s.original_filename}
                          <ArrowUpRight size={15} />
                        </Link>
                      ))
                  ) : (
                    <div className="empty-state">
                      <Bookmark />
                      <p>
                        {t(
                          'Markiere Quellen in der Bibliothek, um sie hier wiederzufinden.',
                          'Bookmark resources in the library to find them here.',
                        )}
                      </p>
                      <Link className="text-link" href="/library">
                        {t('Bibliothek öffnen', 'Open library')}
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  )}
                </section>
                <section className="panel">
                  <h2>{t('Meine Notizen', 'My notes')}</h2>
                  {Object.entries(state.notes)
                    .filter(([, v]) => v.trim())
                    .map(([id, note]) => (
                      <article className="note-entry" key={id}>
                        <h3>
                          {sources.find((s) => s.source_id === id)
                            ?.original_filename ||
                            (id === 'demo-listening'
                              ? t('Hörreflexion', 'Listening reflection')
                              : t('Sprechreflexion', 'Speaking reflection'))}
                        </h3>
                        <p>{note}</p>
                      </article>
                    ))}
                  {!Object.values(state.notes).some((v) => v.trim()) && (
                    <p className="muted">
                      {t(
                        'Deine Quellennotizen aus der Bibliothek erscheinen hier.',
                        'Your source notes from the library appear here.',
                      )}
                    </p>
                  )}
                  {state.writing && (
                    <article className="note-entry">
                      <h3>{t('Mein Schreibentwurf', 'My writing draft')}</h3>
                      <p lang="de">{state.writing}</p>
                    </article>
                  )}
                </section>
              </div>
              <NotebookLearning lang={lang} />
            </>
          )}
          {view === 'about' && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">LINGOVO · r44 + r44a</p>
                  <h1>{title}</h1>
                  <p>
                    {t(
                      'Eine nutzbare Vorschau mit klar erkennbarem Inhaltsstand.',
                      'A working preview with a clear view of content readiness.',
                    )}
                  </p>
                </div>
              </div>
              <div className="stats-grid">
                {[
                  [124, t('Quelldateien', 'Source files')],
                  [258, t('Registrierte Einheiten', 'Registered units')],
                  [
                    raw.status.job_status_counts.accepted,
                    t('Angenommene Jobs', 'Accepted jobs'),
                  ],
                  [
                    raw.status.job_status_counts.pending,
                    t('Ausstehende Jobs', 'Pending jobs'),
                  ],
                ].map(([n, l]) => (
                  <div className="stat" key={l}>
                    <strong>{n}</strong>
                    <span>{l}</span>
                  </div>
                ))}
              </div>
              <section className="panel about-panel">
                <h2>
                  {t('Was du jetzt nutzen kannst', 'What you can use now')}
                </h2>
                <p>
                  {t(
                    '110 quellengeprüfte Buchseiten, 119 Transkripteinheiten, 119 Aufnahmen, 35 Inhaltsverzeichnis-Ziele und 955 Verlagslösungsdatensätze. Der Buchkurs verbindet Aufgaben, gespeicherte Antworten und Lösungen. Dazu eigene Übungen, Wiederholung und Lehrhilfen.',
                    '110 source-reviewed book pages, 119 transcript units, 119 recordings, 35 contents destinations and 955 publisher solution records. The book course connects activities, saved responses and solutions, alongside original practice, review and teaching tools.',
                  )}
                </p>
                <h2>{t('Was noch aussteht', 'What is still pending')}</h2>
                <p>
                  {t(
                    'Die Quellenprüfung ist in den ausgewiesenen Bereichen abgeschlossen. Die finale Produktionsfreigabe, Hör-/Transkriptvergleiche und Satz-Zeitmarken stehen aus. Einzelne Falzstellen, Zeichen und typografische Details bleiben eingeschränkt.',
                    'The source package is a pre-release, not a released course. Semantic accuracy, media quality, alignment, answers and editorial approval have not been fully reviewed.',
                  )}
                </p>
                <p>
                  {t(
                    'Drei Verarbeitungsschritte benötigen Aufmerksamkeit. Der finale Freigabeschritt ist blockiert. Angenommene Jobs betreffen Vorbereitung und Layout; sie bestätigen keine Kursreife.',
                    'The historical processing ledger and current source reviews have different scopes. This pre-release does not claim final production admission.',
                  )}
                </p>
                <h2>
                  {t(
                    'Sprachen & persönliche Daten',
                    'Languages & personal data',
                  )}
                </h2>
                <p>
                  {t(
                    'Navigation und Lernhilfen: Deutsch, Englisch, Armenisch und Russisch. Originaltexte, Aufgaben und Aufnahmen bleiben deutsch. Die Lernhilfen sind keine vollständige Buchübersetzung. Notizen und Lernfortschritt bleiben in diesem Browser; es gibt keine Konten oder Klassensynchronisierung.',
                    'Navigation and learning support: German, English, Armenian and Russian. Original book texts, tasks and recordings remain German. These learning aids are not a full translation of the book. Your notes and progress stay in this browser; there are no accounts or classroom sync.',
                  )}
                </p>
                <h2>{t('Quellenprüfung', 'Source verification')}</h2>
                <p>
                  {t(
                    'Alle Manifest-Einträge und der Status-Hash wurden überprüft. Der Manifest-Hash wurde mit dem separat übermittelten Hash des Datenpakets abgeglichen.',
                    'All manifest entries and the status hash were checked. The manifest digest matches the separately supplied package hash.',
                  )}
                </p>
                <code className="hash">
                  89545eaace81099062346d154a8f7676b44f4d6091c7c541e0c8fa7eb83e9487
                </code>
                <p className="caption">
                  {t(
                    'Unabhängige Demo. Keine offizielle TestDaF- oder Klett-Anwendung. Quelle: Mit Erfolg zum digitalen TestDaF, Ernst Klett Sprachen, 2020.',
                    'Independent demo. Not an official TestDaF or Klett application. Source: Mit Erfolg zum digitalen TestDaF, Ernst Klett Sprachen, 2020.',
                  )}
                </p>
              </section>
            </>
          )}
          <footer className="release-note">
            <span className="green-dot" />
            {t(
              'Vorabversion · Noch kein vollständiger Kurs.',
              'Pre-release · Not a complete course yet.',
            )}
            <Link href="/about">
              {t('Inhaltsstand ansehen', 'View content status')}
              <ArrowUpRight size={12} />
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}
