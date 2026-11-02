# Note reads during sync and backend deploy filters

Prepared November 2, 2026. Local verification is complete; hosting settings and production deployment remain held by the owner. This document is not evidence that the fix or filters are live.

## Read behavior

`BrainStore.inspect` first asks the existing note index for a validated unchanged note outside the mutation queue. It checks the path, symlinks, file type, size, inode/size/mtime/ctime signature, and current index readiness. After the asynchronous stat, readiness and cache-entry identity must still match. No file contents are read or partially synchronized note is parsed by this fast path.

Cold, changed, missing, or invalidated entries retain the existing serialized inspection/scan/reconciliation. Memory writes, revision checks, promotion recovery, and Obsidian sync retain the same exclusive queue. Successful and partially failed sync still invalidate the index. Link metadata from other pages follows the next refresh/completed sync as before.

This removes waiting for a **browser-uncached but already indexed, unchanged note**. It does not promise fast startup snapshots or reads of a file actively changing during sync. It also lets unchanged note reads proceed during a queued evaluation without relaxing mutation serialization.

## Local evidence

- The two new sync-overlap regressions failed before the fix and passed after it.
- An unchanged read completes while sync is held; a target changed to partial content waits and returns only the final synchronized contents. Another unchanged note remains readable meanwhile.
- A controlled stat race rejects a cache entry when invalidation or refresh occurs during the await.
- Existing deleted/oversized/symlink/traversal, categories, sync-failure, write serialization, and revision-conflict tests pass.
- All **94 tests**, TypeScript, production build, and diff checks pass.
- Synthetic 225-note vault, sync held **6002 ms**: three different indexed notes loaded in **0.159, 0.089, 0.185 ms**, all before sync completed. These are local store timings, not production HTTP/browser latencies.

## Render build filter proposal

The reviewable Update Service payload is [`deploy/render-build-filter.json`](../deploy/render-build-filter.json). Apply its included paths to the existing `brain-companion` Render service, with **no ignored paths**. It is not a Blueprint and is not applied by committing the file.

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

1. Keep the held UI release separate. Have the release owner review/apply the filter payload to the existing service; inspect the saved paths and any resulting deploy state before proceeding.
2. Release this backend fix against current main without the held UI changes. It matches `server/**`, so one actual backend replacement remains necessary. Preserve the existing disk, auth, writer settings, and service plan.
3. After recovery, measure authenticated note reads that overlap a real sync, verify fresh/changed-note handling and successful sync, and check existing sign-in. Recheck the normal browser reader.
4. Only after the owner's performance gate is satisfied, release the held UI. Confirm Vercel advances and Render does not redeploy for that UI-only diff. The exact queued UI candidate should be compared against the configured filter before pushing.

Build filters prevent needless replacements; they do **not** make true backend restarts zero-downtime. This single-instance service's persistent disk remains a [zero-downtime exception](https://render.com/docs/deploys#zero-downtime-deploys). No paid infrastructure, scaling, auth changes, or sync scheduling changes are part of this fix.
