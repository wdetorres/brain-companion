---
version: 1
slug: "public-landing-html"
primary_target: "public/landing.html"
related_targets: ["src/landing.ts", "src/landing-timeline.ts", "src/landing.css", "scripts/build.mjs", "vercel.json", "tests/landing.test.ts", "tests/landing-playback.test.ts"]
---

# Public landing — production promotion

Mode: Persuade. Wilson approved the animated conversation mockup and explicitly requested making it the actual landing page and deploying it. This contract promotes that approved revision to the public Vercel root. It supersedes the mockup-only deployment boundary for this promotion; the rejected graph and historical `public/about.html` concept are not design authority.

## Direction contract

THESIS: One brain. Any agent. Save a decision in Claude and retrieve the same context in ChatGPT.

OWN-WORLD: Preserve the approved system sans, monochrome paper surfaces, flat panes, fine dividers, restrained controls, and SVG icons. Inherit global DESIGN.md without rewriting it. No decorative graph, new display font, raster artwork, or extra feature catalog.

STORY: A concise promise and sample action lead into the scripted MCP conversation and persistent source note. Jev evidence appears below. The only visible integration change is replacing the redundant “See it in action” navigation with “Open your Brain,” linking to `/app`.

FIRST VIEWPORT: Preserve the approved heading, named-agent line, CTA, and immediately following conversation. Mobile retains the stacked source note and visible playback controls.

FORM: Preserve the one-shot 18-second sequence: type in Claude, show pending remember with Friday intact, save Monday, stream the response, switch to ChatGPT, retrieve the same Monday note, and stream its answer. Start once at 35% visibility; pause when hidden/offscreen; support play/pause/resume/replay and scene selection. Reduced motion uses complete manual scenes with no animation callbacks. The composer is illustrative, not an input.

PRODUCT TRUTH: The sequence, connection labels, notes, calls, results, and Jev scores are synthetic; no private data, live MCP call, model request, or note write occurs. Eligible real remember writes are direct, with existing source/revision/privacy/permission checks. Jev assesses recall evidence, not write approval. Semantic search remains Wilson's explicitly authorized intended-state assumption (“assume semantic search is there, i will add it”); this release does not implement it. Current retrieval remains a keyword shortlist plus Jev. Named clients do not establish five completed end-to-end integrations.

## Production integration

`public/landing.html` loads same-origin external `/assets/landing.css` and `/assets/landing.js`. The independent esbuild entry `src/landing.ts` imports its CSS and timeline; the existing app entry remains separate. Keep canonical and Open Graph text metadata, inline SVG, and the existing CSP without permitting inline executable scripts.

For Vercel builds only (`VERCEL` set), copy the app shell from `dist/index.html` to `dist/app.html`, then copy `dist/landing.html` to `dist/index.html`. Vercel serves the public index directly at `/`; `/app`, `/demo`, `/sign-in`, `/consent`, and `/settings` rewrite to `/app.html`. Do not restore a root rewrite: the first rollout showed that the existing index took precedence. Builds without `VERCEL` retain the original app index for the unchanged local/Render server. Sample and Jev links use `/demo` and `/demo?view=recall`; app brand/private-back links and the Google post-sign-in callback use `/app`. API, MCP, OAuth, and authentication endpoint forwarding remain unchanged.

## Release boundary and evidence

Frontend, frontend build, Vercel routing, tests, and scoped documentation only. No server/runtime, dependencies, credentials, vault data, sync, or backend configuration changes. The release owner explicitly approved `[skip render]` for this independent frontend build addition, despite `scripts/build.mjs` being a watched Render input. Verify Render remains on `dep-dbk4iup5efls73el0a50` / `f811f2d` after Vercel advances; do not initiate a Render deploy for this promotion.

The approved mockup's `.impeccable/review/landing-motion/` evidence establishes the visual direction. Local browser/CSP and responsive checks are complete, with production captures in `.impeccable/review/landing-production/`; “Open your Brain” remains available on mobile. Live verification caught the initial root-routing failure, now addressed by the Vercel-only output split. The correction passed TypeScript, 110 tests, diff checks, builds in both modes, and root/app artifact assertions. Production route/browser re-verification remains pending. Record final results in `docs/landing.md`; a READY deployment or mockup screenshots alone do not establish a working release.
