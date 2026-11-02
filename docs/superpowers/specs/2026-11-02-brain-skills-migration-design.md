# Brain skills and workflow migration

Status: approved for implementation by Wilson on November 2, 2026 ("let's implement this"). Four separate skills bundled as one Brain plugin; staged adoption preserves existing writer jobs and production settings.

Independent builder check completed on November 2, 2026: no important unanswered planning questions. This is design review, not runtime validation or owner approval.

## Intent and scope

Migrate Wilson's existing Brain instructions into focused, agent-agnostic skills backed by the deployed Brain Companion MCP. Preserve the useful behavior of current collectors, capture rules, review jobs and health checks. Separate reusable procedures from owner-specific policies and client-specific source access.

The future product is a shared hosted service: users create a Brain in the service and optionally connect Obsidian. This migration serves Wilson's existing Brain first. It does not introduce public signup, multiple users, tenant isolation, a new scheduler or a new storage system. The current owner restriction remains in place.

Success means the four skills can be discovered independently, perform their supported workflows through the existing MCP, and report held or unsupported operations accurately. Existing jobs must not lose captures, broaden access or silently change schedules as their instructions migrate. A workflow with unresolved compatibility gaps is explicitly pending, not declared migrated.

## Approaches considered

1. One broad `brain` skill routing to retrieve/capture/review/maintain references. This centralizes entry-point instructions but adds a second routing decision and combines independently useful triggers.
2. Separate focused skills distributed together. This exposes each workflow during skill discovery and supports independent testing and scheduled invocation. Shared policy remains authoritative in the service; brief essential reminders may repeat in individual skills.

Wilson selected approach 2. Each skill can use its own focused references for conditional detail. Do not create a broad router skill or one skill per MCP tool.

## Current evidence

The connected Brain Companion client exposes twelve MCP tools. Read-only calls to `brain_status`, `search`, `inspect` and `list_work` succeeded during this design session. Status reported 219 indexed notes, a successful last sync, and `autoAccept: []`. These observations do not verify write execution, every client's connection, or full device convergence.

`server/mcp.ts` registers the tools, `brain://guide`, `brain://policy` and the `memory-workflow` prompt. `docs/agent-guide.md` supplies the guide. The current portable skill is `skills/brain-harness/SKILL.md`; installed Codex guidance still uses the filesystem-oriented `brain-capture` skill. Claude's installed Brain instructions also describe direct vault access.

The following implementation limits affect migration:

- New/update acceptance and Inbox promotion are disabled in the observed deployment. Successful submission can retain a proposal without saving a Markdown note.
- Explicit link acceptance has a separate path: `review_connection` can write a reviewed link without the new/update/promote acceptance setting. An empty `autoAccept` list is not a global read-only switch.
- Notes excluded from external assessment cannot be applied through the current Jev-gated capture/promotion path. Original policy and privacy metadata must be preserved.
- MCP write protection covers policy filenames and underscore-prefixed folders. Existing ingestion/accomplishment checkpoints in `_System` are not writable through the note API. The MCP also does not expose arbitrary filesystem, local QMD or Obsidian UI operations.
- The connected client exposes tools; skill correctness cannot depend on its ability to read MCP resources or invoke prompts.
- Only the local Codex automation definitions were inspected directly in this session. Claude, Grok and Dots schedule descriptions are documentation evidence until their live configurations are inspected.

## Skill boundaries

| Skill | Trigger and result | Required behavior |
|---|---|---|
| `brain-recall` | A task needs prior personal/project context; produce a sourced answer. | Search narrowly, inspect evidence, check dates and conflicts, cite paths, stop when sufficient. Do not claim, finish or mutate work. |
| `brain-capture` | An explicit save request or a durable event under the owner's standing capture permission; save concise sourced knowledge or report its actual proposal state. | Deduplicate, inspect current revision and parent, preserve unrelated content and metadata, submit exact Markdown with real source evidence, inspect the outcome and read back applied notes. |
| `brain-review` | An authorized request or existing scheduled job to assess pending work; resolve, defer or explain a proposal. | Use bounded listings and client-bound claims, verify original sources, respect expiry/revisions, use checked mutations, record truthful outcomes. A claim does not grant source access or mutation authority. |
| `brain-maintain` | A health check or specifically authorized maintenance run; report findings or perform only its permitted maintenance. | A health check stays read-only. Link maintenance reads both notes and applies only authorized reviewed links. Local indexes, graph appearance and Smart Connections require the existing local integration. |

