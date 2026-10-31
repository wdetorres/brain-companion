import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { mkdir, readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { readVault, revision, safePath } from './vault.ts';
import type { BrainSnapshot, Judge, Note, Operation, RememberInput } from '../src/shared.ts';

export const rememberSchema=z.object({path:z.string().max(512),markdown:z.string().min(1).refine(v=>Buffer.byteLength(v)<=131072,'Note exceeds 128 KiB'),sources:z.array(z.object({title:z.string().min(1).max(300),uri:z.string().min(1).max(2000).refine(v=>/^(https?:|obsidian:|urn:)/.test(v),'Source must be a URL or URN'),observedAt:z.iso.datetime({offset:true})})).min(1).max(20),expectedRevision:z.string().max(100).nullable(),idempotencyKey:z.string().min(8).max(128)}).strict();
export class BrainStore {
  readonly db:DatabaseSync; readonly vault:string; readonly judge:Judge; readonly accept:Set<string>;
  private queue:Promise<unknown>=Promise.resolve(); private closed=false;
  syncStatus='Not configured'; lastSync:string|null=null;
  constructor(options:{vault:string;data:string;judge:Judge;accept?:string[]}) {
    this.vault=resolve(options.vault); mkdirSync(this.vault,{recursive:true});mkdirSync(options.data,{recursive:true});
    this.db=new DatabaseSync(resolve(options.data,'brain.sqlite'));this.judge=options.judge;this.accept=new Set(options.accept||[]);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, idem TEXT UNIQUE, fingerprint TEXT, payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS observed (path TEXT PRIMARY KEY, revision TEXT, markdown TEXT); CREATE TABLE IF NOT EXISTS auth (key TEXT PRIMARY KEY, payload TEXT NOT NULL, expires INTEGER NOT NULL);');
  }
  close(){if(!this.closed){this.db.close();this.closed=true;}}
  exclusive<T>(fn:()=>Promise<T>):Promise<T>{const next=this.queue.then(fn,fn);this.queue=next.catch(()=>{});return next;}
  private save(op:Operation,key?:string,fingerprint?:string){this.db.prepare('INSERT INTO operations(id,idem,fingerprint,payload) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(op.id,key||null,fingerprint||null,JSON.stringify(op));}
  private observe(notes:Note[]){
    const pending=this.db.prepare("SELECT payload FROM operations WHERE json_extract(payload,'$.status')='pending'").all() as {payload:string}[];
    for(const row of pending){const op:Operation=JSON.parse(row.payload); const current=notes.find(n=>n.path===op.path);op.status=current?.revision===revision(op.proposed)?'applied':'needs_attention';op.reason=op.status==='applied'?'Recovered committed write after restart':'Interrupted write retained for inspection';this.save(op);if(op.status==='applied')this.markObserved(current!);}
    for(const n of notes){const prev=this.db.prepare('SELECT revision,markdown FROM observed WHERE path=?').get(n.path) as {revision:string;markdown:string}|undefined;
      if(prev&&prev.revision!==n.revision)this.save({id:randomUUID(),path:n.path,actor:'Obsidian / external',at:new Date().toISOString(),status:'external',reason:'Observed a change outside the memory API',before:prev.markdown,proposed:n.markdown,sources:n.sources,revision:n.revision});
      this.markObserved(n);
    }
    const present=new Set(notes.map(n=>n.path));for(const row of this.db.prepare('SELECT path,markdown FROM observed').all() as {path:string;markdown:string}[]){if(!present.has(row.path)){this.save({id:randomUUID(),path:row.path,actor:'Obsidian / external',at:new Date().toISOString(),status:'external',reason:'Observed a removed page',before:row.markdown,proposed:'',sources:[]});this.db.prepare('DELETE FROM observed WHERE path=?').run(row.path);}}
  }
  private markObserved(n:Note){this.db.prepare('INSERT INTO observed VALUES(?,?,?) ON CONFLICT(path) DO UPDATE SET revision=excluded.revision,markdown=excluded.markdown').run(n.path,n.revision,n.markdown);}
  private async scan(){const notes=await readVault(this.vault);this.observe(notes);return notes;}
  snapshot():Promise<BrainSnapshot>{return this.exclusive(async()=>({notes:await this.scan(),operations:this.db.prepare('SELECT payload FROM operations ORDER BY rowid DESC LIMIT 100').all().map(r=>JSON.parse(r.payload as string)),mode:'live',status:{indexedAt:new Date().toISOString(),sync:this.syncStatus,lastSync:this.lastSync,search:'Keyword search'}}));}
  async inspect(path:string){const s=await this.snapshot();const n=s.notes.find(n=>n.path===path);if(!n)throw Error('Page not found');return n;}
  operation(id:string):Operation|undefined{const row=this.db.prepare('SELECT payload FROM operations WHERE id=?').get(id);return row?JSON.parse(row.payload as string):undefined;}
  async recall(query:string){const terms=query.toLowerCase().split(/\s+/).filter(Boolean).slice(0,12);const {notes}=await this.snapshot();return notes.map(n=>({n,score:terms.reduce((s,t)=>s+(n.title.toLowerCase().includes(t)?5:0)+(n.body.toLowerCase().includes(t)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,12).map(({n})=>({...n,body:n.body.slice(0,1200),markdown:n.markdown.slice(0,1200)}));}
  remember(raw:RememberInput,actor:string):Promise<Operation>{return this.exclusive(async()=>{
    const input=rememberSchema.parse(raw);const target=await safePath(this.vault,input.path,true);const fingerprint=revision(JSON.stringify(input));
    const existing=this.db.prepare('SELECT payload,fingerprint FROM operations WHERE idem=?').get(input.idempotencyKey);
    if(existing){if(existing.fingerprint!==fingerprint)throw Error('Idempotency key reused with different content');return JSON.parse(existing.payload as string);}
    const notes=await this.scan();const current=notes.find(n=>n.path===input.path);
    const op:Operation={id:randomUUID(),path:input.path,actor,at:new Date().toISOString(),status:'needs_attention',reason:'Proposal retained',before:current?.markdown??null,proposed:input.markdown,sources:input.sources};
    const finish=()=>{this.save(op,input.idempotencyKey,fingerprint);return op;};
    if((current?.revision??null)!==input.expectedRevision){op.reason='Revision conflict: inspect the current page and resubmit';return finish();}
    if(current?.markdown===input.markdown){op.status='duplicate';op.reason='Exact content already present';return finish();}
    try{op.decision=await this.judge(input,current,notes.filter(n=>n.path!==input.path).sort((a,b)=>Number(b.folder===current?.folder)-Number(a.folder===current?.folder)).slice(0,5));}catch{op.reason='Jev unavailable or invalid response; proposal retained';return finish();}
    if(op.decision.outcome==='duplicate'){op.status='duplicate';op.reason='Jev assessed this as already remembered; no content changed';return finish();}
    const expected=current?'update':'new';if(op.decision.outcome!==expected||!this.accept.has(expected)||op.decision.confidence<.95){op.reason=op.decision.outcome==='conflict'?'Conflicting evidence; current page preserved':'Automatic acceptance is not enabled or evidence is uncertain';return finish();}
    let latest:string|null=null;try{latest=await readFile(target,'utf8')}catch(e:any){if(e.code!=='ENOENT')throw e;}
    if((latest===null?null:revision(latest))!==input.expectedRevision){op.reason='Page changed during evaluation; proposal retained';return finish();}
    op.status='pending';op.reason='Write journaled';finish();let temp='';
    try{
      await mkdir(dirname(target),{recursive:true});await safePath(this.vault,input.path,true);temp=target+'.'+randomUUID()+'.tmp';
      const fd=await open(temp,'wx',0o600);try{await fd.writeFile(input.markdown,'utf8');await fd.sync();}finally{await fd.close();}
      await rename(temp,target);temp='';const parent=await open(dirname(target),'r');try{await parent.sync();}finally{await parent.close();}
      op.status='applied';op.reason='Applied to server vault; device sync is separate';op.revision=revision(input.markdown);finish();
      this.db.prepare('INSERT INTO observed VALUES(?,?,?) ON CONFLICT(path) DO UPDATE SET revision=excluded.revision,markdown=excluded.markdown').run(input.path,op.revision,input.markdown);return op;
    }catch(e){if(temp)await unlink(temp).catch(()=>{});op.status='needs_attention';op.reason='Write interrupted; inspect server state before retry';return finish();}
  });}
}
