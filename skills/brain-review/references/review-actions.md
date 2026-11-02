# Actions for a claimed item

## Held proposal

Inspect the operation before acting. `review_memory` takes the operation ID, current claim token, reason and `accept` or `dismiss`. Acceptance also needs a new idempotency key and reruns evaluation against the original expected revision. It cannot force acceptance or overwrite later changes. Dismissal records a reason and retains history.

If prose, evidence or revision needs correction, submit a corrected `remember` proposal with a new key and fresh revision. Do not mark the old item resolved until the replacement is actually applied; finish the old work with its matching applied operation ID where required. If held, keep the gap visible rather than treating acceptance as success.

## Inbox filing

Promotion requires explicit task/owner authority and `promote` in `brain_status.autoAccept`. Inspect and claim the Inbox source, verify original evidence and portability, search for duplicates, and read the existing destination parent.

Call `promote` with `sourcePath`, destination `path`, exact destination Markdown, verified sources, source revision, claim token and unique idempotency key. Destination must not exist and its parent must be an existing Projects/Areas/Resources folder. Preserve original provenance, factual content and link targets. A similar note or an unchanged body is not evidence of source verification.

Broken or retargeted links, collisions and changed source revisions can block filing. Report affected paths; do not delete a remaining source or rewrite unrelated notes to bypass the check. Inspect the destination after `applied` and complete only authorized parent-navigation work. For interrupted or uncertain outcomes, retry the exact original key/payload and inspect the operation and both paths.

## Changed-note review

Inspect the current note, original source and relevant links. A task may authorize findings only; do not infer editing permission from a review job. An authorized correction uses `remember` with actual source evidence and the current revision. A completed note update resolves its own live note-review claim or invalidates old work; inspect before attempting another finish.

## Finishing and recovery

`finish_work` records an outcome; it does not write or promote a note. For a resolution that changed a note, supply the matching applied operation ID. Successful promotion/review actions close their own jobs. A held action may leave new proposal work; inspect results instead of assuming all related work was closed.

When a write response is uncertain, reuse its original idempotency key and payload. A claim may expire before recovery: inspect the outcome first and reclaim still-open work as needed. An expired token cannot authorize a new mutation. Never repeatedly change keys to force a result.
