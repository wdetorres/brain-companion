import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { WorkQueue } from '../server/work.ts';

test('work claims are exclusive, expire, fence old clients and survive another queue instance',()=>{
  const db=new DatabaseSync(':memory:');const queue=new WorkQueue(db);try{
    const job=queue.enqueue('note:A.md','rev1','A.md','inbox','Verify source');
    assert.equal(queue.enqueue('note:A.md','rev1','A.md','inbox','Verify source').id,job.id);
    const a=queue.claim(job.id,'client-a',1000);assert.throws(()=>queue.claim(job.id,'client-b',1001),/claimed/);
    assert.equal(queue.list({})[0].claimToken,undefined);
    const restarted=new WorkQueue(db);const b=restarted.claim(job.id,'client-b',301001);
    assert.throws(()=>restarted.finish(job.id,'client-a',a.claimToken,'done','Reviewed',undefined,301002),/claim/);
    restarted.finish(job.id,'client-b',b.claimToken,'done','Reviewed',undefined,301002);
    assert.equal(restarted.list({}).length,0);
    queue.enqueue('note:A.md','rev1','A.md','inbox','Same revision');assert.equal(queue.list({}).length,0);
    queue.enqueue('note:A.md','rev2','A.md','inbox','New revision');assert.equal(queue.list({}).length,1);
  }finally{db.close();}
});

test('new revisions invalidate claims and bounded work lists preserve deferred reasons',()=>{
  const db=new DatabaseSync(':memory:');const q=new WorkQueue(db);try{
    const first=q.enqueue('note:A.md','a','A.md','inbox','Source check');const claim=q.claim(first.id,'a');
    const second=q.enqueue('note:A.md','b','A.md','inbox','Edited');
    assert.throws(()=>q.finish(first.id,'a',claim.claimToken,'done','Outdated'),/claim/);
    const next=q.claim(second.id,'b');q.finish(second.id,'b',next.claimToken,'deferred','Source not accessible');
    assert.equal(q.list({status:'deferred'})[0].reason,'Source not accessible');
    assert.throws(()=>q.claim(second.id,'a'),/deferred/);
    for(let i=0;i<25;i++)q.enqueue('note:'+i,'a',i+'.md','review','Changed');
    assert.equal(q.list({limit:3}).length,3);assert.equal(q.list({limit:999}).length,20);
  }finally{db.close();}
});
test('undoing an unreviewed change reopens its prior job with a fresh claim',()=>{
 const db=new DatabaseSync(':memory:');const q=new WorkQueue(db);try{
 const a=q.enqueue('note:A.md','A','A.md','inbox','Review A'),old=q.claim(a.id,'first');q.enqueue('note:A.md','B','A.md','inbox','Review B');
 q.enqueue('note:A.md','A','A.md','inbox','Review restored A');assert.equal(q.list({}).length,1);const next=q.claim(a.id,'second');assert.notEqual(next.claimToken,old.claimToken);
 assert.throws(()=>q.finish(a.id,'first',old.claimToken,'done','Old token'),/claim/);
 }finally{db.close();}
});
