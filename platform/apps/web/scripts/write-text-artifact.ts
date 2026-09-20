import {randomUUID} from "node:crypto";
import {existsSync,renameSync,unlinkSync,writeFileSync} from "node:fs";

/** Readers see a complete UTF-8 artifact; Windows need not reopen the old file for truncation. */
export function writeTextArtifact(path:string,content:string,encoding:"utf8"="utf8"):void {
  const temporaryPath=`${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporaryPath,content,{encoding,flag:"wx"});
    renameSync(temporaryPath,path);
  } finally {
    if(existsSync(temporaryPath))unlinkSync(temporaryPath);
  }
}
