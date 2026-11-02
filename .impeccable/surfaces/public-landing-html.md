---
version: 1
slug: "public-landing-html"
primary_target: "public/landing.html"
related_targets: ["src/landing.ts", "src/landing-timeline.ts", "src/landing.css", "scripts/build.mjs", "vercel.json", "tests/landing.test.ts", "tests/landing-playback.test.ts"]
---

# Public landing — compact product stage

Mode: Persuade. The latest approved section of `.impeccable/premium-brief.md` governs this surface. Wilson chose option 1 with the correction “1 but i dont like how big everything is”. The approval replaces the earlier paper palette and system-only heading treatment while preserving the working demonstration and production routes.

## Direction contract

THESIS: One brain. Any agent. The conversation and persistent note demonstrate shared context.

OWN-WORLD: Matte black, graphite panes, silver text and fine neutral rules. Atkinson Hyperlegible Next 700 for hero/evidence headings; system sans for working copy. Use unchanged sourced agent SVGs and standard compact controls. No glow, bevel or raster illustration.

STORY: A centered promise and sample action lead into the scripted Claude-to-ChatGPT conversation, then a concrete Jev conflict example. Keep Open your Brain available in the header, including mobile.

FIRST VIEWPORT: A 54px maximum desktop heading (36px mobile), 16px support copy (14px mobile), 22px marks (19px mobile), and a 44px sample action above the wide framed chat/note stage. The page is at most 1100px wide. Mobile stacks the note after the chat and keeps playback controls reachable.

FORM: Product-stage option 1, seed b8219372, in the user's pinned cinematic monochrome world. Retain the one-shot 18-second sequence, start-once threshold, pause/resume/replay, scene selection, source-note update and reduced-motion scenes. The current agent's avatar follows the scene; the composer remains illustrative.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Implementation and truth boundaries

The production surface is `public/landing.html`, styled by `src/landing.css` and driven by the existing `src/landing.ts` / `src/landing-timeline.ts` entry. Keep same-origin assets, CSP, Vercel-only root/app output split and existing API/OAuth routing. The five source SVGs and their hashes/attribution are in `public/agents/`; Atkinson 700 is the self-hosted TrueType `.ttf` in `public/fonts/`, with OFL and source record. No WOFF2, generated brand mark, raster artwork or new runtime dependency ships.

Every conversation, note, score and MCP call in the preview is synthetic. Eligible remember writes and Jev recall semantics remain as recorded in the existing product contract. Semantic-search copy is Wilson's authorized intended state, not evidence that this frontend implements hosted semantic retrieval or that every named client integration is verified end to end.

## Current evidence and open workflow

`DESIGN.md` and `.impeccable/design.json` describe the implemented dark system. Local evidence is in `.impeccable/review/premium/`; `landing-desktop-viewport.png`, `landing-user-1280-viewport.png` and `landing-mobile-viewport.png` are authoritative viewport captures, and the corresponding full-page images are supplemental. This documentation pass reads source and existing records; it does not capture or replay the browser.

The independent `finish-review.md` reports no material production UI deviation against the compact approved direction, with disposition **fix** for workflow persistence only. The automated state still has `plates` open despite zero plates, and later phases pending. The original image's oversized geometry was expressly rejected; the numerical comparison is not a fidelity pass. No receipt or finished gate is fabricated. See `docs/premium-ui.md` for functional checks and release evidence; historical deployment IDs below are not current-release verification.

## Historical release records — superseded visual guidance

The following records are retained as history. Their pale/white palette, prior typography and earlier Review-order statements do not govern the approved compact black system above.

## Public landing — production promotion

Mode: Persuade. Wilson approved the animated conversation mockup and explicitly requested making it the actual landing page and deploying it. This contract promotes that approved revision to the public Vercel root. It supersedes the mockup-only deployment boundary for this promotion; the rejected graph and historical `public/about.html` concept are not design authority.

