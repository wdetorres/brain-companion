import type { Note } from './shared.ts';

export interface NoteFolder {
  path: string;
  name: string;
  folders: NoteFolder[];
  notes: Note[];
  count: number;
}

export function parentFolders(path: string) {
  const parts = path.split('/');
  return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'));
}

export function isInFolder(path: string, folder: string) {
  return !folder || path.startsWith(folder + '/');
}

export function buildFolders(notes: Note[]) {
  const root: NoteFolder = { path: '', name: 'All notes', folders: [], notes: [], count: 0 };
  const folders = new Map([['', root]]);
  for (const note of notes) {
    let parent = root;
    parent.count++;
    for (const path of parentFolders(note.path)) {
      let folder = folders.get(path);
      if (!folder) {
        folder = { path, name: path.slice(path.lastIndexOf('/') + 1), folders: [], notes: [], count: 0 };
        folders.set(path, folder);
        parent.folders.push(folder);
      }
      folder.count++;
      parent = folder;
    }
    parent.notes.push(note);
  }
  for (const folder of folders.values()) {
    folder.folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    folder.notes.sort((a, b) => a.title.localeCompare(b.title) || a.path.localeCompare(b.path));
  }
  return root;
}
