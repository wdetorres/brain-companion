import type { Note } from './shared.ts';

export class NoteCache {
  private notes=new Map<string,Note>();
  private generation=0;
  private read:(path:string,signal:AbortSignal)=>Promise<Note>;

  constructor(read:(path:string,signal:AbortSignal)=>Promise<Note>){this.read=read;}

  get(summary:Note|undefined){
    if(!summary)return;
    const note=this.notes.get(summary.path);
    if(note?.revision===summary.revision)return {...summary,body:note.body,markdown:note.markdown};
  }

  reconcile(notes:Note[]){
    this.generation++;
    const revisions=new Map(notes.map(n=>[n.path,n.revision]));
    for(const [path,note] of this.notes)if(revisions.get(path)!==note.revision)this.notes.delete(path);
  }

  clear(){this.generation++;this.notes.clear();}

  async load(path:string,summary:Note|undefined,signal:AbortSignal){
    signal.throwIfAborted();
    const cached=this.get(summary);if(cached)return cached;
    const generation=this.generation;
    try {
      const note=await this.read(path,signal);
      signal.throwIfAborted();
      if(generation===this.generation)this.notes.set(path,note);
      return note;
    }catch(error){if(!signal.aborted&&generation===this.generation)this.clear();throw error;}
  }
}
