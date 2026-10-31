# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Wilson uses this personal second brain across agents and Obsidian. Other agents interact through MCP; the browser is a read-only companion. The first demonstration includes ChatGPT.

## Product Purpose

Explore connected knowledge and inspect what agents proposed or changed, while keeping Markdown useful in Obsidian.

## Operating Context

The user selected the Explorer concept: whole-note graph nodes, browsing, an inspector, and a change timeline. Obsidian remains the editor. A shared hosted MCP serves agents; Jev evaluates their final Markdown without backend rewriting.

## Capabilities and Constraints

Read-only Graph, Pages, and Changes; search, backlinks, sources, diffs, folder filtering, and graph pan/zoom. One shared brain with no separate personal/Casper/TM access controls. Browser login and MCP OAuth. Sample data must be explicitly labeled. Deployment targets personal Vercel plus a persistent service; live connections are not configured. No private content may be invented or portrayed as connected.

## Brand Commitments

Working name: Brain. The user asked for an Obsidian-inspired whole-note graph and clean Explorer UI, then explicitly requested an overall redesign with Impeccable. Preserve that product structure, rather than interpreting Obsidian as a pixel-copy constraint. The user subsequently specified a black-and-white accent palette, clean and minimalist, explicitly rejecting the violet direction. Use neutral grays for hierarchy and no colored decorative accents. Writing stays direct and concise.

## Evidence on Hand

Current application: src/App.tsx, src/Graph.tsx, src/Markdown.tsx, src/styles.css. Synthetic fixtures: src/demo.ts. Requirements: docs/superpowers/specs/2026-10-31-brain-companion.md. The Vercel demo is deployed; browser review captures exist locally for desktop and mobile. A local preview server cannot bind in this environment.

## Product Principles

- Every visible connection represents a resolved link between whole notes.
- Make it easy to read a note and inspect its evidence.
- Changes retain provenance and exact submitted text.
- Distinguish sample, pending, applied, and live states honestly.

## Current redesign assumptions

The optional priority and build-workflow questions returned no answers. Daily exploration is the inferred priority; no standing build-workflow preference has been recorded. Previously confirmed features and Explorer structure remain binding.
