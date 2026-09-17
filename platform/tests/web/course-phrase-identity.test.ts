import {it,expect,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CoursePatterns} from '../../apps/web/components/study/CourseStudy';
import {studyUnits} from '../../apps/web/lib/study/course-lessons';
vi.mock('../../apps/web/components/study/StudyScope',()=>({useStudyScope:()=>({matches:()=>true}),StudyScopeNotice:()=>null,StudyTagList:()=>null}));
vi.mock('../../apps/web/components/study/StudyProvider',()=>({GermanText:({text}:{text:string})=>text,SaveButton:({item}:{item:{id:string;title:string}})=>createElement('button',{'data-save-id':item.id},item.title)}));
vi.mock('../../apps/web/components/study/StudyAudio',()=>({LineAudio:()=>null}));
it('keeps the phrase deck save identity after search removes preceding phrases',()=>{
 const unit=studyUnits.find(u=>u.number===9)!;
 const html=renderToStaticMarkup(createElement(CoursePatterns,{units:[unit],section:'phrases',speech:{},query:'Ich möchte einen Salat.'}));
 expect(html).toContain('data-save-id="l9-phrase-14"');
 expect(html).not.toContain('data-save-id="l9-phrase-0"');
});
