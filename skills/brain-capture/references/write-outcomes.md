# Write outcomes and recovery

| Result | Meaning and next action |
|---|---|
| `applied` | Written in the server vault. Inspect the saved note and required navigation; check sync separately. |
| `duplicate` | No new write. Inspect the existing evidence before deciding the source needs no further capture. Do not claim the proposed text was saved. |
| `needs_attention` | Proposal retained, not saved as a note. Preserve its operation ID and reason for review. Do not acknowledge the source as captured. |
| `pending` | Outcome needs recovery. Inspect the operation and target; preserve the exact retry payload. |
| decision `not_worth_remembering` | No memory saved; history may retain the assessment. A completed source review can legitimately produce no note under the owner's checkpoint contract. |
| Tool/network error | No reliable success evidence. Resolve the error or inspect/retry without inventing completion. |

Before submitting, inspect `brain_status.autoAccept`: absent `new` or `update` means that action cannot automatically apply. An explicit request can still authorize a proposal, but do not create duplicate proposals on every catch-up run. Keep the source-to-operation association in the collector's approved checkpoint mechanism and inspect a prior operation before resubmitting.

A network retry must reuse the original idempotency key AND identical payload, including revision and sources. Inspect a returned operation ID when available. A correction to Markdown, evidence or revision is a new proposal and needs a new key; preserve the link to the earlier proposal for review.

For revision conflicts, re-inspect and reconcile against actual current text. Never replace newer facts merely to make an old proposal apply. For privacy exclusions or evaluator failure, report the limitation and retain pending work; do not silently change transport or remove privacy fields.

Checkpoint only after a complete source review and all required writes/readback/bookkeeping succeed, or after a verified no-capture outcome under the source owner's rules. Failed/held captures, partial pagination, inaccessible sources and exhausted budgets remain pending. A stale queue token must not acknowledge a newer source event.
