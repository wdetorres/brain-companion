# Agent-agnostic Brain harness

Rollout amendment: Wilson deferred workflow adoption until managed deployment. Keep current jobs, instructions and agent writing behavior; ship the implementation and portable skill with automatic acceptance disabled.


## Intent and approved scope

Wilson approved implementing a shared memory harness on October 31, 2026. Any owner-authorized MCP client can retrieve, submit sourced Markdown, review proposals and promote verified Inbox notes. Verified actions should apply automatically after verification; conflicting or unsupported proposals stay pending. Deletion, bulk reorganization, publishing and broader source access remain owner decisions. Wilson will host the Docker server on Railway, Render or another managed platform; provisioning a host is not part of this change. Migrate accessible existing Brain instructions and scheduled workflows after verification, preserving schedules, source boundaries and the read-only health check.

The goal is bounded work per agent interaction, persistent handoff across different clients, and portable instructions. Markdown remains canonical. There is no hosted agent loop, backend prose generation, new model, new vector service or extra scheduled agent. Jev's existing evaluated questions and thresholds remain unchanged. Live validation stays within the remaining 166 requests in the existing cumulative 2,000-request ledger.

## Approach

Extend the existing Node 24 / SQLite / MCP / React service. This was the recommended approach accepted in the conversation. An external queue/search service would add deployment and consistency work without addressing a present requirement. Relying only on recurring whole-vault agent scans would retain repeated context costs and fragile ownership handoffs.

Use SQLite FTS5 and persisted parsed-note records, updating only files whose filesystem signatures changed. A metadata reconciliation still walks the vault to catch external/synced changes; bodies and parsing are reused. API writes and sync invalidate the index immediately. Existing graph/link resolution semantics must survive the change. MCP search/list responses are bounded and do not dump the whole vault. Search remains lexical, not semantic.

## Agent contract

Retain backward-compatible `recall`, `inspect`, `remember`. Add `brain_status`, bounded `search`, `list_work`, `claim_work`, `finish_work`, `review_memory`, `promote`, `suggest_connections`, and `review_connection`. Publish the same workflow through `brain://guide`, the existing prompt, and an installable `skills/brain-harness/SKILL.md`. Policy and current capabilities are discoverable; clients never assume a proposed write was applied. All clients remain owner-authorized for one shared Brain; this is not a public multi-tenant product. OAuth consent must accurately describe enabled writes and promotion.

Jev evaluates bounded candidates and supplied sources. It does not grant permission or fetch original sources. Agents verify source access and provenance before submission. Candidate privacy metadata is checked before external assessment as well as the current/related notes. Existing policy files, hidden paths, symlinks and underscore-prefixed directories remain protected from MCP writes. Ordinary inspection/search of private notes stays local to the authenticated service; classification and recall preserve assessment exclusions.

## Work queue and review

Persist work for unresolved Inbox notes, material changes to previously observed eligible notes, and actionable memory proposals. Initial indexing does not create a whole-vault review backlog; existing Inbox items are eligible. Temporary chatter and duplicates do not enter the actionable proposal queue. Jobs are deduplicated by subject, revision and kind. List at most 20 summaries per page. Claims last five minutes, use unpredictable claim tokens, and are tied to the authenticated client. Expired claims can be reclaimed; stale claim tokens cannot finish a job. Deferral records a reason and a future retry time. New revisions supersede old work. A reviewed unchanged note is not enqueued again. Queued proposal actions require a current claim token and full authenticated client identity; explicit browser-owner review may override and close a claim.

Finishing a review records an assessment; it cannot itself write a note or pretend an operation was applied. Agents use the normal checked actions for mutations. Review of a held memory either dismisses it with a reason or retries the exact proposal against its original expected revision and fresh evaluation. Stale proposals require correction through `remember`; review cannot overwrite a newer note. The owner has a matching review surface in the existing Changes view, including exact content/diff and outcomes.

## Promotion

Promotion is a narrowly authorized move from an Inbox directory to an existing Projects, Areas or Resources directory. The agent supplies the source revision, exact destination Markdown, verified source excerpts and a unique idempotency key. The destination must not exist. Preserve the original note in operation history. Require Jev support/value checks and preservation of existing factual context; an unchanged body may legitimately classify as a duplicate, so duplicate alone is not permission or a reason to forbid filing. Promotion requires an enabled `promote` action in `AUTO_ACCEPT`.

Validate links against the proposed resulting catalog. Refuse a promotion that would break or retarget existing resolved links, including relative outgoing links; return the affected paths for resolution. This first version does not rewrite unrelated notes or protected hubs as a side effect. Agents can supply corrected outgoing paths. The source's parent/navigation updates remain separate checked writes in authorized scope.

Journal the source and destination before moving. Write and fsync destination first, recheck source revision, then remove source and fsync its directory. After interruption, recover only when file contents prove the authorized operation's state. Conflicting source/destination changes remain visible for review, with originals preserved in history. Never replace an existing destination or remove a changed source observed at the revision check. The server vault has exactly one writer; sync runs under the same exclusive queue. Independent direct filesystem writers to that server copy are unsupported. A retry with the same idempotency key must not make another note or repeat a move.

## UI and hosting

Keep the existing monochrome design and centered Recall view. Add actionable memory review and a compact work list to Changes; no new dashboard or general editor. Synthetic demo data must remain clearly separated from the private backend.

Support a single Docker service exposing its own authenticated HTTPS origin behind the managed platform's proxy, with one persistent `/data` volume for vault, state and optional Obsidian credentials. The Vercel bridge remains optional and requires its shared secret when enabled. Preserve existing local Compose volumes and local Obsidian login. Do not provision paid hosting or invent a deployed endpoint. Document owner setup, OAuth connection, skill installation, durable storage and migration checks.

## Workflow migration and verification

After software verification, update canonical Brain policy/routing, Capture/Review/Retrieve/Maintain contracts, agent setup notes, portable skill copies and accessible installed guidance. Any authorized agent may verify and resolve shared Brain work; original source ownership/provenance and source access remain intact. Existing source-specific capture queues keep their consumers. Preserve the weekday/weekly schedules and strictly read-only health checks. Use supported scheduler tools for accessible prompts; report exact unavailable remote targets and do not claim Markdown edits reconfigured a running remote agent. Until the owner deploys a reachable MCP endpoint, retain an explicit filesystem fallback for already-authorized local workflows.

Tests cover index restart/edit/delete behavior, bounded retrieval and privacy, concurrent claims/expiry/revision changes, reviewed-memory stale revisions and retries, promotion success/collisions/link safety/interruption, real MCP discovery and cross-client actions, browser auth/CSRF, and direct-host versus bridged configuration. Run type checking, all tests and build, then isolated Docker/MCP smoke tests. No real Brain notes are promoted as test fixtures. Update the local service only after checks; enable new/update/promote there after a backup. Record actual validation and migration limits.
