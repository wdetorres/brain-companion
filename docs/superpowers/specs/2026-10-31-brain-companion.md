The v1 is a hosted companion for Wilson’s existing Obsidian Brain. Agents share memory through an authenticated MCP service, while Obsidian remains the editor and Markdown remains canonical. The web interface is for browsing the graph, reading pages, and inspecting changes. This is a proposed implementation design based on the decisions made on 31 October 2026.

# Agreed scope

Wilson selected the hybrid approach after considering both staying entirely in Obsidian and building a standalone brain app. ChatGPT must participate in the first demo. The service will follow MCP standards and use OAuth for that connection. All connections access one shared brain; personal, Casper, and TM labels remain organizational metadata rather than separate permissions.

Agents write the final Markdown using a companion skill. There is no separate generative LLM extraction or rewriting step in the service. Jev evaluates proposed writes through its hosted API. A graph node represents an Obsidian page, rather than an isolated fact.

The web UI has no note editing, approvals, rejection actions, deletion, or rollback controls in v1. Browsing and inspecting changes are the complete web scope. Resolving an issue happens through an agent or Obsidian.

# Approaches considered

| Approach | Advantage | Tradeoff | Decision |
| --- | --- | --- | --- |
| Existing Obsidian only | Keep the current experience with little new maintenance | Does not supply the desired hosted MCP interface by itself | Considered |
| Hosted companion for an Obsidian vault | Shared agent memory with the existing editor, files, and graph conventions | Requires a server, OAuth, indexing, and synchronization | Selected by Wilson |
| Standalone brain app | Full control of the product and storage | Requires rebuilding note management and owning the complete product | Deferred |

# Existing foundation

The existing vault is at `/Users/wilson/Documents/brain`. Its current setup documents Markdown as canonical memory, PARA folders, source and confidence metadata, agent capture instructions, QMD retrieval, a local stdio MCP interface, and a graph derived from Obsidian links. Search indexes are device-local and must be built on the server. The documentation describes a shared Obsidian Sync vault, but current account entitlement, remote vault selection, and sync health still need runtime verification.

The current graph snapshot depends on Obsidian CLI for refresh. A headless server must not assume that syncing the snapshot produces a continuously current graph. The implementation will index Markdown links itself, with compatibility tests for existing link conventions. Existing snapshots can help compare results but are not a second authority.

# Proposed web experience

Wilson selected Explorer: an Obsidian-style sidebar with Graph, Pages, and Changes, plus a page inspector beside the graph. Canvas remains a comparison mockup, not the v1 layout.

| Area | Behavior |
| --- | --- |
| Navigation | Compact sidebar with Graph, Pages, and Changes; search is always easy to reach |
| Graph | Main landing view, using a dark neutral background and the existing folder colors |
| Page selection | Clicking a node opens a readable page panel without losing the graph’s position |
| Page panel | Markdown content, path, source references, backlinks, and recent changes |
| Local graph | Focus on the selected page and its immediate neighbors; return to the wider graph |
| Pages | Folder navigation and search results provide an accessible alternative to the graph |
| Changes | Chronological feed with page, time, actor when known, outcome, and a before/after diff |
| Status | Compact sync and indexing status, including the last successful refresh and a clear stale state |

Keep the existing graph palette: Brain gold, Projects blue, Areas green, Resources purple, Archives blue-gray. Folder grouping controls color, not access. Links come from actual internal references; similarity matches do not automatically become edges. Headings and block references still connect their containing pages. An unresolved link is visibly distinct and cannot open an invented page.

Graph controls cover pan, zoom, reset, hover highlighting, and focusing on neighbors. The default view follows the existing curated visibility rules, while users can reveal Inbox and system notes. Begin with a bounded visible graph; show that a filter or limit is active. A selected page’s neighborhood and search remain usable when the full graph is large.

