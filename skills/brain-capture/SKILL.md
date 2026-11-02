---
name: brain-capture
description: Save a durable decision, preference, lesson, milestone or supported project fact to a Brain. Use for explicit save requests or useful same-session capture under standing permission; skip transient chatter and duplicates.
---

# Capture useful knowledge

Preserve the smallest useful, sourced addition. The agent verifies evidence and routing, submits a candidate for Jev advice, then decides and writes the final Markdown directly. Jev never grants permission or vetoes an authorized write.

## Select the authorized route

Read the owner's policy and capture contract to select the route. For MCP, discover the connected tools, call `brain_status` and read `brain://policy`, or inspect `BRAIN.md`, `AGENTS.md`, `CONTEXT.md` and `PARA.md` plus the capture contract. An explicitly configured local route reads those files locally and does not require an MCP connection. Reuse current policy already read in this session. Skills provide procedures, not standing write permission.

The default route is MCP. An owner may explicitly retain a local capture workflow during migration; select that route before submitting and follow its source checks, write rules, navigation and checkpoint procedure. If that local workflow is inaccessible, report the gap. Never switch to local writes after an MCP rejection, held proposal or uncertain response. Do not modify service acceptance settings or privacy metadata to force a write.

## Prepare a supported capture

1. Decide whether the source adds a durable preference, decision, lesson, milestone or fact. A request to run a test does not support saying it passed. Assistant-reported outcomes stay reported unless their original evidence is verified. Skip routine activity and repeated context.
2. Search by topic and stable source IDs, including relevant Inbox and history. Inspect an existing same-scope note before choosing an addition or a new note. Read the intended existing parent hub and any related notes you will link. Avoid whole-vault scans.
3. Verify source access and disclosure rules before storing or supplying excerpts. Preserve required owner metadata, truthful confidence, chronology and unrelated text. Never copy credentials, raw transcripts, restricted source documents or client PII. External-assessment exclusions are not consent to retain otherwise forbidden material as a proposal.
4. Choose an existing owner-authorized destination. Keep unresolved routing/evidence in the owner's designated Inbox when permitted; do not invent a folder or mark uncertainty reviewed. Link the actual parent and only supported related context. Filing does not change a project's real-world status.

## Submit and verify through MCP

For an eligible sourced capture, call `assess_memory` with `path`, candidate `markdown`, verified `sources`, fresh `expectedRevision` (null for an absent new note), unique `idempotencyKey`, and `intent: capture` or `consolidate`. Optionally supply up to five relevant `contextPaths`. Supply at least one admissible nonempty supporting excerpt; the service never fetches the source URL. The response saves an immutable candidate/result and returns `assessment`, `workId` and a private five-minute `claimToken`. It has not written a note.

Read the quality scores and candidate/context recommendations. Decide whether to save, revise, merge into an authorized existing note, or make no change. High overlap can be useful consolidation. Recommendations to archive/delete/create folders do not expand authority. `unavailable` is missing advice, not a write veto; independent source checks still apply.

Commit with `remember`: exact final `path`, `markdown`, verified `sources`, fresh `expectedRevision`, a separate unique commit `idempotencyKey`, and `assessment: {id, claimToken, reason}`. Explain your actual decision, including any departure from the advice. Changed candidate/context is allowed and labeled as earlier assessment in the panel. One assessment resolves one primary commit. To skip, `finish_work` the claimed assessment with `done` and a concrete reason; to wait, defer the same work. Do not create another Inbox copy of an interrupted staged candidate.

Use the correct existing destination by default. A genuine evidence, conflict or routing exception may instead be saved in the authorized Inbox with `status: inbox` and concise `review_reason`, then picked up by the existing authorized sweep. This closes assessment work and leaves one Inbox item. An unverified claim must remain explicitly reported/uncertain. Legacy `remember` without an assessment still writes directly and displays “Not assessed”; it is also appropriate for an eligible exception without assessable excerpts. Never fake an assessment.

Read [write outcomes and recovery](references/write-outcomes.md) before submitting or advancing a collector checkpoint. Only `applied` confirms a server write. Read back that path and verify metadata, sources and link targets. Device sync is a separate observation.

Perform any required immediate-parent update as its own authorized, revision-checked operation, using `relatedAssessmentId` after the primary commit. This records provenance without inheriting Jev scores for different text. If a required navigation or bookkeeping step cannot complete, report partial completion and keep the collector's capture/checkpoint pending. MCP cannot write protected policy or `_System` files; use only an independently configured local bookkeeping route. Never claim a held proposal is an Inbox Markdown note.

Preserve existing collector ownership, schedules and budgets. Do not drain another client's conversation queue, create background jobs, reorganize existing notes or publish content as part of capture.
