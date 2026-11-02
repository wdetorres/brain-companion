# Note reads during sync and backend deploy filters

Updated November 2, 2026. The unchanged-note fast path (`ac07626`) and Render filters are live. The startup lifecycle follow-up below is locally verified and awaits the release owner’s coordinated rollout.

## Read behavior

`BrainStore.inspect` first asks the existing note index for a validated unchanged note outside the mutation queue. It checks the path, symlinks, file type, size, inode/size/mtime/ctime signature, and current index readiness. After the asynchronous stat, readiness and cache-entry identity must still match. No file contents are read or partially synchronized note is parsed by this fast path.

Before each network sync, including startup, the existing queue validates the derived index against local files. It does **not** recover pending writes/promotions or change Markdown before pulling remote edits. Initial readers wait only for that validation, then unchanged note bodies use the same signature/path checks. During sync, browse snapshots and status return the completed pre-sync view with its original `indexedAt`, prior `lastSync`, and explicit `Syncing with Obsidian` status. Work/activity summaries are from that same pre-sync point.

After successful or partially failed network sync, the existing scan reconciles changes and journal recovery before releasing the mutation queue. A failed sync retains the last successful timestamp; failed validation clears the read view and index readiness. Changed/missing notes still use serialized inspection and never parse an in-progress synced file. Memory writes and their revision guards remain serialized. Search/evaluation/work operations retain their existing queue behavior.

A duration-only `brain_sync` log is emitted for syncs over one second or failures. It contains total/network milliseconds and fixed status text, never paths, note content, credentials, or CLI/error output. The network timeout and bridge timeout are unchanged.

## Local evidence

- The two new sync-overlap regressions failed before the fix and passed after it.
- An unchanged read completes while sync is held; a target changed to partial content waits and returns only the final synchronized contents. Another unchanged note remains readable meanwhile.
- A controlled stat race rejects a cache entry when invalidation or refresh occurs during the await.
- Existing deleted/oversized/symlink/traversal, categories, sync-failure, write serialization, and revision-conflict tests pass.
- All **98 tests**, TypeScript, production build, and diff checks pass, including cold/reopened/consecutive syncs, requests arriving before validation, partial failure, validation failure, and pending promotion recovery ordering.
- Synthetic 225-note vault, sync held **6002 ms**: three different indexed notes loaded in **0.159, 0.089, 0.185 ms**, all before sync completed. These are local store timings, not production HTTP/browser latencies.

- Startup follow-up, synthetic 225-note vault with each sync held for two seconds: initial note + browse + status completed in **31.22 ms cold**, **11.97 ms reopened**, and **15.22 ms next cycle**, all before network sync ended. These exclude HTTP/browser overhead.

## Live evidence before the startup follow-up

On `ac07626`, the first post-deployment MCP inspection failed after **59.160 s**; subsequent reads took **0.651 s** and **1.582 s**. App/request logs did not establish the failed request’s exact cause. The cold index can demonstrably queue behind startup sync, and the bridge aborts at 55 seconds, but this is not proof of that individual failure’s cause.

A later unchanged note read took **0.424 s** and returned **5.478 s before** the real sync finished. The first read after a quiet completed sync took **0.548 s**. The note revision and modification time remained unchanged. These are external MCP tool round trips, not backend-only timings. The startup follow-up still needs the same production check after deployment.

## Render build filter

The applied Update Service payload is [`deploy/render-build-filter.json`](../deploy/render-build-filter.json). The release owner verified its included paths on the existing `brain-companion` Render service, with **no ignored paths**. It is not a Blueprint and is not applied by committing the file.

| Included input | Why the backend must rebuild |
| --- | --- |
| `server/**` | Backend runtime and new backend modules |
| `src/shared.ts`, `src/links.ts` | Imports used by the backend |
| `docs/agent-guide.md` | Read by the MCP server at startup |
| `Dockerfile`, `.dockerignore` | Image, startup, Headless version, and build context |
| `package.json`, `package-lock.json` | Dependencies and build commands |
| `tsconfig.json` | Docker's type-check gate |
| `scripts/build.mjs`, `scripts/build-graph-preview.mjs` | Build entry point and its conditional imported script |

`tests/render-build-filter.test.ts` bundles the static backend import graph without executing it and verifies every local module is covered. A new server import of a shared file outside the allowlist fails the test. Explicit filesystem resources such as `docs/agent-guide.md` are checked separately; new computed imports or filesystem-loaded resources require updating that list during review.

Ordinary docs, skills, tests/fixtures, Vercel bridge/configuration, frontend components/styles, and public assets do not trigger Render by themselves. Test-only edits validate behavior but do not change the running API. All tests, fixtures, frontend assets, and build inputs remain in the Docker context and the Dockerfile still runs the complete type check/test/build on the next qualifying backend deployment.

The canonical UI is on Vercel at `brain.wilsondetorres.com`. Render's standalone fallback UI assets will consequently lag UI-only releases until the next backend build. Any change that intentionally needs the standalone Render UI refreshed requires a deliberate backend deploy and its interruption. No UI/API contract change may silently omit its corresponding server/shared change.

Render's [filter rules](https://render.com/docs/monorepo-support#setting-build-filters) say included paths form an allowlist, ignored paths override includes, and filters only affect automatic deploys. Do not add `docs/**` as an ignored path: it would suppress the required MCP guide update. Manual deploys and service configuration changes can still restart the backend.

## Coordinated rollout and remaining verification

1. Keep the tested UI release separate until the performance gate passes; the release owner retains sole control of pushes and deployments.
2. Release the startup follow-up against current main without the held UI changes. It matches `server/**`, so one actual backend replacement remains necessary. Preserve the existing disk, auth, writer settings, and service plan.
3. After recovery, measure the first authenticated reads after restart, reads overlapping a real sync, and reads after a quiet completed sync. Verify fresh/changed-note handling, successful sync and existing sign-in. Recheck the normal browser reader. Changed-file fallback still waits for sync; report measured limits separately from unchanged-note latency.
4. Only after the owner's performance gate is satisfied, release the held UI. Confirm Vercel advances and Render does not redeploy for that UI-only diff. The exact queued UI candidate should be compared against the configured filter before pushing.

Build filters prevent needless replacements; they do **not** make true backend restarts zero-downtime. This single-instance service's persistent disk remains a [zero-downtime exception](https://render.com/docs/deploys#zero-downtime-deploys). No paid infrastructure, scaling, auth changes, or sync scheduling changes are part of this fix.
