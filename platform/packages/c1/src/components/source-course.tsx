'use client';
import { translate, localize } from '../lib/i18n.js';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Headphones, Download, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Textarea } from './ui/textarea.js';
import Link from './site-link.js';
import { useStudy, downloadFile, type StudyStore } from './study-store.js';
import { SaveReview } from './flow-controls.js';
import { SpeakingRecorder } from './study-media.js';
import { bi } from '../lib/learning.js';
import type { Locale } from '../lib/catalog.js';
import type { BookWork } from '../lib/study-state.js';
import { groupTitle, sourceSkill, type SourceCourse, type SourceGroup, type SourceSolution } from '../lib/source-course.js';
import courseIndex from '../lib/data/source-course-index.json';
import { studySources } from '../lib/study-sources.js';
import { pageQualification } from '../lib/source-qualifications.js';

let cached: SourceCourse | null = null;
export function useSourceCourse() {
  const [data, setData] = useState<SourceCourse | null>(cached);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (cached) { setData(cached); return; }
    const controller = new AbortController(); setError(false);
    fetch('/c1/data/r44/course.json', { signal: controller.signal }).then(r => {
      if (!r.ok) throw new Error('Course unavailable'); return r.json();
    }).then((raw) => {
      const value = raw as SourceCourse;
      if (value.manifest !== courseIndex.manifest || value.groups.length !== courseIndex.groups.length) throw new Error('Course revision mismatch');
      cached = value; setData(value);
    }).catch(e => { if (e.name !== 'AbortError') setError(true); });
    return () => controller.abort();
  }, [retry]);
  return { data, error, retry: () => setRetry(n => n + 1) };
}

export function ContentsNavigation({ lang, select }: { lang: Locale; select?: (page: number) => void }) {
  return <details className="panel source-contents"><summary><BookOpen size={18} /> {translate('Inhaltsverzeichnis · direkt zum Buchabschnitt', 'Contents · jump to a book section', lang)}</summary>
    <div className="contents-grid">{courseIndex.contents.map(c => <div key={c.id} className={c.parentId ? 'contents-child' : 'contents-parent'}>
      {select ? <button type="button" onClick={() => select(c.page - 1)}><span lang="de">{c.title}</span><small>{translate('S.', 'p.', lang)} {c.printed}</small></button> : <Link href={'/book?page=' + c.page}><span lang="de">{c.title}</span><small>{translate('p.', 'p.', lang)} {c.printed}</small></Link>}
    </div>)}</div>
  </details>;
}

export function PageCourseLinks({ page, lang }: { page: number; lang: Locale }) {
  const groups = courseIndex.groups.filter(g => g.pages.includes(page));
  const edges = courseIndex.edges.filter(e => e.page === page);
  const bindings = courseIndex.bindings.filter(b => edges.some(e => e.bindingId === b.id));
  if (!groups.length && !bindings.length) return null;
  return <section className="panel page-course-links"><h3>{translate('Mit dieser Buchseite lernen', 'Study this book page', lang)}</h3>
    <div className="source-link-list">{groups.map(g => <Link key={g.id} href={'/course?activity=' + encodeURIComponent(g.id)}><BookOpen size={16} /><span lang="de">{groupTitle(g)}</span><ArrowRight size={16} /></Link>)}</div>
    <div className="study-actions">{bindings.map(b => <Link className="text-link" key={b.id} href={'/studio?section=' + encodeURIComponent(b.sectionId)}><Headphones size={16} /> {b.collection === 'course' ? (translate('Kurs', 'Course', lang)) : (translate('Modellprüfung', 'Mock exam', lang))} · {b.kind === 'video' ? 'Video' : 'Track'} {b.number}</Link>)}</div>
  </section>;
}

