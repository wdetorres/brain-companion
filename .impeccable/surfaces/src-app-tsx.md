---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/Graph.tsx","src/FolderBrowser.tsx","src/folders.ts","src/Markdown.tsx","src/styles.css","public/favicon.svg"]
---

# Explorer — compact black workspace

Mode: Operate, with Read behavior in note and change panes. The latest approved `.impeccable/premium-brief.md` replaces the earlier white system across Graph, Browse, Review, Recall, account and consent. Preserve folder navigation, source evidence, review/undo, authentication and the existing performance protections.

## Direction contract

THESIS: A shared Brain is a working space for notes and connections, with the selected note and its evidence immediately available.

OWN-WORLD: Matte black graph and rail, graphite readers and headers, silver text and fine borders. System sans throughout the app, compact native/standard controls and explicit labels. The landing's Atkinson headings do not become dashboard display type.

STORY: Find a note through folders, graph, search or Recently changed; read its content and sources; follow a connection; inspect current work or recall evidence. Sample and private states remain explicit.

FIRST VIEWPORT: Retain the 216px desktop rail, compact search/header, dominant graph and 328px selected-note inspector. Recently changed adds up to four notes from existing snapshot timestamps. Narrow layouts use an icon rail then labeled top navigation, stacked graph/reader and queue/detail navigation.

FORM: The Explorer carries the approved compact black world from product-stage option 1, seed b8219372, without replacing its operating structure. Graph dragging and keyboard movement retain bounded settling; pan/zoom/reset and label controls remain standard. No new home screen, live agent call or fabricated activity is introduced.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Preserved behavior

Graph / Browse / Review remain primary navigation; Recall stays beside search. Browse uses real nested folders and root notes. Recently changed derives from valid `modifiedAt` timestamps after category and Inbox/system filtering, is stable for equal times, does not mutate input or add requests, and hides at the icon-rail breakpoint. Note cache reconciliation, request cancellation, stale-response guards, authentication endpoints and server behavior remain unchanged by this visual pass.

Preserve the current upstream `fa6754b` Review order: summary, expanded Jev assessment, diff, sources, then review/undo actions. `src/ChangeReader.tsx` places `JevReview` directly after the summary; only the assessed draft is a disclosure inside the assessment. The historical evidence-first/collapsed-evaluator description below is superseded and must not be used to reorder current UI. Preserve advisory scope notices, unavailable states and permission boundaries.

Account and consent use graphite surfaces while retaining full client identity, requested permissions, the client-supplied-name warning, callback details, server-sync distinctions and copy/retry feedback. Graph motion settles within 1.8 seconds, stops when hidden, and respects reduced motion; temporary positions never alter note contents or relationships.

## Current evidence and open workflow

`DESIGN.md` and `.impeccable/design.json` record the actual system. Existing screenshots are local under `.impeccable/review/premium/`: exact desktop/laptop captures cover dashboard, Browse, Review and Recall. `dashboard-mobile-viewport.png`, `browse-mobile-viewport.png` and `review-mobile-viewport.png` are authoritative mobile viewports; full-page mobile images are supplemental. No new screenshot, browser replay, or authenticated-state verification is performed by this documentation pass.

The independent `finish-review.md` finds no material production UI deviation against the approved compact direction, while retaining **fix** for the unfinished automated comp workflow. `plates` remains open with zero plates; later phases remain pending. This is neither an automated fidelity pass nor production verification. `docs/premium-ui.md` owns functional and release evidence. Historical records below preserve their original scope and deployment context only.

## Historical release records — superseded visual guidance

The following records are retained as history. Their pale/white palette, prior typography and earlier Review-order statements do not govern the approved compact black system above.

## Explorer surface

Mode: Operate, with Read behavior in the note pane.
Scope: src/App.tsx, src/Graph.tsx, src/Markdown.tsx, src/styles.css, public/favicon.svg.
Task: find a note through its real folder hierarchy, graph or search, read its contents and evidence, and inspect agent changes. Primary navigation is Graph / Browse / Review; Recall remains beside search. Whole-note nodes and read-only behavior remain.

### Direction contract

THESIS: A field index for a shared memory, with the graph treated as working space rather than a small dashboard card.

OWN-WORLD: Black navigation, neutral off-white graph canvas, white reading surfaces, charcoal text. One system sans, compact standard controls, and neutral folder markers with explicit text labels. The user explicitly replaced the violet palette with black and white for a clean, minimalist interface. No display headlines, decorative metrics, or label-above-heading pattern.

STORY: Orient in folders, select a connected note, read its content and sources, follow a backlink, or inspect a change. The sample state stays explicit.

FIRST VIEWPORT: A 216px navigation rail, compact search header, dominant open graph, and a roughly 340px selected-note reader. A neighborhood highlight connects a graph selection to a reading itinerary in the inspector. Narrow screens use a compact navigation bar, full-width graph, and a stacked reader. Primary actions remain inside their work area.

FORM: Minimal monochrome field index, adapted by the user’s explicit palette request from candidate 3 of seven, seed 421e231b. Standard web Explorer navigation remains; the world contributes only palette, typography, density, and neighborhood emphasis. The roll was degraded, with no catalog challengers. The question tool returned no answers, and the local decision page could not bind a socket. Code-led execution is a session-specific fallback for the authorized redesign; no standing workflow preference or image approval is invented.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Review evidence: current source before edits; deployed desktop/mobile after implementation where Vercel/browser access allows. No shipping raster artwork is required for a graph built from actual note data.

### November 2, 2026 — folder browsing iteration

Preserve the existing monochrome shell. Browse replaces the flat alphabetical page list with nested physical folders and root notes; selected ancestors open for search/link navigation. Graph has one exact folder-path filter. Mobile Browse switches between the folder list and reader with explicit back navigation and focus transfer. Empty Start here, the sidebar slogan, duplicate collection legend and Jev review shortcut are removed. Review states, evidence and permissions are unchanged. Legacy `view=pages` and `view=changes` links still work, with `browse` and `review` aliases. Wilson accepted this iteration on November 2. The performance chat released it with the note-loading fixes as 8581cc9.

### November 2, 2026 — graph and review refinement

Keep the accepted design. Add direct node dragging with linked-neighbor response and bounded settling, keyboard movement, reset and reduced-motion handling. Review prioritizes unresolved work and human evidence before evaluator details, groups Obsidian edits, and uses queue/detail navigation on mobile. Account uses white sections, compact identity, clear sync status and copyable MCP address. Preserve authorization, cache invalidation and saved graph relationships. Verified locally with synthetic data. Wilson subsequently authorized deployment after performance checks and requested a compact connection-consent screen; full client identity and permission disclosures are retained. See docs/ui-iteration-2-acceptance.md.
