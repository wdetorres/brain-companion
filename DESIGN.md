---
name: "Brain"
description: "Compact black and graphite surfaces for one shared Brain."
colors:
  canvas: "#080808"
  paper: "#101010"
  rail: "#080808"
  rail-raised: "#202020"
  ink: "#f2f2f2"
  reading-text: "#c3c3c3"
  muted: "#a3a3a3"
  line: "#292929"
  accent: "#ececec"
  accent-strong: "#ffffff"
  accent-soft: "#242424"
  action-text: "#111111"
  brain: "#eeeeee"
  projects: "#cccccc"
  areas: "#bbbbbb"
  resources: "#aaaaaa"
  archives: "#999999"
  landing-ink: "#f0f0f0"
  landing-canvas: "#171717"
  landing-line: "#2b2b2b"
  landing-action: "#eeeeee"
  stage-border: "#343434"
typography:
  display:
    fontFamily: "Atkinson, sans-serif"
    fontSize: "clamp(36px, 4.2vw, 54px)"
    fontWeight: 700
    lineHeight: 1.13
    letterSpacing: "-.035em"
  display-mobile:
    fontFamily: "Atkinson, sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.14
    letterSpacing: "-.035em"
  landing-headline:
    fontFamily: "Atkinson, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: "-.025em"
  landing-body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-.025em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "25px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-.025em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.9
  body-compact:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.85
  button:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
  navigation:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  graph-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "14px"
  code:
    fontFamily: "ui-monospace, SFMono-Regular, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.7
rounded:
  inline: "3px"
  small: "4px"
  icon: "5px"
  control: "6px"
  navigation: "7px"
  container: "8px"
  overlay: "10px"
  stage: "12px"
  account: "14px"
  consent: "16px"
  circle: "50%"
spacing:
  "6": "6px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
  "32": "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.action-text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 13px"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
  button-quiet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.reading-text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 13px"
  button-quiet-hover:
    backgroundColor: "{colors.accent-soft}"
  button-icon:
    textColor: "{colors.muted}"
    rounded: "{rounded.icon}"
    width: "30px"
    height: "30px"
  button-text:
    textColor: "{colors.accent-strong}"
    size: "12px"
  landing-primary:
    backgroundColor: "{colors.landing-action}"
    textColor: "{colors.action-text}"
    rounded: "{rounded.navigation}"
    padding: "10px 18px"
    size: "13px"
  input-search:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.navigation}"
    padding: "9px 12px"
    width: "300px"
  navigation-item:
    textColor: "#c1c1c1"
    typography: "{typography.navigation}"
    rounded: "{rounded.navigation}"
    padding: "12px"
  navigation-item-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.reading-text}"
  folder-note:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 8px 8px 29px"
    size: "13px"
  folder-note-selected:
    backgroundColor: "{colors.accent-soft}"
  status-chip:
    textColor: "{colors.muted}"
    rounded: "{rounded.icon}"
    padding: "4px 7px"
    size: "11px"
  graph-node:
    width: "24px"
    height: "24px"
    rounded: "{rounded.circle}"
  wiki-link:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.reading-text}"
    rounded: "{rounded.inline}"
    padding: "0 1px"
  diff-container:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.container}"
    padding: "12px 0"
  demo-frame:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.landing-ink}"
    rounded: "{rounded.stage}"
---

# Design System: Brain

## Overview

**Creative North Star: "Brain in black"**

Brain uses matte black and graphite surfaces, silver text, fine neutral borders and compact controls. The public landing gives the promise and chat-to-note demonstration a restrained product stage; the Explorer gives notes, connections and evidence the space to work. The same dark material extends through authentication, account and consent.

Landing headings use Atkinson Hyperlegible Next at a deliberate, compact scale; interface and reading text use the system sans. The user's approved correction, “1 but i dont like how big everything is”, governs the product-stage composition. This source-derived system supersedes the former pale canvas and white reader guidance. Historical release records in the surface briefs remain history, not current visual authority.

