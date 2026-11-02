---
name: brain-maintain
description: Check Brain health or perform specifically authorized link and index maintenance. Use for explicit maintenance requests and existing maintenance jobs; ordinary recall or capture does not start a maintenance sweep.
---

# Maintain the Brain within the assigned scope

Establish whether this run is a read-only health check or an authorized maintenance action before choosing tools. Keep existing source scope, budgets, schedules and notification rules.

Discover tools, call `brain_status`, and read `brain://policy`. If resources are unavailable, inspect `BRAIN.md`, `AGENTS.md`, `CONTEXT.md` and `PARA.md` plus the relevant owner maintenance contract. Reuse current policy already read in this session. Missing tools or runtime access are limitations to report, not permission to substitute another procedure.

## Health check

Use `brain_status`, bounded `search`, `inspect` and `list_work` to examine the requested scope: missing provenance/metadata, unresolved links, conflicts, deferred work and sync observations. Follow a configured local diagnostic procedure when required for fuller coverage. Report exact paths and coverage gaps; bounded listings are not a whole-Brain audit.

Do not call `assess_memory`, `undo_memory`, `remember`, `claim_work`, `finish_work`, `review_memory`, `promote`, `suggest_connections` or `review_connection` during a read-only check. Suggestions persist state even before a link is accepted. Do not refresh caches, write logs/checkpoints or acknowledge source queues. Report findings without repairing them.

## Authorized link maintenance

Read both notes and their evidence before proposing a link. Preserve chronology, scope and confidentiality; similarity alone does not establish a relationship.

Use the candidate method named in the owner's job. If external assessment is authorized, `suggest_connections(path)` creates bounded persisted proposals; inspect each returned source/target and accept or dismiss only within the run's authority through `review_connection(id, action)`. A specific link request does not authorize processing every suggestion. Read back accepted links and their targets.

`review_connection` can write a link independently of `autoAccept`. An empty automatic-acceptance list is not a read-only guarantee or permission to accept links. The service rechecks revisions; a stale suggestion requires fresh inspection rather than forced acceptance. An uncertain acceptance result can be retried with the same connection ID/action after checking the source note.

If the owner requires local suggestions, use that configured integration; do not replace it with an external evaluator. The MCP cannot accept an arbitrary local suggestion ID. Preserve the owner's existing authorized local link-writing procedure or report the unsupported route.

## Local indexes and operational work

QMD refresh, native link resolution, graph appearance and Obsidian plugins require their actual local runtimes and explicit task authority. Follow the owner's integration instructions; do not install software, enable a cloud embedding provider or create schedules as an incidental repair.

Use existing authorized log/checkpoint mechanisms after a mutating maintenance run. Protected policy and `_System` files are not writable through the note MCP. Defer factual reconciliation, promotion, deletion and broad reorganization outside the assigned scope. Never report successful device sync or a scheduler run from a saved instruction file alone.

## Exception recovery in existing authorized jobs

A job already authorized to process shared work follows `brain-review`: at most its configured batch limit (five if unspecified), ready interrupted assessments/commits and unresolved Inbox first, then its existing permitted link/duplicate/changed-note checks. Reuse stored advice, skip live leases and future deferrals, and preserve exact blockers. Completed direct captures need no routine promotion. This does not give a read-only maintenance run write/queue authority, create a new schedule, or permit archive/delete actions based on Jev advice. Record real executor/run evidence separately from documentation updates.
