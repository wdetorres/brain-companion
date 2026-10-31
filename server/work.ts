import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { WorkItem, WorkKind, WorkStatus } from '../src/shared.ts';
import { revision } from './vault.ts';

export class WorkQueue {
  private db:DatabaseSync;
  constructor(db:DatabaseSync){this.db=db;db.exec(`CREATE TABLE IF NOT EXISTS work(id TEXT PRIMARY KEY,subject TEXT NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL,payload TEXT NOT NULL);CREATE INDEX IF NOT EXISTS work_subject ON work(subject);CREATE INDEX IF NOT EXISTS work_pending ON work(status,created);`);}
  private save(job:WorkItem){this.db.prepare('INSERT OR REPLACE INTO work VALUES(?,?,?,?,?)').run(job.id,job.subject,job.status,job.createdAt,JSON.stringify(job));return job;}
  get(id:string):WorkItem|undefined{const row=this.db.prepare('SELECT payload FROM work WHERE id=?').get(id);return row?JSON.parse(row.payload as string):undefined;}
  active(subject:string){const row=this.db.prepare("SELECT payload FROM work WHERE subject=? AND status IN ('open','claimed','deferred') ORDER BY created DESC LIMIT 1").get(subject);return row?JSON.parse(row.payload as string) as WorkItem:undefined;}
  enqueue(subject:string,rev:string,path:string,kind:WorkKind,reason:string,operationId?:string){
    const id=revision(JSON.stringify([subject,rev,kind]));this.stale(subject,id);const exists=this.get(id);
    if(exists)return exists.status==='stale'?this.save({...exists,status:'open',owner:undefined,claimToken:undefined,leaseUntil:undefined,retryAt:undefined,reason,updatedAt:Date.now()}):exists;
    const now=Date.now();return this.save({id,subject,revision:rev,path,kind,status:'open',reason,createdAt:now,updatedAt:now,operationId});
  }
  stale(subject:string,except=''){for(const row of this.db.prepare("SELECT payload FROM work WHERE subject=? AND id<>? AND status IN ('open','claimed','deferred')").all(subject,except)){const job:WorkItem=JSON.parse(row.payload as string);job.status='stale';job.claimToken=undefined;job.leaseUntil=undefined;job.updatedAt=Date.now();this.save(job);}}
  list(options:{status?:WorkStatus;kind?:WorkKind;limit?:number;offset?:number}){
    const status=options.status;const rows=this.db.prepare(`SELECT payload FROM work WHERE ${status?'status=?':"status IN ('open','claimed','deferred')"} ${options.kind?"AND json_extract(payload,'$.kind')=?":''} ORDER BY CASE WHEN status='open' OR (status='claimed' AND json_extract(payload,'$.leaseUntil')<=?) OR (status='deferred' AND json_extract(payload,'$.retryAt')<=?) THEN 0 ELSE 1 END,created,id LIMIT ? OFFSET ?`).all(...[...(status?[status]:[]),...(options.kind?[options.kind]:[]),Date.now(),Date.now(),Math.min(20,Math.max(1,options.limit||20)),Math.max(0,options.offset||0)]);
    return rows.map(row=>{const job:WorkItem=JSON.parse(row.payload as string);delete job.claimToken;return job;});
  }
  claim(id:string,actor:string,now=Date.now()):WorkItem & {claimToken:string}{
    const job=this.get(id);if(!job||!['open','claimed','deferred'].includes(job.status))throw Error('Work is no longer available');
    if(job.status==='claimed'&&(job.leaseUntil||0)>now){if(job.owner===actor&&job.claimToken)return job as WorkItem&{claimToken:string};throw Error('Work is already claimed');}
    if(job.status==='deferred'&&(job.retryAt||0)>now)throw Error('Work is deferred until its retry time or a new note revision');
    const token=randomUUID();this.save({...job,status:'claimed',owner:actor,claimToken:token,leaseUntil:now+300000,updatedAt:now});return {...job,status:'claimed',owner:actor,claimToken:token,leaseUntil:now+300000,updatedAt:now};
  }
  require(id:string,actor:string,token:string|undefined,now=Date.now()){
    const job=this.get(id);if(!job||job.status!=='claimed'||job.owner!==actor||!token||job.claimToken!==token||(job.leaseUntil||0)<=now)throw Error('A current work claim is required');return job;
  }
  finish(id:string,actor:string,token:string,outcome:'done'|'deferred',reason:string,retryAt?:number,now=Date.now()){
    const job=this.require(id,actor,token,now);return this.resolve(job,outcome,reason,retryAt,now);
  }
  resolve(job:WorkItem,outcome:'done'|'deferred',reason:string,retryAt?:number,now=Date.now()){
    if(outcome==='deferred'&&retryAt!==undefined&&retryAt<=now)throw Error('Deferred retry time must be in the future');
    return this.save({...job,status:outcome,reason,claimToken:undefined,leaseUntil:undefined,retryAt:outcome==='deferred'?(retryAt||now+7*86400000):undefined,updatedAt:now});
  }
}
