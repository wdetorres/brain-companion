# Validation and release status

Date: 2026-10-31. Build: Explorer v0.1.0.

## Verified locally

- Full behavioral suite, TypeScript check, production asset build.
- Clean offline dependency install into a fresh temporary directory, followed by real esbuild execution (Darwin ARM64).
- Independent read-only whole-branch review. All three important findings reproduced in failing tests and fixed: pending write recovery, graph/reader link agreement, relevance of Jev context.
- Persistent write/retry/restart behavior, policy/symlink/traversal rejection, stale and competing updates, source requirements, malformed model results, external edits, and sync/write queue ordering.
- OAuth PKCE, resource/redirect binding, one-time code exchange, refresh rotation/replay rejection, browser CSRF, authenticated reads, SDK tool discovery/call, fixed-destination bridge/cookie forwarding.
- Actual React Markdown rendering with hostile HTML, executable links, and ambiguous/relative note links.
- Production configuration refuses development HTTP defaults and missing owner credentials.

## Not yet verified live

This runtime cannot listen on a local socket and cannot reach npm/GitHub from its shell. Dependencies were reconstructed from real cached tarballs, then a normal clean offline install was verified. Vercel requires a user consent grant for the personal project scope. No persistent host, Jev secret, or Obsidian account credentials have been configured.

Remaining deployment checks: browser interactions/accessibility; real HTTP/proxy/Vercel routing; clean Linux installation and Docker image build; ChatGPT authorization and a fresh-conversation recall; live Jev API accuracy, cost, and thresholds; Obsidian CLI authentication, sync, conflict copies, and offline-device convergence; persistent-volume backup restoration; actual process-kill/power-loss recovery.

No real vault was copied, modified, or uploaded. No live API evaluation was performed. Automatic write acceptance is disabled by default.

## Deliberate v1 limits

- Keyword search; no semantic/QMD adapter yet. Cost: paraphrased searches can miss relevant notes.
- Stable folder-group graph with actual resolved edges, maximum 200 visible notes. Cost: no force-directed layout yet; large vaults need filters.
- Agent guidance through a Markdown document, MCP resource, and prompt. Cost: clients ignoring resources/prompts need those instructions supplied separately.
- One owner, one brain, one persistent writer. Extra filesystem writers or multiple replicas can violate the write assumptions.
- Proposals remain inspectable but cannot be approved or edited in the browser. Enable tested write categories in server configuration, or resolve through an agent/Obsidian.

No minor findings were deferred by the independent reviewer. Source control remains a local branch because no external repository was available. The release archive includes all source and a standalone sample UI.
