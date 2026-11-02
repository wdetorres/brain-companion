# Public landing page

The approved “One brain. Any agent.” animated mockup is being promoted to the public Vercel root. The page shows a scripted Claude save followed by ChatGPT recall of the same note, with a Jev evidence example below. This release changes frontend entry points and navigation; it adds no backend capability.

## Routes and build

| Hosted path | Vercel destination | Purpose |
| --- | --- | --- |
| `/` | `/landing.html` | Public landing page |
| `/app` | `/index.html` | Existing private Brain app entry |
| `/demo` | `/index.html` | Explicit synthetic Explorer |
| `/demo?view=recall` | `/index.html`, query retained | Synthetic Jev recall view |
| `/sign-in`, `/consent`, `/settings` | `/index.html` | Existing auth and account views |
| `/mcp`, OAuth, discovery, and API routes | Existing bridge rewrites | Unchanged backend forwarding |

The landing navigation opens `/app`; its primary sample and lower Jev links are origin-relative. Private app brand/back links and the Google post-sign-in `callbackURL` target `/app`. The OAuth callback endpoint itself is unchanged.

`scripts/build.mjs` copies `public/` into `dist/` and builds two independent entries:

- `src/main.tsx` → `dist/assets/app.js` and app CSS.
- `src/landing.ts`, importing `src/landing.css` and `src/landing-timeline.ts` → `dist/assets/landing.js` and `landing.css`.

`public/landing.html` includes canonical/Open Graph text metadata and external same-origin CSS/JavaScript. Existing CSP and security headers remain intact; no inline executable script, remote font, raster asset, new dependency, or private payload is added. The standalone HTML under `mockups/landing/` remains historical review material, not the production source.

These root rewrites are Vercel-specific. The unchanged local/Render server still serves the app shell at its root; it does not serve the landing page through `/landing.html`. A static `dist/` server can preview the page itself, but cannot validate Vercel rewrites, auth, or API forwarding.

## Behavior and product limits

The one-shot 18-second animation begins when 35% of the demo first becomes visible. Friday remains in the note while `remember` is pending; Monday appears only after the scripted save. ChatGPT then recalls that same Monday note. Scene controls restart the selected illustrative sequence, and play/pause/resume/replay control progression. Hidden or offscreen playback pauses and requires manual resumption. Reduced motion provides complete scenes through scene controls or “Next scene,” without animation callbacks.

Visible sample labeling applies to all messages, connection states, calls, results, notes, and scores. The page sends no messages, makes no MCP/model requests, and reads or writes no private notes. The Jev panel is adapted HTML, not a live evaluation or screenshot of an account. Client names illustrate shared MCP use, not verified integration of all five named clients.

Wilson authorized the semantic-search intended state before approving promotion. This release does not implement semantic retrieval: the current backend uses a keyword shortlist plus Jev assessment. Eligible real `remember` writes remain direct with existing checks; Jev is not a write-approval gate. Preserve these limits when describing the release.

## Build and verification commands

Use the existing Node 24+ environment and installed dependencies from the repository root:

```sh
npm run check
npm test
npm run build
```

For focused landing regression checks:

```sh
node --test tests/landing.test.ts tests/landing-playback.test.ts
```

The timeline tests cover save ordering and note continuity. Controller tests compile the production entry in memory and cover pause/resume, hidden/offscreen pause, reduced-motion scenes, completion, and replay. The route test checks landing/app destinations, retained MCP/auth forwarding, links, and external script loading. Auth regressions cover ordinary Google sign-in returning to `/app` and the signed MCP flow retaining its separate consent requirement.

To inspect the built page locally:

```sh
python3 -m http.server 4184 --bind 127.0.0.1 --directory dist
```

Open <http://127.0.0.1:4184/landing.html>. Use a Vercel preview or the released origin for the route contract: `/` must show the landing; `/app` must retain the private entry; `/demo` and its recall query must show synthetic data; auth/account routes must retain their existing behavior. Check CTA destinations, playback, keyboard control, reduced motion, mobile overflow, asset loading, console/CSP errors, and anonymous private-API rejection without reading private content.

## Release contract

This integration starts from `origin/main` `f811f2d`. Wilson approved deployment and the performance session explicitly approved `[skip render]` for the independent frontend addition to `scripts/build.mjs`. That file is normally a watched Render input. The exception applies to this reviewed frontend-only build change, not future server/shared/runtime changes; see [the Render filter record](note-read-performance.md#render-build-filter).

Release through the existing Vercel production project and canonical domain. Preserve existing secrets, project configuration, backend endpoints, and data. Put `[skip render]` in the release commit message and verify the final diff has no server/runtime/dependency change. Do not manually redeploy or reconfigure Render.

After Vercel advances, record its deployment ID, source commit, ready state, and canonical-origin checks. Verify the existing live Render deployment remains **`dep-dbk4iup5efls73el0a50` at `f811f2d`** with no replacement deployment. Render's standalone fallback UI may lag the Vercel frontend by design.

## Verification and pending release checks

- TypeScript, full tests (**109/109**, including landing cases), production build, and diff whitespace check: passed.
- Local production-build browser/CSP and desktop/mobile checks ran. The mobile navigation was corrected to retain “Open your Brain” and hide “View code”; final captures under `.impeccable/review/landing-production/desktop.png` and `mobile.png` are being refreshed.
- Deployed landing/app routes, auth return, browser/CSP, responsive, and playback confirmation: pending.
- Release commit and Vercel production deployment ID/ready state: pending.
- Render baseline `dep-dbk4iup5efls73el0a50` was confirmed live before release. Post-release canonical-origin checks and unchanged Render deployment: pending.

The approved mockup evidence is under `.impeccable/review/landing-motion/`. Production results must replace the pending entries above; mockup approval does not establish deployment success. Physical-device motion smoothness, screen readers, every browser engine, and every named client's integration are not established by the existing mockup checks.
