import { readdir, readFile, lstat, realpath } from 'node:fs/promises';
import { resolve, relative, dirname, posix, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import { resolveNoteLink } from '../src/links.ts';
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
export async function readVault(root:string):Promise<Note[]> {
  const files:string[]=[];
  async function walk(dir:string){for(const item of await readdir(resolve(root,dir),{withFileTypes:true})){if(item.name.startsWith('.')||item.isSymbolicLink())continue;const p=posix.join(dir,item.name);if(item.isDirectory())await walk(p);else if(item.isFile()&&p.endsWith('.md'))files.push(p);}}
  await walk(''); const notes:Note[]=[];
  for(const path of files.sort()) {
    const target=await safePath(root,path); const stat=await lstat(target); if(stat.size>2*1024*1024)continue;
    const markdown=await readFile(target,'utf8'); const fm=markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/); let meta:any={};
    try {if(fm){const parsed=parse(fm[1],{maxAliasCount:20});if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))meta=parsed;}}catch{/* malformed frontmatter remains visible */}
    const body=fm?markdown.slice(fm[0].length):markdown;
    const sources:Source[]=Array.isArray(meta.sources)?meta.sources.filter((s:any)=>s&&typeof s.title==='string'&&typeof s.uri==='string'&&typeof s.observedAt==='string'):[];
    notes.push({path,title:typeof meta.title==='string'?meta.title:body.match(/^#\s+(.+)$/m)?.[1]||basename(path,'.md'),folder:folderFor(path),markdown,body,revision:revision(markdown),links:[],unresolved:[],tags:Array.isArray(meta.tags)?meta.tags.filter((s:unknown)=>typeof s==='string'):[],sources,modifiedAt:stat.mtime.toISOString()});
  }
  for(const n of notes){for(const raw of rawLinks(n.body)){
    const match=resolveNoteLink(notes,n.path,raw);
    if(match&&match!==n.path)n.links.push(match);else if(!match)n.unresolved.push(raw);
  } n.links=[...new Set(n.links)];n.unresolved=[...new Set(n.unresolved)];}
  return notes;
}
