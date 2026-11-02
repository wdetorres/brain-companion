# Brain Skills Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship four portable skills and adopt supported local workflows without disrupting current collection or enabling production writes.

**Architecture:** Independent recall, capture, review and maintenance skills share the existing MCP contract. Owner-specific routing retains explicitly authorized local writers until MCP write parity is verified. A minimal Claude-compatible manifest bundles the four skills without discovering the legacy harness.

**Tech Stack:** Markdown Agent Skills, JSON plugin manifest, existing Node MCP and SQLite test fixtures. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-02-brain-skills-migration-design.md`

## Global Constraints

- Do not bake Wilson's name, endpoint, absolute paths, agent names or schedules into the reusable skills.
- Do not create a broad router skill or one skill per MCP tool.
- Keep existing authorized workflows operating until their replacement covers the same source/privacy/output requirements.
- Preserve the existing user edit in the original checkout's `skills/brain-harness/SKILL.md`.
- Do not enable production automatic acceptance, alter privacy exclusions, publish, change hooks or create jobs.

## Review Focus

- Tool-only clients must discover policy without requiring resources or prompts.
- Missing/private evidence and held captures must not become saved notes or source acknowledgements.
- Read-only health checks must not claim work or persist link suggestions; empty autoAccept is not global read-only.
- Expired claims and uncertain network outcomes must preserve revision and retry semantics.
- Existing local capture routes must remain usable without becoming a fallback after a denied MCP write.

## Task 1: Portable skills and package

**Files:** create `skills/brain-{recall,capture,review,maintain}/SKILL.md`, capture/review references as needed, and `skills/.claude-plugin/plugin.json`; update `docs/agent-guide.md`, `docs/harness.md`, `README.md`, `server/mcp.ts` instructions.

**Interfaces:** consume the existing twelve tools and owner policy; expose four independent skill triggers. Plugin root is `skills/`, with explicit paths to the four new siblings and no default nested `skills/` directory. Legacy harness remains outside its discovered components.

- [x] Author self-contained workflows and short conditional references; capture may follow an explicit preselected owner-local route without bypassing an MCP rejection.
- [x] Validate all skill frontmatter/references and the plugin through the installed CLI. Verify only the four intended components are discovered.
- [x] Align served guide and MCP instructions with resource-free policy discovery and true mutation boundaries.
- [x] Commit the skills and package.

## Task 2: Behavioral verification

**Files:** add `docs/skill-validation.md`; reuse `tests/harness-mcp.test.ts`, `tests/harness-memory.test.ts`, `tests/harness-work.test.ts`, `tests/promotion.test.ts` and existing link tests.

**Interfaces:** consume Task 1 skills and synthetic tool transcripts; produce recorded trigger/procedure checks and actual isolated MCP results. No production writes or live Jev sweep.

- [x] Exercise realistic selection and execution scenarios with an independent agent, including all Review Focus cases. Supply raw cases, not expected answers; prohibit live mutations.
- [x] Run existing isolated MCP/state tests for capture, stale revisions, claims, held writes and promotion; correct any mismatches between skills and real behavior.
- [x] Run type checking and build after the MCP instruction change. Record exact limits of simulated versus live validation.
- [x] Commit validation evidence.

## Task 3: Local adoption and instruction alignment

**Files:** install four skills in local Codex/Claude skill roots and vault `_System/Skills/`; update owner `AGENTS.md`, `CONTEXT.md`, `CLAUDE.md`, affected stages, Search README, agent setup notes/global installed guidance, and Sources and cadence; create owner-only `Skill migration.md`. Update existing local automation prompts through the supported tool only where their behavior changes. Append `log.md` and the existing Brain Companion project note.

**Interfaces:** consume validated skills; owner configuration selects local writer routes and MCP-first recall. Preserve original source consumers, timing, limits, notification intent and checkpoint files.

- [x] Back up affected local Markdown and automation definitions privately; read before edits and preserve unrelated customizations.
- [x] Install matching copies; reconcile the existing brain-capture name instead of leaving competing definitions. Verify client discovery using supported read-only mechanisms.
- [x] Align canonical and installed instructions. Preserve current local capture/weekly methods and explicitly list remote scheduler/client targets not verified.
- [x] Verify saved files, relevant links and hashes; refresh authorized derived indexes if available. Check live MCP readback separately from local files.
- [x] Record completed adoption versus pending writer cutover in `docs/skill-migration.md`, without private source data.
- [x] Perform the executing-plans final fresh review; fix material findings, run appropriate checks and commit. Keep the completed branch local for user review.

## Execution rulings

- Implement inline: changes share a small contract; an independent behavioral pass and final review provide the useful second pair of eyes. The user's explicit implementation request authorizes proceeding without another plan-approval pause.
- Documentation and reversible configuration use validators and behavioral checks, not tests that assert exact prose. Existing MCP behavior already has meaningful isolated tests; add runtime tests only if a runtime defect requires a change.
- Use the native managed worktree `brain-skills`, keeping the original checkout and its uncommitted edit intact. Existing installed dependencies are reused.
