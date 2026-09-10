import {describe,it,expect} from "vitest";
import {developerPathFragment} from "../../apps/web/scripts/export-path-leaks.mjs";
describe("export developer path detection",()=>{
  it("accepts the public home page and its Next chunk on every platform",()=>{for(const path of ["/german-learning-exam/cheat-sheets/home/","static/chunks/app/cheat-sheets/home/page-123.js","/cheat-sheets/home/__next._full.txt"])expect(developerPathFragment(path)).toBeUndefined();});
  it("still rejects Linux, Mac and Windows home directory leaks",()=>{for(const path of ["/home/runner/work/project","/Users/example/project","C:\\Users\\example\\project","C:\\\\Users\\\\example","E:/claude-cursor/project","E:\\\\claude-cursor\\\\project"])expect(developerPathFragment(path),path).toBeTruthy();});
  it("does not let a safe route hide another developer path",()=>expect(developerPathFragment('/cheat-sheets/home/page.js /home/runner/work')).toBe('/home/'));
});
