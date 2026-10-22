import { afterEach,describe,it,expect,vi } from "vitest";
import { mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync } from "node:fs";
import { join,dirname,resolve } from "node:path";
import { tmpdir } from "node:os";
import { finalizeOfflineExport,pruneWortwerkPreviewExport } from "../../apps/web/scripts/offline-export.js";
const folders:string[]=[];
afterEach(()=>{vi.unstubAllEnvs();for(const folder of folders.splice(0))rmSync(folder,{recursive:true,force:true});});
function output(){
 const folder=mkdtempSync(join(tmpdir(),"wortwerk-preview-export-"));folders.push(folder);
 const files=["index.html","play/run/index.html","play/preview/index.html","play/preview/index.txt","play/preview/__next.play.__PAGE__.txt","play/preview.html","play/preview.txt","play/preview.rsc","play/preview.meta","play/preview.json","play/preview.segments/root.segment.rsc","play/preview-neighbor/index.html"];
 for(const file of files){mkdirSync(dirname(join(folder,file)),{recursive:true});writeFileSync(join(folder,file),file.endsWith("html")?"<html><body>Fixture export</body></html>":"fixture payload");}
 writeFileSync(join(folder,"sw.js"),readFileSync(resolve("apps/web/public/sw.js"),"utf8"));
 return folder;
}
describe("authoring preview static export",()=>{
 it("removes default HTML,RSC,segment and stale route files before offline finalization while retaining learner routes",()=>{
  vi.stubEnv("WORTWERK_PREVIEW",undefined);const folder=output();
  const result=finalizeOfflineExport(folder,"");
  for(const file of ["play/preview","play/preview.html","play/preview.txt","play/preview.rsc","play/preview.meta","play/preview.json","play/preview.segments"])expect(existsSync(join(folder,file)),file).toBe(false);
  expect(existsSync(join(folder,"play/run/index.html"))).toBe(true);expect(existsSync(join(folder,"play/preview-neighbor/index.html"))).toBe(true);
  expect(result.entries.some(entry=>entry.relPath.startsWith("play/preview"))).toBe(false);
  expect(readFileSync(join(folder,"sw.js"),"utf8")).not.toContain('"/play/preview/"');
 });
 it("keeps the complete route and precaches its HTML only for the explicit build flag",()=>{
  vi.stubEnv("WORTWERK_PREVIEW","1");const folder=output();const result=finalizeOfflineExport(folder,"");
  expect(existsSync(join(folder,"play/preview/index.html"))).toBe(true);expect(existsSync(join(folder,"play/preview/index.txt"))).toBe(true);
  expect(existsSync(join(folder,"play/preview/__next.play.__PAGE__.txt"))).toBe(true);
  expect(result.entries.some(entry=>entry.relPath==="play/preview/index.html")).toBe(true);
 });
 it("treats other flag spellings as disabled and safely tolerates an absent preview route",()=>{
  const folder=output();pruneWortwerkPreviewExport(folder,"true");pruneWortwerkPreviewExport(folder,"0");
  expect(existsSync(join(folder,"play/preview"))).toBe(false);expect(existsSync(join(folder,"index.html"))).toBe(true);
 });
});
