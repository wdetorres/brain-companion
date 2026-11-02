# Agent–Jev assessment and commit implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any authorized agent assess and file verified Brain updates immediately, while an existing scheduled sweep revisits genuine exceptions, with a visible assessment and reversible history.

**Architecture:** Add an explicit assessment stage beside the existing revision-checked write path, returning real Jev feedback to the agent before its final commit. Reuse the journal and work queue for reversible writes, unresolved Inbox captures and interrupted assessments. Adapt an existing authorized scheduled sweep to consume ready exceptions; add no worker or cron and require no second promotion pass for successful direct captures.

**Tech Stack:** Node >=24, TypeScript, Zod, SQLite (`node:sqlite`), existing Jev HTTP client, MCP, React and esbuild.

**Spec:** [Agent → Jev → agent → Brain](../specs/2026-11-02-agent-jev-assess-commit-design.md).

## Global Constraints

- Node >=24; reuse TypeScript, Zod, SQLite, React, the existing Jev client, write journal and work queue. Add no runtime dependencies.
- Jev scores are advisory. Only deterministic permission, privacy, path, claim, revision and recovery checks can prevent an otherwise requested commit.
- Preserve source/privacy boundaries, protected paths, enabled write scopes and existing collectors. Never turn an MCP rejection into a filesystem bypass.
- Any authorized agent can submit, inspect and resume work; no named-agent dependency or new schedule.
- Preserve and verify an existing authorized scheduled sweep for exceptions; unchanged completed captures do not require a second promotion pass. Jev scores alone never route a capture to Inbox.
- Keep legacy direct `remember` callers working, with an honest “Not assessed” display. Updated capture instructions use assessment first.
- Use at most 20 additional paid Jev HTTP requests for this workflow's validation, counting failures and retries. The old exhausted allowance stays untouched.
- Server writes and device sync are separate outcomes. Do not promise zero latency or zero future maintenance.

## Review Focus

1. Agent disappears or response is lost: an existing scheduled consumer actually revisits ready work, with one primary commit, no duplicate Inbox note and no repeated model request for unchanged context (Tasks 1, 3, 5, 7, 8).
2. Candidate, comparison notes or target change: preserve what Jev actually evaluated, disclose drift, and never overwrite a newer file (Tasks 1, 3, 6).
3. Private or hostile source/context: reject ineligible explicit inputs before remote calls; treat content as data and validate returned choices (Tasks 1, 2).
4. Crash between journal, file mutation and completion: reconcile the same operation; undo cannot erase later edits, path reuse or referenced notes (Tasks 3, 4).
5. Existing direct callers, model warnings and unavailable Jev: direct writes remain compatible; evidence/routing gaps have explicit exception paths, scores alone never force Inbox, and UI reports actual saved/unsaved/deferred state (Tasks 3, 5, 6, 7).

## Scope and file map

Work from the current deployed baseline `f811f2d` or its verified descendant in an isolated implementation branch. The original checkout has unrelated local edits; preserve them. No implementation, deployment or live evaluation happens while producing this plan.

| Files | Responsibility |
| --- | --- |
| `src/shared.ts` | Assessment/input/reference/recommendation types, operation associations, work kind and undo journal fields |
| `server/store.ts`, `server/work.ts` | Durable assessments, claims, completion binding, commits, promotion, recovery and undo |
| `server/jev.ts`, `server/main.ts` | Real advisory assessor and runtime injection; preserve existing recall/link assessors |
| `server/mcp.ts`, `server/http.ts`, `api/bridge.ts` | Public assessment/inspection/undo contracts and authenticated browser routes |
| `src/App.tsx`, `src/JevReview.tsx`, `src/WorkList.tsx`, `src/MemoryActions.tsx`, `src/presentation.ts`, `src/styles.css`, `src/demo.ts` | Visible assessment, awaiting-agent details, actual disposition and bounded undo UI |
| New `tests/assessment.test.ts`, `tests/undo.test.ts`; existing tests named below | Behavioral regression coverage |
| `docs/agent-guide.md`, `docs/harness.md`, `docs/jev-features.md`, `docs/validation.md`, `docs/writer-activation.md`, `docs/skill-migration.md`, `docs/skill-validation.md`, `README.md`, `skills/` | Shared contract, compatibility, deployment and agent guidance |
| `scripts/test-jev-workflow.ts`, `scripts/test-harness-live.ts`; new `scripts/validate-assess-commit.ts` | Preserve ordinary deterministic smoke checks; isolate the new capped live validation |
| Existing scheduled review prompt/configuration and its linked owner stage docs, discovered during rollout | Consume ready exceptions within existing authority, cadence and batch limits; verify actual pickup |

