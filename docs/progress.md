# Build progress

Plan: docs/superpowers/plans/2026-10-31-brain-companion.md

- User accepted Explorer and Vercel plus persistent worker; instructed implementation.
- New isolated project directory; no existing repository or worktree to protect.
- Native implementation with final independent review.
- Local network unavailable; cached dependencies used. Vercel account confirmed but personal team scope requires connector authorization.
- Pre-flight: storage → HTTP → UI share src/shared.ts contracts. No conflicting interfaces.

## Implementation evidence

- Task 1: complete at ce3b461. Real temporary vault/SQLite tests cover exact bytes, revision conflicts, path protection, idempotency, persisted history, malformed Jev results, and external edits.
- Tasks 2 and 3: implemented at 7817d03. OAuth PKCE/resource/client/redirect/code-reuse/CSRF tests, actual SDK tools/list + tools/call, Vercel bridge destination/cookie checks, Markdown render safety and graph/diff tests pass.
- Task 4: Docker/Compose, Vercel routes, owner setup, agent instructions, evaluation runner, and backup/restore documented. Independent review in progress. Deployment still blocked by personal Vercel team consent and absent persistent worker credentials.
- Current suite: 23 passed; TypeScript and production browser build pass. Clean `npm ci --offline` in a new temporary directory and esbuild invocation pass after hydrating lockfile tarball identities and optional platform entries.
- Ruling: keyword retrieval ships before QMD integration because QMD is not installed or verified here. Cost: recall misses semantic-only matches; UI and tool outputs explicitly say keyword search.
- Ruling: portable agent instructions ship as an MCP resource and prompt plus Markdown guide, rather than an installed skill package. Cost: clients that ignore resources/prompts need the guide supplied separately.
- Ruling: this initial graph uses stable folder groups with real link edges rather than a physics simulation. Cost: a large vault may need a force layout after real usage; folder and neighborhood filters bound views to 200 pages.
- Ruling: automatic new/update acceptance stays disabled until credentialed Jev evaluation. Cost: initial MCP writes create inspectable proposals rather than immediately changing vault notes.
- Ruling: user instruction to build authorizes implementation and the selected deployment; no repeated design approval requested. Vercel's missing account-scope grant remains a real authorization boundary.
- Validation boundary: the runtime denied binding localhost (`listen EPERM`). No browser interaction, Docker image build, Linux dependency download, live Jev call, live Obsidian Sync, or ChatGPT handshake is claimed. No real vault content was copied or edited.

## Independent review and fixes

Reviewer inspected the whole implementation at 7817d03. No critical exploit demonstrated in the documented single-instance model. Three important issues were reproduced and fixed:

- Final: fixed pending idempotent retry/operation inspection recovery, including the recovered revision. Direct-restart test failed with `pending`, then passed with `applied`.
- Final: fixed graph/reader link disagreement by sharing one page-relative resolver. Real renderer test failed on relative links, then passed; ambiguous basenames stay unresolved and local paths beat title matches.
- Final: fixed alphabetical Jev context by ranking candidate terms, titles, explicit links, inbound links, and folder relevance before selecting five pages. Test excluding a relevant contradictory note failed, then passed.
- Lock repair: populated cached package URL/integrity identities and every esbuild optional platform entry. Clean offline install and actual esbuild execution passed on Darwin. Linux installation remains a deployment check.
- Final suite after fixes: 25/25 passed; type check and production build passed. One additional shared-resolver regression case added before final verification.
- Final: Ruling: browser interaction/accessibility, real proxy/Vercel routing, clean Linux/Docker installation, live ChatGPT/Jev/Obsidian integrations, model acceptance accuracy/cost, backup restore, real power-loss recovery, and offline-device convergence remain unverified because this environment cannot run those integrations or lacks credentials. Cost: live readiness is not established; README names these deployment checks and automatic acceptance stays disabled.
- Final: Ruling: hostile local filesystem races and multiple processes editing the server vault remain outside the single-owner, single-process deployment contract. Cost: running extra writers could defeat revision checks; only the service-controlled sync process may write this server copy.
- Deferred minors: none raised by the independent reviewer.
