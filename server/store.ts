import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { mkdir, readFile, rename, open, unlink, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { connectionMarkdown } from '../src/links.ts';
import { questionVersion } from './jev.ts';
import { relatedNotes, shortlist } from './retrieval.ts';
import { folderFor, parseNote, revision, safePath } from './vault.ts';
import { NoteIndex } from './note-index.ts';
import { WorkQueue } from './work.ts';
import { createNoteFile, promotionLinkChanges, undoLinkChanges, readOptional, syncDirectory } from './promotion.ts';
import { categories } from '../src/shared.ts';
import type { BrainSnapshot, Judge, Note, Operation, RememberInput, RecallJudge, ConnectionJudge, Connection, MemoryCategory, RecallResult, RecallHit, AssessMemoryInput, Assessment, AssessmentNote, WriteAssessor } from '../src/shared.ts';

const candidateSchema=z.object({path:z.string().max(512),markdown:z.string().min(1).refine(v=>Buffer.byteLength(v)<=131072,'Note exceeds 128 KiB'),sources:z.array(z.object({title:z.string().min(1).max(300),uri:z.string().min(1).max(2000).refine(v=>/^(https?:|obsidian:|urn:)/.test(v),'Source must be a URL or URN'),observedAt:z.iso.datetime({offset:true}),excerpt:z.string().min(1).max(6000).optional()})).min(1).max(20),expectedRevision:z.string().max(100).nullable(),idempotencyKey:z.string().min(8).max(128)}).strict();
export const rememberSchema=candidateSchema.extend({assessment:z.object({id:z.string().min(1).max(128),claimToken:z.string().min(1).max(128),reason:z.string().trim().min(1).max(1000)}).strict().optional(),relatedAssessmentId:z.string().min(1).max(128).optional()}).refine(v=>!(v.assessment&&v.relatedAssessmentId),'Supply a primary assessment or a related assessment, not both');
export const promoteSchema=rememberSchema.safeExtend({sourcePath:z.string().min(1).max(512),expectedRevision:z.string().min(1).max(100),claimToken:z.string().min(1).max(128)});
export const assessMemorySchema=candidateSchema.extend({intent:z.enum(['capture','consolidate','promote']),sourcePath:z.string().min(1).max(512).optional(),contextPaths:z.array(z.string().min(1).max(512)).max(5).refine(v=>new Set(v).size===v.length,'Context paths must be distinct').optional()})
  .refine(v=>v.intent==='promote'?!!v.sourcePath&&!!v.expectedRevision:!v.sourcePath,'Only promotion requires a source path and revision')
  .refine(v=>v.sources.some(s=>!!s.excerpt?.trim()),'Assessment requires a verified source excerpt');
export const undoMemorySchema=z.object({operationId:z.string().min(1).max(128),expectedRevision:z.string().min(1).max(100),reason:z.string().trim().min(1).max(1000),idempotencyKey:z.string().min(8).max(128)}).strict();
export class BrainStore {
  readonly db:DatabaseSync; readonly vault:string; readonly judge:Judge; readonly accept:Set<string>;
  readonly index:NoteIndex;
  readonly work:WorkQueue;
  private recallJudge?:RecallJudge; private connectionJudge?:ConnectionJudge; private writeAssessor?:WriteAssessor;
  private recallCache = new Map<string, { at:number; result:RecallResult }>();
  private queue:Promise<unknown>=Promise.resolve(); private closed=false;
  private syncReady?:Promise<void>;
  private syncView?:{snapshot:BrainSnapshot;status:ReturnType<BrainStore['statusFrom']>};
  syncStatus='Not configured'; lastSync:string|null=null;
  constructor(options:{vault:string;data:string;judge:Judge;accept?:string[];recallJudge?:RecallJudge;connectionJudge?:ConnectionJudge;writeAssessor?:WriteAssessor}) {
    this.vault=resolve(options.vault); mkdirSync(this.vault,{recursive:true});mkdirSync(options.data,{recursive:true});
    this.db=new DatabaseSync(resolve(options.data,'brain.sqlite'));this.judge=options.judge;this.accept=new Set(options.accept||[]);this.recallJudge=options.recallJudge;this.connectionJudge=options.connectionJudge;
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, idem TEXT UNIQUE, fingerprint TEXT, payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS observed (path TEXT PRIMARY KEY, revision TEXT, markdown TEXT); CREATE TABLE IF NOT EXISTS auth (key TEXT PRIMARY KEY, payload TEXT NOT NULL, expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);');
    this.db.exec('CREATE TABLE IF NOT EXISTS connections (id TEXT PRIMARY KEY, payload TEXT NOT NULL)');
    this.db.exec('CREATE TABLE IF NOT EXISTS assessments (id TEXT PRIMARY KEY, idem TEXT UNIQUE NOT NULL, fingerprint TEXT NOT NULL, payload TEXT NOT NULL, progress TEXT NOT NULL DEFAULT \'{}\')');this.writeAssessor=options.writeAssessor;
    if(this.db.prepare('SELECT value FROM metadata WHERE key=?').get('noteParserVersion')?.value!=='2'){
      this.db.exec('DROP TABLE IF EXISTS note_index; DROP TABLE IF EXISTS note_fts');
      this.db.prepare('INSERT OR REPLACE INTO metadata VALUES(?,?)').run('noteParserVersion','2');
    }
    this.index=new NoteIndex(this.db,this.vault);
    this.work=new WorkQueue(this.db);
    for(const row of this.db.prepare("SELECT id,payload FROM assessments WHERE json_extract(payload,'$.status')='assessing'").all()){
      const a:Assessment=JSON.parse(row.payload as string);a.status='unavailable';a.error='Assessment interrupted; inspect the saved candidate before continuing';
      this.db.prepare('UPDATE assessments SET payload=? WHERE id=?').run(JSON.stringify(a),row.id as string);
    }
    if(!this.db.prepare('SELECT value FROM metadata WHERE key=?').get('workIndexed')){
      for(const row of this.db.prepare("SELECT payload FROM operations WHERE json_extract(payload,'$.status')='needs_attention'").all()){
        const op:Operation=JSON.parse(row.payload as string);if(!op.resolution&&op.decision?.outcome!=='not_worth_remembering')this.work.enqueue('operation:'+op.id,revision(op.proposed),op.path,'proposal',op.reason,op.id);
      }
      this.db.prepare('INSERT INTO metadata VALUES(?,?)').run('workIndexed','1');
    }
    if(!this.db.prepare('SELECT value FROM metadata WHERE key=?').get('categoriesIndexed')){
      for(const row of this.db.prepare("SELECT payload FROM operations WHERE json_extract(payload,'$.status')='applied' ORDER BY rowid").all()){
        const op:Operation=JSON.parse(row.payload as string);this.recordCategory(op);
      }
      this.db.prepare('INSERT INTO metadata VALUES(?,?)').run('categoriesIndexed','1');
    }
    this.lastSync=(this.db.prepare('SELECT value FROM metadata WHERE key=?').get('lastSync')?.value as string)||null;
  }
  close(){if(!this.closed){this.db.close();this.closed=true;}}
  exclusive<T>(fn:()=>Promise<T>):Promise<T>{const next=this.queue.then(fn,fn);this.queue=next.catch(()=>{});return next;}
  synchronize(run:()=>Promise<void>):Promise<void>{
    let ready!:()=>void;
    const warming=new Promise<void>(resolve=>{ready=resolve;});this.syncReady=warming;
    return this.exclusive(async()=>{
      const started=performance.now();let networkMs=0;
      this.syncStatus='Syncing with Obsidian';
      try{
        // Validate derived data before network I/O; journal recovery must wait for remote changes.
        const notes=await this.index.refresh();
        this.syncView={snapshot:this.snapshotFrom(notes),status:this.statusFrom(notes)};ready();
        let succeeded=false;const networkStarted=performance.now();
        try{await run();succeeded=true;}catch{}finally{networkMs=performance.now()-networkStarted;}
        // A failed sync can still have changed files before it stopped.
        this.index.invalidate();await this.scan();
        if(succeeded){
          const lastSync=new Date().toISOString();
          this.db.prepare('INSERT OR REPLACE INTO metadata VALUES(?,?)').run('lastSync',lastSync);
          this.lastSync=lastSync;this.syncStatus='Last sync succeeded';
        }else this.syncStatus='Sync failed; server vault may be behind';
      }catch{this.index.invalidate();this.syncStatus='Sync failed; server vault may be behind';}
      finally{
        this.syncView=undefined;ready();if(this.syncReady===warming)this.syncReady=undefined;
        const durationMs=Math.round(performance.now()-started);
        if(durationMs>=1000||this.syncStatus!=='Last sync succeeded')console.info(JSON.stringify({event:'brain_sync',durationMs,networkMs:Math.round(networkMs),status:this.syncStatus}));
      }
    });
  }
  private save(op:Operation,key?:string,fingerprint?:string){
    this.db.exec('SAVEPOINT save_operation');try{
      this.db.prepare('INSERT INTO operations(id,idem,fingerprint,payload) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(op.id,key||null,fingerprint||null,JSON.stringify(op));
      if(op.assessment?.role==='primary'){
        const a=this.assessmentRecord(op.assessment.id);if(!a)throw Error('Assessment not found');const progress=a.progress||{};
        if(op.status==='pending')progress.operationId=op.id;
        if(['applied','duplicate'].includes(op.status)){
          if(progress.resolution&&progress.resolution.operationId!==op.id)throw Error('Assessment already completed');
          progress.operationId=op.id;progress.resolution={actor:op.actor,at:new Date().toISOString(),reason:op.assessment.reason,operationId:op.id};
          const job=this.work.get(a.workId);if(job)this.work.resolve(job,'done','See operation '+op.id);
        }
        this.db.prepare('UPDATE assessments SET progress=? WHERE id=?').run(JSON.stringify(progress),a.id);
      }
      this.db.exec('RELEASE save_operation');
    }catch(e){this.db.exec('ROLLBACK TO save_operation; RELEASE save_operation');throw e;}
    if(op.status==='pending'||op.status==='applied')this.index.invalidate();
  }
  private observe(notes:Note[]){
    const pending=this.db.prepare("SELECT payload FROM operations WHERE json_extract(payload,'$.status')='pending'").all() as {payload:string}[];
    for(const row of pending){const op:Operation=JSON.parse(row.payload);if(op.promotion||op.undo)continue;const current=notes.find(n=>n.path===op.path);op.status=current?.revision===revision(op.proposed)?'applied':'needs_attention';op.reason=op.status==='applied'?'Recovered committed write after restart':'Interrupted write retained for inspection';if(op.status==='applied')op.revision=current!.revision;this.save(op);if(op.status==='applied'){this.markObserved(current!);this.recordCategory(op);this.completeNoteWork(op);}else if(!op.resolution&&op.assessment?.role!=='primary'&&op.decision?.outcome!=='not_worth_remembering')this.work.enqueue('operation:'+op.id,revision(op.proposed),op.path,'proposal',op.reason,op.id);}
    for(const n of notes){const prev=this.db.prepare('SELECT revision,markdown FROM observed WHERE path=?').get(n.path) as {revision:string;markdown:string}|undefined;
      if(prev&&prev.revision!==n.revision){this.work.stale('note:'+n.path);this.save({id:randomUUID(),path:n.path,actor:'Obsidian / external',at:new Date().toISOString(),status:'external',reason:'Observed a change outside the memory API',before:prev.markdown,proposed:n.markdown,sources:n.sources,revision:n.revision});if(n.assessmentAllowed!==false&&n.folder!=='inbox')this.work.enqueue('note:'+n.path,n.revision,n.path,'review','Review changed context and links');}
      if(n.folder==='inbox')this.work.enqueue('note:'+n.path,n.revision,n.path,'inbox',n.reviewReason||'Verify sources and filing destination');
      if(!prev||prev.revision!==n.revision)this.markObserved(n);
    }
    const present=new Set(notes.map(n=>n.path));for(const row of this.db.prepare('SELECT path,markdown FROM observed').all() as {path:string;markdown:string}[]){if(!present.has(row.path)){this.save({id:randomUUID(),path:row.path,actor:'Obsidian / external',at:new Date().toISOString(),status:'external',reason:'Observed a removed page',before:row.markdown,proposed:'',sources:[]});this.db.prepare('DELETE FROM observed WHERE path=?').run(row.path);this.work.stale('note:'+row.path);}}
  }
  private markObserved(n:Note){this.db.prepare('INSERT INTO observed VALUES(?,?,?) ON CONFLICT(path) DO UPDATE SET revision=excluded.revision,markdown=excluded.markdown').run(n.path,n.revision,n.markdown);}
  private recordCategory(op:Operation){const category=op.category||op.decision?.category;if(op.revision&&category)this.db.prepare('INSERT OR REPLACE INTO note_categories VALUES(?,?,?)').run(op.path,op.revision,category);}
  private completeNoteWork(op:Operation){const job=this.work.active('note:'+op.path);if(!job)return;if(job.status==='claimed'&&job.owner===op.actor&&(job.leaseUntil||0)>Date.now())this.work.resolve(job,'done','Applied operation '+op.id);else this.work.stale(job.subject);}
  private async scan(){
    let notes=await this.index.refresh();
    for(const row of this.db.prepare("SELECT payload FROM operations WHERE json_extract(payload,'$.status')='pending' AND json_extract(payload,'$.undo') IS NOT NULL").all()){
      const op:Operation=JSON.parse(row.payload as string);await this.applyUndo(op,notes,()=>{this.save(op);return op;});this.index.invalidate();notes=await this.index.refresh();
    }
    if(await this.recoverPromotions(notes))notes=await this.index.refresh();this.observe(notes);
    for(const c of this.connections())if(c.status==='proposed'&&(!notes.some(n=>n.path===c.source&&n.revision===c.sourceRevision)||!notes.some(n=>n.path===c.target&&n.revision===c.targetRevision))){c.status='stale';this.saveConnection(c);}
    return notes;
  }
  private connections():Connection[]{return this.db.prepare('SELECT payload FROM connections').all().map(row=>JSON.parse(row.payload as string));}
  private saveConnection(c:Connection){this.db.prepare('INSERT OR REPLACE INTO connections VALUES(?,?)').run(c.id,JSON.stringify(c));}
  private async recoverPromotions(notes:Note[]){
    let changed=false;
    for(const row of this.db.prepare("SELECT payload FROM operations WHERE json_extract(payload,'$.status')='pending' AND json_extract(payload,'$.promotion') IS NOT NULL").all()){
      const op:Operation=JSON.parse(row.payload as string),p=op.promotion!;
      const sourcePath=await safePath(this.vault,p.sourcePath,true),target=await safePath(this.vault,op.path,true);
      const source=await readOptional(sourcePath),destination=await readOptional(target);
      if(destination===op.proposed&&(source===null||revision(source)===p.sourceRevision)){
        const note=source===null?undefined:parseNote(p.sourcePath,source,op.at);
        if(note&&promotionLinkChanges(notes,note,parseNote(op.path,op.proposed,op.at)).length){op.status='needs_attention';op.reason='Promotion recovery requires link review';this.save(op);continue;}
        if(source!==null){await unlink(sourcePath);await syncDirectory(dirname(sourcePath));changed=true;}
        op.status='applied';op.revision=revision(op.proposed);op.reason='Recovered journaled promotion';this.save(op);this.recordCategory(op);
        this.db.prepare('DELETE FROM observed WHERE path=?').run(p.sourcePath);this.markObserved(parseNote(op.path,op.proposed,op.at));
        const job=this.work.active('note:'+p.sourcePath);if(job)this.work.resolve(job,'done','Promotion recovered');
      }else{op.status='needs_attention';op.reason='Interrupted promotion; source/destination changed or destination was not committed';this.save(op);}
    }
    return changed;
  }
  private snapshotFrom(notes:Note[]):BrainSnapshot{return {notes,operations:this.db.prepare('SELECT payload FROM operations ORDER BY rowid DESC LIMIT 100').all().map(r=>JSON.parse(r.payload as string)),connections:this.connections().filter(c=>c.status==='proposed').slice(0,200),mode:'live',status:{indexedAt:new Date().toISOString(),sync:this.syncStatus,lastSync:this.lastSync,search:'Keyword search'}};}
  async snapshot():Promise<BrainSnapshot>{await this.syncReady;if(this.syncView)return this.syncView.snapshot;return this.exclusive(async()=>this.snapshotFrom(await this.scan()));}
  async inspect(path:string):Promise<Note>{
    // Validated unchanged notes need not wait for sync or evaluation.
    const current=await this.index.current(path);if(current)return current;
    if(this.syncReady){await this.syncReady;const warmed=await this.index.current(path);if(warmed)return warmed;}
    return this.exclusive(async()=>{
      // shortcut: other-page link changes follow refresh/sync; add filesystem invalidation if independent writers are introduced.
      const n=await this.index.current(path)||(await this.scan()).find(n=>n.path===path);
      if(!n)throw Error('Page not found');return n;
    });
  }
  private operationRecord(id:string):Operation|undefined{const row=this.db.prepare('SELECT payload FROM operations WHERE id=?').get(id);return row?JSON.parse(row.payload as string):undefined;}
  private assessmentRecord(id:string):Assessment|undefined{const row=this.db.prepare('SELECT payload,progress FROM assessments WHERE id=?').get(id);return row?{...JSON.parse(row.payload as string),progress:JSON.parse(row.progress as string)}:undefined;}
  private useAssessment(input:RememberInput&{sourcePath?:string},actor:string,notes:Note[]){
    const id=input.assessment?.id||input.relatedAssessmentId;if(!id)return{association:undefined,guard:()=>{}};
    const a=this.assessmentRecord(id);if(!a)throw Error('Assessment not found');
    const changed=[...(a.context.current?[a.context.current]:[]),...a.context.related].some(n=>!notes.some(latest=>latest.path===n.path&&latest.revision===n.revision));
    if(input.relatedAssessmentId){
      const primary=a.progress?.resolution?.operationId&&this.operationRecord(a.progress.resolution.operationId);
      if(!primary||primary.status!=='applied')throw Error('Related writes require an applied primary operation');
      return{association:{id,role:'related' as const,reason:'Follow-up to assessed update',candidateMatches:null,contextChanged:changed},guard:()=>{}};
    }
    const guard=()=>{const latest=this.assessmentRecord(id)!;if(latest.progress?.resolution)throw Error('Assessment already completed');if(latest.status==='assessing')throw Error('Assessment is still running');
      if(latest.progress?.operationId&&this.operationRecord(latest.progress.operationId)?.status==='pending')throw Error('Inspect pending operation before continuing');
      this.work.require(a.workId,actor,input.assessment!.claimToken);};guard();
    const candidate=(v:RememberInput&{sourcePath?:string})=>JSON.stringify({path:v.path,markdown:v.markdown,sources:v.sources,expectedRevision:v.expectedRevision,sourcePath:v.sourcePath});
    return{association:{id,role:'primary' as const,reason:input.assessment!.reason,candidateMatches:candidate(input)===candidate(a.input),contextChanged:changed},guard};
  }
  assessment(id:string):Promise<Assessment|undefined>{return this.exclusive(async()=>this.assessmentRecord(id));}
  async assessMemory(raw:AssessMemoryInput,actor:string):Promise<{assessment:Assessment;workId:string;claimToken?:string}>{
    const input=assessMemorySchema.parse(raw),fingerprint=revision(JSON.stringify(input));let evaluate=false;
    const assessment=await this.exclusive(async()=>{
      const prior=this.db.prepare('SELECT id,fingerprint FROM assessments WHERE idem=?').get(input.idempotencyKey);
      if(prior){if(prior.fingerprint!==fingerprint)throw Error('Idempotency key reused with different content');return this.assessmentRecord(prior.id as string)!;}
      await safePath(this.vault,input.path,true);if(input.sourcePath)await safePath(this.vault,input.sourcePath,true);
      const notes=await this.scan(),current=notes.find(n=>n.path===(input.sourcePath||input.path));
      if((current?.revision??null)!==input.expectedRevision)throw Error('Revision conflict: inspect current context');
      if(input.intent==='promote'&&(current?.folder!=='inbox'||notes.some(n=>n.path===input.path)))throw Error('Promotion requires an Inbox source and absent destination');
      if(current?.assessmentAllowed===false||parseNote(input.path,input.markdown,'').assessmentAllowed===false)throw Error('Candidate is outside the hosted assessment privacy scope');
      const explicit:Note[]=[];for(const path of input.contextPaths||[]){await safePath(this.vault,path);const n=notes.find(n=>n.path===path);if(!n)throw Error('Context note not found');if(n.assessmentAllowed===false)throw Error('Context is outside the hosted assessment privacy scope');explicit.push(n);}
      const bounded=(n:Note):AssessmentNote=>({...n,markdown:n.markdown.slice(0,12000),body:n.body.slice(0,12000),truncated:n.markdown.length>12000});
      const selected=[...explicit,...relatedNotes(input,notes)].filter((n,i,all)=>n.path!==current?.path&&all.findIndex(x=>x.path===n.path)===i).slice(0,5);
      const id=randomUUID(),a:Assessment={id,actor,at:new Date().toISOString(),input,fingerprint,workId:'',status:'assessing',context:{current:current?bounded(current):undefined,related:selected.map(bounded)}};
      this.db.exec('BEGIN');try{
        const job=this.work.enqueue('assessment:'+id,fingerprint,input.path,'assessment','Awaiting agent decision',undefined,id);a.workId=job.id;this.work.claim(job.id,actor);
        this.db.prepare('INSERT INTO assessments(id,idem,fingerprint,payload) VALUES(?,?,?,?)').run(id,input.idempotencyKey,fingerprint,JSON.stringify(a));this.db.exec('COMMIT');
      }catch(e){this.db.exec('ROLLBACK');throw e;}evaluate=true;return a;
    });
    if(evaluate){
      try{if(!this.writeAssessor)throw Error('Unavailable');const result=await this.writeAssessor(input,assessment.context.current,assessment.context.related);Object.assign(assessment,result,{status:'assessed'});}
      catch{assessment.status='unavailable';assessment.error='Assessment unavailable; inspect sources before continuing or explicitly retry with a new key';}
      await this.exclusive(async()=>{this.db.prepare('UPDATE assessments SET payload=? WHERE id=?').run(JSON.stringify(assessment),assessment.id);});
    }
    return this.exclusive(async()=>{const a=this.assessmentRecord(assessment.id)!,job=this.work.get(a.workId);return{assessment:a,workId:a.workId,...(job?.status==='claimed'&&job.owner===actor&&(job.leaseUntil||0)>Date.now()?{claimToken:job.claimToken}:{})};});
  }
  operation(id:string):Promise<Operation|undefined>{return this.exclusive(async()=>{const op=this.operationRecord(id);if(op?.status==='pending')await this.scan();return this.operationRecord(id);});}
  private statusFrom(notes:Note[]){return {version:2,notes:notes.length,autoAccept:[...this.accept],folders:[...new Set(notes.map(n=>dirname(n.path)).filter(p=>p!=='.'))].sort().slice(0,200),work:this.db.prepare('SELECT status,COUNT(*) AS count FROM work GROUP BY status').all(),sync:this.syncStatus,lastSync:this.lastSync,search:'SQLite FTS5 + Jev evidence review',index:{parsedThisRefresh:this.index.lastReadCount},claimSeconds:300,guide:'brain://guide',policy:'brain://policy'};}
  async status(){await this.syncReady;if(this.syncView)return this.syncView.status;return this.exclusive(async()=>this.statusFrom(await this.scan()));}
  policy(){return this.exclusive(async()=>{const parts:string[]=[];for(const path of ['BRAIN.md','AGENTS.md','CONTEXT.md','PARA.md']){const text=await readOptional(await safePath(this.vault,path));if(text!==null){if(Buffer.byteLength(text)>65536)throw Error('Policy is too large; inspect its file directly');parts.push('# '+path+'\n\n'+text);}}return parts.join('\n\n')||'No vault-specific policy files are present. Follow brain://guide and the owner-authorized scope.';});}
  search(query:string,limit=12,category?:MemoryCategory):Promise<Note[]>{return this.exclusive(async()=>{await this.scan();return this.index.search(query,Math.min(20,Math.max(1,limit)),category).map(n=>({...n,body:n.body.slice(0,1200),markdown:n.markdown.slice(0,1200)}));});}
  recall(query:string,category?:MemoryCategory):Promise<RecallResult>{return this.exclusive(async()=>{
    z.string().trim().min(1).max(1000).parse(query);if(category)z.enum(categories).parse(category);
    await this.scan();const selected=this.index.search(query,8,category,true);
    const key=revision(JSON.stringify([query,category,selected.map(n=>[n.path,n.revision])]));
    const cached=this.recallCache.get(key);if(cached&&Date.now()-cached.at<600000)return cached.result;
    const unavailable:RecallResult={notes:[],evidence:[],conflicts:[],excluded:0,status:'unavailable',search:'Keyword shortlist; Jev unavailable',warning:'No assessed evidence is available. Use keyword search and inspect sources before answering.'};
    if(!this.recallJudge)return unavailable;
    const hits:RecallHit[]=[];
    try{
      for(let i=0;i<selected.length;i+=4){const batch=await Promise.allSettled(selected.slice(i,i+4).map(async note=>({note:{...note,body:note.body.slice(0,Math.max(0,12000-(note.markdown.length-note.body.length))),markdown:note.markdown.slice(0,12000)},assessment:await this.recallJudge!(query,note,selected)})));for(const r of batch){if(r.status==='rejected')throw Error('Assessment failed');hits.push(r.value);}}
    }catch{return unavailable;}
    const evidence=hits.filter(h=>h.assessment.route==='evidence').sort((a,b)=>b.assessment.probabilities.evidence*b.assessment.probabilities.relevant-a.assessment.probabilities.evidence*a.assessment.probabilities.relevant);
    const conflicts=hits.filter(h=>h.assessment.route==='conflict');
    const result:RecallResult={notes:evidence.map(h=>h.note),evidence,conflicts,excluded:hits.length-evidence.length-conflicts.length,status:'assessed',search:'Keyword shortlist + Jev evidence review',...(conflicts.length?{warning:'Conflicting evidence found. Address these conflicts and preserve dates/scope before answering.'}:{})};
    if(this.recallCache.size>=100)this.recallCache.delete(this.recallCache.keys().next().value!);this.recallCache.set(key,{at:Date.now(),result});return result;
  });}
  suggestConnections(path:string):Promise<Connection[]>{return this.exclusive(async()=>{
    await safePath(this.vault,path,true);if(!this.connectionJudge)throw Error('Jev is not configured');
    const notes=await this.scan(),source=notes.find(n=>n.path===path);if(!source)throw Error('Page not found');if(source.assessmentAllowed===false)throw Error('This note is excluded from external assessment');
    const eligible=this.index.search(source.title+' '+source.body,64,undefined,true).filter(n=>n.path!==path&&!source.links.includes(n.path)&&!n.links.includes(path)&&!/[%\[\]#|\r\n]/.test(n.path));
    const candidates=relatedNotes({path,markdown:source.markdown,sources:[],expectedRevision:source.revision,idempotencyKey:''},eligible);
    for(const target of candidates){
      try{await safePath(this.vault,target.path,true);}catch{continue;}
      const id=revision(JSON.stringify([questionVersion,source.path,source.revision,target.path,target.revision]));
      if(this.connections().some(c=>c.id===id))continue;
      const assessment=await this.connectionJudge(source,target);
      this.saveConnection({id,source:path,target:target.path,sourceRevision:source.revision,targetRevision:target.revision,status:assessment.useful?'proposed':'dismissed',assessment});
    }
    await this.scan();return this.connections().filter(c=>c.source===path&&c.status==='proposed');
  });}
  reviewConnection(id:string,action:'accept'|'dismiss',actor='Owner'):Promise<Connection>{return this.exclusive(async()=>{
    z.string().min(1).max(128).parse(id);z.enum(['accept','dismiss']).parse(action);
    const notes=await this.scan(),c=this.connections().find(c=>c.id===id);if(!c)throw Error('Suggestion not found');
    if(c.operationId){const previous=this.operationRecord(c.operationId);if(previous?.status==='applied'){c.status='accepted';this.saveConnection(c);return c;}}
    if(c.status!=='proposed')return c;
    c.reviewedBy=actor;c.reviewedAt=new Date().toISOString();
    if(action==='dismiss'){c.status='dismissed';this.saveConnection(c);return c;}
    const source=notes.find(n=>n.path===c.source)!,target=notes.find(n=>n.path===c.target)!;
    const path=await safePath(this.vault,source.path,true);await safePath(this.vault,target.path,true);
    // Recheck both files after review; a suggestion never authorizes overwriting a later edit.
    if(revision(await readFile(path,'utf8'))!==c.sourceRevision||revision(await readFile(await safePath(this.vault,target.path),'utf8'))!==c.targetRevision){c.status='stale';this.saveConnection(c);return c;}
    if(/[%\[\]#|\r\n]/.test(target.path))throw Error('Target cannot be represented as a wiki link');
    const op:Operation={id:randomUUID(),path:source.path,actor:actor+' · connection review',at:new Date().toISOString(),status:'needs_attention',reason:'Reviewed connection',category:source.category,before:source.markdown,proposed:source.markdown+connectionMarkdown(source.path,target.path),sources:[{title:'Reviewed link to '+target.title,uri:'urn:brain:connection:'+c.id,observedAt:new Date().toISOString()}]};
    c.operationId=op.id;this.saveConnection(c);
    await this.apply(op,path,c.sourceRevision,()=>{this.save(op);return op;});
    c.status=op.status==='applied'?'accepted':'stale';this.saveConnection(c);return c;
  });}
  listWork(options:Parameters<WorkQueue['list']>[0]={}){return this.exclusive(async()=>{await this.scan();return this.work.list(options);});}
  claimWork(id:string,actor:string){return this.exclusive(async()=>{await this.scan();return this.work.claim(id,actor);});}
  finishWork(input:{id:string;claimToken:string;outcome:'done'|'deferred';reason:string;operationId?:string;retryAt?:number},actor:string){return this.exclusive(async()=>{
    await this.scan();const job=this.work.require(input.id,actor,input.claimToken);
    if(job.assessmentId){
      const a=this.assessmentRecord(job.assessmentId)!;if(a.status==='assessing')throw Error('Assessment is still running');
      if(input.operationId)throw Error('Assessment writes finish their own work; inspect the applied operation');
      if(input.outcome==='done'){
        this.db.exec('SAVEPOINT finish_assessment');try{
          this.db.prepare('UPDATE assessments SET progress=? WHERE id=?').run(JSON.stringify({...a.progress,resolution:{actor,at:new Date().toISOString(),reason:input.reason}}),a.id);
          const finished=this.work.finish(input.id,actor,input.claimToken,input.outcome,input.reason,input.retryAt);this.db.exec('RELEASE finish_assessment');return finished;
        }catch(e){this.db.exec('ROLLBACK TO finish_assessment; RELEASE finish_assessment');throw e;}
      }
    }
    if(input.operationId){if(input.outcome!=='done')throw Error('An applied result must finish the work');const op=this.operationRecord(input.operationId);if(!op||!['applied','duplicate'].includes(op.status)||(op.path!==job.path&&op.promotion?.sourcePath!==job.path))throw Error('Result must be an applied operation for this work item');
      if(job.operationId){const original=this.operationRecord(job.operationId);if(original){original.resolution={actor,at:new Date().toISOString(),reason:input.reason,operationId:op.id};this.save(original);}}
    }
    return this.work.finish(input.id,actor,input.claimToken,input.outcome,input.reason,input.retryAt);
  });}
  reviewMemory(input:{id:string;action:'accept'|'dismiss';reason:string;claimToken?:string;idempotencyKey?:string},actor:string,owner=false):Promise<Operation>{return this.exclusive(async()=>{
    await this.scan();const original=this.operationRecord(input.id);if(!original)throw Error('Proposal not found');
    if(original.resolution)return original.resolution.operationId?this.operationRecord(original.resolution.operationId)!:original;
    if(original.status!=='needs_attention'||original.promotion||original.undo||original.assessment?.role==='primary')throw Error('This operation cannot be approved as a memory; resume its assessment or undo when linked');
    const job=this.work.active('operation:'+original.id);
    const guard=()=>{if(!owner){if(!job)throw Error('Proposal is not actionable');this.work.require(job.id,actor,input.claimToken);}};guard();
    if(input.action==='dismiss'){
      original.resolution={actor,at:new Date().toISOString(),reason:input.reason};this.save(original);if(job)this.work.resolve(job,'done',input.reason);return original;
    }
    if(!input.idempotencyKey)throw Error('An idempotency key is required');
    const result=await this.rememberUnlocked({path:original.path,markdown:original.proposed,sources:original.sources,expectedRevision:original.expectedRevision!==undefined?original.expectedRevision:(original.before===null?null:revision(original.before)),idempotencyKey:input.idempotencyKey},actor,guard);
    guard();original.resolution={actor,at:new Date().toISOString(),reason:input.reason,operationId:result.id};this.save(original);if(job)this.work.resolve(job,'done','Reviewed; see operation '+result.id);return result;
  });}
  remember(raw:RememberInput,actor:string):Promise<Operation>{return this.exclusive(()=>this.rememberUnlocked(raw,actor));}
  undoMemory(raw:z.infer<typeof undoMemorySchema>,actor:string):Promise<Operation>{return this.exclusive(async()=>{
    const input=undoMemorySchema.parse(raw),fingerprint=revision(JSON.stringify(input));
    const existing=this.db.prepare('SELECT payload,fingerprint FROM operations WHERE idem=?').get(input.idempotencyKey);
    if(existing&&existing.fingerprint!==fingerprint)throw Error('Idempotency key reused with different content');
    const notes=await this.scan(),original=this.operationRecord(input.operationId);if(!original)throw Error('Operation not found');
    const completed=this.db.prepare("SELECT payload FROM operations WHERE json_extract(payload,'$.undo.operationId')=? AND json_extract(payload,'$.status')='applied' LIMIT 1").get(original.id);
    if(completed)return JSON.parse(completed.payload as string);
    const active=this.db.prepare("SELECT payload FROM operations WHERE json_extract(payload,'$.undo.operationId')=? AND json_extract(payload,'$.undo.started')=1 AND json_extract(payload,'$.status') IN ('pending','needs_attention') LIMIT 1").get(original.id);
    if(active&&(!existing||JSON.parse(existing.payload as string).id!==JSON.parse(active.payload as string).id))throw Error('Undo already journaled; inspect it and retry its original idempotency key');
    const op:Operation=existing?this.operationRecord(JSON.parse(existing.payload as string).id)!:{id:randomUUID(),path:original.path,actor,at:new Date().toISOString(),status:'needs_attention',reason:'Undo requested',before:original.proposed,proposed:original.before??'',sources:[{title:'Undo of recorded operation',uri:'urn:brain:operation:'+original.id,observedAt:new Date().toISOString()}],expectedRevision:input.expectedRevision,undo:{operationId:original.id,files:original.promotion?[{path:original.promotion.sourcePath,before:null,after:original.before},{path:original.path,before:original.proposed,after:null}]:[{path:original.path,before:original.proposed,after:original.before}],reason:input.reason}};
    const finish=()=>{this.save(op,input.idempotencyKey,fingerprint);return op;};
    if(original.status!=='applied'||original.undo||!original.revision){op.reason='Only an applied write or promotion can be undone';return finish();}
    const scope=original.promotion?'promote':original.before===null?'new':'update';
    if(!this.accept.has(scope)){op.reason='Undo requires enabled '+scope+' writes';return finish();}
    if(input.expectedRevision!==original.revision){op.reason='Undo requires the original resulting revision; later edits must be preserved';return finish();}
    return this.applyUndo(op,notes,finish);
  });}
  private async applyUndo(op:Operation,notes:Note[],finish:()=>Operation):Promise<Operation>{
    const undo=op.undo!,original=this.operationRecord(undo.operationId)!;
    for(const file of undo.files){
      const target=await safePath(this.vault,file.path,true),current=await readOptional(target);
      if(current!==file.before&&(!undo.started||current!==file.after)){op.status='needs_attention';op.reason='Undo would overwrite a later edit or reused path: '+file.path;return finish();}
      if([file.before,file.after].some(text=>text!==null&&parseNote(file.path,text,op.at).assessmentAllowed===false)){op.status='needs_attention';op.reason='Undo content is outside the hosted privacy scope';return finish();}
    }
    const affected=undoLinkChanges(notes,undo.files,original.promotion?{from:original.path,to:original.promotion.sourcePath}:undefined);
    if(affected.length){op.status='needs_attention';op.reason='Undo would change resolved links; review: '+affected.slice(0,10).join(', ');return finish();}
    undo.started=true;op.status='pending';op.reason='Undo journaled';finish();
    try{
      for(const file of undo.files){
        const target=await safePath(this.vault,file.path,true),current=await readOptional(target);if(current===file.after)continue;
        if(current!==file.before){op.status='needs_attention';op.reason='Page changed during undo: '+file.path;return finish();}
        if(file.after===null){await unlink(target);await syncDirectory(dirname(target));}
        else{
          await mkdir(dirname(target),{recursive:true});await safePath(this.vault,file.path,true);
          if(file.before===null)await createNoteFile(target,file.after);
          else{const temp=target+'.undo-'+randomUUID()+'.tmp';try{await createNoteFile(temp,file.after);await rename(temp,target);await syncDirectory(dirname(target));}finally{await unlink(temp).catch(()=>{});}}
        }
      }
      for(const file of undo.files){this.work.stale('note:'+file.path);if(file.after===null)this.db.prepare('DELETE FROM observed WHERE path=?').run(file.path);else this.markObserved(parseNote(file.path,file.after,op.at));}
      op.status='applied';op.reason='Undo applied to server vault; device sync is separate';const target=undo.files.find(f=>f.path===op.path);op.revision=target?.after===null?undefined:revision(target!.after!);return finish();
    }catch{op.reason='Undo interrupted; inspect this operation to recover its journal';return finish();}
  }
  promote(raw:z.infer<typeof promoteSchema>,actor:string):Promise<Operation>{return this.exclusive(async()=>{
    const input=promoteSchema.parse(raw);
    if(input.sources.some(s=>!s.excerpt?.trim()))throw Error('Promotion requires verified source excerpts');
    const fingerprint=revision(JSON.stringify({...input,claimToken:undefined,assessment:input.assessment?{...input.assessment,claimToken:undefined}:undefined}));
    const existing=this.db.prepare('SELECT fingerprint,payload FROM operations WHERE idem=?').get(input.idempotencyKey);
    if(existing){if(existing.fingerprint!==fingerprint)throw Error('Idempotency key reused with different content');await this.scan();return this.operationRecord((JSON.parse(existing.payload as string) as Operation).id)!;}
    if(folderFor(input.sourcePath)!=='inbox'||!['projects','areas','resources'].includes(folderFor(input.path)))throw Error('Promotion must file an Inbox note into Projects, Areas or Resources');
    const sourcePath=await safePath(this.vault,input.sourcePath,true),target=await safePath(this.vault,input.path,true);
    if(!(await stat(dirname(target))).isDirectory())throw Error('Destination folder must already exist');
    const notes=await this.scan(),source=notes.find(n=>n.path===input.sourcePath);if(!source)throw Error('Inbox source not found');
    if(await readOptional(target)!==null)throw Error('Promotion destination already exists');
    const job=this.work.active('note:'+source.path);if(!job)throw Error('Claim the Inbox work item first');
    const assessed=this.useAssessment(input,actor,notes);
    const guard=()=>{this.work.require(job.id,actor,input.claimToken);assessed.guard();};guard();
    const op:Operation={id:randomUUID(),path:input.path,actor,at:new Date().toISOString(),status:'needs_attention',reason:'Promotion retained',before:source.markdown,proposed:input.markdown,sources:input.sources,expectedRevision:null,promotion:{sourcePath:source.path,sourceRevision:input.expectedRevision},assessment:assessed.association};
    const finish=()=>{this.save(op,input.idempotencyKey,fingerprint);return op;};
    if(source.revision!==input.expectedRevision){op.reason='Source revision changed; inspect and claim current work';return finish();}
    const destination=parseNote(input.path,input.markdown,op.at);
    if(source.assessmentAllowed===false||destination.assessmentAllowed===false){op.reason='Promotion content is excluded from external assessment';return finish();}
    const affected=promotionLinkChanges(notes,source,destination);if(affected.length){op.reason='Promotion would change resolved links; review: '+affected.slice(0,10).join(', ');return finish();}
    if(!this.accept.has('promote')){op.reason='Automatic promotion is not enabled';return finish();}
    op.category=destination.category||source.category;
    if(revision(await readFile(sourcePath,'utf8'))!==input.expectedRevision){op.reason='Source changed before promotion';return finish();}guard();
    op.status='pending';op.reason='Promotion journaled';finish();
    try{
      await createNoteFile(target,input.markdown);
      if(revision(await readFile(sourcePath,'utf8'))!==input.expectedRevision)throw Error('Source changed');
      await unlink(sourcePath);await syncDirectory(dirname(sourcePath));
    }catch{op.reason='Promotion interrupted; inspect both paths to reconcile the journal';return finish();}
    // Completion failures leave the durable pending journal for the next inspection.
    op.status='applied';op.reason='Promoted in server vault; device sync is separate';op.revision=revision(input.markdown);finish();this.recordCategory(op);
    this.db.prepare('DELETE FROM observed WHERE path=?').run(input.sourcePath);this.markObserved(destination);this.work.resolve(job,'done','Promoted to '+input.path);return op;
  });}
  private async rememberUnlocked(raw:RememberInput,actor:string,beforeWrite?:()=>void):Promise<Operation>{
    const input=rememberSchema.parse(raw);const target=await safePath(this.vault,input.path,true);const fingerprint=revision(JSON.stringify({...input,assessment:input.assessment?{...input.assessment,claimToken:undefined}:undefined}));
    const existing=this.db.prepare('SELECT payload,fingerprint FROM operations WHERE idem=?').get(input.idempotencyKey);
    if(existing){if(existing.fingerprint!==fingerprint)throw Error('Idempotency key reused with different content');const op:Operation=JSON.parse(existing.payload as string);if(op.status==='pending'){await this.scan();return this.operationRecord(op.id)!;}return op;}
    const notes=await this.scan();const current=notes.find(n=>n.path===input.path);
    const assessed=this.useAssessment(input,actor,notes);
    const op:Operation={id:randomUUID(),path:input.path,actor,at:new Date().toISOString(),status:'needs_attention',reason:'Proposal retained',before:current?.markdown??null,proposed:input.markdown,sources:input.sources,expectedRevision:input.expectedRevision,assessment:assessed.association};
    const finish=()=>{this.save(op,input.idempotencyKey,fingerprint);if(op.status==='needs_attention'&&op.assessment?.role!=='primary'&&op.decision?.outcome!=='not_worth_remembering')this.work.enqueue('operation:'+op.id,fingerprint,op.path,'proposal',op.reason,op.id);return op;};
    if((current?.revision??null)!==input.expectedRevision){op.reason='Revision conflict: inspect the current page and resubmit';return finish();}
    if(current?.markdown===input.markdown){op.status='duplicate';op.revision=current.revision;op.reason='Exact content already present';return finish();}
    if(current?.assessmentAllowed===false){op.reason='Current note is outside the hosted capture privacy scope; use the owner-configured route';return finish();}
    const proposed=parseNote(input.path,input.markdown,op.at);if(proposed.assessmentAllowed===false){op.reason='Proposed note is outside the hosted capture privacy scope; use the owner-configured route';return finish();}
    const expected=current?'update':'new';if(!this.accept.has(expected)){op.reason='Automatic '+expected+' writes are not enabled';return finish();}
    op.category=proposed.category||current?.category;
    return this.apply(op,target,input.expectedRevision,finish,()=>{beforeWrite?.();assessed.guard();});
  }
  private async apply(op:Operation,target:string,expectedRevision:string|null,finish:()=>Operation,beforeWrite?:()=>void):Promise<Operation>{
    let latest:string|null=null;try{latest=await readFile(target,'utf8')}catch(e:any){if(e.code!=='ENOENT')throw e;}
    if((latest===null?null:revision(latest))!==expectedRevision){op.reason='Page changed before writing; inspect the current page and resubmit';return finish();}
    beforeWrite?.();op.status='pending';op.reason='Write journaled';finish();let temp='';
    try{
      await mkdir(dirname(target),{recursive:true});await safePath(this.vault,op.path,true);temp=target+'.'+randomUUID()+'.tmp';
      const fd=await open(temp,'wx',0o600);try{await fd.writeFile(op.proposed,'utf8');await fd.sync();}finally{await fd.close();}
      await rename(temp,target);temp='';const parent=await open(dirname(target),'r');try{await parent.sync();}finally{await parent.close();}
    }catch(e){if(temp)await unlink(temp).catch(()=>{});op.reason='Write interrupted; inspect server state to reconcile the journal';return finish();}
    // Do not demote a published write when recording completion fails.
    op.status='applied';op.reason='Applied to server vault; device sync is separate';op.revision=revision(op.proposed);finish();this.recordCategory(op);this.completeNoteWork(op);
    this.db.prepare('INSERT INTO observed VALUES(?,?,?) ON CONFLICT(path) DO UPDATE SET revision=excluded.revision,markdown=excluded.markdown').run(op.path,op.revision,op.proposed);return op;
  }
}
