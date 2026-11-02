# Jev memory and retrieval update

Authorized 2026-10-31: implement all four roles, use minimized personal/project Brain excerpts in a private ignored eval dataset, spend at most 2,000 total Jev requests (increased from 1,000, then 1,500), update the local Docker service and hosted demo. Automatic writes stayed disabled during this evaluation. Wilson subsequently authorized the harness implementation but deferred activating its workflows until deployment; see [harness.md](harness.md). Existing uncommitted work was part of the baseline.

Scope: shared types, Jev adapter, keyword shortlist, store/history, authenticated HTTP and MCP recall, graph and review UI, synthetic demo, evaluator/fixtures/tests, agent guidance and deployment documentation. No generative answers, embeddings, bulk reclassification, automatic link writes, or Brain workflow changes.

## Acceptance gate (frozen before evaluation)

Use development and held-out cases separated by source/topic, not randomly repeated paraphrases. Record each source path, selected evidence and label rationale privately. Counterfactual and injection cases must be marked as authored tests rather than Brain facts.

- Zero unsafe memory acceptances: chatter, unsupported claims, contradictions and attacks must never become new/update.
- At least 90% exact memory outcomes, worth-remembering labels, and category accuracy on applicable cases.
- At least 90% recall evidence precision and recall coverage; all labeled contradictions and injected passages must be routed safely.
- At least 90% connection precision and 80% positive connection coverage; zero unsafe link saves.
- Zero invalid/API responses in the final run; all unit, integration, type and build checks pass.
- Final gate requires unseen held-out cases. If tuning follows a holdout failure, retire that set into development and construct a fresh holdout before claiming a pass. No threshold loosening to pass.
- No automatic acceptance enabled by an eval result. Live model limitations remain explicit.

The runner must enforce a persistent request budget across retries/reruns, report model/question version, dataset fingerprint, usage, per-role metrics and failures. Keep private cases/results under ignored `data/evals/`; only synthetic fixtures and aggregate reports may be published.

## Implemented

The memory adapter checks source support, duplication, lost context, lasting value and category. Categories use structured definitions, examples and exclusions. Empty comparison sets cannot contain duplicates or lost context; byte-identical current content is a deterministic duplicate, recorded as `comparison: exact_content`, while Jev still assesses its category. These facts bypass unnecessary model comparisons without changing any acceptance threshold. Source excerpts retain the subject, date and qualifications; Jev does not fetch citations. Existing internal/client/policy notes are excluded from model assessment. Categories can filter current classified notes and proposals without rewriting the vault.

Recall reviews at most eight keyword matches, promotes useful evidence and returns contradictions separately. The browser has a dedicated Recall view and the MCP tool exposes the same results. Model failures return an explicit unavailable state. A keyword shortlist can miss synonyms; this is not a full semantic search engine.

Suggested connections classify a pair as connected, unrelated or an evaluator-directed instruction attack; a connected probability of at least 0.90 is required. They appear as dotted graph edges. The owner reviews both notes and the exact appended wiki link. Save rechecks both revisions, uses the existing journaled writer and persists an operation; dismissal never modifies Markdown. The public demo uses synthetic notes and illustrative scores, with link changes confined to the browser session.

## Evaluation outcome — October 31, 2026

**The frozen acceptance gate passed on development and the final untouched holdout.** At the time of this gate, automatic writes were disabled. The subsequent harness supports verified writes and explicit link review by the owner or an authorized agent, but automatic writes remain disabled until deployment/adoption.

The private dataset contains **336 distinct cases from 29 Brain notes**: 286 development cases and a fresh 50-case holdout. It covers personal preferences, project constraints/results, pending checks, dated service/travel status, career records, decisions, duplicates, sourced revisions, conflicting accounts, unsupported inferences, chatter and authored attacks. Two final-holdout preferences are explicitly authored variants grounded in the source topics, not claims about Wilson. Client material, credentials, account identifiers, raw transcripts and third-party personal details were excluded. Exact source paths, minimized evidence, fingerprints and label rationale stay in ignored local files.

| Metric | Development (286) | Untouched holdout (50) | Gate |
| --- | ---: | ---: | ---: |
| Exact memory outcome | 91.6% (142/155) | 92.9% (26/28) | ≥90% |
| Worth remembering | 100% (155/155) | 100% (28/28) | ≥90% |
| Category accuracy | 96.1% (124/129) | 100% (24/24) | ≥90% |
| Recall evidence precision / coverage | 100% / 100% | 100% / 100% | ≥90% each |
| Connection precision | 100% | 100% | ≥90% |
| Positive connection coverage | 93.1% (27/29) | 80% (4/5) | ≥80% |
| Unsafe memory acceptances / unsafe recall routes | 0 / 0 | 0 / 0 | 0 |
| API or invalid-response failures | 0 | 0 | 0 |

Recall handled all 18 development and 3 held-out contradictions, and all 6 development and 1 held-out injection passages. Zero unsafe link saves was verified with integration tests for explicit review, stale revisions, idempotency and journal recovery, not inferred from model scores.

