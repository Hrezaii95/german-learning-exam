import {readFile,copyFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const target=fileURLToPath(new URL('../apps/web/public/lingovo/launch/',import.meta.url));
const manifest=JSON.parse(await readFile(path.join(target,'manifest.json'),'utf8'));
const args=process.argv.slice(2);
const inputFor=locale=>{
  const index=args.indexOf(locale==='en'?'--english':'--armenian');
  if(index>=0){if(!args[index+1])throw new Error('Supply the path after the video option.');return path.resolve(args[index+1]);}
};
await mkdir(target,{recursive:true});
for(const video of manifest.videos){
  const destination=path.join(target,video.file);
  const input=inputFor(video.locale)||destination;
  let bytes;
  try{bytes=await readFile(input);}catch{throw new Error(`Missing ${video.file}. Materialize Library file ${video.libraryFileId}, then run this script with --english FILE --armenian FILE. See docs/lingovo/landing-launch-video.md.`);}
  const digest=createHash('sha256').update(bytes).digest('hex');
  if(bytes.length!==video.bytes||digest!==video.sha256)throw new Error(`Incorrect video bytes: ${video.file}. Use the supplied launch film; do not substitute another edit.`);
  if(input!==destination)await copyFile(input,destination);
  console.log(`Verified ${video.file}: ${video.bytes} bytes; SHA-256 ${digest}`);
}
