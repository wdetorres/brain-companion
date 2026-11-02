import React, { useEffect, useId, useMemo, useState } from 'react';
import { ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react';
import { buildFolders, parentFolders } from './folders.ts';
import type { NoteFolder } from './folders.ts';
import type { Note } from './shared.ts';

export function FolderBrowser({ notes, selected, onOpen }: { notes: Note[]; selected: string | null; onOpen: (path: string) => void }) {
  const tree = useMemo(() => buildFolders(notes), [notes]);
  const [expanded, setExpanded] = useState(() => new Set(selected ? parentFolders(selected) : []));
  const id = useId();
  // Reveal a note reached through search or a link, while keeping other branches open.
  useEffect(() => {
    if (selected) setExpanded(current => new Set([...current, ...parentFolders(selected)]));
  }, [selected]);

  function toggle(path: string) {
    setExpanded(current => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }

  function contents(folder: NoteFolder): React.ReactNode {
    return <>
      {folder.folders.map(child => {
        const open = expanded.has(child.path);
        const childrenId = id + '-' + encodeURIComponent(child.path);
        const Icon = open ? FolderOpen : Folder;
        return <li key={child.path}>
          <button className="folder-row" aria-expanded={open} aria-controls={childrenId} title={child.path} onClick={() => toggle(child.path)}>
            <ChevronRight size={13} className={open ? 'folder-chevron expanded' : 'folder-chevron'} /><Icon size={16} />
            <span>{child.name}</span><small aria-label={`${child.count} notes`}>{child.count}</small>
          </button>
          <ul id={childrenId} hidden={!open}>{contents(child)}</ul>
        </li>;
      })}
      {folder.notes.map(note => <li key={note.path}>
        <button className={'folder-note ' + (selected === note.path ? 'selected' : '')} aria-current={selected === note.path ? 'page' : undefined} title={note.path} onClick={() => onOpen(note.path)}>
          <FileText size={15} /><span>{note.title}</span>
        </button>
      </li>)}
    </>;
  }

  return <nav className="folder-browser" aria-label="Note folders">
    {notes.length ? <ul>{contents(tree)}</ul> : <p className="empty-text">No notes match these filters.</p>}
  </nav>;
}
