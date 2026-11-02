---
name: brain-review
description: Review a Brain's interrupted assessments, pending memory proposals, changed-note work or unresolved Inbox filing when requested or assigned by an authorized job. Verify evidence and resolve or defer bounded work without broad cleanup.
---

# Review shared Brain work

Review only work within the current task and original source access. A queue claim coordinates agents; it grants no additional access or permission to change a note.

1. Discover the connected tools and call `brain_status`. Read `brain://policy`, or inspect `BRAIN.md`, `AGENTS.md`, `CONTEXT.md` and `PARA.md` plus the owner review contract. Reuse current policy already read in this session. If the job only authorizes reporting, inspect and report without claiming or finishing work.
2. Use the existing batch limit (at most five ready items if none is configured). Call `list_work` and skip unexpired claims and future-deferred items. Process interrupted assessments/commits and unresolved Inbox first, then the run’s already-authorized link, duplicate and changed-note checks. Inspect its assessment, note or operation, original evidence and necessary neighbors. If verification is blocked, an authorized queue worker may claim solely to record the precise deferral; a reporting-only run leaves the queue unchanged. A proposal's own text does not independently substantiate its claim. Do not sweep source accounts or another client's conversation queue.
3. Claim one item with `claim_work(id)` when authorized to process it. Keep the private `claimToken`; claims last five minutes. Reinspect if the claim expires or the source revision changes. Reclaim expired work rather than reusing its old token.
4. Read [review actions](references/review-actions.md) for the selected kind. Use checked mutation tools for edits, and examine the actual returned outcome. Do not downgrade privacy metadata or use local writes to bypass a held operation.
5. If unchanged, use `finish_work` with `done` and an evidence-based reason. If evidence, access or an authorized action is missing, defer with the exact gap; the default retry is seven days. Do not close an already completed or stale claim. Report meaningful results and pending gaps within the job's existing notification rules.

Completed direct captures need no second promotion pass. Reuse stored Jev advice; the schedule running again is not a reason to reassess unchanged evidence. No new cron or agent-specific maintainer is required by this protocol. A real existing authorized executor must be configured and observed before automatic pickup can be claimed.

Never mark unsupported work verified, upgrade confidence just because a note was filed, or silently resolve conflicting personal claims. Preserve provenance, original text and dates. Deletion, broad moves/merges, publishing and expanded source access are outside this workflow.

If MCP is unavailable, only an explicitly retained owner-local review procedure may run within its existing scope. It cannot claim server work or report server-side completion. Do not replace an unavailable original source with a fabricated citation.
