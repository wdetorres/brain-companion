import { open, link, unlink, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createNoteResolver } from '../src/links.ts';
import type { Note, FileChange } from '../src/shared.ts';
import { rawLinks, parseNote } from './vault.ts';

export async function readOptional(path:string){try{return await readFile(path,'utf8');}catch(e:any){if(e.code==='ENOENT')return null;throw e;}}
export async function syncDirectory(path:string){const fd=await open(path,'r');try{await fd.sync();}finally{await fd.close();}}
export async function createNoteFile(target:string,markdown:string){
  const temp=target+'.'+randomUUID()+'.tmp';
  try{const fd=await open(temp,'wx',0o600);try{await fd.writeFile(markdown,'utf8');await fd.sync();}finally{await fd.close();}
    // A hard link publishes the complete file without replacing an existing destination.
    await link(temp,target);await syncDirectory(dirname(target));
  }finally{await unlink(temp).catch(()=>{});}
}
export function promotionLinkChanges(notes:Note[],source:Note,destination:Note):string[]{
  const before=notes.filter(n=>n.path!==destination.path),after=[...before.filter(n=>n.path!==source.path),destination];
  const oldResolve=createNoteResolver(before),newResolve=createNoteResolver(after);const affected=new Set<string>();
  for(const n of before){
    if(n.path===source.path)continue;
    for(const raw of rawLinks(n.body)){
      const old=oldResolve(n.path,raw);if(old&&newResolve(n.path,raw)!==(old===source.path?destination.path:old))affected.add(n.path);
    }
  }
  const targets=new Set(rawLinks(destination.body).map(raw=>newResolve(destination.path,raw)).filter(Boolean));
  for(const raw of rawLinks(source.body)){const target=oldResolve(source.path,raw);if(target&&!targets.has(target===source.path?destination.path:target))affected.add(source.path);}
  return [...affected];
}
export function undoLinkChanges(notes:Note[],files:FileChange[],move?:{from:string;to:string}):string[]{
  const unaffected=notes.filter(n=>!files.some(f=>f.path===n.path));
  const before=[...unaffected,...files.filter(f=>f.before!==null).map(f=>parseNote(f.path,f.before!,''))];
  const after=[...unaffected,...files.filter(f=>f.after!==null).map(f=>parseNote(f.path,f.after!,''))];
  if(move)return promotionLinkChanges(before,before.find(n=>n.path===move.from)!,after.find(n=>n.path===move.to)!);
  const oldResolve=createNoteResolver(before),newResolve=createNoteResolver(after),affected=new Set<string>();
  for(const n of unaffected)for(const raw of rawLinks(n.body)){
    const old=oldResolve(n.path,raw);if(old&&newResolve(n.path,raw)!==old)affected.add(n.path);
  }
  return [...affected];
}
