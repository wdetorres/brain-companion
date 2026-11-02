# Write outcomes and recovery

| Result | Meaning and next action |
|---|---|
| `applied` | Written in the server vault. Inspect the saved note and required navigation; check sync separately. |
| `duplicate` | No new write. Inspect the existing evidence before deciding the source needs no further capture. Do not claim the proposed text was saved. |
| `needs_attention` | Proposal retained, not saved as a note. Preserve its operation ID and reason for review. Do not acknowledge the source as captured. |
| `pending` | Outcome needs recovery. Inspect the operation and target; preserve the exact retry payload. |
| Assessment recommendation/classification | Advice only, with no Markdown write. The agent may commit, revise, finish without change or defer. A negative score cannot override an actual `applied` status. |
| Tool/network error | No reliable success evidence. Resolve the error or inspect/retry without inventing completion. |

Before submitting, inspect `brain_status.autoAccept`: enabled `new`/`update` writes apply directly without a model approval step. Absent `new` or `update` means that action cannot automatically apply. An explicit request can still authorize a proposal, but do not create duplicate proposals on every catch-up run. Keep the source-to-operation association in the collector's approved checkpoint mechanism and inspect a prior operation before resubmitting.

A network retry must reuse the original idempotency key AND identical payload, including revision and sources. Inspect a returned operation ID when available. A correction to Markdown, evidence or revision is a new proposal and needs a new key; preserve the link to the earlier proposal for review.

For revision conflicts, re-inspect and reconcile against actual current text. Never replace newer facts merely to make an old proposal apply. For privacy exclusions or disabled writes, report the limitation and retain pending work; do not silently change transport or remove privacy fields. Jev uncertainty, duplicate scores and outages do not block new/update/promotion writes. Legacy model-held proposals can be resolved through authorized `review_memory` acceptance, without rerunning Jev; they are not automatically replayed.

Checkpoint only after a complete source review and all required writes/readback/bookkeeping succeed, or after a verified no-capture outcome under the source owner's rules. Failed/held captures, partial pagination, inaccessible sources and exhausted budgets remain pending. A stale queue token must not acknowledge a newer source event.

Assessment retries reuse the exact assessment key/payload and stored result; no extra Jev call is made. Resume via `inspect(assessmentId)` and the shared work claim. Commit retries keep the exact commit key, content, sources, assessment ID and reason; only a newly reclaimed lease token may change. An applied primary commit resolves its assessment once. A changed final draft/context keeps the original feedback visibly labeled; related parent writes do not inherit its scores. A staged candidate needs no extra Inbox copy. Only genuine unresolved evidence/routing merits an authorized Inbox save with a truthful `review_reason`.
