import {afterEach, describe, expect, it, vi} from 'vitest';
import {c1Location, c1Path, updateC1History} from '../src/lib/navigation.js';

afterEach(()=>vi.unstubAllEnvs());
describe('C1 links remain refreshable host routes',()=>{
  it.each([
    ['/course', {activity:'course-lesen-1-1a'}, '/prepare/c1/course?skill=lesen&mode=teacher&activity=course-lesen-1-1a#assignment=abc'],
    ['/studio', {section:'testdaf.mock-exam-1.audio.transcript.002'}, '/prepare/c1/studio?skill=lesen&mode=teacher&section=testdaf.mock-exam-1.audio.transcript.002#assignment=abc'],
    ['/book', {page:9}, '/prepare/c1/book?skill=lesen&mode=teacher&page=9#assignment=abc'],
    ['/cheat-sheets', {sheet:'reading'}, '/prepare/c1/cheat-sheets?skill=lesen&mode=teacher&sheet=reading#assignment=abc'],
  ])('keeps the %s path and unrelated scope/query values',(route,changes,expected)=>{
    expect(c1Location(route,changes,'https://lingovo.example/prepare/c1/?skill=lesen&mode=teacher#assignment=abc')).toBe(expected);
  });
  it('removes only the consumed start flag',()=>{
    expect(c1Location('/today',{start:null},'https://lingovo.example/prepare/c1/today?start=1&skill=hoeren')).toBe('/prepare/c1/today?skill=hoeren');
  });
  it('does not double-prefix canonical routes, assets, or deployment base paths',()=>{
    expect(c1Path('/prepare/c1/course?activity=a')).toBe('/prepare/c1/course?activity=a');
    expect(c1Path('/c1/pages/008.jpg')).toBe('/c1/pages/008.jpg');
    expect(c1Path('/course?activity=a','/demo')).toBe('/demo/prepare/c1/course?activity=a');
    expect(c1Path('/demo/prepare/c1/course?activity=a','/demo')).toBe('/demo/prepare/c1/course?activity=a');
    expect(c1Path('https://testdaf.de/')).toBe('https://testdaf.de/');
    expect(c1Path('#main')).toBe('#main');
  });
  it('keeps host router history state when opening and returning from an activity',()=>{
    history.replaceState({hostRouter:{tree:'preserve'}},'','/prepare/c1/course?skill=lesen');
    updateC1History('/course',{activity:'course-lesen-1-1a'});
    expect(location.pathname).toBe('/prepare/c1/course');
    expect(new URLSearchParams(location.search).get('skill')).toBe('lesen');
    expect(history.state).toEqual({hostRouter:{tree:'preserve'}});
    updateC1History('/course',{activity:null});
    expect(location.search).toBe('?skill=lesen');
  });
});
