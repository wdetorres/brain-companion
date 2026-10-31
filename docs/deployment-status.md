# Jev deployment status — October 31, 2026

This section supersedes the historical checkpoint below.

- Local service: http://localhost:3010, healthy container `brain-companion-brain-1`, rebuilt and recreated with both Compose files. The same `/data/vault`, `/data/state`, and `/home/node` named volumes remain attached. The desktop vault was not mounted or modified.
- Pinned `JEV_MODEL=jev-1.14.0`; the key is configured and `AUTO_ACCEPT` remains empty. The running adapter matches the evaluated SHA-256 `61a281f05328859ae084a049fc194dd76f740baa29fd5dfbfb94478fb3086fd0` (`memory-recall-links-v21`). No private eval files or `.env` are present in the image.
- A fresh consistent SQLite backup and private revision/history/session baseline were saved under ignored `data/` before recreation. All note revisions and operation IDs matched afterward, the same owner session worked, and scheduled Obsidian sync succeeded without reauthentication at `2026-10-31T11:43:43.098Z`. A further recreation for the Recall refinement preserved the same state and session, with sync confirmed at `2026-10-31T11:57:29.957Z`.
- Authenticated recall/connection route checks passed, including anonymous denial, origin/CSRF validation, invalid category rejection, nonexistent-link rejection and an empty-keyword recall. These checks made no live-vault Jev calls and changed no Brain notes.
- Docker's build passed TypeScript, **46 tests**, the production asset build and dependency pruning. Coverage includes comparison facts, model response validation, scored recall, cached revisions, restricted-note exclusion, reviewed link writes, stale source/target revisions, idempotency, journal recovery, owner authorization and the 2,000-request cap.
- Hosted demo: https://brain-companion-hazel.vercel.app/demo. Deployment `dpl_Hf4tSFBoCP88jqoBTcSZgBQUuNxA` is READY and aliased to the existing domain. The Vercel MCP received an explicit 51-file source allowlist; no `.env`, Brain excerpts, SQLite files, owner password or evaluation data was uploaded. Production JS/CSS hashes match the checked local build.
- The refreshed browser showed category filters, dotted proposals and the two-note review with the exact appended link. No console warnings/errors were recorded. Earlier full UI checks covered worth-remembering, contradictory recall, sample link saves, desktop and narrow-screen overflow. The subsequent Recall refinement matches the monochrome reader theme with a centered content column; desktop/mobile category, evidence and conflict interaction checks passed.
- Public `/api/brain` and `/api/recall` return the expected 503 setup response because no persistent remote backend is connected. `/data/evals/brain-cases-v6.json` returns 404. Demo content is synthetic and scores are illustrative. No paid Render service or public tunnel was created. The real service remains local and requires the Mac awake with Docker running.
- The independent local and GitHub histories were joined with a merge commit and published to `main` without rewriting existing commits. The verified local application tree, including the centered Recall column, was preserved; only these source-control status notes changed during reconciliation. Private evals and credentials remain excluded.

## Acceptance gate passed

The private dataset has **336 cases from 29 Brain notes**. v21 passed 286 development cases and the final untouched 50-case holdout: **92.9% exact memory outcomes, 100% categories, 100% lasting-value accuracy, 100% recall precision/coverage, and 100% connection precision with 80% coverage**. Unsafe memory acceptances, unsafe recall routes and invalid/API failures were zero. All numerical thresholds remained unchanged. See [the complete evaluation report and limits](jev-features.md).

Actual request count: **1,834 / 2,000**. The final holdout used 73 new calls and three repeated classification requests within that same holdout; a private cache audit confirmed none of those cache hits came from development. Failed holdouts and rejected candidates remain recorded. No additional tuning followed the passing holdout. Automatic writes remain disabled and links require owner review.

## Completion evidence

| Requirement | Evidence |
| --- | --- |
| Worth remembering and four categories | Shared typed outcomes, Jev adapter, Changes review and category filters; final holdout 28/28 worth and 24/24 category labels |
| Evidence and conflict recall before answering | Same store assessment exposed by authenticated HTTP and MCP, separate evidence/conflict results, unavailable-state handling; recall integration tests and final 12-case recall set |
| Dotted, reviewed connections | Graph dotted edges, both-note preview and exact appended link; integration coverage for authorization, revisions, dismissal, idempotency and recovery |
| Relevant private Brain evals and iterative gate | Source-linked 336-case ignored dataset, preserved failed iterations, frozen thresholds, development and untouched-holdout passes, model/dataset/adapter fingerprints |
| Local and hosted updates | Running Docker hash matches the passing adapter; preserved state/sync; READY Vercel alias, asset hash checks and browser verification |

## Still not verified

A live remote ChatGPT/OAuth client connection, convergence to another device, backup restoration and real power-loss recovery were not performed. Local authenticated routes and temporary-vault integration tests do not establish those results. Small held-out samples do not establish production-wide accuracy or whole-vault semantic retrieval.

---

# Historical checkpoint — before the Jev feature implementation

Updated 2026-10-31 (Asia/Manila).

## Current decision

Use local Docker temporarily. Paid Render deployment is paused at the owner's request. No Render service or disk was created. The workspace is still Hobby. The repository is public at https://github.com/wdetorres/brain-companion.

## Ready