**Key Characteristics:**

- Matte black ground, graphite panes and silver hierarchy across public and private surfaces.
- Compact landing display type, standard working controls and spacious note line height.
- Real sourced agent SVGs, flat panes and thin borders without glow or raster illustration.
- Bounded playback and graph motion, explicit sample states and visible keyboard focus.

## Colors

Neutral grayscale carries every surface and state. Frontmatter values are normative, extracted from `src/styles.css` and `src/landing.css`; the landing's local differences have separate names rather than pretending both stylesheets define identical tokens.

### Primary

- **Silver action** (`accent`, `accent-strong`, `action-text`): light primary buttons with dark labels, bright hover, checkboxes, carets and focus outlines. The public action uses `landing-action`.
- **Graphite interaction** (`accent-soft`, `rail-raised`): selected or hovered rows, quiet controls, inline note links and supporting surfaces.

### Neutral

- **Matte ground** (`canvas`, `rail`): the app graph and navigation, and the public page ground. The public stylesheet calls this ground its root background, while its local `--canvas` is the distinct `landing-canvas` note pane.
- **Graphite paper** (`paper`): reading panes, headers, account and consent, and the public demonstration frame. The existing token name does not imply a white surface.
- **Silver text** (`ink`, `landing-ink`, `reading-text`, `muted`): headings, public copy, reading text and supporting metadata.
- **Fine rules** (`line`, `landing-line`, `stage-border`): persistent pane separation and the public demonstration frames.
- **Collection grays** (`brain`, `projects`, `areas`, `resources`, `archives`): small folder markers accompanied by explicit names. Graph dots use the graph's muted/active treatment, not a category-color legend.

**The Monochrome Rule.** Use black, white and neutral grays throughout; meaning must remain explicit in text, icons, outlines or line patterns.

## Typography

**Landing display font:** Atkinson Hyperlegible Next, weight 700, registered as `Atkinson` with a sans-serif fallback. The actual self-hosted file is `public/fonts/atkinson-hyperlegible-next-700.ttf`, served as TrueType with `font-display: swap`. Its OFL and source/hash record are in `public/fonts/`; there is no WOFF2 file or remote font request. Only the public hero and evidence heading use this face.

**Interface and reading font:** the system sans stack in frontmatter. **Code font:** native monospace. Auth, account, consent, note titles, graph labels, navigation and demonstration copy keep the working UI voice.

### Hierarchy

- **Public promise:** `display`, capped at 54px; at the 640px breakpoint it uses `display-mobile` (36px). Supporting copy uses `landing-body`, becoming 14px on mobile.
- **Public evidence heading:** `landing-headline`, becoming 30px at 850px and below. Demonstration conversation text is 13px, with 11–12px metadata and a 14px schedule.
- **App titles:** full notes use `headline`; view and inspector headings use `title`. Narrow note titles use 29px; view titles step to 24px then 23px.
- **Reading:** full Markdown uses `body`; the inspector uses `body-compact`, increasing to 14px on wide desktop and stacked mobile. Markdown headings are 26/20/17/15px with weight 600 and line height 1.45.
- **Working controls:** `button` and `navigation`; supporting labels generally use 10–12px. Graph captions use `graph-label`; the layout decides which captions fit, and active captions may use more lines.
- **Code:** diffs use `code`; inline code is 0.88em of its context.

**The Compact Promise Rule.** Keep the landing hero at its approved 54px maximum and 36px mobile size; the cinematic treatment comes from composition and contrast, not inflated type or controls.

**The Reading Measure Rule.** Keep full-page note content and change readers within the implemented 70ch measure; compact previews use the inspector's available width.

## Layout