export function SourceCourseEntry({ lang, teacher = false }: { lang: Locale; teacher?: boolean }) {
  const {state}=useStudy();
  const active=courseIndex.groups.find(g=>state.bookWork['activity:'+g.id]&&!state.bookWork['activity:'+g.id].reviewed);
  const compared=courseIndex.groups.filter(g=>state.bookWork['activity:'+g.id]?.reviewed&&state.bookWork['activity:'+g.id].revision===g.revision).length;
  return <section className="panel source-course-entry"><div><p className="eyebrow">{translate('DIREKT AUS DEM BUCH', 'FROM YOUR BOOK', lang)}</p><h2>{teacher ? (translate('Unterricht mit den Buchaufgaben', 'Teach with the book’s activities', lang)) : (translate('Dein vollständiger Buchkurs', 'Your complete book workspace', lang))}</h2><p>{translate('Lesen, Hören, Schreiben und Sprechen · mit Buchtexten, Aufnahmen und Verlagslösungen.', 'Reading, listening, writing and speaking—with source texts, recordings and publisher solutions.', lang)}</p><small>{compared} {translate('Aufgabengruppen selbst verglichen', 'activity groups self-reviewed', lang)}</small></div><div className="study-actions"><Link className="primary-link" href={teacher ? '/course?mode=teacher' : '/course'}>{translate('Buchkurs öffnen', 'Open book course', lang)} <ArrowRight size={18} /></Link>{active&&<Link className="text-link" href={'/course?activity='+encodeURIComponent(active.id)}>{translate('Meine Aufgabe fortsetzen', 'Resume my activity', lang)}</Link>}</div></section>;
}