No new runtime package, generic lifecycle executor, auto-delete tool, folder manager or scheduled maintainer. Update the existing sweep's exception-consumption instructions; preserve its authorized broader consistency checks. Leave unrelated authentication, graph, recall and collector behavior alone.

## Routing contract

| Situation | Capture path | Follow-through |
| --- | --- | --- |
| Verified evidence and clear destination | Assess → agent decides → direct commit | Finish in the active session; no mandatory promotion sweep |
| Actual evidence gap, unresolved factual conflict or routing ambiguity | Save a truthful, concise Inbox note with `status: inbox`, `review_reason` and available provenance, when permitted | Existing scheduled sweep verifies and files or defers with a specific blocker |
| Agent interrupted after staging or while committing | Retain the existing assessment/write journal; create no Inbox copy | Existing sweep reclaims after lease expiry and resumes the same work |
| Jev unavailable or gives a negative/uncertain score | Agent considers its own verified evidence and records a reason | Score alone does not hold the write, select Inbox or require human approval |

Missing an assessable excerpt is not a reason to invent one: an eligible unresolved capture may use the existing direct Inbox route and show “Not assessed.” Privacy, permission and revision failures cannot be bypassed by changing the destination to Inbox. A successfully saved Inbox exception has one Inbox work item, not a second unfinished assessment for the same capture.

## Task 1: Persist an assessable candidate and return a resumable result

**Files:** `src/shared.ts`, `server/store.ts`, `server/work.ts`; new `tests/assessment.test.ts`, existing `tests/harness-work.test.ts`, `tests/runtime.test.ts`.

**Interfaces:**
- `AssessMemoryInput =` existing candidate fields plus `intent: 'capture'|'consolidate'|'promote'`, optional `sourcePath`, optional `contextPaths: string[]` (maximum five distinct paths). Promotion requires sourcePath and uses its revision; other intents reject sourcePath.
- `Assessment` stores immutable terminal input/context/result, with `status: 'assessing'|'assessed'|'unavailable'`, `decision?: Decision`, `recommendations?: Recommendation[]`, sanitized `error?: string` and model-context revisions/truncation flags.
- `WriteAssessor(input: AssessMemoryInput, current: Note|undefined, related: Note[]): Promise<{decision: Decision; recommendations: Recommendation[]}>` is injectable in the store for deterministic tests.
- `BrainStore.assessMemory(input: AssessMemoryInput, actor: string): Promise<{assessment: Assessment; workId: string; claimToken?: string}>`; `BrainStore.assessment(id: string): Promise<Assessment | undefined>` returns no token.
- Extend `WorkKind` with `assessment`, `WorkItem` with optional `assessmentId`, and `WorkQueue.enqueue` with optional assessment linkage; keep existing callers valid.

