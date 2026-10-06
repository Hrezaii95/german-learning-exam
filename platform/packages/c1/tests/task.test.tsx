import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {ActivitySession} from '../src/components/source-course.js';
import {StudyProvider,useStudy} from '../src/components/study-store.js';
import {freshStudy} from '../src/lib/study-state.js';
import {sourceResponse,type SourceCourse,type SourceGroup} from '../src/lib/source-course.js';
import {lessons,wordCount} from '../src/lib/learning.js';
import {languages,translate} from '../src/lib/i18n.js';
import {readableSourceText} from '../src/lib/source-text.js';
import {NotebookLearning} from '../src/components/learning-space.js';
import {ProgressRoom} from '../src/components/study-workspaces.js';
import {ListeningPlayer} from '../src/components/study-media.js';
import index from '../src/lib/data/source-course-index.json';

const group:SourceGroup={...index.groups[0],anchors:[{page:9,unitId:'page-9',objectId:'obj-006',kind:'instruction',text:'Vervollständigen Sie die Substantive, Verben und Adjektive.',rows:[]}],solutionIds:['answer-1'],itemLinks:[],itemReferences:[]};
const data:SourceCourse={manifest:'test',addonManifest:'test',groups:[group],contents:[],bindings:[],edges:[],questions:[],solutions:{'answer-1':{id:'answer-1',page:83,text:'Analyse, Annahme, Anwendung',kind:'solution',revision:'test'}}};
function Task({value=group}:{value?:SourceGroup}){const store=useStudy();return <ActivitySession group={value} data={data} lang="en" store={store} teacher={false}/>;}
function Route({view}:{view:'task'|'notebook'|'progress'}){const store=useStudy();return view==='task'?<Task/>:view==='notebook'?<NotebookLearning lang="en"/>:<ProgressRoom lang="en" store={store}/>;}
beforeEach(()=>localStorage.clear());afterEach(cleanup);

