---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/Graph.tsx","src/FolderBrowser.tsx","src/folders.ts","src/Markdown.tsx","src/styles.css","public/favicon.svg"]
---

# Explorer surface

Mode: Operate, with Read behavior in the note pane.
Scope: src/App.tsx, src/Graph.tsx, src/Markdown.tsx, src/styles.css, public/favicon.svg.
Task: find a note through its real folder hierarchy, graph or search, read its contents and evidence, and inspect agent changes. Primary navigation is Graph / Browse / Review; Recall remains beside search. Whole-note nodes and read-only behavior remain.

## Direction contract

THESIS: A field index for a shared memory, with the graph treated as working space rather than a small dashboard card.

OWN-WORLD: Black navigation, neutral off-white graph canvas, white reading surfaces, charcoal text. One system sans, compact standard controls, and neutral folder markers with explicit text labels. The user explicitly replaced the violet palette with black and white for a clean, minimalist interface. No display headlines, decorative metrics, or label-above-heading pattern.

STORY: Orient in folders, select a connected note, read its content and sources, follow a backlink, or inspect a change. The sample state stays explicit.

FIRST VIEWPORT: A 216px navigation rail, compact search header, dominant open graph, and a roughly 340px selected-note reader. A neighborhood highlight connects a graph selection to a reading itinerary in the inspector. Narrow screens use a compact navigation bar, full-width graph, and a stacked reader. Primary actions remain inside their work area.

FORM: Minimal monochrome field index, adapted by the user’s explicit palette request from candidate 3 of seven, seed 421e231b. Standard web Explorer navigation remains; the world contributes only palette, typography, density, and neighborhood emphasis. The roll was degraded, with no catalog challengers. The question tool returned no answers, and the local decision page could not bind a socket. Code-led execution is a session-specific fallback for the authorized redesign; no standing workflow preference or image approval is invented.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Review evidence: current source before edits; deployed desktop/mobile after implementation where Vercel/browser access allows. No shipping raster artwork is required for a graph built from actual note data.

## November 2, 2026 — folder browsing iteration

Preserve the existing monochrome shell. Browse replaces the flat alphabetical page list with nested physical folders and root notes; selected ancestors open for search/link navigation. Graph has one exact folder-path filter. Mobile Browse switches between the folder list and reader with explicit back navigation and focus transfer. Empty Start here, the sidebar slogan, duplicate collection legend and Jev review shortcut are removed. Review states, evidence and permissions are unchanged. Legacy `view=pages` and `view=changes` links still work, with `browse` and `review` aliases. This iteration is local and awaits Wilson’s acceptance; graph physics, review reordering and settings surface refinement remain subsequent work.
