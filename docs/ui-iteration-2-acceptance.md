# Graph, Review and account refinement

November 2, 2026. Released as `244121d` from `codex/graph-review-polish`, including production changes through `e9e2116` and performance fixes `ac07626` / `5c5ffd8`. Wilson initially held deployment, then explicitly approved all deployments. The bounded performance gate passed before the UI release. Vercel `dpl_5sMkhizE9kTDLs2DjDYKc8sAYzRJ` is READY on the canonical domain; live desktop/mobile verification passed.

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
| Automated suite after performance integration | 101 passed, 0 failed |
| Startup, sync overlap, cache validation and recovery ordering | Regression tests and bounded production checks pass |
| Render build-filter dependency coverage | Tests pass; settings applied and verified |
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
| Live production demo | Nested folders/readers, node drag with neighbor movement, exact reset, keyboard open and Review hierarchy pass |
| Live mobile at 390 × 844 | Review queue/detail/back focus and account fit pass; no horizontal overflow |
| Live account and consent boundary | Existing owner session, white account surfaces and copy feedback pass; invalid consent is blocked in the new compact frame |

Tests use synthetic note/account data only. Temporary account/API fixtures are outside the repository and are never included in the build. The portable demo and existing dense graph fixture use the production bundle. No real account connections or notes were changed.

## Preview and evidence

Local interactive demo: `http://127.0.0.1:4181/brain-explorer-demo.html?view=graph`.

Run `npm run build` for the portable `dist/brain-explorer-demo.html`; `node scripts/build-graph-preview.mjs` adds the existing 200-node synthetic graph check.

Screenshots are outside the repository in `/Users/wilson/.codex/visualizations/2026/11/02/01a19ae4-bd8c-7db0-a631-6b1276d67570/iteration-2/`, including desktop Review, graph, account, mobile queue/detail/account, and intermediate Review.

## Coordination and limits

The performance chat deployed only accepted iteration one plus its earlier loading fixes. It reported median authenticated note opening improving from 898 to 268 ms over five samples, including browser automation overhead. Later checks found one 6.108-second sync-overlap read and at least 51 seconds of observed HTTP 502 recovery during a docs-only backend replacement. Wilson chose to hold deployment and address performance first.

Wilson subsequently approved all deployments. The release owner saved the 11 included Render paths with no ignored paths and deployed backend fixes separately. `ac07626` passed warm overlap checks but exposed a 59.160-second first MCP failure. The startup follow-up `5c5ffd8` validates the local index before network sync, exposes a completed summary while syncing, and reconciles afterward while preserving write/recovery ordering.

The merged UI release unexpectedly triggered Render deployment `dep-dbk3q6bbc2fs73e30tb0` despite no backend differences from `5c5ffd8`. Replacement was already underway when inspected, so it was allowed to finish; it became live at 07:35:44Z and public health recovered. A settings reload confirmed the filter persisted. Merge-history evaluation is a possible cause, not established fact. Future UI-only merges should verify the final backend delta and use Render's explicit skip phrase when the worker must stay untouched; ordinary linear documentation filtering is checked separately. The standalone Render UI now also includes this iteration because of that replacement.

On `5c5ffd8`, the first post-recovery MCP read took 0.787 s; status during sync took 0.446 s. A fresh browser note opened in 0.271 s during a scheduled sync and returned 0.486 s before its completion (start inferred from the scheduler). The first MCP read after a quiet sync took 0.694 s. A full browser reload took 1.597 s and retained the owner session. No startup timeout recurred in these bounded probes. True backend replacements still interrupt this disk-backed service; the filtered UI diff has no backend deployment matches. No paid scaling or auth changes were made.

Physical touch hardware, OS-level reduced-motion behavior, screen-reader output, and sustained frame-rate profiling were not tested. The reduced-motion and hidden/unmount cancellation paths were reviewed in source. No production mutations or full cross-browser accessibility audit were performed. Existing graph scope remains bounded to 200 notes; motion is a temporary exploration aid, not a persisted graph editor.

The full valid long-name consent flow used synthetic local data; live verification checked the deployed frame and invalid-request rejection without creating or revoking grants. Live screenshots use the sample workspace only and are stored beside the local evidence as `live-graph.jpg`, `live-browse.jpg`, `live-review.jpg` and `live-mobile-review.jpg`.