- [ ] Add failing tests with injected assessors: `assert.equal(judgeCalls, 1)` after concurrent/exact retries; changed payload/same key rejects; assessment survives reopen; candidate Markdown is absent; privacy-excluded source note/current/context and stale input cause zero judge calls; all stored model-input truncation flags match what the fake assessor received. Source-note privacy here means the actual promotion source or explicitly supplied vault context; do not claim arbitrary external excerpts can be independently classified from their URI.
- [ ] Run `node --test tests/assessment.test.ts tests/harness-work.test.ts tests/runtime.test.ts`; verify failures are the missing contract, not unrelated fixtures.
- [ ] Add the strict assessment schema using current byte/source/path limits and at least one nonempty source excerpt. Snapshot eligible current/source context plus a maximum of five neighbors, prioritizing explicit paths. Persist normalized input fingerprints before remote calls.
- [ ] Add the `assessments` table with ID, unique retry key, fingerprint, JSON payload and separate progress/completion JSON. Reuse SQLite transactions and the current exclusive queue. Terminal candidate/result data is immutable; progress records may change.
- [ ] Automatically enqueue/claim the assessment for its creator using the existing five-minute lease. Release the vault lock for the assessor call. Persist assessed/unavailable afterward; retries observe the existing in-flight/terminal record and do not repeat the call. On restart mark interrupted assessments unavailable, retaining their work item.
- [ ] Verify same-client retries recover only their still-current token; another client's listings/inspection never reveal it. Test a sync can run while the fake assessor is awaiting a response, and the final assessment still records its original revisions.
- [ ] Run the targeted tests and `npm run check`; commit this bounded storage contract.

## Task 2: Produce real quality and lifecycle advice

**Files:** `server/jev.ts`, `server/main.ts`, `src/shared.ts`; `tests/jev.test.ts`, new synthetic `tests/fixtures/jev-assess-commit.json`.

**Interfaces:**
- `createWriteAssessor(key: string|undefined, model?: string): WriteAssessor` composes the existing quality judge with one batched advisory request.
- Candidate advice is `save|revise|merge|skip|investigate`; context advice is `keep|merge|promote|archive|delete|investigate`. `Recommendation` is a discriminated candidate/context record containing action, confidence and the validated distribution; context records also contain the supplied path and revision.
- Store every actual model/version and usage result; do not attribute the advisory request's usage/version to an unrelated recall result.

- [ ] Add failing synthetic tests for: Singapore-style high-overlap consolidation; supported correction with historical context; an Inbox note ready for promotion; an obsolete note worth archiving; duplicate material with unique provenance; missing/truncated context; malicious evaluator instructions; invalid action/path/distribution. Assert recommendations reference only provided snapshots and no test invokes the live network.
- [ ] Run `node --test tests/jev.test.ts tests/assessment.test.ts` and confirm the new advisory cases fail.
- [ ] Implement strict choice parsing using the existing Jev response/probability checks and data-as-evidence instruction. Batch all bounded context questions in one request. Pass intent so factual duplication is distinct from useful consolidation. Preserve the existing four quality measures, including honest overlap labeling.
- [ ] Make archive/delete advice conditional on supplied evidence of supersession/redundancy; never recommend destruction from missing/truncated context. Keep path generation, prose generation and execution out of the assessor. Wire it into `server/main.ts` using the existing server-only key/model.
- [ ] Run the targeted tests and `npm run check`; commit the assessor. Do not run `npm run evaluate` against the exhausted budget.

## Task 3: Let the agent commit, revise, skip or resume without a model veto

**Files:** `src/shared.ts`, `server/store.ts`, `server/work.ts`; `tests/assessment.test.ts`, `tests/vault.test.ts`, `tests/harness-memory.test.ts`, `tests/promotion.test.ts`, `tests/runtime.test.ts`.

**Interfaces:**
- Extend `RememberInput`/`rememberSchema` and inherited `promoteSchema` with optional `assessment: {id: string; claimToken: string; reason: string}` or optional `relatedAssessmentId: string`; they are mutually exclusive. Enforce the existing 1–1000 character reason bound.
- `Operation.assessment?: {id: string; role: 'primary'|'related'; reason: string; candidateMatches: boolean|null; contextChanged: boolean}`. Never persist claim tokens in operations.
- `finishWork` supports an assessment's explicit no-change completion. `remember`/`promote` complete its primary claim automatically only on applied/exact-no-op success; failures leave it actionable.

