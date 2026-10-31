export type Source = { title: string; uri: string; observedAt: string };
export type Note = { path: string; title: string; folder: string; markdown: string; body: string; revision: string; links: string[]; unresolved: string[]; tags: string[]; sources: Source[]; modifiedAt: string };
export type Decision = { outcome: 'new'|'update'|'duplicate'|'conflict'|'uncertain'; confidence: number; model: string; usage: Record<string,number>; probabilities?: Record<string,number> };
export type RememberInput = { path: string; markdown: string; sources: Source[]; expectedRevision: string|null; idempotencyKey: string };
export type Operation = { id: string; path: string; actor: string; at: string; status: 'applied'|'duplicate'|'needs_attention'|'failed'|'external'|'pending'; reason: string; before: string|null; proposed: string; sources: Source[]; decision?: Decision; revision?: string };
export type BrainSnapshot = { notes: Note[]; operations: Operation[]; mode: 'demo'|'live'; status: { indexedAt: string; sync: string; lastSync: string|null; search: string } };
export type Judge = (input: RememberInput, current: Note|undefined, related: Note[]) => Promise<Decision>;
