import test from 'node:test';
import assert from 'node:assert/strict';
import { NoteCache } from '../src/note-cache.ts';
import { parseNote } from '../server/vault.ts';
import type { Note } from '../src/shared.ts';

const note=parseNote('Example.md','# Example\nSynthetic content.','2026-11-02T00:00:00Z');
const summary={...note,body:'',markdown:''};
const signal=()=>new AbortController().signal;

test('revisits reuse content while refresh updates derived metadata without another fetch',async()=>{
  let reads=0;const cache=new NoteCache(async()=>{reads++;return note;});
  await cache.load(note.path,summary,signal());
  const updated={...summary,links:['Target.md'],category:'decision' as const};
  cache.reconcile([updated]);
  const result=await cache.load(note.path,updated,signal());
  assert.equal(reads,1);assert.equal(result.body,note.body);
  assert.deepEqual(result.links,['Target.md']);assert.equal(result.category,'decision');
});

test('edited and deleted notes are invalidated and clearing the session drops cached content',async()=>{
  let current=note,reads=0;const cache=new NoteCache(async()=>{reads++;return current;});
  await cache.load(note.path,summary,signal());
  current=parseNote(note.path,'# Example\nChanged content.','2026-11-02T00:01:00Z');
  const updated={...current,body:'',markdown:''};
  cache.reconcile([updated]);assert.equal(cache.get(summary),undefined);
  assert.equal((await cache.load(note.path,updated,signal())).body,current.body);assert.equal(reads,2);
  cache.reconcile([]);assert.equal(cache.get(updated),undefined);
  await cache.load(note.path,updated,signal());cache.clear();assert.equal(cache.get(updated),undefined);
});

test('a response from before a refresh or sign-out cannot repopulate the cache',async()=>{
  for(const invalidate of [(cache:NoteCache)=>cache.reconcile([]),(cache:NoteCache)=>cache.clear()]){
    let resolve!: (note:Note)=>void;const pending=new Promise<Note>(r=>{resolve=r;});const cache=new NoteCache(()=>pending);
    const loading=cache.load(note.path,summary,signal());invalidate(cache);
    resolve(note);await loading;assert.equal(cache.get(summary),undefined);
  }
});

test('cancelled selections cannot populate the cache and failed reads clear cached private content',async()=>{
  let resolve!: (note:Note)=>void;const pending=new Promise<Note>(r=>{resolve=r;});const cache=new NoteCache(()=>pending);
  const controller=new AbortController();const loading=cache.load(note.path,summary,controller.signal);
  controller.abort();resolve(note);await assert.rejects(loading,{name:'AbortError'});
  assert.equal(cache.get(summary),undefined);
  let denied=false;const authCache=new NoteCache(async()=>{if(denied)throw Error('Sign in to your Brain');return note;});
  await authCache.load(note.path,summary,signal());denied=true;
  await assert.rejects(()=>authCache.load('Other.md',undefined,signal()),/Sign in/);
  assert.equal(authCache.get(summary),undefined);
});