describe('book task completion',()=>{
  it('shows the original source page and one saved response, then enables self-comparison',async()=>{
    render(<StudyProvider><Task/></StudyProvider>);
    const image=screen.getByRole('img',{name:'Original book page · PDF 9'});
    expect(image.getAttribute('src')).toMatch(/\/c1\/pages\/.+\/008.jpg$/);
    expect(screen.getAllByRole('textbox',{name:'My response',exact:true})).toHaveLength(1);
    expect(screen.queryByRole('textbox',{name:'My response / full draft'})).toBeNull();
    const check=screen.getByRole('checkbox',{name:'I compared my response and noted unresolved questions.'}) as HTMLInputElement;
    expect(check.disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox',{name:'My response',exact:true}),{target:{value:'1a: Analyse; annehmen; bekannt'}});
    await waitFor(()=>expect(JSON.parse(localStorage.getItem('wortweg-study-v2')!).bookWork['activity:'+group.id].answers.response).toBe('1a: Analyse; annehmen; bekannt'));
    expect(check.disabled).toBe(false);
    fireEvent.click(screen.getByRole('button',{name:'Show solutions and examples'}));
    expect(screen.getByText('Analyse, Annahme, Anwendung')).toBeTruthy();
  });
  it('preserves an existing anchor draft in the single response field',()=>{
    const state=freshStudy();state.bookWork['activity:'+group.id]={revision:group.revision,answers:{'9:obj-006':'Meine bisherige Antwort'},notes:'',reviewed:false};
    localStorage.setItem('wortweg-study-v2',JSON.stringify(state));
    render(<StudyProvider><Task/></StudyProvider>);
    expect((screen.getByRole('textbox',{name:'My response',exact:true}) as HTMLTextAreaElement).value).toContain('Meine bisherige Antwort');
    expect(sourceResponse({response:'',old:'older draft'})).toBe('');
  });
  it('labels a missing source page and prevents a false completion',()=>{
    render(<StudyProvider><Task value={{...group,pages:[999]}}/></StudyProvider>);
    expect(screen.getByText('Incomplete material: this activity is not yet fully available in the workspace.')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox',{name:'My response',exact:true}),{target:{value:'Attempt'}});
    expect((screen.getByRole('checkbox',{name:'I compared my response and noted unresolved questions.'}) as HTMLInputElement).disabled).toBe(true);
  });
  it('keeps a reviewed book response connected to notebook, progress and the daily goal',()=>{
    const ui=render(<StudyProvider><Route view="task"/></StudyProvider>);
    fireEvent.change(screen.getByRole('textbox',{name:'My response',exact:true}),{target:{value:'Meine Antwort bleibt erhalten.'}});
    fireEvent.click(screen.getByRole('checkbox',{name:'I compared my response and noted unresolved questions.'}));
    ui.rerender(<StudyProvider><Route view="notebook"/></StudyProvider>);
    expect(screen.getByText('Meine Antwort bleibt erhalten.')).toBeTruthy();
    expect(screen.getByRole('link',{name:'Continue activity'}).getAttribute('href')).toBe('/prepare/c1/course?activity=course-lesen-1-1a');
    ui.rerender(<StudyProvider><Route view="progress"/></StudyProvider>);
    expect(screen.getByText('Book activity groups self-reviewed').parentElement?.textContent).toContain('1 / 236');
    expect(screen.getByText(/different activities reviewed today/).textContent).toContain('1 / 3');
  });
  it('reports a source image delivery failure without claiming the task is complete',()=>{
    render(<StudyProvider><Task/></StudyProvider>);
    fireEvent.error(screen.getByRole('img',{name:'Original book page · PDF 9'}));
    expect(screen.getByText('Incomplete material: this activity is not yet fully available in the workspace.')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox',{name:'My response',exact:true}),{target:{value:'Attempt'}});
    expect((screen.getByRole('checkbox',{name:'I compared my response and noted unresolved questions.'}) as HTMLInputElement).disabled).toBe(true);
  });
  it('provides a writing model that meets its stated practice length',()=>{
    const exercise=lessons.find(l=>l.id==='writing-position')!.exercises.find(e=>e.id==='wp-3')!;
    expect(wordCount(exercise.model!)).toBeGreaterThanOrEqual(100);
    expect(wordCount(exercise.model!)).toBeLessThanOrEqual(150);
  });
  it('does not turn completed transcript-only tasks into listening evidence',()=>{
    const state=freshStudy();
    const lesson=lessons.find(l=>l.id==='listening-details')!;
    state.attempts=lesson.exercises.map(ex=>({exerciseId:ex.id,lessonId:lesson.id,revision:lesson.revision,response:['0'],correct:true,at:Date.now(),selfReviewed:false}));
    localStorage.setItem('wortweg-study-v2',JSON.stringify(state));
    render(<StudyProvider><Route view="progress"/></StudyProvider>);
    expect(screen.getByRole('progressbar',{name:'Listening'}).getAttribute('aria-valuenow')).toBe('0');
    expect(screen.getByText('Transcript-only practice counts toward activity totals, not listening progress.')).toBeTruthy();
  });
  it('offers a verified original-audio next action without inventing demo audio',()=>{
    render(<ListeningPlayer lang="en" text="A demo passage without a recording."/>);
    expect(screen.getByRole('link',{name:'Practise with original audio'}).getAttribute('href')).toBe('/prepare/c1/studio?section=testdaf.mock-exam-1.audio.transcript.002');
    expect(screen.getByText('For listening practice, open this separate original-source activity. It is not a recording of the demo text.')).toBeTruthy();
    expect(screen.getByText('Hören 1, Hörtext / Track 2')).toBeTruthy();
  });
  it('supports all four interface languages for task and recording states',()=>{
    expect(languages.map(l=>l.code)).toEqual(['de','en','hy','ru']);
    for(const locale of ['hy','ru'] as const){
      for(const label of ['More study tools','Original activity','Task and response','Saving recording…','Words','Expressions','Questions','Excerpts']) expect(translate('German label',label,locale)).not.toBe(label);
    }
    expect(translate('Originalaufgabe','Original activity','de')).toBe('Originalaufgabe');
  });
  it('repairs extraction line breaks while preserving meaningful hyphens',()=>{
    expect(readableSourceText('pas -\nsiert; Fremdspra-\nchen; Software-\nRoboter; E-Busse')).toBe('passiert; Fremdsprachen; Software-\nRoboter; E-Busse');
  });
});
