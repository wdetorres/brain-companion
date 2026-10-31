import type { DatabaseSync } from 'node:sqlite';
import type { MemoryCategory, Note } from '../src/shared.ts';
import { readVault, type CachedNote } from './vault.ts';

export class NoteIndex {
  private db:DatabaseSync; private vault:string;
  private cache=new Map<string,CachedNote>();
  lastReadCount=0;
  constructor(db:DatabaseSync,vault:string) {
    this.db=db;this.vault=vault;
    db.exec(`CREATE TABLE IF NOT EXISTS note_index(path TEXT PRIMARY KEY, signature TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE VIRTUAL TABLE IF NOT EXISTS note_fts USING fts5(path UNINDEXED,title,body);
      CREATE TABLE IF NOT EXISTS note_categories(path TEXT PRIMARY KEY,revision TEXT NOT NULL,category TEXT NOT NULL);`);
    for(const row of db.prepare('SELECT * FROM note_index').all() as {path:string;signature:string;payload:string}[])
      this.cache.set(row.path,{signature:row.signature,note:JSON.parse(row.payload)});
  }
  async refresh():Promise<Note[]> {
    const before=new Map(this.cache);const notes=await readVault(this.vault,this.cache);this.lastReadCount=0;
    this.db.exec('BEGIN');
    try {
      for(const n of notes){
        const previous=before.get(n.path), next=this.cache.get(n.path)!;
        if(previous?.signature!==next.signature)this.lastReadCount++;
        if(!previous||previous.signature!==next.signature||previous.note.links.join('\0')!==n.links.join('\0')||previous.note.unresolved.join('\0')!==n.unresolved.join('\0'))
          this.db.prepare('INSERT OR REPLACE INTO note_index VALUES(?,?,?)').run(n.path,next.signature,JSON.stringify(n));
        if(previous?.note.revision!==n.revision){
          this.db.prepare('DELETE FROM note_fts WHERE path=?').run(n.path);
          this.db.prepare('INSERT INTO note_fts(path,title,body) VALUES(?,?,?)').run(n.path,n.title,n.body);
        }
      }
      for(const path of before.keys())if(!this.cache.has(path)){
        this.db.prepare('DELETE FROM note_index WHERE path=?').run(path);
        this.db.prepare('DELETE FROM note_fts WHERE path=?').run(path);
        this.db.prepare('DELETE FROM note_categories WHERE path=?').run(path);
      }
      this.db.exec('COMMIT');
    }catch(e){this.db.exec('ROLLBACK');this.cache=before;throw e;}
    const categories=new Map((this.db.prepare('SELECT * FROM note_categories').all() as {path:string;revision:string;category:MemoryCategory}[]).map(r=>[r.path,r]));
    for(const n of notes){const category=categories.get(n.path);if(!n.category&&category?.revision===n.revision)n.category=category.category;}
    return notes;
  }
  search(query:string,limit:number,category?:MemoryCategory,assessmentOnly=false):Note[] {
    const words=[...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu)||[])].slice(0,40);
    if(!words.length)return [];
    const expression=words.map(w=>'"'+w+'"').join(' OR ');
    const rows=this.db.prepare(`SELECT f.path FROM note_fts f JOIN note_index n ON n.path=f.path
      LEFT JOIN note_categories c ON c.path=n.path AND c.revision=json_extract(n.payload,'$.revision')
      WHERE note_fts MATCH ? ${assessmentOnly?"AND json_extract(n.payload,'$.assessmentAllowed')=1":''} ${category?"AND COALESCE(json_extract(n.payload,'$.category'),c.category)=?":''}
      ORDER BY bm25(note_fts,0,5,1),f.path LIMIT ?`).all(...(category?[expression,category,limit]:[expression,limit])) as {path:string}[];
    return rows.map(r=>this.cache.get(r.path)!.note);
  }
}