Capture's duplicate search is a necessary part of capture, not a mandatory nested invocation of `brain-recall`. Skills may use the same MCP tools without loading each other's full instructions. User requests and job scope still govern which actions are authorized.

## Shared contract and portable packaging

Place the four skills under `skills/`, each with a self-contained `SKILL.md` and only the references it needs. Keep names and descriptions narrow enough to distinguish ordinary recall, useful capture, queue review and maintenance. Do not bake Wilson's name, endpoint, absolute paths, agent names or schedules into the reusable skills.

The MCP supplies live policy, capabilities, revision checks, idempotency and action results. Skills explain judgment and workflow; server code remains responsible for enforcement. Keep critical workflow reminders in each relevant skill rather than relying on an additional common skill being installed or activated.

Prefer `brain://policy` when supported. Tool-only clients inspect the canonical policy files named in the existing contract and discover actual tool schemas. Each skill must contain enough essential guidance to work without `brain://guide` or prompts. Do not add a tool merely to avoid writing a short instruction.

Maintain the repository guide and tool instructions alongside the skill split. Check callers and documentation before retiring `brain-harness`; preserve existing references until replacements are installed and verified. The existing installed `brain-capture` must be reconciled rather than leaving two competing skills with that name. Preserve unrelated customization and the already-present uncommitted whitespace change in `skills/brain-harness/SKILL.md`.

One plugin is the intended distribution unit. First validate local skills against real client discovery and the existing authorized connection. Claude/Codex manifests, connection instructions and hooks are client adapters; validate current official formats before authoring them. Marketplace publication and additional hooks are later work, not required for this migration. Do not create a new catch-up job.

## Existing workflows and cutover

Canonical vault rules remain owner configuration. Apply the vault's `CONTEXT.md` instruction-synchronization contract whenever changing a live workflow: affected stage instructions, routing, agent setup, installed guidance, schedule documentation and accessible actual scheduler prompts must agree. Retain unrelated local customizations. Verify saved changes and log exact inaccessible targets.

| Existing workflow | Migration treatment |
|---|---|
| Same-session retrieval | Adopt `brain-recall` once the client's MCP connection and tool-only policy discovery work. Preserve explicit local retrieval when the owner has separately authorized it. |
| Same-session capture | Adopt `brain-capture` for supported submissions. Applying captures requires enabled server actions and successful verification. Held proposals must not be reported as saved or trigger source acknowledgements. |
| Codex daytime catch-up | Keep the current source scope, four daily runs, 20-chat/5-note budget, discovery fallback and exact-token acknowledgement. Source collection, queue and checkpoint handling stay with the existing local consumer; its note-writing procedure can use the new capture contract after compatibility checks. |
| Claude accomplishments | Preserve its existing session/GitHub/Linear/project-memory sources, daily and weekly outputs, limits and schedule. Update its actual prompt only through an available supported interface; otherwise report this exact target pending. |
| Grok link/duplicate review | Use the relevant review procedure within its current authority and schedule. Shared capability does not silently grant promotion or unrelated rewriting. Verify the real remote prompt before declaring migration complete. |
| Dots enrichment | Preserve its approved accounts/sources, budgets and separate checkpoints. Inspect its existing delivery restriction and actual scheduler before changing the delivery route; no new monitoring scope. |
| Codex weekday health check | Keep read-only behavior and timing. It must not claim/finish work, request persisted link suggestions or refresh indexes. |
| Codex weekly connections | Preserve the existing local Smart Connections method, ten-note/five-link limits and schedule. Do not substitute Jev's candidate list or external assessment for the authorized local method as part of a skill rewrite. |

