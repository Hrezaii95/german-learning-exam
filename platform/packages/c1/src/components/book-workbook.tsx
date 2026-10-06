'use client';
import { c1Path, updateC1History } from '../lib/navigation.js';
import { translate } from '../lib/i18n.js';

import { useEffect, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Textarea } from './ui/textarea.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs.js';
import { useStudy, downloadFile, type StudyStore } from './study-store.js';
import Link from './site-link.js';
import index from '../lib/data/book-index.json';
import type { BookData, BookPage } from '../lib/book-workbook.js';
import type { BookWork } from '../lib/study-state.js';
import type { Locale } from '../lib/catalog.js';
import { SaveReview } from './flow-controls.js';
import { bi } from '../lib/learning.js';
import courseIndex from '../lib/data/source-course-index.json';
import { sourceSkill } from '../lib/source-course.js';
import { imageOnlyObject, pageQualification } from '../lib/source-qualifications.js';
import { ContentsNavigation, PageCourseLinks, SourceRows } from './source-course.js';

export default function BookWorkbook({ lang }: { lang: Locale }) {
  const store = useStudy();
  const [data, setData] = useState<BookData | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(2);
  const [query, setQuery] = useState('');
  const t = (de: string, en: string) => (translate(de, en, lang));
  const scope = store.state.flow.scope;
  useEffect(() => {
    if (
      scope.mode === 'pages' &&
      (page + 1 < scope.from || page + 1 > scope.to)
    )
      setPage(scope.from - 1);
  }, [scope.mode, scope.from, scope.to, page]);
  useEffect(() => {
    const sync = () => { const value = Number(new URLSearchParams(location.search).get('page'));
      if (Number.isInteger(value) && value >= 1 && value <= 110) setPage(value - 1); };
    sync(); window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch(c1Path(index.url), { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Book load failed');
        return r.json();
      })
      .then((raw) => {
        const value = raw as BookData;
        if (
          value.updateManifest !== index.manifest ||
          value.pages.length !== index.pages
        )
          throw new Error('Book revision mismatch');
        setData(value);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(true);
      });
    return () => controller.abort();
  }, [retry]);
  function select(n: number) {
    if ((scope.mode === 'pages' && (n + 1 < scope.from || n + 1 > scope.to)) || (scope.mode === 'skill' && !courseIndex.groups.some(g => sourceSkill(g.section) === scope.skill && g.pages.includes(n + 1)))) store.setState(s => ({...s,flow:{...s.flow,scope:{...s.flow.scope,mode:'all'}}}));
    setPage(n);
    updateC1History('/book', {page: n + 1});
    window.scrollTo({ top: 0 });
  }
  if (error)
    return (
      <section className="panel">
        <p role="alert">
          {t(
            'Die Buchtexte konnten nicht geladen werden.',
            'The book text could not be loaded.',
          )}
        </p>
        <Button onClick={() => setRetry((n) => n + 1)}>
          {t('Erneut laden', 'Retry')}
        </Button>
        <Link href="/library?collection=book">
          {t('Buchscans öffnen', 'Open book scans')}
        </Link>
      </section>
    );
  if (!data || !store.ready)
    return (
      <p role="status">
        {t(
          'Buch und gespeicherte Antworten werden geladen …',
          'Loading book and saved responses…',
        )}
      </p>
    );
  const current = data.pages[page];
  const scopedPages = data.pages.filter(
    (p) =>
      scope.mode === 'skill' ? courseIndex.groups.some(g => sourceSkill(g.section) === scope.skill && g.pages.includes(p.pageIndex + 1)) : scope.mode !== 'pages' ||
      (p.pageIndex + 1 >= scope.from && p.pageIndex + 1 <= scope.to),
  );
  if (!['all', 'pages', 'skill'].includes(scope.mode))
    return (
      <section className="panel">
        <h1>{t('Interaktives Buch', 'Interactive book')}</h1>
        <p>
          {t(
            'Für diese Auswahl sind noch keine Buchseiten eindeutig verknüpft. Wähle oben einen Buchabschnitt nach PDF-Seiten oder alle Materialien.',
            'Book pages are not yet explicitly linked to this selection. Choose a book section by PDF pages, or all materials, above.',
          )}
        </p>
      </section>
    );
  const results = query.trim()
    ? scopedPages.filter((p) =>
        p.objects.some((o) =>
          o.text.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
        ),
      )
    : [];
  return (
    <div className="book-workbook">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {t('DEIN BUCH, DEINE ANTWORTEN', 'YOUR BOOK, YOUR RESPONSES')}
          </p>
          <h1>{t('Das interaktive Buch', 'The interactive book')}</h1>
          <p>
            {t(
              '110 PDF-Seiten · durchsuchbare Texte · gespeicherte Antworten',
              '110 PDF pages · searchable text · saved responses',
            )}
          </p>
        </div>
      </div>
      <p className="study-disclosure">
        {t(
          'Quellengeprüfte Vorabfassung. Nutze den Scan für unklare Zeichen und das genaue Layout. Verknüpfte Aufgaben, Medien und Verlagslösungen findest du unter der Seitenauswahl.',
          'Source-reviewed pre-release. Use the scan for unclear characters and exact layout. Linked activities, media and publisher solutions appear below the page selector.',
        )}
      </p>
      {store.error && (
        <p className="notice" role="alert">
          {t(
            'Speichern fehlgeschlagen. Exportiere deine Antworten.',
            'Saving failed. Export your responses.',
          )}
        </p>
      )}
      <ContentsNavigation lang={lang} select={select} />
      <div className="book-toolbar">
        <label className="study-field">
          {t('Im Buch suchen', 'Search the book')}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'Thema, Ausdruck oder Aufgabenwort',
              'Topic, phrase or task wording',
            )}
          />
        </label>
        <label className="study-field">
          {t('PDF-Seite', 'PDF page')}
          <select value={page} onChange={(e) => select(Number(e.target.value))}>
            {scopedPages.map((p) => (
              <option key={p.unitId} value={p.pageIndex}>
                {p.pageIndex + 1}
                {p.printedLabels.length
                  ? ` · ${t('Druck', 'printed')} ${p.printedLabels.join('–')}`
                  : ''}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="outline"
          disabled={!page || (scope.mode === 'pages' && page + 1 <= scope.from)}
          onClick={() => select(page - 1)}
          aria-label={t('Vorherige Buchseite', 'Previous book page')}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          disabled={
            page === data.pages.length - 1 ||
            (scope.mode === 'pages' && page + 1 >= scope.to)
          }
          onClick={() => select(page + 1)}
          aria-label={t('Nächste Buchseite', 'Next book page')}
        >
          <ChevronRight />
        </Button>
      </div>
      {query.trim() && (
        <section className="panel book-search">
          <p role="status">
            {results.length} {t('Seiten mit Treffern', 'pages with matches')}
          </p>
          {results.map((p) => (
            <Button
              variant="outline"
              key={p.unitId}
              onClick={() => {
                select(p.pageIndex);
                setQuery('');
              }}
            >
              {t('PDF-Seite', 'PDF page')} {p.pageIndex + 1} ·{' '}
              {p.objects
                .find((o) =>
                  o.text
                    .toLocaleLowerCase()
                    .includes(query.toLocaleLowerCase()),
                )
                ?.text.slice(0, 70)}
            </Button>
          ))}
        </section>
      )}
      <BookPageSession
        key={current.unitId}
        page={current}
        data={data}
        lang={lang}
        store={store}
      />
    </div>
  );
}

function BookPageSession({
  page: p,
  data,
  lang,
  store,
}: {
  page: BookPage;
  data: BookData;
  lang: Locale;
  store: StudyStore;
}) {
  const t = (de: string, en: string) => (translate(de, en, lang));
  const [zoom, setZoom] = useState(false);
  const [tab, setTab] = useState('read');
  const work: BookWork = store.state.bookWork[p.unitId] || {
    revision: p.revision,
    answers: {},
    notes: '',
    reviewed: false,
  };
  const fields = p.unitId === data.fields?.unit_id ? data.fields : null;
  function patch(value: Partial<BookWork>) {
    store.setState((s) => ({
      ...s,
      bookWork: { ...s.bookWork, [p.unitId]: { ...work, ...value } },
    }));
  }
  function answer(id: string, value: string) {
    patch({ answers: { ...work.answers, [id]: value }, reviewed: false });
  }
  const responses = Object.values(work.answers).filter((v) => v.trim()).length;
  const text = p.objects
    .map((o) => o.text)
    .filter(Boolean)
    .join('\n\n');
  const objectText = (id: string) =>
    p.objects.find((o) => o.id === id)?.text || '';
  return (
    <>
      <div className="book-page-heading">
        <h2>
          <BookOpen size={22} /> {t('PDF-Seite', 'PDF page')} {p.pageIndex + 1}
          {p.printedLabels.length > 0 &&
            ` · ${t('Gedruckt', 'Printed')} ${p.printedLabels.join('–')}`}
        </h2>
        <Button
          variant="outline"
          onClick={() =>
            downloadFile(
              `wortweg-book-${p.pageIndex + 1}.json`,
              JSON.stringify(
                {
                  page: p,
                  work,
                  baseManifest: data.baseManifest,
                  updateManifest: data.updateManifest,
                },
                null,
                2,
              ),
              'application/json',
            )
          }
        >
          <Download size={16} />
          {t('Antworten exportieren', 'Export responses')}
        </Button>
      </div>
      {work.revision !== p.revision && (
        <p className="notice">
          {t(
            'Neue Textfassung. Deine früheren Antworten bleiben erhalten.',
            'New text revision. Your previous responses are preserved.',
          )}
          <Button
            onClick={() => patch({ revision: p.revision, reviewed: false })}
          >
            {t('Mit neuer Fassung arbeiten', 'Use new revision')}
          </Button>
        </p>
      )}
      <PageCourseLinks page={p.pageIndex + 1} lang={lang} />
      {pageQualification(p.pageIndex + 1, lang) && <p className="notice">{pageQualification(p.pageIndex + 1, lang)}</p>}
      <div className="book-page-layout">
        <aside className="panel book-scan">
          <div className={zoom ? 'book-scan-image zoom' : 'book-scan-image'}>
            <img
              src={p.image}
              alt={`${t('Buchscan, PDF-Seite', 'Book scan, PDF page')} ${p.pageIndex + 1}`}
            />
          </div>
          <div className="study-actions">
            <Button variant="outline" onClick={() => setZoom(!zoom)}>
              {zoom
                ? t('Anpassen', 'Fit image')
                : t('Scan vergrößern', 'Enlarge scan')}
            </Button>
            <a
              className="text-link"
              href={p.image}
              target="_blank"
              rel="noreferrer"
            >
              {t('Scan separat öffnen', 'Open scan separately')}
            </a>
          </div>
          <p className="caption">
            {t(
              'Der Scan ist die Referenz. PDF-Zählung und gedruckte Seitenzahlen können abweichen.',
              'The scan is the reference. PDF and printed page numbers may differ.',
            )}
          </p>
          <label className="study-field">
            {t('Notizen zu dieser Seite', 'Notes on this page')}
            <Textarea
              rows={5}
              value={work.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </label>
        </aside>
        <section className="panel book-content">
          <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
            <TabsList className="studio-tabs">
              <TabsTrigger value="read">
                {t('Lesen & Antworten', 'Read & respond')}
              </TabsTrigger>
              <TabsTrigger value="practice">
                {t('Aufgaben bearbeiten', 'Work on activities')}
              </TabsTrigger>
              <TabsTrigger value="teach">
                {t('Lehrhilfe', 'Teacher guide')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="read">
              <p>
                {t(
                  'Lies den Quelltext und ergänze eigene Antworten. Tabellen und Markierungen bleiben mit der Buchseite verbunden.',
                  'Read the source and add your responses. Tables and annotations stay connected to their book page.',
                )}
              </p>
              {p.objects
                .filter((o) => o.text.trim())
                .map((o) => (
                  imageOnlyObject(p.pageIndex + 1, o.id) ? <article className="book-object" key={o.id}><p>{t('Unbestätigter Randhinweis – bitte im Scan lesen.', 'Unconfirmed margin note—please read the scan.')}</p><a href={p.image} target="_blank" rel="noreferrer" className="text-link">{t('Scan öffnen', 'Open scan')}</a></article> : <article className="book-object" id={o.id} key={o.id}>
                    <SaveReview
                      lang={lang}
                      item={{
                        id: 'book:' + p.unitId + ':' + o.id,
                        kind: 'excerpt',
                        title: bi(o.text.slice(0, 120), o.text.slice(0, 120)),
                        answer: bi(o.text, o.text),
                        href: '/book?page=' + (p.pageIndex + 1),
                        origin: 'provisional-book-capture',
                        page: p.pageIndex + 1,
                        sourceId: p.sourceId,
                        revision: p.revision,
                        savedAt: 0,
                      }}
                    />
                    <small>
                      {o.id} · {o.kind}
                    </small>
                    {o.kind === 'heading' ? (
                      <h3 lang="de">{o.text}</h3>
                    ) : (
                      <p lang="de"><BookSourceText page={p} objectId={o.id} text={o.text} /></p>
                    )}
                    <SourceRows rows={o.rows || []} />
                    {['question', 'blank', 'option', 'answer'].includes(
                      o.kind,
                    ) && (
                      <label className="study-field">
                        {t('Meine Antwort / Notiz', 'My response / note')} ·{' '}
                        {o.id}
                        <Textarea
                          value={work.answers[o.id] || ''}
                          onChange={(e) => answer(o.id, e.target.value)}
                          rows={3}
                        />
                      </label>
                    )}
                  </article>
                ))}
            </TabsContent>
            <TabsContent value="practice">
              {fields ? (
                <>
                  <h3>{t('Wortstämme ergänzen', 'Complete the word stems')}</h3>
                  <p>
                    {t(
                      'Ergänze die fehlenden Buchstaben. Die Zahl der sichtbaren Lücken stammt aus der Quelle. Keine automatische Richtig/Falsch-Bewertung.',
                      'Add the missing letters. The number of visible blanks comes from the source. No automatic right/wrong scoring.',
                    )}
                  </p>
                  {(['noun_bank', 'verb_bank', 'adjective_bank'] as const).map(
                    (key, n) => (
                      <section className="book-word-bank" key={key}>
                        <h4>
                          {
                            [
                              t('Nomen', 'Nouns'),
                              t('Verben', 'Verbs'),
                              t('Adjektive', 'Adjectives'),
                            ][n]
                          }
                        </h4>
                        <div className="book-blank-grid">
                          {fields[key].items.map((item) => {
                            const id = `${fields[key].object_id}:${item.row}:${item.column}`;
                            return (
                              <label key={id} className="book-blank">
                                <span lang="de">
                                  {item.stem}
                                  {'_'.repeat(item.visible_blank_slots)}
                                </span>
                                <Input
                                  aria-label={`${t('Buchstaben für', 'Letters for')} ${item.stem}`}
                                  value={work.answers[id] || ''}
                                  onChange={(e) => answer(id, e.target.value)}
                                  maxLength={item.visible_blank_slots}
                                />
                                <small>
                                  {item.visible_blank_slots}{' '}
                                  {t('Buchstaben', 'letters')}
                                </small>
                              </label>
                            );
                          })}
                        </div>
                      </section>
                    ),
                  )}
                  <h3>{t('Übung 3: Wortwahl', 'Exercise 3: word choice')}</h3>
                  <p className="book-source-text" lang="de">
                    {objectText(fields.exercise3.object_id)}
                  </p>
                  {fields.exercise3.items.map((item) => (
                    <fieldset className="book-choice" key={item.item}>
                      <legend>
                        {t('Auswahl', 'Choice')} {item.item}
                      </legend>
                      {item.options.map((o) => (
                        <label key={o.label}>
                          <input
                            type="radio"
                            name={`choice-${item.item}`}
                            checked={
                              work.answers[`choice:${item.item}`] === o.label
                            }
                            onChange={() =>
                              answer(`choice:${item.item}`, o.label)
                            }
                          />
                          <span lang="de">
                            {o.label} · {o.text_joined}
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  ))}
                  <h3>
                    {t(
                      'Übung 4: Ausdrücke ersetzen',
                      'Exercise 4: replace expressions',
                    )}
                  </h3>
                  <p className="book-source-text" lang="de">
                    {objectText(fields.exercise4.object_id)}
                  </p>
                  {fields.exercise4.targets.map((target) => (
                    <label className="study-field" key={target.item}>
                      <span>
                        {target.item}. <u lang="de">{target.text}</u> →{' '}
                        {t('Mein Ersatz', 'My replacement')}
                      </span>
                      <Input
                        value={work.answers[`replace:${target.item}`] || ''}
                        onChange={(e) =>
                          answer(`replace:${target.item}`, e.target.value)
                        }
                      />
                    </label>
                  ))}
                </>
              ) : (
                <>
                  <h3>
                    {t('Mit dieser Seite üben', 'Practise with this page')}
                  </h3>
                  <p>
                    {t(
                      'Lies die Aufgaben im Scan oder im Textbereich. Trage deine Antworten im Bereich „Lesen & Antworten“ ein. Hier kannst du zusätzlich eine Zusammenfassung und offene Fragen festhalten.',
                      'Read the tasks in the scan or text view. Enter responses under Read & respond. You can also record a summary and open questions here.',
                    )}
                  </p>
                  <label className="study-field">
                    {t(
                      'Meine Zusammenfassung / Lösungsskizze',
                      'My summary / solution outline',
                    )}
                    <Textarea
                      rows={8}
                      value={work.answers.summary || ''}
                      onChange={(e) => answer('summary', e.target.value)}
                    />
                  </label>
                  <label className="study-field">
                    {t('Das möchte ich klären', 'Questions to resolve')}
                    <Textarea
                      rows={4}
                      value={work.answers.questions || ''}
                      onChange={(e) => answer('questions', e.target.value)}
                    />
                  </label>
                  <Link className="text-link" href="/book?page=9">
                    {t(
                      'Wortlücken und Auswahlübungen auf PDF-Seite 9 öffnen',
                      'Open word gaps and choice activities on PDF page 9',
                    )}
                  </Link>
                </>
              )}
              <div className="studio-review">
                <p>
                  {responses} {t('Antworten gespeichert', 'responses saved')}
                </p>
                <label>
                  <input
                    type="checkbox"
                    checked={work.reviewed && work.revision === p.revision}
                    disabled={!responses}
                    onChange={(e) =>
                      patch({
                        reviewed: e.target.checked,
                        revision: p.revision,
                      })
                    }
                  />
                  {t(
                    'Mit Scan, Lehrkraft oder Lerngruppe überprüft',
                    'Reviewed against the scan, with a teacher or study group',
                  )}
                </label>
              </div>
            </TabsContent>
            <TabsContent value="teach">
              <h3>
                {t(
                  'Mit der Buchseite unterrichten',
                  'Teach with this book page',
                )}
              </h3>
              <p>
                {t(
                  'Ergänzende Lehrhilfe von Lingovo. Aufgabenwortlaut im Buch zuerst gemeinsam klären.',
                  'Supplementary guidance by Lingovo. Begin by clarifying the book’s task instructions together.',
                )}
              </p>
              <ol className="studio-teacher-steps">
                <li>
                  {t(
                    'Vorentlasten: Überschriften, Schlüsselwörter und die Aufgabe besprechen.',
                    'Prepare: discuss headings, key vocabulary and task instructions.',
                  )}
                </li>
                <li>
                  {t(
                    'Einzelarbeit: Antworten festhalten und unsichere Stellen markieren.',
                    'Individual work: record responses and mark uncertain passages.',
                  )}
                </li>
                <li>
                  {t(
                    'Partnerarbeit: Antworten vergleichen und Textbelege nennen.',
                    'Pair work: compare responses and give textual evidence.',
                  )}
                </li>
                <li>
                  {t(
                    'Plenum: Am Scan klären, welche Informationen tatsächlich vorliegen. Keine ungeprüften Antworten als Lösungsschlüssel behandeln.',
                    'Whole class: use the scan to establish what is actually supported. Treat unverified responses as proposals.',
                  )}
                </li>
                <li>
                  {t(
                    'Transfer: Einen Satz oder Ausdruck in einem neuen Hochschulkontext verwenden.',
                    'Transfer: use a sentence or phrase in a new university context.',
                  )}
                </li>
              </ol>
              <p>
                {t(
                  'Unterstützung: Aufgaben in kleine Schritte teilen, Wortschatz vorentlasten, englische Erklärungen erlauben. Vertiefung: Alternativen begründen und eigene Beispiele formulieren.',
                  'Support: break tasks into steps, pre-teach vocabulary, allow English explanations. Extend: justify alternatives and create new examples.',
                )}
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  downloadFile(
                    `wortweg-book-worksheet-${p.pageIndex + 1}.md`,
                    `# ${t('Bucharbeitsblatt', 'Book worksheet')} — PDF ${p.pageIndex + 1}\n\n${text}\n\n${t('Meine Antworten', 'My responses')}:\n\n${Object.entries(
                      work.answers,
                    )
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(
                        '\n',
                      )}\n\n${work.notes}\n\nSource: ${p.unitId}\nRevision: ${p.revision}\nStatus: source-reviewed pre-release; publisher comparisons available in linked book-course activities`,
                  )
                }
              >
                {t('Arbeitsblatt exportieren', 'Export worksheet')}
              </Button>
              <label className="study-field">
                {t('Link für Lernende', 'Link for learners')}
                <Input
                  readOnly
                  value={`${location.origin}${c1Path('/book?page=' + (p.pageIndex + 1))}`}
                  onFocus={(e) => e.target.select()}
                />
              </label>
            </TabsContent>
          </Tabs>
        </section>
      </div>
      <details className="panel book-provenance">
        <summary>
          {t('Quelle und Textfassung', 'Source and text revision')}
        </summary>
        <dl>
          <dt>{t('Einheit', 'Unit')}</dt>
          <dd>{p.unitId}</dd>
          <dt>Job</dt>
          <dd>
            {p.jobId} · {p.captureStatus}
          </dd>
          <dt>{t('Status', 'Status')}</dt>
          <dd>{p.status}</dd>
          <dt>{t('Quellpfad', 'Source path')}</dt>
          <dd>{p.sourcePath}</dd>
          <dt>SHA-256</dt>
          <dd>{p.sourceSha256}</dd>
          <dt>{t('Textfassung', 'Text revision')}</dt>
          <dd>{p.revision}</dd>
          <dt>{t('Ursprüngliche Erfassung', 'Original capture')}</dt>
          <dd>{p.originalRevision}</dd>
          <dt>{t('Datenaktualisierung', 'Data update')}</dt>
          <dd>{data.updateManifest}</dd>
        </dl>
        <a
          className="text-link"
          href={p.rawUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t('Erfassten Datensatz öffnen', 'Open captured data record')}
        </a>
        {p.criticalUrl && <a className="text-link" href={p.criticalUrl} target="_blank" rel="noreferrer">{t('Erfasste Aufgabenstrukturen und Einschränkungen', 'Captured task structures and qualifications')}</a>}
      </details>
    </>
  );
}

function BookSourceText({ page, objectId, text }: { page: BookPage; objectId: string; text: string }) {
  const target = page.strokes?.find(s => s.target.object_id === objectId);
  if (target) return <span className={'source-underline ' + target.style}>{text}</span>;
  const spans = (page.strokes || []).flatMap(s => s.spans).filter(s => s.object_id === objectId).sort((a,b) => a.start-b.start);
  if (!spans.length) return <>{text}</>;
  const chars = Array.from(text); let position = 0;
  const parts = spans.map((s,i) => { const before = chars.slice(position,s.start).join(''); position = s.end; return <span key={i}>{before}<span className={'source-underline ' + s.stroke_style}>{chars.slice(s.start,s.end).join('')}</span></span>; });
  return <>{parts}{chars.slice(position).join('')}</>;
}