The public page has a centered 1100px maximum content width, with 40px side space on wide screens, 24px below 850px and 18px below 640px. Its 72px masthead precedes a centered promise and a wide chat/source-note frame. The desktop frame uses a 1.65:1 conversation-to-note grid; below 850px it becomes 1.4:1, and below 640px it stacks. The following evidence section pairs concise explanation with a concrete Jev example. This composition belongs to the public surface brief, not every app screen.

The app is a viewport-height flex shell (`100dvh`, minimum 500px) with independently scrollable navigation, lists and readers. Its base rail is 216px, search header 69px and inspector 328px. Browse uses a 320px folder pane; Review uses a 296px queue. Full readers have 42px top, 52px side and 60px bottom padding. Recall keeps an 800px maximum working column; account an 820px maximum page; consent a 480px maximum card.

| App condition | Implemented change |
| --- | --- |
| At least 1500px | Rail 232px; inspector 380px; inspector text 14px. |
| At most 1150px | Rail 190px; inspector 300px; Browse folders 280px; Review queue 260px; tighter padding. |
| At most 950px | Rail becomes a 70px icon strip; Recently changed hides; account access appears beside search. |
| At most 760px | Navigation becomes a sticky 61px top bar; page scrolls naturally. Graph and inspector stack with a 510px graph. Browse and Review show list or selected reader, with explicit back controls and focus transfer. Folder and navigation targets are at least 44px. |
| At most 440px | Wordmark hides while navigation labels remain; graph height becomes 450px; controls tighten. |
| At least 951px wide and at most 800px tall | Rail spacing compresses while retaining independent scrolling. |

## Elevation & Depth

Persistent panes are flat. Black and graphite tones plus fine borders create hierarchy; no glow, bevel or decorative shadow creates the cinematic effect. Search results use the single ambient overlay shadow. Focus, selected graph nodes and text legibility have their own state outlines or canvas-colored text shadow rather than floating cards.

### Shadow Vocabulary

- **Search overlay:** `var(--shadow-overlay)`; its exact value is in the sidecar.
- **Search focus:** a two-pixel gray ring on the field wrapper indicates input state.

**The Flat Pane Rule.** Separate persistent panes with tone and fine borders; reserve the overlay shadow for transient search results.

## Shapes

Compact rounded rectangles define controls, lists and framed demonstrations. Persistent app panes meet squarely. Graph nodes and folder markers are circles; selection adds an offset ring. Fine SVG strokes communicate actions. The existing Brain mark remains a three-node network; actual agent identities use sourced SVG assets rather than generic symbols or generated logo imitations.

The landing ships unchanged Claude, OpenAI, Gemini and Grok SVGs from `@lobehub/icons-static-svg` 1.102.0 and Cursor's official cube. `public/agents/sources.json` records origins and per-file hashes; `LOBE-LICENSE` retains attribution. Marks are 22px in the agent line and 19px on mobile, with names beside them. The conversation avatar follows its active agent. No runtime icon dependency or raster artwork is added for these marks.

## Components

### Buttons

Primary app actions use silver fill and dark labels, brightening on hover. Quiet actions use graphite paper, a fine border and silver reading text; hover adds graphite interaction fill. Icon and text actions remain compact. Primary and quiet app controls have a 36px minimum height; the public sample action and consent actions have 44px minimum targets. Disabled app controls use 0.48 opacity. General focus uses a two-pixel accent outline offset by three pixels; the landing uses a four-pixel offset.

### Inputs / Fields

Search uses a black rounded wrapper and leading SVG icon with a focus-within ring. Results appear in a bounded graphite overlay. Folder and category filters remain native selects; recall categories use native radio inputs styled as a wrapping segmented group. Question and review-reason textareas retain visible borders, readable text and explicit focus. Loading, error, disabled and retry states stay part of these controls.

### Navigation and lists

The rail contains Graph, Browse and Review; Recall stays beside search. Active rail rows use graphite fill and silver text, not white inversion. Recently changed shows up to four notes ordered by existing modification timestamps after category and Inbox/system filtering; it makes no new request and hides with the icon rail. Browse retains actual nested folders, root notes, descendant counts and naturally ordered names. Selected note, queue and activity rows use the graphite interaction surface. Status chips and SVG icons supplement explicit status wording.

