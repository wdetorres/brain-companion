# Compact monochrome UI

Wilson approved the product-stage composition with the refinement “1 but i dont like how big everything is.” Both the public landing and Explorer now use matte black/graphite surfaces and silver text. The landing headline is 54px maximum (36px on mobile), agent marks 22px (19px on mobile), and the primary action 44px high. The chat and persistent note remain the focal point.

The landing uses unchanged sourced Claude, OpenAI, Gemini and Grok SVGs from Lobe Icons, plus Cursor's official cube. Source records, hashes and attribution are in `public/agents/`. Atkinson Hyperlegible Next 700 is self-hosted with its OFL in `public/fonts/`. No generated logo, raster illustration, remote font request or new runtime dependency ships.

The existing one-shot chat sequence, playback controls, reduced-motion scenes and source-note update are preserved. The avatar follows the current agent. Every conversation, note, score and MCP call in the preview is synthetic. Semantic-search wording remains Wilson's expressly authorized intended-state claim; this frontend release does not implement hosted semantic retrieval or establish every named integration end to end.

The Explorer retains Graph / Browse / Review / Recall, physical folder hierarchy, graph dragging and keyboard movement, source evidence, assessments and undo. A four-note Recently changed list uses existing modification timestamps and current category/system filters. It adds no requests. Note caching, request cancellation, stale-response guards, auth endpoints and server code are unchanged. Account and consent inherit the dark palette and preserve all permission disclosures.

## Verification

TypeScript and all 141 tests passed, including both Vercel and standalone build layouts, playback/pause/reduced-motion behavior, agent identity switching and stable non-mutating recent-note ordering. Source-asset hashes and TrueType header passed. Core text contrast pairs exceed 4.5:1. Browser checks cover 1440px desktop, 1280px laptop and 390px mobile, folder/reader navigation, recall conflict results and graph keyboard movement. Evidence is local under `.impeccable/review/premium/`.

The static design detector reported the old system's missing Atkinson/type/color documentation; the documenter updates those intentional changes. Its flat hierarchy warning came from resolving the unbuilt `/assets/landing.css` against `public/`, while browser measurements verified the loaded 54px heading and 16px body.

The original image composition's geometric comparison is not a fidelity pass: Wilson explicitly rejected its scale. The automated Impeccable plates phase also remains open because it requires another receipt even with zero plates. No receipt was fabricated. The independent rendered review returned `fix` solely for unfinished workflow evidence; it requested no production UI correction. It reviewed the compact direction, all supplied desktop/mobile captures and the preserved application behavior. Authoritative viewport captures include complete edges; CUA uniformly scales captures on pages with scrollbars. This workflow limitation is separate from functional release checks.

## Release

The performance chat confirmed no outstanding gate or deployment conflict. This is a frontend-only `[skip render]` release. Before release, Render's live deployment was `dep-dbk6iqnavr4c73cphqlg`, commit `fa6754b172bc5377b891d7c13ed391aba87d4f20`. Compare it after Vercel advances; no worker restart is intended. Live route, asset, authenticated note-open/cache and browser checks are recorded after release.
