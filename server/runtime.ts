import { execFile } from 'node:child_process';
import type { BrainStore } from './store.ts';

export async function syncOnce(store: BrainStore, run?: () => Promise<void>) {
  return store.exclusive(async () => {
    store.syncStatus = 'Syncing with Obsidian';
    try {
      await (run ? run() : new Promise<void>((resolve, reject) => {
        // Do not stream CLI output: it can contain vault names and private paths.
        execFile('ob', ['sync', '--path', store.vault], { timeout: 120000, maxBuffer: 1024 * 1024 }, error => error ? reject(error) : resolve());
      }));
      store.lastSync = new Date().toISOString();
      store.syncStatus = 'Last sync succeeded';
      store.db.prepare('INSERT OR REPLACE INTO metadata VALUES(?,?)').run('lastSync', store.lastSync);
    } catch {
      store.syncStatus = 'Sync failed; server vault may be behind';
    }
  });
}
export function scheduleSync(store: BrainStore, intervalMs = 30000) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function tick() {
    if (stopped) return;
    await syncOnce(store);
    if (!stopped) timer = setTimeout(() => void tick(), intervalMs);
  }
  void tick();
  return () => { stopped = true; if (timer) clearTimeout(timer); };
}