### Public demonstration

A dark conversation pane and a slightly lighter persistent note share a thin rounded frame. Scene choices remain standard buttons with pressed state and an active underline; play, pause, resume and replay are explicit. The illustrative composer is not an input. The one-shot 18-second sequence starts once at 35% visibility, pauses when hidden or offscreen, and stops when complete. Reduced motion provides complete manually selected scenes without animation callbacks. The source note updates with the conversation; all preview notes, calls, results and scores remain labeled synthetic.

### Graph

Whole-note dots sit on matte black. Faint neutral edges become brighter for the active neighborhood; unrelated elements dim. Selected dots add an offset silver ring. Proposed connections use dotted lines and do not become spring relationships. Label placement is resolved by the graph layout; a user control can hide or show labels.

Dragging a node moves its linked neighbors through a damped response, settling within 1.8 seconds; idle graphs do not animate. Arrow keys move the focused node, Enter opens it, and reset restores layout and camera. Camera pan and zoom keep controls anchored. Reduced motion moves only the directly controlled node; hidden graphs cancel motion. Temporary positions never write note content or saved links.

### Reader and recall

Graphite reading panes retain readable Markdown, understated source rows, backlinks and fine dividers. Resolved wiki links are underlined inline actions; unresolved links have dashed underlines. Code and diff use native monospace; long code and tables scroll. Recall presents question, categories, evidence and explicit conflicts in its working column; model scores remain labeled judgments, not proof.

### Review

Preserve the upstream `fa6754b` content order: operation summary, expanded Jev assessment, diff, sources, then review/undo actions and operation identity. `src/ChangeReader.tsx` and `src/JevReview.tsx` are authoritative. The assessed draft alone is a disclosure within the assessment; the assessment itself is not collapsed behind the diff. Earlier evidence-first/collapsed-evaluator prose in historical iteration notes is superseded.

Pending work precedes recent activity; routine Obsidian edits remain in a disclosure. Desktop can open unresolved work first; mobile uses queue/detail navigation and focus transfer. Advisory assessment states, unavailable assessments, earlier-draft/context notices, source evidence, undo and authorization behavior remain intact. Diff additions/removals share neutral surface tones and distinguish themselves through explicit plus/minus signs.

### Account and consent

Account sections use graphite paper on black, with compact identity, server sync status, connected apps and a copyable MCP address with failure fallback. Consent preserves the full wrapping client name, identity, requested permissions, unverified-name notice, callback details and equal-height Cancel/Connect actions. The compact card and mobile padding never remove permission disclosures.

Button and edge state transitions use 160ms; the landing note update uses 350ms. Busy indicators animate only during work. Reduced-motion preference removes CSS transitions and animation; playback and graph logic also honor it.

## Do's and Don'ts

### Do:

- **Do** preserve matte black ground, graphite reading surfaces and silver hierarchy across public, app, account and consent.
- **Do** use Atkinson only for the compact landing promise and evidence heading, and system sans for working UI.
- **Do** use unchanged sourced SVG marks with their provenance, and keep the active conversation identity accurate.
- **Do** retain standard controls, visible focus, explicit status labels, reduced motion and bounded playback or settling.
- **Do** preserve the current Review order: summary, expanded assessment, diff, sources and actions.

### Don't:

- **Don't** restore pale working canvases, white reading panes or colored decorative accents.
- **Don't** enlarge the approved compact geometry to imitate the superseded composition image's scale.
- **Don't** add glow, bevel, ornamental graph artwork or stacks of shadowed dashboard cards.
- **Don't** rely on grayscale differences alone to convey category, status or changed lines.
- **Don't** turn illustrative conversation controls into claims of live agent calls or completed integrations.