The final holdout was authored before the last category refinement, separated by source/topic from observed development cases, and evaluated only after development passed. The adapter and numerical thresholds were frozen for that run. No labels or thresholds were changed to turn a failed holdout into a pass. Failed holdouts were retained in the audit and retired into development before further tuning.

### Iteration history

- Earlier 44-, 42- and 50-case holdouts failed memory/category accuracy. Structured category definitions and deterministic empty/exact comparison facts improved development results. Two early source/label defects were documented: a supposed duplicate omitted a separate fact, and an excerpt had lost the date identifying its task.
- v18 passed memory/category/recall on a new 50-case holdout, but connection coverage was 3/5. A broader-wording connection candidate regressed on 31 observed cases and was rejected.
- v20 used explicit connection classes and passed that role on the next untouched 50-case holdout (5/5), but memory accuracy was 22/28 and categories 21/24. Two synthetic source envelopes prefixed “Authored test statement” were safely treated as uncertain; those observed failures were retained, not relabeled. Subsequent authored fixtures keep provenance markers outside the source statement and are explicitly labeled in dataset metadata.
- v21 clarified conditional choices, concrete verification steps and factual corrections. It passed the complete 286-case development set and the final untouched holdout above. The final memory errors were conservative false rejections; the missed connection concerned two historical installment schedules. These remain recorded limitations.

### Reproducibility and limits

Final adapter: `memory-recall-links-v21`, pinned model `jev-1.14.0`. Dataset SHA-256: `788a0e110fa0f00387e3f254eca4155be1bfa82d2b28785ac472e4a10285abf4`. Adapter SHA-256: `61a281f05328859ae084a049fc194dd76f740baa29fd5dfbfb94478fb3086fd0`.

Total actual evaluation requests: **1,834 of 2,000**. The final holdout used 73 new requests and 3 exact-request cache hits, with 63,159 live input tokens and 4,026 live output tokens, averaging 233 ms per successful live request. Cache hits were repeated statements within the held-out set; cached replays are not independent trials. Report `usage` includes cached responses; `requestUsage` counts only new successful requests. The private runner preserves the cumulative ledger, enforces the 2,000-request cap, serializes runs and supports up to 400 cases per split.

These are small-set observed rates, not production reliability guarantees. Connection coverage met its threshold at 4/5. Recall metrics evaluate supplied shortlisted passages; an additional offline shortlist check found 2 keyword misses among 10 development evidence/conflict cases in a miniature corpus. This does not establish whole-vault semantic search coverage. The public demo uses synthetic notes and illustrative scores; it does not run Jev or expose the private dataset.

Validation: **46 tests**, TypeScript and the production build passed. Tests cover deterministic comparison facts, response validation, authorization, reviewed links, revision checks, idempotency, recovery and budget enforcement. Deployment evidence is in [deployment-status.md](deployment-status.md).

Design references: [TypeSafe memory gating](https://docs.typesafe.ai/cookbooks/basic_memory), [passage classification](https://docs.typesafe.ai/cookbooks/classifying_rag_passages), [structured choice criteria](https://docs.typesafe.ai/primitives/choice), and [citation relationships](https://docs.typesafe.ai/cookbooks/citation_check).

## Harness integration follow-up

The unchanged v21 adapter passed an isolated synthetic capture/review/promotion/recall workflow using seven additional Jev requests. Total cumulative usage is now **1,841 / 2,000**. This is integration evidence, not a new accuracy holdout. Promotion additionally verifies supplied source evidence independently of the unresolved Inbox note.

## Append assessment fix — November 2, 2026

`memory-recall-links-v22` separates source support for an appended addition from its relationship to stored history. Only an exact preserved prefix ending at a newline qualifies. That preservation makes removed-context probability zero; replacements retain all v21 checks. The addition still needs source support ≥0.95, novelty ≥0.95, compatible-history probability ≥0.95, conflict ≤0.05 and the existing worth/category thresholds. Related notes participate in novelty and conflict checks. A later verified state can supersede a dated checkpoint without erasing it. Source URIs and observation times accompany appended evidence.

Appends use three Jev requests: historical relationship/novelty, source support, and classification. Every response is validated, model versions must agree, and usage includes all three requests. No API, permission, privacy, revision or journal behavior changed.

The final 13 authored append regression cases in `tests/fixtures/jev-append-regression.json` matched every expected outcome: five legitimate updates, four conflicts, two unsupported holds and two duplicates (including one found only in a related note). The first 12-case run had one conservative duplicate/uncertain mismatch; the final run followed explicit related-note wording and is development evidence, not an untouched holdout. The existing 50-case frozen holdout replay retained its passing metrics with zero new requests; cached replay is not independent model evidence.

With the production related-note shortlist, the corrected held project update now meets the unchanged 0.95 source-support threshold. The broader original remains uncertain at 0.74 support; that two-case strict evaluation remains a failure (1/2), not a claimed all-pass gate. An earlier eight-case diagnostic set also retained one conservative false hold. No unsafe acceptance was observed in these bounded checks.

All 77 tests, TypeScript and the production build passed. Cumulative evaluation usage before live activation: **1,983 / 2,000**. Live acceptance and remaining limitations are recorded in [writer-activation.md](writer-activation.md).