### Direction contract

THESIS: One brain. Any agent. Save a decision in Claude and retrieve the same context in ChatGPT.

OWN-WORLD: Preserve the approved system sans, monochrome paper surfaces, flat panes, fine dividers, restrained controls, and SVG icons. Inherit global DESIGN.md without rewriting it. No decorative graph, new display font, raster artwork, or extra feature catalog.

STORY: A concise promise and sample action lead into the scripted MCP conversation and persistent source note. Jev evidence appears below. The only visible integration change is replacing the redundant “See it in action” navigation with “Open your Brain,” linking to `/app`.

FIRST VIEWPORT: Preserve the approved heading, named-agent line, CTA, and immediately following conversation. Mobile retains the stacked source note and visible playback controls.

FORM: Preserve the one-shot 18-second sequence: type in Claude, show pending remember with Friday intact, save Monday, stream the response, switch to ChatGPT, retrieve the same Monday note, and stream its answer. Start once at 35% visibility; pause when hidden/offscreen; support play/pause/resume/replay and scene selection. Reduced motion uses complete manual scenes with no animation callbacks. The composer is illustrative, not an input.

PRODUCT TRUTH: The sequence, connection labels, notes, calls, results, and Jev scores are synthetic; no private data, live MCP call, model request, or note write occurs. Eligible real remember writes are direct, with existing source/revision/privacy/permission checks. Jev assesses recall evidence, not write approval. Semantic search remains Wilson's explicitly authorized intended-state assumption (“assume semantic search is there, i will add it”); this release does not implement it. Current retrieval remains a keyword shortlist plus Jev. Named clients do not establish five completed end-to-end integrations.

### Production integration

`public/landing.html` loads same-origin external `/assets/landing.css` and `/assets/landing.js`. The independent esbuild entry `src/landing.ts` imports its CSS and timeline; the existing app entry remains separate. Keep canonical and Open Graph text metadata, inline SVG, and the existing CSP without permitting inline executable scripts.

For Vercel builds only (`VERCEL` set), copy the app shell from `dist/index.html` to `dist/app.html`, then copy `dist/landing.html` to `dist/index.html`. Vercel serves the public index directly at `/`; `/app`, `/demo`, `/sign-in`, `/consent`, and `/settings` rewrite to `/app.html`. Do not restore a root rewrite: the first rollout showed that the existing index took precedence. Builds without `VERCEL` retain the original app index for the unchanged local/Render server. Sample and Jev links use `/demo` and `/demo?view=recall`; app brand/private-back links and the Google post-sign-in callback use `/app`. API, MCP, OAuth, and authentication endpoint forwarding remain unchanged.

### Release boundary and evidence

Frontend, frontend build, Vercel routing, tests, and scoped documentation only. No server/runtime, dependencies, credentials, vault data, sync, or backend configuration changes. The release owner explicitly approved `[skip render]` for this independent frontend build addition, despite `scripts/build.mjs` being a watched Render input. Verify Render remains on `dep-dbk4iup5efls73el0a50` / `f811f2d` after Vercel advances; do not initiate a Render deploy for this promotion.

The approved mockup's `.impeccable/review/landing-motion/` evidence establishes the visual direction. Local browser/CSP and responsive checks are complete, with production captures in `.impeccable/review/landing-production/`; “Open your Brain” remains available on mobile. Live verification caught the initial root-routing failure, now addressed by the Vercel-only output split. The correction passed TypeScript, 110 tests, diff checks, builds in both modes, and root/app artifact assertions. Production route/browser re-verification passed for application commit `e55d36b` and Vercel deployment `dpl_2cE6WRte1d5sHcrS2n4DrHcuNE9r`. The canonical landing, both sample actions, authenticated `/app` and account return, desktop/mobile playback, asset equality, CSP, anonymous rejection, and unchanged Render baseline were checked. See `docs/landing.md` for evidence and limits.
