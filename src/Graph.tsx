import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Scan, Move, Type } from 'lucide-react';
import { graphLabels, layoutGraph } from './graph-layout.ts';
import type { Note, Connection } from './shared.ts';

export function Graph({ notes, selected, onSelect, connections = [] }: { connections?: Connection[]; notes: Note[]; selected: string | null; onSelect: (path: string) => void }) {
  const graphKey = JSON.stringify(notes.map(n => [n.path, n.links]));
  const layout = useMemo(() => layoutGraph(notes), [graphKey]);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [hover, setHover] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  useEffect(() => { setView({ x: 0, y: 0, k: 1 }); setHover(null); }, [graphKey]);
  useEffect(() => {
    const element = viewport.current!;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setSize({ width, height });
    });
    observer.observe(element);
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      zoom(Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * .004), event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => { observer.disconnect(); element.removeEventListener('wheel', wheel); };
  }, []);
  function zoom(factor: number, x = 0, y = 0) {
    setView(v => {
      const k = Math.max(.3, Math.min(6, v.k * factor)), ratio = k / v.k;
      return { k, x: x + (v.x - x) * ratio, y: y + (v.y - y) * ratio };
    });
  }
  const active = hover || selected;
  const related = new Set(active ? [active] : []);
  for (const edge of layout.edges) { if (edge.a === active) related.add(edge.b); if (edge.b === active) related.add(edge.a); }
  for (const edge of connections.filter(c => c.status === 'proposed')) { if (edge.source === active) related.add(edge.target); if (edge.target === active) related.add(edge.source); }
  const xs = layout.nodes.map(n => n.x), ys = layout.nodes.map(n => n.y);
  const minX = Math.min(0, ...xs), maxX = Math.max(0, ...xs), minY = Math.min(0, ...ys), maxY = Math.max(0, ...ys);
  const fit = Math.max(.05, Math.min((size.width - 150) / Math.max(100, maxX - minX), (size.height - 150) / Math.max(100, maxY - minY)));
  const byPath = new Map(notes.map(n => [n.path, n]));
  const points = layout.nodes.map(n => ({ ...n, title: byPath.get(n.path)!.title,
    x: (n.x - (minX + maxX) / 2) * fit * view.k + size.width / 2 + view.x,
    y: (n.y - (minY + maxY) / 2) * fit * view.k + size.height / 2 - 12 + view.y,
    radius: (3 + Math.min(4, Math.sqrt(n.degree) * .55)) * Math.min(1.5, Math.sqrt(view.k)),
  }));
  const positions = new Map(points.map(n => [n.path, n]));
  const labels = new Map((showLabels ? graphLabels(points, size.width, size.height, view.k, active, related) : []).map(l => [l.path, l]));
  return <div className="graph-stage" ref={viewport} onPointerDown={e => {
    if (e.button !== 0 || (e.target as Element).closest('button')) return;
    drag.current = { x: e.clientX, y: e.clientY, px: view.x, py: view.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }} onPointerMove={e => { if (drag.current) setView(v => ({ ...v, x: drag.current!.px + e.clientX - drag.current!.x, y: drag.current!.py + e.clientY - drag.current!.y })); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
    <svg className="graph-lines" width={size.width} height={size.height} aria-hidden="true">{layout.edges.map(e => {
      const a = positions.get(e.a)!, b = positions.get(e.b)!;
      return <line key={JSON.stringify([e.a, e.b])} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={active ? (e.a === active || e.b === active ? 'lit' : 'dim') : ''} />;
    })}{connections.filter(c => c.status === 'proposed' && positions.has(c.source) && positions.has(c.target)).map(c => {
      const a = positions.get(c.source)!, b = positions.get(c.target)!;
      return <line key={c.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="suggested-edge" strokeDasharray="3 6" />;
    })}</svg>
    {points.map(n => { const label = labels.get(n.path); return <button key={n.path} className={`graph-node ${n.path === selected ? 'selected' : ''} ${n.path === active ? 'active-node' : ''} ${active && !related.has(n.path) ? 'dim' : ''}`} style={{ left: n.x, top: n.y }} onClick={() => onSelect(n.path)} onMouseEnter={() => setHover(n.path)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(n.path)} onBlur={() => setHover(null)} aria-label={'Read ' + n.title} aria-pressed={selected === n.path}>
      <span className="node-dot" style={{ width: n.radius * 2, height: n.radius * 2 }} />
      {label && <span className="node-name" style={{ width: label.width, left: label.x - n.x + 12, top: label.y - n.y + 12 }}>{n.title}</span>}
    </button>; })}
    {!notes.length && <div className="graph-empty">No notes in this view.</div>}
    <div className="graph-hint"><Move size={12} /><span>Scroll to zoom · drag to pan · select a note</span></div>
    <div className="zoom-controls"><button aria-label="Show labels" aria-pressed={showLabels} title={showLabels ? 'Hide note labels' : 'Show note labels'} onClick={() => setShowLabels(value => !value)}><Type size={16} /></button><button aria-label="Zoom in" onClick={() => zoom(1.3)}><Plus size={16} /></button><button aria-label="Zoom out" onClick={() => zoom(1 / 1.3)}><Minus size={16} /></button><button aria-label="Reset graph" onClick={() => setView({ x: 0, y: 0, k: 1 })}><Scan size={16} /></button></div>
  </div>;
}
