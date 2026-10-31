# Validation and release status

Updated October 31, 2026 for the Brain harness. This replaces earlier environment/deployment limitations.

## Verified

- 66 behavioral tests, TypeScript, production asset build and Node 24 Docker build. The suite covers a real MCP protocol exchange across two clients: capture, discover/claim work, promote and consume.
- Privacy exclusions before Jev, invalid privacy YAML, revision conflicts, create-only reviews, expired/reassigned claims, revision reversion, idempotency, interrupted write/promotion recovery, occupied destinations and preserved link targets.
- OAuth PKCE/resource/redirect binding, refresh/replay protection, owner CSRF and bridge routing, including the new work and memory-review URLs. Local Docker and a separate standalone Docker runtime completed a real owner OAuth exchange, tool/resource discovery and authenticated status; temporary grants were revoked.
- Isolated live Jev smoke passed held-proposal review, cross-client Inbox promotion, recall and idempotent retry. Seven new requests; cumulative ledger **1,841 / 2,000**. No real Brain notes were promoted as tests. The existing v21 classifier and thresholds are unchanged; the earlier untouched Brain-derived gate is documented in [jev-features.md](jev-features.md), not rerun or claimed as a new holdout.
- Local Docker recreation preserved every baseline note revision, existing operation IDs and the same owner session. Scheduled Obsidian sync succeeded with existing credentials. The approved actions passed smoke verification, then `AUTO_ACCEPT` was restored to empty at the owner’s request to postpone adoption until deployment.
- Changes UI: shared work selection, reason-required review controls and demo dismissal; desktop and narrow-screen inspection, no horizontal overflow or console warnings/errors in those interactions. Synthetic rejected chatter stays out of the work queue.
- Workflow migration was exercised, then fully reverted at the owner’s request. Readback confirms original Brain/installed instruction contents and original prompts/settings for all three Codex jobs; only scheduler update timestamps differ. Existing agent writing and schedules remain in effect. The portable skill is shipped in the repository for later installation.
- Fresh-context design/code review. Material findings were reproduced and fixed with regressions: invalid privacy metadata, stale jobs on revision restoration, privacy-change claim invalidation and missing recovered-proposal work. Explicit Markdown filename resolution remains compatible. A separate regression prevents Inbox text from substantiating its own promotion without source support.

## Limits

- Managed-host HTTPS/proxy behavior and actual third-party connector enrollment await the owner-provisioned host. Local OAuth is verified; this is not a completed ChatGPT/Grok remote connection.
- Workflow adoption is deliberately deferred until the owner deploys the service. Remote Grok/Claude/Dots schedulers were not changed. Current local jobs and instructions remain as before.
- One owner, one replica, one server-vault writer. Independent direct filesystem writers are unsupported. Refresh still walks metadata/links across the vault; persistent parsing and FTS avoid rereading every body or asking Jev about the whole brain.
- Retrieval is lexical. Jev scores a bounded shortlist and can reject useful notes; source pointers do not prove truth. Agents still verify sources and interpret conflicts.
- Volume archives were made while the service was stopped and their contents were readable. Full restoration to a separate running service, physical power-loss testing, offline-device conflict convergence and a comprehensive accessibility audit were not performed.
