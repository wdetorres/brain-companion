# Folder browsing — local acceptance

November 2, 2026. Branch: `codex/folder-browsing`. These checks were completed locally before acceptance; the subsequent release is recorded below.

## Implemented

- Graph / Browse / Review primary navigation; Recall remains beside search.
- Browse shows actual nested folder paths and root notes. Folder names are preserved, folders sort naturally, and note titles sort within their own folder.
- Selected ancestors open when a note is reached through search or links. Existing open branches are retained while reading in Browse.
- Graph filters by exact folder path, including descendants, without matching neighboring path prefixes.
- Mobile Browse uses a folder list or reader with Back to folders, focus transfer and 44px folder targets. Review attention badges stay visible; account access remains available in the header outside the demo.
- Removed the flat Collections list, empty Start here, sidebar slogan, duplicate graph legend, duplicate review shortcut and promotional view subtitles. Existing monochrome surfaces, note evidence and review safeguards remain.
- Legacy `view=pages` / `view=changes` URLs still work; `browse` / `review` aliases are accepted.

## Performance coordination

Integrated performance-session commit `4fc749f` as `d66fa72`. Its cache lifecycle, revision invalidation, sign-out clearing, shared ConnectionPanel cache, targeted server reads, auth checks and no-store responses remain. The one merge conflict combined the revised sidebar with the cache clear on sign-out. Singapore configuration was included in the subsequent authorized deployment handled by the performance chat.

## Acceptance results

| Check | Result |
|---|---|
| TypeScript | Pass |
| Automated tests | 86 passed, 0 failed |
| Production build and diff whitespace | Pass |
| Layout detector | No findings |
| Nested paths, root notes, duplicate names, numbered folder ordering | Pass, automated tests |
| Prefix boundary isolation and empty input | Pass, automated tests |
| Disclosure IDs with spaces/special characters; selected ancestor expansion | Pass, component render test |
| Enter / Space folder expansion and keyboard note opening | Pass, desktop browser |
| Search from Recall reveals the selected note and its ancestor folders | Pass, desktop browser |
| Exact graph folder filter | Pass; Design folder contained exactly its two sample notes |
| Graph, Browse, Review and secondary Recall navigation | Pass, desktop browser |
| Category selection persists when opening a matching note | Pass, mobile browser |
| Inbox/system visibility | Pass; 25 sample notes became 27, with both folders exposed |
| Mobile list/reader transition, focus transfer and return to expanded folders | Pass |
| Mobile folder targets and attention badge | 44px measured targets; badge visible |
| Horizontal overflow | None at 1280px desktop and 390px mobile |
| Browser errors/warnings | None observed |

Browser checks used synthetic sample notes in the production build, not live private data. The performance session separately verified cache request counts, refresh invalidation and sign-out in its synthetic authenticated browser harness. The combined test suite includes its cache and server freshness tests.

## Preview and evidence

Local preview: `http://127.0.0.1:4180/brain-explorer-demo.html?view=browse`.

Portable preview: `dist/brain-explorer-demo.html` after `npm run build`.

Desktop and mobile screenshots are stored outside the repository under `/Users/wilson/.codex/visualizations/2026/11/02/01a19ae4-bd8c-7db0-a631-6b1276d67570/iteration-1/`.

## Acceptance gate and remaining work

Wilson accepted this iteration on November 2 and authorized graph interaction and remaining refinements. The performance chat separately received deployment approval and released this accepted iteration with the loading fixes and current Jev fix as 8581cc9. The second iteration remains separate and is not deployed.

Not checked: production latency after routing changes, live account/review mutations, physical touch hardware, or a complete accessibility audit. Empty physical folders cannot appear because the API exposes notes rather than a directory inventory. Folder disclosure is keyboard accessible; it does not implement the additional arrow-key behavior of an ARIA tree widget.
