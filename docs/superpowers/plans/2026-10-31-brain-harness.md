# Brain Harness Implementation Plan

> **For agentic workers:** Execute task-by-task using superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** A portable, agent-agnostic MCP memory harness with bounded retrieval, durable shared work and verified writes/promotion.

**Architecture:** Extend the existing single-owner service. SQLite indexes Markdown and records work; existing Jev assessments gate mutations. MCP clients supply reasoning and source verification.

**Tech Stack:** Node 24, TypeScript, SQLite FTS5, installed MCP SDK, React, Docker; no new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-31-brain-harness.md`

## Global constraints

- Markdown remains canonical; preserve provenance, privacy exclusions, revisions and idempotency.
- Keep existing Jev questions/thresholds; at most 166 additional live requests within the cumulative ledger.
- Owner will provision the managed host; no new paid platform or agent loop.
- No deletion/bulk-reorganization tools or side-effect rewrites of unrelated notes.
- Migrate existing instructions after verification, preserving schedules and read-only health checks.

## Review focus

- A sync changes a file outside MCP: invalidate indexed results and stale work before accepting a write.
- A second client reclaims expired work: the original token must not finish or dismiss it.
- An interrupted promotion has two files: preserve edits and recover only proven states.
- A sensitive new proposal must never be sent to Jev even if no existing note supplies metadata.
- Remote workers are not configured yet: documentation must preserve functioning local fallbacks and report pending remote propagation.

### Task 1: Persistent incremental retrieval

Files: `server/vault.ts`, new `server/note-index.ts`, `server/store.ts`, `src/links.ts`, new `tests/note-index.test.ts`.

Interface: `NoteIndex(db, vault)` supplies `refresh(): Promise<Note[]>`, `search(query, limit, category?): Note[]`; parsed records and FTS update only for changed files. Preserve `readVault` behavior for existing tests. Store uses FTS candidates before existing bounded ranking/evaluation.

- [x] Add tests for unchanged refresh, restart, edit, deletion, newly resolved/ambiguous links and escaped FTS input; watch failures.
- [x] Implement cached parsing, FTS lookup and store integration; run targeted tests.

### Task 2: Shared work and reviewed memory

Files: new `server/work.ts`, `src/shared.ts`, `server/store.ts`, new `tests/harness-work.test.ts`.

Interfaces: store `listWork`, `claimWork`, `finishWork`, `reviewMemory`; persisted jobs have revision, kind, status, owner/token/expiry and reason. Queue mutations run under the store's existing exclusive writer. Claims last 300 seconds; list limits are 1–20. Existing methods remain compatible.

- [x] Add tests for deduplication, competing clients, expired claims, deferral, new revisions and reviewed-memory stale writes; watch failures.
- [x] Implement persisted work, proposal closure and checked review; reject sensitive proposed content before Jev.
- [x] Run the work, vault and memory feature tests.

### Task 3: Checked Inbox promotion

Files: `server/store.ts`, new `server/promotion.ts` if needed, `src/shared.ts`, new `tests/promotion.test.ts`.

Interface: `promote({sourcePath,path,markdown,sources,expectedRevision,idempotencyKey}, actor)` returns an auditable Operation. Source must be Inbox; target parent exists in Projects/Areas/Resources. Journal and validate both revisions. Return actionable hold reasons for link changes/collisions.

- [x] Add tests for successful filing, disabled policy, private content, unsupported evidence, occupied target, broken incoming/outgoing links, retry and interrupted recovery; watch failures.
- [x] Implement promotion and recovery using existing operation history and exclusive writes.
- [x] Run promotion and existing write-recovery tests.

### Task 4: MCP, owner review and portable distribution

Files: `server/mcp.ts`, `server/http.ts`, `server/auth.ts`, `src/App.tsx`, shared/UI styles, `api/bridge.ts`, `docs/agent-guide.md`, `skills/brain-harness/SKILL.md`, HTTP/auth/render tests.

Interfaces: retain old tools; add status/search/work/review/promotion/connection tools with bounded schemas and correct annotations. Owner review shares the store logic, requires CSRF and shows operation contents before accepting. Skill discovers names and current server guide without assuming a client vendor.

- [x] Exercise real MCP tools/list and calls across two authenticated actors, plus resource/prompt discovery.
- [x] Implement routes, review actions and minimal Changes UI matching DESIGN.md.
- [x] Verify auth/CSRF, bounded outputs and safe error behavior; update synthetic demo and user guide.

### Task 5: Hosting, workflow migration and delivery

Files: `server/config.ts`, `server/main.ts`, Docker/Compose/env examples, README/deployment docs, relevant Brain canonical and installed instructions, accessible existing automation prompts.

- [x] Test direct HTTPS hosting with optional bridge secret and preserve bridged/local behavior.
- [x] Run full tests, typecheck and build; run isolated Docker/MCP smoke and inspect UI.
- [x] Back up local state and update Docker; enable new/update/promote only after verification.
- [ ] Deferred by owner: migrate instructions/jobs only after managed deployment. Original files and all three Codex prompts/settings were restored and read back.
- [x] Fresh-context whole-change review, resolve material findings with regression tests, document results and commit.

## Execution record

2026-10-31: user approved automatic verified actions and post-verification workflow migration; user will provision managed Docker hosting. Implementation uses the existing checkout on `codex/brain-harness` with a clean starting main at `1fff158`.


Implementation verification: 66 tests, TypeScript/build and Docker pass; two-client MCP workflow, real local/isolated-container OAuth, UI review/queue interactions and a seven-request live Jev smoke pass. Cumulative Jev usage 1,841/2,000. Review findings fixed with regressions before live enablement. Full backup restore, physical power-loss and actual remote client enrollment were not performed.

Rollout: stopped-service volume backups; local Docker recreated; new/update/promote passed smoke and automatic acceptance was then disabled again at the owner’s request; baseline notes/history/session preserved and scheduled sync verified. Migration was exercised and then reverted at the owner’s request to keep existing jobs/writing until deployment tomorrow. Original policies, installed instructions and all three scheduler prompts/settings were restored exactly except update timestamps. Portable skill remains in the repository; host/connector adoption is deferred. No new schedule or source scope. Hosted UI/source-control delivery recorded in deployment-status.md.
