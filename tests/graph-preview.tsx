import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Graph } from '../src/Graph.tsx';
import type { Note } from '../src/shared.ts';
import '../src/styles.css';

// Synthetic dense fixture; never copy private vault data into a hosted preview.
const groups = ['Architecture', 'Research', 'Delivery', 'Writing', 'Learning', 'Systems', 'Design', 'Planning', 'Operations', 'Reading', 'Experiments', 'Collaboration', 'Development', 'Travel', 'Ideas', 'Health', 'Home', 'Finance', 'Career', 'Journal'];
const subjects = ['Overview', 'Working notes', 'Decisions and tradeoffs', 'Next steps', 'Open questions', 'Useful references', 'Lessons learned', 'Weekly review', 'Long-term direction', 'Ideas to revisit'];
const path = (i: number) => `Sample/${String(i).padStart(3, '0')}.md`;
const notes: Note[] = Array.from({ length: 200 }, (_, i) => {
  const group = Math.floor(i / 10), base = group * 10;
  return { path: path(i), title: i % 10 ? `${groups[group]}: ${subjects[i % 10]}` : groups[group], folder: 'projects',
    links: i % 10 ? [path(base), path(base + (i + 1) % 10), path(base + (i + 2) % 10)] : [path((base + 10) % 200), path((base + 50) % 200), ...Array.from({ length: 9 }, (_, j) => path(base + j + 1))],
    markdown: '', body: '', revision: '', sources: [], unresolved: [], tags: [], modifiedAt: '2026-10-31T00:00:00Z' };
});
function Preview() {
  const [selected, setSelected] = useState<string | null>(null);
  return <main className="graph-panel" style={{ height: '100dvh' }}>
    <div className="graph-toolbar"><div className="graph-counts"><span>Graph review</span><span>200 synthetic notes</span></div><button className="text-button" onClick={() => setSelected(null)}>Clear selection</button></div>
    <Graph notes={notes} selected={selected} onSelect={setSelected} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
