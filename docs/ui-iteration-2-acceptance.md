# Graph, Review and account refinement

November 2, 2026. Branch: `codex/graph-review-polish`, based on released `8581cc9`. Integration includes production changes through `e9e2116` and performance fix `ac07626`. Wilson explicitly held deployment after the performance checks found sync-overlap latency and backend replacement downtime. No part of this follow-on UI iteration or performance fix has been deployed.

## Result

- Pull graph nodes and their actual neighbors respond. Movement settles after release, with no idle animation. Clicking still opens a note; dragging does not. Arrow keys move the focused node, Enter opens it, and Reset restores the layout and camera. Motion stops when hidden or unmounted. Reduced motion moves only the directly controlled node. Graph positions are temporary; note links and suggested connections are unchanged.
- Review opens unresolved proposals first on desktop. The reason, proposed diff and sources precede actions and collapsed evaluator details. Pending items are separated from recent activity; routine Obsidian edits are collapsed. Selected queue items are highlighted. Low-value submissions show “Not saved” and do not count as pending review.
- Mobile Review opens the queue, then the selected change with Back to review and focus transfer. The category filter is limited to Graph/Browse, where it actually applies.
- Account sections use white surfaces on the existing pale canvas. Identity and sync copy are shorter. MCP address copying has success/failure feedback. Connection and queue fetch failures offer retry instead of showing false empty states.
- Consent now uses a short heading and Connect button, wraps the full client-supplied name below the heading, and puts the callback under Connection details. Identity, scope disclosures and the unverified-name warning remain visible. The same long Claude Code plugin name fits on desktop and mobile; synthetic failure recovery and expired requests were checked.
- The UI changes add no dependencies or API/authorization changes. The integrated backend fix lets validated unchanged indexed notes bypass the sync queue, preserving serialized fallback for cold, changed or invalidated notes. See [performance evidence and rollout](note-read-performance.md).

## Verification

| Check | Result |
|---|---|
| TypeScript, production build, whitespace | Pass |
| Automated suite after performance integration | 97 passed, 0 failed |
| Sync-overlap and asynchronous cache validation | Regression tests pass; production timing pending |
| Render build-filter dependency coverage | Tests pass; settings not applied |
| Layout detector on changed UI files | No findings |
| Spring response, isolated notes, finite 200-node motion, settling | Automated tests pass |
| Review priority, resolved/low-value exclusion, empty fallback | Automated test passes |
| Drag vs click, keyboard arrows/Enter, exact reset | Desktop browser pass |
| 200-node graph drag and idle settling | Browser pass; stable DOM positions after settling |
| Review priority, source-first layout, evaluator disclosure | Desktop browser pass |
| Queue and connection loading/failure/retry | Browser pass with synthetic HTTP failures |
| Obsidian edits disclosure | Browser pass with synthetic operation |
| Mobile queue/detail, Back and focus | Pass at 390 × 844 |
| Account, copy success, synthetic revoke and empty state | Browser pass |
| Horizontal overflow | None in checked desktop 1280 × 720, intermediate 850 × 900, mobile 390 × 844 views |
| Browser console | No unexpected errors; intentional HTTP 503s used for retry checks |

Tests use synthetic note/account data only. Temporary account/API fixtures are outside the repository and are never included in the build. The portable demo and existing dense graph fixture use the production bundle. No real account connections or notes were changed.

## Preview and evidence

Local interactive demo: `http://127.0.0.1:4181/brain-explorer-demo.html?view=graph`.

Run `npm run build` for the portable `dist/brain-explorer-demo.html`; `node scripts/build-graph-preview.mjs` adds the existing 200-node synthetic graph check.

Screenshots are outside the repository in `/Users/wilson/.codex/visualizations/2026/11/02/01a19ae4-bd8c-7db0-a631-6b1276d67570/iteration-2/`, including desktop Review, graph, account, mobile queue/detail/account, and intermediate Review.

## Coordination and limits

The performance chat deployed only accepted iteration one plus its earlier loading fixes. It reported median authenticated note opening improving from 898 to 268 ms over five samples, including browser automation overhead. Later checks found one 6.108-second sync-overlap read and at least 51 seconds of observed HTTP 502 recovery during a docs-only backend replacement. Wilson chose to hold deployment and address performance first.

Performance commit `ac07626` is integrated locally. Its six-second synthetic sync check returned three unchanged indexed notes in 0.089–0.185 ms; those are store timings, not production browser measurements. The prepared Render filter is not applied. A separate backend-only rollout and real sync-overlap checks, including a just-invalidated index, must precede the held UI release. True backend replacements still interrupt this disk-backed service. No push, hosting settings change, paid scaling, or live UI verification was performed for this candidate.

Physical touch hardware, OS-level reduced-motion behavior, screen-reader output, and sustained frame-rate profiling were not tested. The reduced-motion and hidden/unmount cancellation paths were reviewed in source. No production mutations or full cross-browser accessibility audit were performed. Existing graph scope remains bounded to 200 notes; motion is a temporary exploration aid, not a persisted graph editor.