- [ ] Add failing tests: uncertain/conflict/duplicate/not-worth advice each permits an authorized write with rationale; a revised candidate records `candidateMatches: false`; an unavailable assessment can commit; changed comparison context sets `contextChanged`; stale destination revisions still prevent overwrite; legacy direct writes and legacy accepts make zero assessor calls.
- [ ] Add concurrency/recovery tests: only one primary completion per assessment; wrong/expired/reassigned token cannot commit; same-key retry returns the same operation; interruption after file rename recovers and closes work; failed commit may be corrected with a new key; no-change closure does not create a Markdown note.
- [ ] Add exception-routing tests: deliberately saving an assessed candidate as an unresolved Inbox note closes its assessment work and leaves exactly one Inbox item; interrupted staging leaves no Inbox file; a verified directly filed note creates no Inbox/promotion item. Negative scores alone do not change the requested destination.
- [ ] Run `node --test tests/assessment.test.ts tests/vault.test.ts tests/harness-memory.test.ts tests/promotion.test.ts tests/runtime.test.ts` and verify intended failures.
- [ ] Before mutation, validate assessment ownership/claim and bind its pending operation in the journal. Reuse `apply` and the promotion journal. Match the normalized assessed/final fields, record drift and the agent's reason, and complete progress atomically with the applied operation record. Recovery reconciles the same association; it cannot open a second completion.
- [ ] Remove model-threshold and second-preservation vetoes from `promote`. Retain original-source excerpt requirements, enabled promotion scope, source revision, destination absence, source work claim, privacy and resolved-link checks. Promotion with assessment validates both its source claim and the assessment claim; their tokens are distinct.
- [ ] Support provenance-only parent writes with `relatedAssessmentId`: require an already applied primary operation, run normal permissions/revision checks, and set `candidateMatches: null`. Parent content has no inherited model score. Failed parent writes never undo or relabel the already-saved primary note.
- [ ] Resolve exact-content no-ops honestly, keep original assessment data unchanged, and ensure model classifications never enqueue a new human approval proposal or select Inbox. Reuse the existing Inbox observation/enqueue path after an intentionally saved exception; close its assessment work only after that save succeeds.
- [ ] Run the targeted tests and `npm run check`; commit the complete agent-controlled write path.

## Task 4: Add narrow, revision-safe undo

**Files:** `src/shared.ts`, `server/store.ts`, existing vault/promotion helpers only where reusable; new `tests/undo.test.ts`, `tests/promotion.test.ts`.

**Interfaces:**
- `BrainStore.undoMemory(input: {operationId: string; expectedRevision: string; reason: string; idempotencyKey: string}, actor: string): Promise<Operation>`.
- Add `Operation.undo?: {operationId: string; files: {path: string; before: string|null; after: string|null}[]}`. This is the exact inverse journal for one or two files, not a user-supplied patch API. Null means absent; do not render removal as an empty note.

- [ ] Add failing tests for update restoration, removal of an unchanged created note, reverse promotion, same-key replay, crash after each filesystem step, later edit/path reuse, protected/symlink paths and newly introduced incoming links. Assert original records remain and refused undo leaves all files untouched.
- [ ] Run `node --test tests/undo.test.ts tests/promotion.test.ts` and verify the missing undo behavior.
- [ ] Derive inverse files exclusively from the stored applied operation. Require the original write scope (`new`, `update` or `promote`) still enabled, the current expected revision equal its recorded result, source absence when reversing a move, and valid resolved links. Unsupported/external/non-applied/undo operations are not undoable. Allow only one successful inverse per original operation; a retry returns the existing inverse. Return ordinary conflict outcomes with specific reasons so the UI can explain them.
- [ ] Persist the inverse before mutation and extend recovery to reconcile each exact before/after state. Never recursively remove directories. Conflicting recovery stops with a concrete reason. The undo operation's source links to the original journal record; do not misrepresent the original update's evidence as proof of the restored text.
- [ ] Test that a linked hub must be undone before its newly created note and that nothing cascades automatically. Run targeted tests and `npm run check`; commit bounded undo.

## Task 5: Expose the same flow to every client