The page viewer sanitizes rendered Markdown. In v1, external source links remain links, executable HTML is disabled, and attachments are listed as references rather than promising a full media viewer. Keyboard navigation and the Pages view must support the same core reading tasks.

Changes distinguish applied, duplicate, needs attention, failed, and externally observed changes. Jev’s typed outcome, relevant page references, and any uncertainty are inspectable details. No fabricated explanation or proof is generated. A confidence score is a model judgment, not the note’s factual confidence.

# Service and storage

Wilson selected his personal Vercel account for deployment. The connected personal account is wdetorres on Hobby. The proposed deployment split is a Vercel-hosted Explorer web UI and authenticated HTTP entry points, with a separate small Linux service providing the durable vault, Obsidian Headless Sync, indexing, and serialized note writes. Markdown in that service’s synced directory remains the canonical working copy. Wilson approved the split and requested implementation.

A separate server-local store holds operation records, proposals, snapshots, and derived indexes. These operational records are backed up separately from the vault. Losing a derived search or graph index must not lose notes. The history store supports inspection and future recovery, but the v1 browser exposes no restore action.

Use the existing QMD retrieval approach if its server runtime checks pass. Keyword search remains available while embeddings refresh or if semantic search is unavailable. Search results return paths, snippets, current revisions, source metadata, and freshness information. They never imply that a stale index is current.