export default function SourceCourseRoom({ lang, role }: { lang: Locale; role: string }) {
  const store = useStudy(); const { data, error, retry } = useSourceCourse();
  const [selected, setSelected] = useState(''); const [query, setQuery] = useState('');
  const [skill, setSkill] = useState('all'); const [collection, setCollection] = useState('all');
  const [task, setTask] = useState('all'); const [limit, setLimit] = useState(24);
  const [teacher, setTeacher] = useState(role === 'teacher');
  const t = (de: string, en: string) => translate(de, en, lang);
  useEffect(() => { const q = new URLSearchParams(location.search); setSelected(q.get('activity') || ''); setTeacher(q.get('mode') === 'teacher' || role === 'teacher'); if (q.get('skill')) setSkill(q.get('skill')!); }, [role]);
  function open(id: string) { setSelected(id); history.replaceState(null, '', '/course' + (id ? '?activity=' + encodeURIComponent(id) : '')); window.scrollTo({ top: 0 }); }
  if (error) return <section className="panel"><p role="alert">{t('Buchkurs konnte nicht geladen werden.', 'The book course could not load.')}</p><Button onClick={retry}>{t('Erneut versuchen', 'Retry')}</Button></section>;
  if (!data || !store.ready) return <p role="status">{t('Buchkurs wird geladen …', 'Loading book course…')}</p>;
  const group = data.groups.find(g => g.aliases.includes(selected));
  const scope = store.state.flow.scope;
  const filtered = data.groups.filter(g => (skill === 'all' || sourceSkill(g.section) === skill) && (collection === 'all' || g.collection === collection) && (task === 'all' || g.task === task) && (scope.mode !== 'pages' || g.pages.some(p => p >= scope.from && p <= scope.to)) && (scope.mode !== 'skill' || sourceSkill(g.section) === scope.skill) && (groupTitle(g) + ' ' + g.anchors.map(a => a.text).join(' ')).toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de')));
  const tasks = [...new Set(data.groups.filter(g => skill === 'all' || sourceSkill(g.section) === skill).map(g => g.task))];
  return <div className="source-course-room">
    <div className="page-heading"><div><p className="eyebrow">{t('LERNEN MIT DEM ORIGINAL', 'LEARN WITH THE SOURCE')}</p><h1>{t('Dein Buchkurs', 'Your book course')}</h1><p>{t('Aufgaben bearbeiten. Aufnahmen hören. Antworten vergleichen.', 'Work through tasks. Listen to recordings. Compare your responses.')}</p></div><Button variant="outline" aria-pressed={teacher} onClick={() => setTeacher(!teacher)}>{teacher ? t('Lehrkraftansicht', 'Teacher view') : t('Selbstlernen', 'Self-study')}</Button></div>
    <p className="study-disclosure">{t('Quellengeprüfte Vorabfassung. Verlagslösungen und Beispiele dienen dem Vergleich; es wird keine automatische TestDaF-Note vergeben.', 'Source-reviewed pre-release. Publisher solutions and examples support comparison; no automatic TestDaF score is assigned.')}</p>
    {store.error && <p className="notice" role="alert">{t('Speichern fehlgeschlagen. Exportiere deine Arbeit.', 'Saving failed. Export your work.')}</p>}
    {selected && !group ? <section className="panel"><p>{t('Diese Aufgabe wurde nicht gefunden.', 'This activity was not found.')}</p><Button onClick={() => open('')}>{t('Alle Aufgaben', 'All activities')}</Button></section> : group ? <><Button variant="outline" onClick={() => open('')}><ArrowLeft size={16}/>{t('Zur Aufgabenübersicht', 'Back to activities')}</Button><ActivitySession key={group.id} group={group} data={data} lang={lang} store={store} teacher={teacher}/><div className="study-actions"><Button disabled={data.groups.indexOf(group) === 0} onClick={() => open(data.groups[data.groups.indexOf(group)-1].id)}>{t('Vorherige Aufgabe', 'Previous activity')}</Button><Button disabled={data.groups.indexOf(group) === data.groups.length-1} onClick={() => open(data.groups[data.groups.indexOf(group)+1].id)}>{t('Nächste Aufgabe', 'Next activity')}<ArrowRight size={16}/></Button></div></> : <>
      <ContentsNavigation lang={lang}/>
      <div className="source-course-filters"><label>{t('Suchen', 'Search')}<Input value={query} onChange={e => { setQuery(e.target.value); setLimit(24); }} placeholder={t('Aufgabe, Ausdruck oder Text', 'Activity, expression or text')}/></label>
        <label>{t('Sammlung', 'Collection')}<select aria-label={t('Sammlung', 'Collection')} value={collection} onChange={e => { setCollection(e.target.value); setLimit(24); }}><option value="all">{t('Alle', 'All')}</option><option value="course">{t('Kurs', 'Course')}</option><option value="mock-exam-1">{t('Modellprüfung 1', 'Mock exam 1')}</option></select></label>
        <label>{t('Fertigkeit', 'Skill')}<select aria-label={t('Fertigkeit', 'Skill')} value={skill} onChange={e => { setSkill(e.target.value); setTask('all'); setLimit(24); }}><option value="all">{t('Alle Fertigkeiten', 'All skills')}</option>{[['lesen','Lesen','Reading'],['hoeren','Hören','Listening'],['schreiben','Schreiben','Writing'],['sprechen','Sprechen','Speaking']].map(([id,de,en]) => <option key={id} value={id}>{t(de,en)}</option>)}</select></label>
        <label>{t('Aufgabentyp', 'Task type')}<select aria-label={t('Aufgabentyp', 'Task type')} value={task} onChange={e => {setTask(e.target.value);setLimit(24);}}><option value="all">{t('Alle Typen', 'All types')}</option>{tasks.map(v => <option key={v}>{v}</option>)}</select></label>
      </div>
      <p role="status">{filtered.length} {t('Aufgabengruppen', 'activity groups')} · {t('Gruppen können mehrere Teilaufgaben enthalten.', 'Groups may contain several subitems.')}</p>
      {!filtered.length && <div className="panel"><p>{t('Keine passende Aufgabe. Ändere die Filter oder die Lernauswahl.', 'No matching activity. Change the filters or study selection.')}</p></div>}
      <div className="source-course-grid">{filtered.slice(0,limit).map(g => {const work=store.state.bookWork['activity:'+g.id];return <article className="panel source-course-card" key={g.id}><p className="eyebrow">{g.collection==='course'?t('KURS','COURSE'):t('MODELLPRÜFUNG','MOCK EXAM')} · {g.section}</p><h2 lang="de">{g.task}</h2><p lang="de">{g.phase}{g.label ? ' · '+g.label : ''}</p><p className="source-excerpt" lang="de">{g.anchors[0]?.text.slice(0,160)}</p><div className="source-card-footer"><small>PDF {g.pages.join(', ')} {work?.reviewed && work.revision===g.revision ? '· ✓ '+t('Verglichen','Compared') : work ? '· '+t('In Bearbeitung','In progress') : ''}</small><Button onClick={() => open(g.id)}>{t('Öffnen','Open')}<ArrowRight size={16}/></Button></div></article>;})}</div>
      {limit<filtered.length && <Button variant="outline" onClick={() => setLimit(n=>n+24)}>{t('Weitere Aufgaben', 'More activities')}</Button>}
    </>}
  </div>;
}

function ActivitySession({ group:g, data, lang, store, teacher }: { group:SourceGroup; data:SourceCourse; lang:Locale; store:StudyStore; teacher:boolean }) {
  const t=(de:string,en:string)=>translate(de, en, lang);
  const id='activity:'+g.id; const [revealed,setRevealed]=useState(false); const [showTranscript,setShowTranscript]=useState(false);
  const work:BookWork=store.state.bookWork[id]||{revision:g.revision,answers:{},notes:'',reviewed:false};
  function patch(change:Partial<BookWork>) { store.setState(s=>({...s,bookWork:{...s.bookWork,[id]:{...(s.bookWork[id]||work),...change}}})); }
  function answer(key:string,text:string) { store.setState(s=>({...s,bookWork:{...s.bookWork,[id]:{...(s.bookWork[id]||work),answers:{...(s.bookWork[id]?.answers||work.answers),[key]:text},reviewed:false}}})); }
  const edges=data.edges.filter(e=>g.anchors.some(a=>a.page===e.page && e.objectIds.includes(a.objectId)));
  const linked=data.bindings.filter(b=>edges.some(e=>e.bindingId===b.id));
  const pageBindings=data.bindings.filter(b=>!linked.includes(b)&&data.edges.some(e=>e.bindingId===b.id&&g.pages.includes(e.page)));
  const records=g.solutionIds.map(i=>data.solutions[i]);
  const rootRecords=records.filter(r=>!r.parent||!g.solutionIds.includes(r.parent));
  function exportWorksheet(includeAnswers:boolean) {
    const text=['# '+groupTitle(g),t('Arbeitsblatt · Originalaufgaben aus dem Buch','Worksheet · source activities from the book'),...g.anchors.map(a=>`\nPDF ${a.page}\n${a.text}\n\n${work.answers[a.page+':'+a.objectId]||'____________________________'}`),'\n'+t('Meine Antwort','My response')+'\n'+(work.answers.response||''),'\n'+t('Notizen','Notes')+'\n'+work.notes,
      ...(includeAnswers?['\n'+t('Verlagslösungen / Beispiele – keine automatische Bewertung','Publisher solutions / examples — no automatic grading'),...rootRecords.map(r=>`\nPDF ${r.page}\n${r.text}`)]:[]),`\n${location.origin}/course?activity=${encodeURIComponent(g.id)}`].join('\n');
    downloadFile('wortweg-'+g.id+(includeAnswers?'-teacher':'-worksheet')+'.md',text);
  }
  return <article className="source-activity">
    <header className="panel"><p className="eyebrow">{g.section} · {g.collection==='course'?t('Kurs','Course'):t('Modellprüfung 1','Mock exam 1')}</p><h2 lang="de">{g.task} · {g.phase}{g.label?' · '+g.label:''}</h2><div className="study-actions">{g.pages.map(p=><Link key={p} className="text-link" href={'/book?page='+p}><BookOpen size={16}/>{t('Buchseite','Book page')} PDF {p}</Link>)}<Button variant="outline" onClick={()=>exportWorksheet(false)}><Download size={16}/>{t('Arbeitsblatt','Worksheet')}</Button><Button variant="outline" onClick={()=>window.print()}>{t('Drucken','Print')}</Button></div></header>
    {g.pages.map(p=>pageQualification(p,lang)?<p className="notice" key={p}>PDF {p}: {pageQualification(p,lang)}</p>:null)}
    {work.revision!==g.revision&&<p className="notice">{t('Die Quelle wurde aktualisiert. Deine bisherigen Antworten bleiben erhalten.','The source was updated. Your earlier responses are preserved.')} <Button onClick={()=>patch({revision:g.revision,reviewed:false})}>{t('Neue Fassung verwenden','Use new revision')}</Button></p>}
    {teacher&&<section className="panel teacher-source-guide"><h3>{t('Unterrichtsablauf','Teaching sequence')}</h3><p className="caption">{t('Anpassbare Wortweg-Lehrhilfe; kein Verlagshandbuch.','Adaptable Wortweg guidance; not a publisher teacher manual.')}</p><ol><li>{t('Auftrag und Kontext gemeinsam lesen. Unklare Begriffe sammeln.','Read the task and context together. Collect unclear terms.')}</li><li>{t('Lernende bearbeiten die Aufgabe zunächst ohne Lösung. Bei Medien zuerst ohne Transkript hören.','Learners attempt the task before seeing the solution. For media, listen before revealing the transcript.')}</li><li>{t('Antworten paarweise begründen und mit der Quelle vergleichen. Bei Mustertexten mehrere gültige Formulierungen zulassen.','Discuss responses in pairs and compare with the source. Allow alternative wording for model responses.')}</li><li>{t('Einen schwierigen Ausdruck zur Wiederholung speichern und einen nächsten Lernschritt notieren.','Save a difficult expression for review and note a next learning step.')}</li></ol><Button variant="outline" onClick={()=>exportWorksheet(true)}>{t('Lehrkraftversion mit Lösungen exportieren','Export teacher version with solutions')}</Button></section>}
    <section className="panel"><h3>{t('1 · Lesen und bearbeiten','1 · Read and respond')}</h3><p>{t('Öffne die verknüpften Buchseiten für den vollständigen Lesetext, Abbildungen und Kontext.','Open the linked book pages for the complete passage, figures and context.')}</p>
      {g.anchors.map((a,i)=>{const q=data.questions.find(q=>q.page===a.page&&q.objectId===a.objectId);const key=a.page+':'+a.objectId;return <div className="source-question" key={key+':'+i}><small>PDF {a.page}</small><div className="source-text" lang="de">{a.text}</div><SourceRows rows={a.rows}/>{q?.options.length? <div className="source-options" aria-label={t('Optionen aus dem Buch','Options from the book')}>{q.options.map((o,j)=><Button key={j} variant="outline" aria-pressed={work.answers[key]===o.text} onClick={()=>answer(key,o.text||o.label||'')}><span lang="de">{o.text||o.label}</span></Button>)}</div>:null}
        {g.itemReferences.some(r=>r.page===a.page&&r.objectId===a.objectId)&&<details className="source-item-answer"><summary>{t('Verlagslösung zu dieser Teilaufgabe','Publisher answer for this subitem')}</summary>{g.itemReferences.filter(r=>r.page===a.page&&r.objectId===a.objectId).map(r=><p key={r.recordId} className="source-text" lang="de">{data.solutions[r.recordId].text}</p>)}</details>}
        {['question','blank','instruction','task'].includes(a.kind)&&<label className="study-field">{t('Meine Antwort','My response')}<Textarea aria-label={t('Meine Antwort', 'My response') + ' · PDF ' + a.page + ' · ' + a.objectId} value={work.answers[key]||''} onChange={e=>answer(key,e.target.value)} rows={3}/></label>}
      </div>;})}
      <label className="study-field">{t('Meine Antwort / Gesamtentwurf','My response / full draft')}<Textarea aria-label={t('Meine Antwort / Gesamtentwurf', 'My response / full draft')} value={work.answers.response||''} onChange={e=>answer('response',e.target.value)} rows={7}/></label><p className="caption">{t('Automatisch auf diesem Gerät gespeichert.','Saved automatically on this device.')}</p>
      {g.section==='Sprechen'&&<SpeakingRecorder lang={lang}/>}
    </section>
    {(linked.length>0||pageBindings.length>0)&&<section className="panel"><h3>{t('2 · Hören und nachlesen','2 · Listen and read')}</h3>{linked.map(b=>{const s=studySources.find(s=>s.section_id===b.sectionId);return <div className="source-media-block" key={b.id}><h4 lang="de">{b.label} · {b.kind==='video'?'Video':'Track'} {b.number}</h4>{b.kind==='video'?<video controls preload="none" src={b.media.url}/>:<audio controls preload="none" src={b.media.url}/>}<div className="study-actions"><Button variant="outline" onClick={()=>setShowTranscript(!showTranscript)}>{showTranscript?t('Transkript ausblenden','Hide transcript'):t('Transkript anzeigen','Show transcript')}</Button><Link className="text-link" href={'/studio?section='+encodeURIComponent(b.sectionId)}>{t('Hörstudio: Tempo, Schleife, Diktat','Listening studio: speed, loop, dictation')}</Link></div>{showTranscript&&<p className="source-text" lang="de">{s?.studyText}</p>}</div>;})}{pageBindings.length>0&&<><p>{t('Weitere Aufnahmen auf diesen Buchseiten; keine feinere Zuordnung zu dieser Teilaufgabe behauptet.','Other recordings linked to these book pages; no finer subitem match is asserted.')}</p><div className="study-actions">{pageBindings.map(b=><Link key={b.id} className="text-link" href={'/studio?section='+encodeURIComponent(b.sectionId)}>{b.kind==='video'?'Video':'Track'} {b.number} · {b.label}</Link>)}</div></>}</section>}
    <section className="panel source-solutions"><h3>{t('3 · Mit der Verlagslösung vergleichen','3 · Compare with the publisher solution')}</h3><p>{t('Versuche die Aufgabe zuerst selbst. Musterantworten zeigen eine mögliche Lösung. Gruppenzuordnungen sind keine Bewertung einzelner Antworten.','Attempt the activity first. Model responses show one possible answer. Group relationships do not grade individual responses.')}</p><Button variant="outline" aria-expanded={revealed} onClick={()=>setRevealed(!revealed)}>{revealed?t('Lösungen ausblenden','Hide solutions'):t('Lösungen und Beispiele anzeigen','Show solutions and examples')}</Button>
      {revealed&&<div className="solution-list">{rootRecords.map(r=><Solution key={r.id} value={r} childrenRecords={records.filter(c=>c.parent===r.id)} lang={lang}/>)}<p className="caption">{t('Weitere Teilantworten sind unter den jeweiligen Gruppen aufklappbar.','Individual records can be expanded beneath their parent groups.')}</p></div>}
      <label className="study-field">{t('Was verbessere ich beim nächsten Versuch?','What will I improve on my next attempt?')}<Textarea aria-label={t('Was verbessere ich beim nächsten Versuch?', 'What will I improve on my next attempt?')} value={work.notes} onChange={e=>patch({notes:e.target.value})} rows={3}/></label>
      <label className="source-review-check"><input type="checkbox" checked={work.reviewed&&work.revision===g.revision} disabled={work.revision!==g.revision} onChange={e=>patch({reviewed:e.target.checked})}/><span>{t('Ich habe meine Antwort verglichen und offene Fragen notiert.','I compared my response and noted unresolved questions.')}</span></label>
      <SaveReview lang={lang} item={{id:'source-activity:'+g.id,kind:'question',title:bi(groupTitle(g),groupTitle(g)),answer:bi(rootRecords.map(r=>r.text).join('\n\n'),rootRecords.map(r=>r.text).join('\n\n')),href:'/course?activity='+encodeURIComponent(g.id),origin:'publisher-source-r44',revision:g.revision,page:g.pages[0],skill:sourceSkill(g.section) as 'lesen'|'hoeren'|'schreiben'|'sprechen',savedAt:0}}/>
      {work.reviewed&&<p><CheckCircle2 size={16}/>{t('Vergleich gespeichert – keine Prüfungsnote.','Comparison saved—not an exam score.')}</p>}
    </section>
    <details className="panel source-provenance"><summary>{t('Quelle, Zuordnungen und Fassung','Source, relationships and revision')}</summary><p>{g.aliases.join(' · ')}</p><p>{t('Verknüpfte Lösungsdatensätze','Linked solution records')}: {g.solutionIds.length} · {t('Explizite Teilzuordnungen','Explicit item relationships')}: {g.itemLinks.length}</p><p>{t('Fassung','Revision')}: {g.revision}</p><p>r44 · {data.manifest}</p><p>{t('Quellenprüfung mit ausgewiesenen Einschränkungen; finale Produktionsfreigabe ausstehend.','Source-reviewed with declared limits; final production admission remains pending.')}</p>{g.continuation&&<p>{t('Fortsetzung desselben Schreibmodells auf PDF 87–88.','The same writing model continues across PDF 87–88.')}</p>}</details>
  </article>;
}

function Solution({value:r,childrenRecords,lang}:{value:SourceSolution;childrenRecords:SourceSolution[];lang:Locale}) {
  const model=/model|example/.test(r.kind);return <article className="source-solution"><p className="eyebrow">{model?(translate('MUSTERANTWORT · EINE MÖGLICHKEIT', 'MODEL RESPONSE · ONE POSSIBILITY', lang)):(translate('VERLAGSLÖSUNG / ERLÄUTERUNG', 'PUBLISHER SOLUTION / EXPLANATION', lang))} · PDF {r.page}</p>{r.cells?<SourceRows rows={[r.cells]}/>:<div lang="de" className="source-text">{r.text}</div>}{r.explanation&&r.explanation!==r.text&&<p lang="de" className="source-text">{r.explanation}</p>}<Link className="text-link" href={'/book?page='+r.page}>{translate('Originalseite ansehen', 'View original page', lang)}</Link>{childrenRecords.length>0&&<details><summary>{translate('Teilantworten', 'Individual records', lang)} ({childrenRecords.length})</summary>{childrenRecords.map(c=><div key={c.id} className="source-child-answer"><small>{c.label||c.id}</small>{c.cells?<SourceRows rows={[c.cells]}/>:<p lang="de" className="source-text">{c.text}</p>}</div>)}</details>}</article>;
}

export function SourceRows({rows}:{rows:unknown[]}) {
  if (!rows.length || !rows.every(Array.isArray)) return null;
  return <div className="source-table-scroll"><table className="source-table"><tbody>{(rows as unknown[][]).map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j} lang="de">{typeof cell==='string'||typeof cell==='number'?String(cell):JSON.stringify(cell)}</td>)}</tr>)}</tbody></table></div>;
}