**Files:** `server/mcp.ts`, `server/http.ts`, `api/bridge.ts`; `tests/harness-mcp.test.ts`, `tests/http.test.ts`, `tests/bridge.test.ts`, `tests/memory-features.test.ts`.

**Interfaces:**
- MCP: new `assess_memory`, `undo_memory`; extend `inspect` with mutually exclusive `assessmentId`, `list_work` with assessment kind, and existing commit schemas with Task 3 fields.
- Browser: authenticated `GET /api/assessment?id=…` and origin/CSRF-checked `POST /api/memories/undo` with Task 4 input. Keep the existing operation detail endpoint. No new browser endpoint that can submit arbitrary replacement Markdown.

- [ ] Add failing two-client MCP test: client A assesses, stops, claim expires; B claims/inspects/rechecks and commits; A's old token cannot write; repeat succeeds idempotently. Verify returned resources describe assessment as advisory and expose no token in read calls.
- [ ] Add authenticated browser/bridge tests for allowed routes, missing auth, invalid origin/CSRF, body limits and invalid undo payload. Ensure old `remember`, `inspect`, review and OAuth clients still work.
- [ ] Run `node --test tests/harness-mcp.test.ts tests/http.test.ts tests/bridge.test.ts tests/memory-features.test.ts` and verify intended failures.
- [ ] Register tools/routes and update instructions. Assessment is a persisted mutation with external model access; undo is destructive and bounded to an explicit operation. `applied` confirms a write, assessment success does not. Keep legacy held-item acceptance direct without reassessing.
- [ ] Extend only the bridge route allowlist needed by these browser endpoints. Run targeted tests and `npm run check`; commit the public contract.

## Task 6: Restore the prominent, truthful write-assessment panel

**Files:** `src/App.tsx`, `src/JevReview.tsx`, `src/WorkList.tsx`, `src/MemoryActions.tsx`, `src/presentation.ts`, `src/styles.css`, `src/demo.ts`; `tests/render.test.ts`, `tests/presentation.test.ts`.

**Interfaces:**
- `JevReview` accepts a separately loaded `Assessment` plus its optional resulting `Operation`; preserve rendering of historical operations with inline `decision`.
- Work list opens assessment details by `assessmentId`. Owner undo uses Task 5's route with the inspected current revision and an explicit reason; display returned outcomes, not optimistic success.

- [ ] Add failing render/presentation tests for applied despite not-worth advice, earlier-draft/context labels, unassessed legacy/Inbox writes, unavailable assessment, awaiting-agent candidates, Inbox review reasons, deferred blockers/retry times, source recommendations, actual removed-file undo diff, and explicit demo labels. Assert no new panel is hidden behind “Evaluation details.”
- [ ] Run `node --test tests/render.test.ts tests/presentation.test.ts` and verify intended failures.
- [ ] Restore the existing panel directly in the detail view. Show submitted candidate/evidence, real scores/advice, agent rationale, final diff and actual write status. Keep assessment status separate from commit status; `applied` cannot be overridden by a model classification or generic “Reviewed” label.
- [ ] Add awaiting-agent assessment detail and bounded owner Undo using current patterns. Distinguish a saved unresolved Inbox note from an unsaved staged assessment; show the blocker/retry time for deferred work. Do not label the assessment queue “needs approval” or promise a scheduled pickup without verified scheduler state. Parent hub changes show provenance linkage without pretending Jev assessed them. Preserve accessible labels, focus/error handling and explicit sample markings.
- [ ] Run targeted tests, `npm run check`, and `npm run build`. Inspect local live-shaped fixtures for supported, revised, unavailable and undone cases at desktop/mobile widths; commit the UI.

## Task 7: Make the existing sweep consume exceptions

**Files:** `docs/agent-guide.md`, `docs/harness.md`, `skills/brain-capture/SKILL.md`, `skills/brain-capture/references/write-outcomes.md`, `skills/brain-review/SKILL.md`, `skills/brain-review/references/review-actions.md`, relevant maintain guidance; `tests/harness-mcp.test.ts`, `tests/harness-work.test.ts`, `tests/assessment.test.ts`. Existing scheduler prompt/configuration is updated in Task 8, not a new server-side job.