Obsidian Headless Sync supports continuous operation and needs its local vault and sync state to survive restarts. Vercel Daemons can run continuous processes, but the current public beta has ephemeral storage and does not support persistent storage. An all-Vercel design would therefore require an additional durable-storage and recovery mechanism; do not assume the function or daemon filesystem is the vault. The recommended weekend scope is Vercel for the app with one persistent worker host, approved by Wilson. No infrastructure has been provisioned. See [Vercel Daemons](https://vercel.com/docs/daemons) and [Obsidian Headless Sync](https://obsidian.md/help/sync/headless).

# MCP contract

The names below are provisional, but the behaviors are required.

| Tool | Input and result |
| --- | --- |
| `recall` | Query and optional folder or tag filters; returns bounded relevant page references, snippets, revisions, and freshness |
| `inspect` | Page path or operation ID; returns current Markdown and links, or a proposed/applied change with its source and outcome |
| `remember` | Agent-authored Markdown, target page, source references, expected revision for updates, and an idempotency key; returns applied, duplicate, needs attention, or failed |

The companion skill teaches agents to recall before writing, inspect the latest page before changing it, preserve source metadata and original evidence, write meaningful wikilinks, and handle conflict or retry results. It is packaged for the selected clients; a remote MCP URL alone does not install a skill or ensure the client follows it.

For the first demo, connect ChatGPT and a development MCP client that can exercise the same tools. The second branded agent can be chosen during implementation without changing the storage contract.

The `remember` operation can create or update content notes within the existing filing structure. Renaming, deleting, bulk rewriting, scheduler changes, and modifications to operational policy files are outside this tool’s v1 contract. Shared access does not imply permission to rewrite the service’s own instructions.

# Write evaluation

1. Authenticate the caller and validate the request, target path, source envelope, size limits, and idempotency key.

2. Read the current target revision and retrieve a small set of related pages from the same shared brain.

3. Ask Jev focused questions about novelty, duplication, a supported update, or conflicting evidence. Supply only the candidate and relevant context.

4. Apply deterministic rules to the typed result. A clear duplicate returns the existing page without modifying it. A valid new or supported update may apply the exact submitted Markdown. Ambiguous or conflicting changes remain proposals with a needs-attention result.

5. Preserve the original page and proposed content in the operation record. Recheck the target revision, serialize service writes, and replace the local file atomically.

6. Record the outcome, refresh the relevant indexes, and let Headless Sync propagate the change.

Jev never writes prose, edits a page, upgrades a source’s confidence, or authorizes access. Model version, question configuration, outcome, and usage are recorded for later evaluation. Decision thresholds must be tested on labeled examples before automated acceptance is enabled against the real vault.

The initial acceptance policy is conservative: enable automatic acceptance only for outcome classes that pass the agreed evaluation cases. Unresolved classes return needs attention. Jev errors also return needs attention with the original proposal retained; they do not silently bypass evaluation or claim a write succeeded. Agents can inspect and resubmit clarified proposals. Users can also make direct corrections in Obsidian, which are subsequently observed by the service.

An idempotent retry must not create a second operation or duplicate note. External observations from Obsidian Sync are recorded separately and are not retroactively attributed to an agent. Do not send every sync event back through `remember`, which would create evaluation loops.

# Concurrent edits and synchronization

Obsidian Sync is eventually consistent. Local revision checks protect against known stale writes, but cannot promise a transaction across every offline device. The implementation must preserve snapshots and configure conflict copies rather than silently treating a text merge as an evidence resolution.

The MCP response distinguishes a write applied to the server working copy from one observed on another device. The browser must not claim every device is up to date merely because the local file write succeeded. Sync health and index freshness are separate statuses.

The demo validates an agent update, an Obsidian edit, a repeated request, and a simulated competing edit. A conflicting proposal must be inspectable, with the prior content preserved. The sync client and file writer need integration testing; a process-local lock alone cannot control changes made by the sync process.

# Authentication and operation

Use MCP-compatible OAuth for ChatGPT and a normal authenticated session for the web viewer. One user owns the shared brain. All authorized agent connections have the same content access; connection identity is recorded where the authentication mechanism can establish it. API tokens for additional background bots are optional later work.

The service validates tokens for the intended resource. The Jev credential and sync credentials remain on the server. Authenticated access applies to Markdown content, diffs, search, and graph data as well as the MCP tools. Unauthenticated visitors cannot inspect the brain.

Before production connection, verify the active Sync subscription, selected remote vault, server persistence and backup restore, OAuth compatibility with ChatGPT, and the Jev API credential. Initial end-to-end tests use a small fixture vault. Migration of real notes is not required to prove the demo.

# Demo and success criteria

The first demonstration follows one decision across clients and views:

1. ChatGPT connects through OAuth and records a sourced project decision.

2. The web graph shows the affected page and its actual links.

3. The Changes view displays the submitted content and the resulting diff.

4. A fresh agent session recalls the decision through MCP.

5. A later revision preserves the old content in history.

6. A duplicate request does not create another page, and a conflicting change is surfaced without silently replacing the current note.

7. The server continues to serve agents with the user’s laptop asleep.

8. Obsidian receives the change when its client syncs, and a human edit travels back to the hosted view.

Use synthetic pages for the shareable demo. Evaluate Jev on a small labeled set of new facts, duplicates, legitimate updates, and conflicts. Report actual errors, latency, and cost rather than claiming Jev is necessary or superior in advance.

# Scope boundaries

V1 includes shared agent read/write access, OAuth, the graph, page viewing, change inspection, Jev evaluation, and the Obsidian sync path. It excludes web editing, chat, automatic source ingestion, a generative rewriting service, autonomous cleanup, separate organizational permissions, a graph database, and a general multi-user product.

The intended result is a working demonstration of shared memory with visible evidence and changes. It is not a replacement for every Obsidian feature.

# References

- [Obsidian Headless](https://obsidian.md/help/headless) and [Headless Sync](https://obsidian.md/help/sync/headless)

- [Obsidian data storage](https://obsidian.md/help/data-storage) and [sync conflict behavior](https://obsidian.md/help/sync/troubleshoot)

- [MCP authorization specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)

- [ChatGPT custom MCP connections](https://developers.openai.com/api/docs/guides/custom-mcp-server)

- [Jev typed decisions](https://docs.typesafe.ai/introduction)

- Existing vault instructions read during this discussion: `BRAIN.md`, `AGENTS.md`, `CONTEXT.md`, and `_System/Search/README.md` in `/Users/wilson/Documents/brain`.

