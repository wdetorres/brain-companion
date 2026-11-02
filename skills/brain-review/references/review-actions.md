# Actions for a claimed item

## Interrupted assessment or commit

Inspect `assessmentId`, its `progress.operationId` when present, and the actual target before deciding. Reopen original evidence and current revisions; stored excerpts and scores do not establish current truth. Claim the assessment job before resuming. Reuse its immutable result and original commit key/payload if recovering an uncertain write. A replacement claim token may replace the expired token without changing content or the decision reason. Inspect completion first; never write twice because a response was lost.

When ready, `remember` with `assessment: {id, claimToken, reason}` and the checked final candidate. For promotion, retain the separate Inbox claim token plus this assessment claim. Changed text/context is labeled as an earlier assessment; use a fresh assessment only when materially new evidence makes it useful, explicitly finishing/superseding the old work within authority. `unavailable` advice does not block independently verified writes. A successful primary write closes its assessment job; an intentional Inbox save leaves one Inbox job. A parent update uses `relatedAssessmentId`, not another primary use.

If no change is justified, finish the assessment `done` with the decision reason. If access, evidence or authority is missing, defer that same item with the exact blocker and a future retry time (default seven days). Staged text is not a note; do not create a duplicate Inbox capture solely for recovery.

## Legacy held proposal

Inspect the operation before acting. `review_memory` takes the operation ID, current claim token, reason and `accept` or `dismiss`. Acceptance also needs a new idempotency key and writes directly against the original expected revision without rerunning Jev. Write permissions and privacy checks still apply; it cannot overwrite later changes. Dismissal records a reason and retains history.

If prose, evidence or revision needs correction, submit a corrected `remember` proposal with a new key and fresh revision. Do not mark the old item resolved until the replacement is actually applied; finish the old work with its matching applied operation ID where required. If held, keep the gap visible rather than treating acceptance as success.

## Inbox filing

Promotion requires explicit task/owner authority and `promote` in `brain_status.autoAccept`. Inspect and claim the Inbox source, verify original evidence and portability, search for duplicates, and read the existing destination parent.

For useful new evidence, first `assess_memory` with `intent: promote`, `sourcePath`, candidate destination and the current source revision; include the returned assessment reference and reason in the final call. Existing stored advice can be reused; a routine sweep does not require a paid reassessment. Jev scores and outages never veto filing.

Call `promote` with `sourcePath`, destination `path`, exact destination Markdown, verified sources, source revision, claim token and unique idempotency key. Destination must not exist and its parent must be an existing Projects/Areas/Resources folder. Preserve original provenance, factual content and link targets. A similar note or an unchanged body is not evidence of source verification.

Broken or retargeted links, collisions and changed source revisions can block filing. Report affected paths; do not delete a remaining source or rewrite unrelated notes to bypass the check. Inspect the destination after `applied` and complete only authorized parent-navigation work. For interrupted or uncertain outcomes, retry the exact original key/payload and inspect the operation and both paths.

## Changed-note review

Inspect the current note, original source and relevant links. A task may authorize findings only; do not infer editing permission from a review job. An authorized correction uses `remember` with actual source evidence and the current revision. A completed note update resolves its own live note-review claim or invalidates old work; inspect before attempting another finish.

## Finishing and recovery

`finish_work` records an outcome; it does not write or promote a note. For a resolution that changed a note, supply the matching applied operation ID. Successful promotion/review actions close their own jobs. Validation failures remain pending with their actual reason. Assessment-bound attempts reuse the same assessment job rather than creating a second proposal job; inspect results instead of assuming all related work was closed.

When a write response is uncertain, reuse its original idempotency key and payload. A claim may expire before recovery: inspect the outcome first and reclaim still-open work as needed. An expired token cannot authorize a new mutation. Never repeatedly change keys to force a result.

## Explicit bounded reversal

Only an explicit owner undo request or an already-authorized reversal task permits `undo_memory`. Inspect the original applied operation and current affected paths. Supply its ID, original result `expectedRevision`, reason and stable idempotency key. The server checks current content, path reuse, privacy and incoming links before restoring recorded prior state. It refuses later edits and dependent links; remove dependencies only through separately authorized changes. It cannot undo an undo, delete arbitrary notes, or cascade through related operations. Reuse the exact key/payload after interrupted responses and inspect recovery before another action. Jev archive/delete advice alone never authorizes undo.