**Interfaces:** Reuse `list_work`, `claim_work`, `inspect`, `remember`, `promote` and `finish_work`. A sweep run uses its existing batch limit (at most five ready items if none was defined), skips unexpired claims and future-deferred work, and preserves current source/action authority. It processes interrupted assessment/commit work and unresolved Inbox items before its already-authorized broader consistency checks.

- [ ] Add a deterministic two-client scenario for the complete consumer contract: A saves one unresolved Inbox capture and abandons another staged assessment; B runs a bounded sweep, resumes the staged item once, and defers the Inbox item whose source is still unavailable. Include a live claim and future-deferred item that B must leave untouched. Assert there is no duplicate note, both unresolved reasons remain truthful, and replay makes zero additional model calls.
- [ ] Extend the scenario with changed source/note context and a due deferred item: B reopens original evidence/current revisions and files only after verification and existing permissions allow it. A completed direct capture requires no second promotion job. Use synthetic MCP clients and injected time/assessors, not a new scheduler framework or paid calls.
- [ ] Run `node --test tests/harness-mcp.test.ts tests/harness-work.test.ts tests/assessment.test.ts`; implement only missing queue/completion behavior in the owning Tasks 1/3 code if the scenarios expose a gap.
- [ ] Write the shared sweep procedure: list a bounded ready batch, claim, inspect existing journal/result and original sources, recheck revisions and authority, then commit/promote, finish with no change, or defer with a concrete blocker and the existing retry rules. Reuse existing assessments unless new evidence or a materially changed candidate makes a fresh assessment useful; never reassess simply because the schedule ran again.
- [ ] Document the three routing paths in the table above. Preserve currently authorized link/duplicate/external-edit review without reopening every completed capture for promotion. An inaccessible source or disabled write scope remains a named blocker; a review claim or Jev recommendation does not expand authority.
- [ ] Run targeted tests and `npm run check`; commit the consumer contract and regression coverage. This proves the workflow, not that the real schedule is active.

## Task 8: Align the portable workflow and validate the complete release

**Files:** documentation and scripts in the scope map; all four `skills/brain-{capture,review,recall,maintain}/SKILL.md`, capture/review reference files, compatibility `skills/brain-harness/SKILL.md`; `tests/evaluation.test.ts`, `tests/render-build-filter.test.ts`.

**Interfaces:** The contract shipped in code, MCP resources, plugin skills and affected owner routing must agree. Production rollout is a later authorized execution step; this plan does not deploy anything.