The exact current schedules and source identities stay in Wilson's owner configuration, not public skill packages. Local source checkpoints and the identifier queue can remain local; this does not require uploading conversations or making the hosted server a conversation collector.

## Gaps and rollout decisions

This design does not authorize enabling production new/update/promote acceptance, changing privacy exclusions, or bypassing a held MCP write through a direct filesystem retry. Those changes need a concrete verified cutover proposal.

Implement and validate the skill split before switching live writers. Keep existing authorized workflows operating until their replacement covers the same source/privacy/output requirements. In particular, current private/internal captures and protected bookkeeping remain explicitly unmigrated where the MCP cannot handle them. Do not claim that merely rewriting their instructions completes migration.

The implementation plan should distinguish:

1. Shared skill authoring, behavioral validation and installation.
2. Read workflow adoption and configuration alignment that the current service supports.
3. Writer/job cutover once supported writes, parent navigation, source checkpoints and sync have been verified together.
4. Separately scoped service changes needed for remaining unsupported workflows.

When proposing writer activation, show exact actions/settings and verification evidence. Do not broaden metadata portability to make Jev accept an excluded note. Existing source boundaries and read-only jobs remain unchanged throughout.

## Validation and completion evidence

Use synthetic notes and isolated service state for mutation checks. Never create test proposals, claims or notes in Wilson's production Brain just to prove connectivity.

- Validate skill metadata and references using available skill tooling; confirm descriptions distinguish positive and negative trigger examples.
- Exercise representative recall, capture, review and maintenance requests. Include absent evidence, duplicates, stale revisions, held writes, unavailable policy resources and an inaccessible source. Assess behavior rather than matching wording.
- Verify recall and read-only health-check scenarios make no workflow mutations. Test that empty automatic acceptance is not treated as permission to accept links.
- Verify capture retries retain their original key/payload, held submissions remain unsaved, and checkpoints do not advance for incomplete captures.
- Verify each chosen client can discover the intended skill and use its supported connection. One client's successful call does not establish another's readiness.
- Compare before/after scheduler fields when prompts change; preserve schedules, enabled state, source scope, budgets and notification intent. Record unavailable remote targets explicitly.
- Confirm authoritative guidance and installed copies agree; refresh only the affected derived indexes where available and authorized.

Run repository checks appropriate to changed runtime code or packaging. A documentation-only change does not need a full production redeploy or live write test. Follow the existing cumulative Jev evaluation budget; do not start a new paid evaluation sweep without checking its remaining allowance.

## Builder discretion and exclusions

The builder may choose concise reference filenames, synthetic examples and the smallest compatible packaging implementation after verifying official client documentation. A small amount of duplicated essential guidance is acceptable. Do not add a common loader, registry, workflow engine or abstraction solely to remove a few repeated lines.

Excluded: multi-user implementation, public onboarding, new hosted collection/scheduling, broader source permissions, bulk vault reorganization, new Jev roles, changes to existing job timing, and marketplace publication. Off-disk recovery and interrupted-sync recovery remain existing verification gaps; this design does not claim to resolve them.

## Sources

- Wilson's decisions in the November 2, 2026 migration discussion: shared hosted service, service-created Brains with optional Obsidian sync, current focus on his workflows, four separate skills bundled together.
- Repository: `skills/brain-harness/SKILL.md`, `docs/agent-guide.md`, `docs/harness.md`, `docs/hosting-runbook.md`, `server/mcp.ts`, `server/store.ts`, `server/vault.ts`.
- Private owner configuration inspected locally: `BRAIN.md`, `AGENTS.md`, `CONTEXT.md`, the four stage contracts, `Sources and cadence.md`, `Codex capture queue.md`, Codex/Claude setup and installed guidance. Do not copy private source contents or personal configuration into distributed packages.
- Current local Codex automation definitions: `brain-daytime-catch-up`, `brain-weekday-inbox-triage`, `brain-weekly-connections`. Remote scheduler descriptions were read from owner documentation, not independently verified.