- Published the application source, based on local main at `9d7b5f7`.
- Pinned official Obsidian Headless to `0.0.14`; Docker health check honors `PORT`.
- Added `compose.local.yaml`: localhost origin, development HTTP, no Vercel bridge secret required locally. The host port stays bound to `127.0.0.1:3010`; owner password authentication remains required.
- Reused the existing named volumes for Markdown, SQLite, and the Obsidian account home. The desktop vault is not mounted or copied.
- The generated password hash and bridge secret are in the ignored mode-0600 `.env`. The owner password is in ignored `data/owner-password.txt` (mode 0600), outside the container environment. Store it in a password manager.
- Saved the bridge key as a sensitive, production-only Vercel variable. The hosted monochrome UI remains at https://brain-companion-hazel.vercel.app; no backend URL or tunnel is connected.
- Verified 27 application tests, TypeScript, and production asset build during deployment preparation. Then validated both Compose configurations, localhost binding, all three volume targets, unchanged production bridge settings, exclusion of the plaintext owner password, and `git diff --check`.
- Reviewed the published source before changing visibility: no live credentials or real-vault files were included. Demo content is synthetic.
- Reworked the graph after real-vault visual feedback: connected clusters, a monochrome charcoal canvas, faint links, and collision-aware labels. Published application commit `676bd7a4fe5a2f84ec7c1d61371c49b79673592d`; 29 tests, TypeScript, build, and synthetic desktop/mobile browser checks passed. The local image must be rebuilt to use it.
- Added a read-only Jev review to Changes, with recorded evidence-support, duplicate, and conflict signals, classification, and the stored operation outcome. The graph/page header links to reviews. The public demo at https://brain-companion-hazel.vercel.app/demo?view=changes includes four explicitly illustrative scenarios; it makes no Jev calls. Production application commit `3ea5bce9651f59981cabc78b010417cb505870f3`, deployment `dpl_8w2eLwL8sm8GwMhZLynegoQ1BEyr`, is ready. TypeScript, 30 tests, build, all four scenario selections, and the shortcut passed; desktop and narrow-screen browser checks found no horizontal overflow or console warnings/errors. Local Docker still needs a rebuild to show this UI. No evaluator thresholds, automatic-write settings, or API permissions changed.

## Start locally

Run in a normal terminal, from the repository directory:

```sh
docker compose -f compose.yaml -f compose.local.yaml up -d --build
```

The owner ran the command successfully: the Docker image built, all three named volumes were created, and `brain-companion-brain-1` started. This agent session still cannot access the Docker socket directly. Do not use `down -v`; it deletes the data volumes.

Browser checks against http://localhost:3010 passed: `/healthz` returned `{"ok":true}`, anonymous vault/MCP requests required authentication, both OAuth discovery documents used the local origin, and owner login succeeded. The owner then authenticated Obsidian Headless, selected the remote vault, and reported a completed one-shot sync (`Fully synced`). The authenticated vault API now returns real notes in live mode; the existing browser session still works. Private note counts and a sample revision are recorded only in ignored `data/restart-baseline.json` for comparison after recreation.

Local `.env` now has `SYNC_ENABLED=true`, but the running container still needs recreation to apply it. Its API currently reports `Not configured` because the successful first sync ran manually outside the application scheduler. Run:

```sh
docker compose -f compose.yaml -f compose.local.yaml up -d --build --force-recreate brain
```

After recreation, confirm the same notes and browser session, then a fresh `Last sync succeeded` status without reauthenticating Obsidian. This verifies the mounted vault, SQLite session, and Headless credentials. No operation history exists yet, so operation and OAuth-token persistence require separate checks. A full OAuth code exchange, authenticated MCP tool calls, and live restart persistence remain unverified.

## Remaining setup

The owner configured the local Jev key and completed live synthetic evaluation with `jev-1.14.0`. Clarified evidence/duplicate/conflict questions improved exact matches from 2/6 to 5/6, with zero unsafe acceptances or API failures; mean response time was 324 ms. The remaining new-memory case was retained as uncertain (support 0.93, duplicate 0.03, conflict 0.06). Thresholds remain unchanged and `AUTO_ACCEPT` remains empty. This small sample does not validate automatic writes. The owner also ran the isolated MCP/Jev/SQLite workflow successfully against live `jev-1.14.0`: the supported update was retained as `needs_attention`, the synthetic note stayed unchanged, the proposal and decision survived closing and reopening SQLite, and retries reused the operation with only one Jev call. This validates the tool-handler/store integration in a temporary vault; live Docker, OAuth, and Obsidian persistence remain unverified.

1. Complete a live OAuth code exchange and authenticated MCP tool calls after configuring the vault.
2. Recreate Docker to load the local Jev key and revised evaluator, then verify a retained proposal through the authenticated service. Leave `AUTO_ACCEPT` empty while evaluating unseen representative cases.
3. Recreate the local service with both Compose files to activate scheduled sync after the completed manual sync. Keep this container vault separate from the desktop vault.
4. Verify container recreation preserves notes and browser sessions and that scheduled sync succeeds with the persisted Obsidian credentials. Then verify operation history and OAuth grants after creating a test proposal and connection. No live restart result is claimed yet.
5. For remote agents and the hosted Vercel UI, connect a stable HTTPS tunnel to the **production** Compose configuration and set Vercel's `BRAIN_SERVICE_URL`. Do not expose the local override publicly. No tunnel was provisioned.

The Mac must remain awake and Docker running. Render or Railway can replace it later using the existing portable Docker image and persistent paths; resuming paid Render provisioning requires a new instruction from the owner.

## Source-control boundary

The shell cannot resolve GitHub and local `.git` is read-only in this session. Source publication used the GitHub connector, so remote history starts with a snapshot rather than the original local ancestry. Local main remains at `9d7b5f7` with deployment changes in the working tree. Do not force-push it over remote main; reconcile the histories in a normal terminal before further git-based work.
