# Brain Companion Implementation Plan

> For agentic workers: use superpowers:executing-plans. User approved the design, selected Explorer and the Vercel plus persistent service split, and instructed “ok build this.” Continue implementation without another approval round.

**Goal:** Ship an Explorer web app with agent memory tools, immutable change history, and a deployable persistent Markdown service.

**Architecture:** The Vercel app serves the UI and forwards authenticated requests to one persistent Node service. The service owns the vault, SQLite operation history, OAuth state, Jev judgments, and sync lifecycle. Demo mode uses synthetic notes and is explicitly labeled; live mode fails closed without credentials.

**Tech stack:** TypeScript, React, esbuild, Node 24+, SQLite, official MCP SDK, Jev HTTP API, Obsidian Headless Sync.

**Spec:** ../specs/2026-10-31-brain-companion.md

## Global constraints

- Explorer layout; read-only Graph, Pages, Changes.
- One shared brain; no backend generative rewriting.
- Markdown canonical; no real vault ingestion until credentials and sync are configured.
- Writes require sources, revision checks and idempotency; policies and operational files are not writable.
- OAuth for MCP; authenticated session for private web data; secrets server-side.
- Deploy frontend under personal Vercel account. Durable service requires a persistent volume.

## Review focus

1. Traversal, symlinks, hidden files and policy paths must never escape the permitted vault.
2. Concurrent/replayed writes must preserve source bytes and history across restarts.
3. Malformed Jev results and stale evidence must not silently apply a change.
4. OAuth code reuse, resource mismatch and CSRF must fail closed.
5. Hostile Markdown must render as inert content, and unresolved links must remain distinct.

## Task 1: Vault and operation store

Files: server/vault.ts, server/store.ts, server/jev.ts, src/shared.ts, tests/vault.test.ts, tests/jev.test.ts.

Interfaces: BrainStore.snapshot() returns BrainSnapshot; remember(RememberInput, actor) returns Operation; inspect(path) returns Note; recall(query) returns Note[].

- [ ] Write failing behavioral tests for links, traversal/symlinks, source requirements, revision conflicts, duplicate retries, Jev failures and restart recovery. Run `npm test`; observe expected missing behavior.
- [ ] Implement Markdown indexing, durable SQLite history, atomic journaled writes and strict Jev schema validation. Preserve submitted Markdown exactly.
- [ ] Run `npm test`; expect all storage tests passing. Commit.

## Task 2: Authenticated API and MCP

Files: server/auth.ts, server/http.ts, server/main.ts, server/mcp.ts, api/bridge.ts, tests/auth.test.ts, tests/http.test.ts.

Interfaces: createHandler(store, config) handles Fetch Request → Response; MCP exposes recall, inspect, remember through the SDK. Same-origin browser session and OAuth tokens protect distinct interfaces.

- [ ] Write failing auth/HTTP tests for code reuse, PKCE, redirect/resource binding, login CSRF, private endpoints and MCP discovery.
- [ ] Implement owner sign-in, OAuth authorization with explicit consent, hashed persistent tokens, discovery, SDK tools and fixed-origin Vercel forwarding.
- [ ] Run `npm test`; expect authenticated round trip and rejection cases passing. Commit.

## Task 3: Explorer

Files: src/App.tsx, src/Graph.tsx, src/NoteView.tsx, src/styles.css, src/demo.ts, src/markdown.tsx, tests/presentation.test.ts, scripts/build.mjs, public/index.html.

Interfaces: App consumes BrainSnapshot; Graph selects notes by path; NoteView renders sanitized tokens. Page navigation preserves selected graph state.

- [ ] Write tests for graph filtering, missing links, safe URL handling and readable diffs.
- [ ] Implement responsive Explorer with search, graph pan/zoom, keyboard page list, page sources/backlinks and change diffs. Include login, loading/error states and explicit demo status.
- [ ] Run `npm test`, `npm run check`, `npm run build`; inspect UI where browser preview is available. Commit.

## Task 4: Deployment and handoff

Files: Dockerfile, compose.yaml, vercel.json, README.md, .env.example, scripts/seed.ts, docs/agent-guide.md.

- [ ] Package one persistent service with health check, volume mounts and optional Headless Sync; keep demo and live mode separate.
- [ ] Document owner secret setup, Jev evaluation enablement, OAuth connection, backup/restore and deployment configuration.
- [ ] Run full tests, type check and production build. Get a fresh independent code review and address important findings.
- [ ] Deploy to personal Vercel when its project-scope authorization is available; otherwise provide the finished build and exact unblock steps. Save source archive durably.
