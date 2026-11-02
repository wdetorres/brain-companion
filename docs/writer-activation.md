# Hosted writer activation — November 2, 2026

**Current result: not activated.** The four-skill migration is deployed. A bounded hosted write trial retained two proposals without changing the target note. `AUTO_ACCEPT` was restored to empty and verified through the connected MCP. Existing local writers, collectors, checkpoints and schedules retain their prior routes.

## Deployment and rollback evidence

- GitHub `main` was fast-forwarded from `df5dcc4` to `d50b773272ad4f0868b5ec1d8ef1bf519f7d4d3e`.
- Vercel production `dpl_HSiruJxr7E7HEB7jhEL7a9nars6L` became Ready. Render `dep-dbk2f63bc2fs73e1k910` became live. The worker's deployed guide contains the four-workflow instructions.
- The public landing page returned 200, anonymous `/api/brain` and `/mcp` returned 401, and OAuth discovery retained the canonical issuer/resource. The worker's `/healthz` returned 200. The Vercel public origin does not route `/healthz` and returns 404 there.
- A private same-disk backup at `/data/backups/pre-writer-2026-11-02` contains the vault, Headless configuration and SQLite online backups. Source/copy file hashes were stable across the copy; both databases passed `integrity_check`. Files/directories have private permissions. This is a rollback copy, not independent disaster recovery or a full restore test.
- Only `AUTO_ACCEPT` was temporarily changed to `new,update`, using an environment merge. Render activation deployment `dep-dbk2gq2jnfac739dctfg` exposed those settings through authenticated `brain_status`. Promotion stayed disabled.
- After the trial failed, only that variable was restored to empty. Render rollback deployment `dep-dbk2hsg473hc73c4r9i0` became live at `2026-11-02T06:09:27.566849Z`. MCP subsequently returned `autoAccept: []` and successful scheduled sync.

## Failed readiness check

The trial used a useful, sourced addition to an existing eligible personal project note, with its already-linked parent hub inspected first. The proposal preserved the current Markdown byte-for-byte and appended the deployment milestone. The evaluator returned `conflict` (0.56), including a `lost_context` score of 0.36 despite the preserved prefix. The note revision remained unchanged. An exact retry returned the same operation ID and held outcome without another evaluation.

A smaller corrected proposal explicitly dated the new state and superseded the earlier undeployed checkpoint. It also remained held: conflict 0.65, lost context 0.37. Both operations remain available for review. Neither proposal was retried as a local note write, and no source checkpoint or capture-queue acknowledgement was advanced.

This demonstrates conservative rejection and idempotent handling of a held operation. It does **not** verify an applied write, successful-write retry, a new note, parent-hub mutation or hosted-to-desktop convergence after a write.

## Investigation and next acceptance gate

An isolated development experiment assessed only an appended addition while retaining the current note as context, and treated exact prefix preservation as zero removed text. Synthetic cases covered dated updates, contradiction, unsupported completion, evaluator injection, unrelated fact loss, duplication and a new note. The final experiment matched seven of eight expected outcomes, with no unsafe acceptances in this small set; the real long-history update still failed. Narrowing that update further also failed. The experiment therefore was **not shipped**; the deployed evaluator and thresholds remain `memory-recall-links-v21`.

Four requests were reserved for the two live proposals and 30 new requests were used in isolated development, bringing the existing cumulative evaluation ledger to **1,875 / 2,000**. Exact-request cache replays are not independent evidence. Private cases, outputs and the unshipped patch remain outside version control.

Before reactivation, resolve the long-note update failure on a representative evaluation set without weakening privacy, conflict, preservation or support checks. Verify both legitimate additions and adversarial/unsupported changes, then repeat one meaningful hosted capture. Check the applied operation, exact retry, required parent navigation and desktop sync. Only then change owner routing for the verified lane. Scheduled collectors additionally need their own checkpoint/acknowledgement acceptance; protected bookkeeping and assessment-excluded notes still need an explicit strategy.

To disable a future trial, restore only `AUTO_ACCEPT` to empty, deploy, and verify the live MCP result. Disabling acceptance does not delete held proposals or undo applied notes. Do not restore the vault backup over newer notes to undo a configuration change. Off-disk recovery, interrupted-sync recovery, other clients' writer readiness and collector cutover remain unverified.
