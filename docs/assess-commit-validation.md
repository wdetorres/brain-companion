# Assessment and commit release validation

Implementation date: November 2, 2026. Branch: `codex/direct-note-writes`.

The implementation adds `assess_memory` → agent decision → `remember`/`promote`, persisted handoff work, advisory quality/lifecycle recommendations, a prominent write-assessment panel and bounded journaled undo. Legacy direct callers remain compatible. Jev cannot veto commits. Genuine uncertainty may use the authorized Inbox; interrupted candidates stay in assessment work without duplicate notes.

## Verified implementation

- 131 automated tests passed after final review, including two-client MCP handoff, expired-claim fencing, exact retries, changed candidate/context labels, unavailable advice, safe undo/crash recovery, privacy exclusions, HTTP authentication/CSRF and bridge/build-filter coverage. TypeScript check, production build and deterministic workflow smoke passed.
- A bounded synthetic sweep resumed one abandoned assessment, deferred unavailable original evidence, skipped a live claim and future deferral, then handled changed evidence and due work. It made no repeated assessment request. This verifies the consumer protocol, not an unattended scheduler.
- Desktop (1280 × 720) and mobile (390 × 844) inspection covered the prominent assessment, unsaved candidate, revised-draft/context, unavailable feedback and removed-file undo states. Separate component render assertions cover outcome/rationale/source labels; these are synthetic fixtures, not production captures.
- Existing cached Inbox notes acquire their stored `review_reason` through a derived parser-index rebuild. Deferred source blockers and note/history data are preserved.

## Live Jev check

The explicit additional allowance is **20 HTTP attempts**, separate from the exhausted older evaluator budget. **14 used; 6 remain.** The private ledger is `data/evals/assess-commit-2026-11-02-budget.json`. Failed dispatches and internal assessor subrequests count. A runner lock and fsync/rename reservation prevent concurrent spending and counter reset on restart. Automated tests establish that request 21 is not sent. Do not rerun the whole validator on the remaining six requests.

Only synthetic temporary vaults were sent to Jev. No personal vault, source credentials or client material was used. All temporary test notes/state were removed. Model: `jev-1.14.0`; quality questions: `memory-recall-links-v23`; lifecycle questions: `memory-advice-v1`.

| Scenario | Assessment time | Quality classification | Advice and observed outcome |
|---|---:|---|---|
| Supported capture | 704 ms | New | Save (81% confidence); saved, replayed and undone |
| Singapore-style consolidation | 1,007 ms | Uncertain | Save (26%); related merge/delete advice at 38%/35%; the verified consolidation saved despite uncertainty, originals were retained |
| Source-backed correction | 511 ms | Uncertain | Merge (62%); verified correction saved with unrelated facts preserved |
| Lifecycle advice | 759 ms | Uncertain | Archive temporary checklist (94%), keep decision history (80%); recommendations recorded, no archive/delete executed |

Each case replayed its stored assessment, handed off to a second client, committed/retried once and safely undid the synthetic primary change with **zero extra HTTP requests**. These four checks prove the real transport/contract and measured latency for this run; they are not an accuracy benchmark or evidence that all lifecycle recommendations are reliable. The low-confidence advice is shown as such in the panel. Source verification and the decision remain with the agent.

## Rollout status and activation requirements

**Not deployed or activated by this implementation task.** The approved plan separates implementation from production rollout. The current live service, installed plugin copies, canonical vault instructions and schedules were not switched to new tool-dependent instructions prematurely. Repo skills and `brain://guide` are ready for the backend release. Marketplace publication/installed-copy synchronization follow that release.

The locally accessible Codex job `brain-weekday-inbox-triage` is actually **Brain post-triage health check**, active weekdays at 23:30 Asia/Manila. Its saved prompt explicitly prohibits claims, finishing work, note writes and Inbox triage; it cannot be repurposed as the recovery writer. Its configuration was read through the automation tool and local saved TOML, not changed or run.

The existing Grok Second Brain Bot **Weekday Inbox triage**, documented for weekdays 23:00 Asia/Manila, is the remote review executor candidate. Current canonical Review instructions describe link/duplicate reporting, not blanket permission to rewrite another agent’s notes. Its actual remote scheduler configuration, MCP capability and run were inaccessible from this implementation session. Consequently **automatic exception recovery is not activated or verified**. A shared queue does not itself run agents.

For an authorized rollout:

1. Back up coordinated vault/SQLite/sync state. Deploy backend/API before activating skills or scheduler instructions; preserve current enabled action scopes. Do not enable promotion or destructive scopes incidentally.
2. Follow the owner’s `CONTEXT.md` → Keeping ICM in sync and Skill migration route: align affected Capture/Review/Maintain instructions, global agent setup, canonical copies and the existing marketplace package/version/source hashes. Verify local Codex/Claude installation; separately record inaccessible Grok/desktop copies. Preserve collector queues, privacy routes, parent/log bookkeeping, source owners and read-only schedules.
3. Inspect the actual existing remote executor, retain cadence/batch/source authority and apply the shared consumer contract only to actions it is authorized to perform. If it cannot commit a candidate, record that concrete blocker; do not convert a read-only job into a writer or create another cron.
4. Verify authenticated real clients, a specifically authorized bounded write/readback and the browser panel. Verify server/device sync separately. Observe a controlled ready exception in a real run of the existing schedule; record run/work/operation IDs and actual outcome before claiming automatic pickup.

## Rollback

Stop new work and reconcile pending commits and undo journals on the new runtime before reverting. Older recovery code does not understand inverse journals or assessment work. Restore coordinated state if rollback is required; reverting code alone does not revert notes. Preserve assessment/history records. Undo is one recorded primary change at a time and refuses later edits, reused paths and dependent links; it is not cascading deletion or general reorganization.

## Fresh review and final verification

A fresh whole-branch reviewer found two Important defects: a completion-record persistence failure could demote an already-written note and permit another primary write; reverse promotion could silently retarget outgoing links in the restored note. Both were reproduced in failing isolated regressions, fixed in one pass, and verified with 131/131 tests, TypeScript, production build and the deterministic MCP workflow smoke. No Critical or deferred Minor findings remained. No additional paid requests were used after the 14-request run.

Implementation decisions: retry fingerprints exclude only ephemeral lease tokens while binding content/assessment/reason; the component extraction supports real rendering tests; parser migration rebuilds derived note indexes only; undo sends the original result revision while the server checks current content. Incorrect retry/revision handling would risk duplicate writes or overwrites, so these paths have focused tests.

Review boundaries retained: production/installed-skill/scheduler activation is pending; four synthetic live checks do not establish general model accuracy; independent filesystem writers and multiple replicas remain unsupported; arbitrary deletion, cascading undo and undo-of-undo remain excluded; unchanged authentication and device-sync internals were not freshly audited. Respecting these boundaries is required before calling the deployed Brain automatically maintained.
