import { readdir, readFile, lstat, realpath } from 'node:fs/promises';
import { resolve, relative, dirname, posix, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import { createNoteResolver } from '../src/links.ts';
import { categories, type MemoryCategory } from '../src/shared.ts';
import type { Note, Source } from '../src/shared.ts';

export const revision = (text:string) => createHash('sha256').update(text).digest('hex');
export function validatePath(path:string, write=false):void {
  if(!path || path.length>512 || path.includes('\\') || path.includes('\0') || path.startsWith('/') || !path.endsWith('.md') || path.split('/').some(p=>!p || p==='..' || p.startsWith('.'))) throw Error('Invalid note path');
  if(write && path.split('/').some(p=>p.startsWith('_') || /^(AGENTS|BRAIN|CONTEXT|SKILL|CLAUDE|GEMINI|README)\.md$/i.test(p))) throw Error('Operational policy files are read-only');
}
export async function safePath(root:string, path:string, write=false):Promise<string> {
  validatePath(path,write); const base=await realpath(root); const target=resolve(base,path);
  if(relative(base,target).startsWith('..')) throw Error('Path escapes vault');
  let current=base; for(const part of path.split('/')) {current=resolve(current,part); try {const s=await lstat(current);if(s.isSymbolicLink())throw Error('Symlinks are not permitted');} catch(e:any){if(e.code==='ENOENT')break;throw e;}}
  return target;
}
export function folderFor(path:string):string {
  const first=path.split('/')[0].replace(/^\d+[\s._-]*/,'').toLowerCase();
  return first.startsWith('project')?'projects':first.startsWith('area')?'areas':first.startsWith('resource')?'resources':first.startsWith('archive')?'archives':first.startsWith('inbox')?'inbox':first.startsWith('_')?'system':'brain';
}
export function rawLinks(body:string):string[] {
  const clean=body.replace(/```[\s\S]*?```/g,'').replace(/~~~[\s\S]*?~~~/g,'').replace(/`[^`\n]*`/g,'');
  return [...clean.matchAll(/!?\[\[([^\]|]+)(?:\|[^\]]*)?\]\]|(?<!!)\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)].map(m=>(m[1]||m[2]).split('#')[0]).filter(v=>v&&!/^[a-z][a-z\d+.-]*:/i.test(v));
}
export type CachedNote = { signature:string; note:Note };
export function parseNote(path:string, markdown:string, modifiedAt:string):Note {
  const fm=markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/); let meta:any={};
  if(/^---\r?\n/.test(markdown)&&!fm)meta.sensitivity='restricted';
  try {if(fm){const parsed=parse(fm[1],{maxAliasCount:20});if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Frontmatter must be a mapping');meta=parsed;}}catch{/* Malformed frontmatter is not permission to send a note externally. */meta.sensitivity='restricted';}
  if(['sensitivity','portability','scope'].some(k=>k in meta&&typeof meta[k]!=='string')||('contains_client_data' in meta&&typeof meta.contains_client_data!=='boolean'))meta.sensitivity='restricted';
  const body=fm?markdown.slice(fm[0].length):markdown;
  const sources:Source[]=Array.isArray(meta.sources)?meta.sources.filter((s:any)=>s&&typeof s.title==='string'&&typeof s.uri==='string'&&typeof s.observedAt==='string'):[];
  const assessmentAllowed = !path.split('/').some(p=>p.startsWith('_')||/^(AGENTS|BRAIN|CONTEXT|SKILL|CLAUDE|GEMINI|README)\.md$/i.test(p)) && meta.contains_client_data !== true && !['internal','restricted','confidential'].includes(meta.sensitivity) && (meta.portability !== 'internal' && !String(meta.scope||'').startsWith('work') || meta.portability === 'portable');
  return {path,assessmentAllowed,category:categories.includes(meta.memory_category ?? meta.type) ? (meta.memory_category ?? meta.type) as MemoryCategory : undefined,title:typeof meta.title==='string'?meta.title:body.match(/^#\s+(.+)$/m)?.[1]||basename(path,'.md'),folder:folderFor(path),markdown,body,revision:revision(markdown),links:[],unresolved:[],tags:Array.isArray(meta.tags)?meta.tags.filter((s:unknown)=>typeof s==='string'):[],sources,modifiedAt};
}
export async function readVault(root:string, cache?:Map<string,CachedNote>):Promise<Note[]> {
  const files:string[]=[];
  async function walk(dir:string){for(const item of await readdir(resolve(root,dir),{withFileTypes:true})){if(item.name.startsWith('.')||item.isSymbolicLink())continue;const p=posix.join(dir,item.name);if(item.isDirectory())await walk(p);else if(item.isFile()&&p.endsWith('.md'))files.push(p);}}
  await walk(''); const notes:Note[]=[];
  for(const path of files.sort()) {
    const target=await safePath(root,path); const stat=await lstat(target); if(stat.size>2*1024*1024)continue;
    const signature=[stat.ino,stat.size,stat.mtimeMs,stat.ctimeMs].join(':');const cached=cache?.get(path);
    const note=cached?.signature===signature?{...cached.note,links:[],unresolved:[]}:parseNote(path,await readFile(target,'utf8'),stat.mtime.toISOString());
    cache?.set(path,{signature,note});notes.push(note);
  }
  const present=new Set(notes.map(n=>n.path));if(cache)for(const path of cache.keys())if(!present.has(path))cache.delete(path);
  const resolveLink=createNoteResolver(notes);
  for(const n of notes){for(const raw of rawLinks(n.body)){
    const match=resolveLink(n.path,raw);
    if(match&&match!==n.path)n.links.push(match);else if(!match)n.unresolved.push(raw);
  } n.links=[...new Set(n.links)];n.unresolved=[...new Set(n.unresolved)];}
  return notes;
}