- [ ] Align all remaining skills/docs with direct filing plus Task 7 exception recovery. Explain earlier-draft labeling, unavailable assessment, separate parent updates and that journaling alone does not schedule recovery. Require an explicit owner undo request or an already-authorized reversal task before the agent invokes bounded undo; advice never grants that authority. Keep source eligibility verification with the agent and read-only recall/maintenance read-only. Remove obsolete claims that promotion needs model approval.
- [ ] Update deterministic smoke scripts and docs for compatibility and real assessment mode. Keep global evaluation scripts on their existing budget; add `scripts/validate-assess-commit.ts` for the explicitly approved allowance. Use the existing live script's process-scoped `globalThis.fetch` wrapper and exclusive runner lock; restore both in `finally`. Before each real HTTP attempt reserve one request durably in a separate private ledger (`data/evals/assess-commit-2026-11-02-budget.json`, limit 20); every failure, retry and internal assessor subrequest counts. Reject malformed ledgers, persist via temporary file/fsync/rename before dispatch, and never print keys or private excerpts. Test that request 21 is never sent and restarts cannot reset the counter.
- [ ] Run `npm test`, `npm run check`, `npm run build` once the implementation is complete. Verify backend build filters include every new runtime import; add no runtime file outside covered paths without updating `render.yaml`. Fix failures before paid validation.
- [ ] Run the capped live script on synthetic isolated state. Cover supported capture, Singapore-style consolidation, source-backed correction and lifecycle advice, with selected resume/undo steps using stored results. Stop before the limit; do not expand to the old evaluation suite. Record model versions, request count and measured assessment latency. A stored-result replay and commit must use zero extra requests.
- [ ] Document synthetic-vs-live evidence and exact unverified surfaces. Restore/back up state as needed; never use the personal vault as destructive test data.
- [ ] During an authorized rollout, read current `/Users/wilson/Documents/Brain/CONTEXT.md` → Keeping ICM in sync and `_System/Agent workflows/Skill migration.md`. Apply only affected routing changes in `BRAIN.md`, `AGENTS.md`, `CONTEXT.md`, `PARA.md` if relevant, Capture/Review/Maintain stage instructions, global agent setup and installed copies. Preserve existing folder authority, collectors, private routes and read-only schedules.
- [ ] Locate the existing scheduled review executor and its actual saved prompt/configuration. Update that run to use Task 7's consumer contract, preserving its cadence, configured batch limit and source/write authority. Do not create another job, consume another agent's private conversation queue, or convert a read-only check into a writer. Record the executor identity/location, configured instructions and any inaccessible target; the shared protocol itself must remain agent-agnostic.
- [ ] Publish/synchronize the four-skill package through the existing marketplace process in `/Users/wilson/projects/brain-companion-marketplace` (or its clean worktree), update version/source hashes and verify installed Codex/Claude copies. Record inaccessible remote Grok/desktop copies precisely. Backend/API lands before new tool-dependent skill instructions.
- [ ] Roll out only with existing authorization: back up persistent SQLite and vault, deploy the tested backend/frontend, verify real authenticated two-client reads plus a bounded authorized write, and inspect both panel and note. Keep destructive/promotion scopes disabled unless independently authorized; advice is useful while execution remains restricted. Record server-vs-device sync separately.
- [ ] Observe a controlled ready exception being claimed and completed/deferred by a real run of the existing schedule within its authorized scope. Record run identity/time, work and operation IDs, and outcome without private excerpts. A manual MCP handoff or edited schedule document is insufficient evidence of scheduled pickup. If the scheduler is inaccessible, disabled, or lacks authority for the intended action, explicitly report automatic exception recovery as not activated/limited rather than calling the full rollout complete.
- [ ] Commit release documentation and the validation record. If a live check cannot be run within authority/budget, record the exact unverified behavior rather than claiming success.

## Rollback and completion

The added table and optional fields are additive, but older code does not understand assessment work kinds or undo recovery. Before runtime rollback, stop new submissions, drain/reconcile pending writes and inverse journals on the new version, then restore a coordinated backup if necessary; do not start old recovery against new pending undo records. Retain assessment/history data. Reverting a deployed runtime does not revert already-written notes.

Done means the real panel returns, verified updates finish directly, high-overlap consolidation is not held by a score, genuine exceptions have a bounded existing consumer, later edits survive undo attempts, and shared instructions match verified behavior. Verify scheduled pickup separately before calling automatic recovery active. A new maintenance service, full-vault recurring reassessment, generic deletion, new-folder authority and a claim of zero latency remain outside this change.

## Plan self-review

Spec coverage maps to Tasks 1–8: immutable assessment/resumption (1), real quality/lifecycle advice (2), agent authority/direct filing and exception deduplication (3), reversibility (4), agent-agnostic access (5), truthful panel (6), bounded exception-consumer contract (7), compatible workflows, real scheduler activation and bounded validation (8). The five review-focus classes have explicit owning tests. API names and optional associations above are shared across tasks. A separate builder review identified source-privacy enforcement and MCP undo authority; both remain explicit. Wilson's follow-up added exception Inbox handling and verified existing-sweep recovery while retaining immediate filing as the default. This is one release because the service, clients and panel must agree on the same persisted workflow; ship the backend contract before activating updated skills/sweep instructions.
