---
name: "Brain"
description: "A compact monochrome workspace with shared dark and light themes."
colors:
  canvas: "#141414"
  paper: "#1c1c1c"
  ink: "#f2f2f2"
  reading-text: "#d4d4d4"
  muted: "#a8a8a8"
  line: "#353535"
  control: "#262626"
  control-hover: "#303030"
  border-hover: "#525252"
  selected: "#353535"
  action-text: "#171717"
  accent: "#ececec"
  accent-strong: "#ffffff"
  control-strong: "#404040"
  action-border: "#d4d4d4"
  action-highlight: "#ffffff80"
  light-canvas: "#f5f5f5"
  light-paper: "#ffffff"
  light-ink: "#171717"
  light-reading-text: "#404040"
  light-muted: "#666666"
  light-line: "#dedede"
  light-control: "#f3f3f3"
  light-control-hover: "#e9e9e9"
  light-border-hover: "#a3a3a3"
  light-selected: "#e5e5e5"
  light-action-text: "#fafafa"
  light-accent: "#262626"
  light-accent-strong: "#111111"
  light-control-strong: "#dedede"
  light-action-border: "#171717"
  light-action-highlight: "#ffffff26"
typography:
  display:
    fontFamily: "Atkinson, sans-serif"
    fontSize: "clamp(36px, 4.2vw, 54px)"
    fontWeight: 700
    lineHeight: 1.13
    letterSpacing: "-.035em"
  landing-headline:
    fontFamily: "Atkinson, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: "-.025em"
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
    lineHeight: "18px"
  navigation:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  code:
    fontFamily: "ui-monospace, SFMono-Regular, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.7
rounded:
  badge: "4px"
  item: "8px"
  control: "10px"
  inset: "12px"
  review: "16px"
  panel: "24px"
  circle: "50%"
spacing:
  "4": "4px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "32": "32px"
components:
  button-primary:
    textColor: "{colors.action-text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  button-quiet:
    backgroundColor: "{colors.control}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  button-quiet-hover:
    backgroundColor: "{colors.control-hover}"
  input-search:
    backgroundColor: "{colors.control}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  navigation-item:
    textColor: "{colors.reading-text}"
    typography: "{typography.navigation}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  navigation-item-active:
    textColor: "{colors.action-text}"
  status-chip:
    backgroundColor: "{colors.control}"
    textColor: "{colors.reading-text}"
    rounded: "{rounded.badge}"
    padding: "2px 6px"
    size: "11px"
  review-panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.review}"
  scene-option:
    textColor: "{colors.muted}"
    rounded: "{rounded.item}"
    padding: "7px 12px"
    size: "12px"
  scene-option-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.ink}"
  theme-toggle:
    backgroundColor: "{colors.control}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px"
    width: "36px"
    height: "36px"
---

# Design System: Brain

## Overview

**Creative North Star: "Brain in monochrome"**

Brain uses neutral layers and compact controls in two themes: charcoal surfaces with silver text by default, or white surfaces with charcoal text when light mode is selected. Rounded outer panels give the app, landing page and documentation a common frame; reading surfaces inside them remain quiet and spacious. The compact landing scale and monochrome identity remain in force.

The component treatment adapts [BoardUI's](https://www.boardui.com/) MIT-licensed free button, input, sidebar, badge and segmented-control designs into the existing React, HTML and CSS. This is a native implementation with no new runtime dependency, not a Tailwind or React Aria installation. BoardUI revision `ec5c5eb3e29c2441be63b9422cd54f411ef23466` is attributed in `public/THIRD_PARTY_NOTICES.txt`; its MIT notice is also retained in `src/boardui.css`. BoardUI's colored accents map to neutral actions, selections and focus treatments: white primary actions in dark mode, charcoal primary actions in light mode.

**Key Characteristics:**

- Shared semantic dark/light tokens across the app, landing page and documentation.
- Floating rounded frames, inset controls and restrained contact shadows.
- Contrasting primary actions and selected app navigation; neutral secondary selections.
- Compact typography, readable note measures and explicit interaction states.

## Colors

The shared source of truth is `src/boardui.css`, imported by all three surface stylesheets. Unprefixed frontmatter colors describe the dark default; `light-` entries record the corresponding `:root[data-theme="light"]` overrides. At runtime both themes use the same semantic CSS property names, such as `--paper` and `--action-text`. Frontmatter component references describe the default theme; sidecar previews inherit the runtime properties. The sidecar records shadows and component CSS that the frontmatter schema cannot hold.

### Primary

- **Contrasting action:** primary buttons and selected app navigation share a light gradient with dark text in dark mode, and a charcoal gradient with light text in light mode. `action-text`, `action-border` and `action-highlight` keep their labels and edges consistent. Gradients remain CSS custom properties referenced by the sidecar; they are images, not frontmatter color values.
- **Neutral focus:** `accent` and `accent-strong` support outlines, carets and clear hover states in each theme.

### Neutral

- **Ground and paper:** `canvas` sits behind `paper` panels and beneath the graph. Dark mode uses charcoal layers; light mode uses a soft gray canvas and white panels.
- **Inset controls:** `control`, `control-hover`, `control-strong` and `selected` distinguish fields, hover, badges and selection. Selection in lists also has an inset border.
- **Text hierarchy:** `ink`, `reading-text` and `muted` separate headings, prose and supporting metadata in both themes.
- **Fine boundaries:** `line` divides surfaces; `border-hover` strengthens interactive edges.

**The Monochrome Rule.** Keep decorative color out of the interface; communicate category, status and changed lines with words, icons, borders or line patterns as well as tone.

## Typography

**Landing display font:** self-hosted Atkinson Hyperlegible Next, registered as `Atkinson`, weight 700. `public/fonts/atkinson-hyperlegible-next-700.ttf` uses `font-display: swap`; the font's license and provenance remain beside it. Only the landing promise and evidence heading use this face.

**Interface and reading font:** system sans. **Code font:** native monospace. Keep the existing type pairing when adapting new BoardUI treatments.

- **Public promise:** `display`; at 640px and below it becomes 36px with a 1.14 line height. The evidence heading becomes 30px at 850px and below.
- **Note titles:** `headline`; the inspector uses `title`. App view titles are 23px on desktop, 24px on mobile and 23px at 440px and below. Documentation uses 30px/25px/17px headings with a 1.35 line height.
- **Reading:** `body` for full notes, `body-compact` for inspector previews. Inspector text rises to 14px on wide desktop and stacked mobile. Documentation body is 15px with a 1.85 line height.
- **Controls:** `button` and `navigation`; metadata generally uses 10–12px. Search and editable textareas use 16px on mobile.

**The Compact Promise Rule.** Preserve the landing headline's 54px maximum and 36px mobile size.

**The Reading Measure Rule.** Keep full note, change and documentation readers within the implemented 70ch measure.

## Layout

The app has a viewport-height shell with 12px outer padding and gap. The sidebar and main region are separate rounded panels. Desktop navigation is 236px wide, the search header 68px high and the inspector 328px wide. Browse uses a 320px folder pane; Review uses a 296px queue. Full readers use 42px top, 52px side and 60px bottom padding. Recall retains an 800px maximum working column.

At 1500px and above the sidebar becomes 248px and inspector 380px. At 1150px and below they become 208px and 300px, with 280px Browse and 260px Review lists. At 950px the sidebar becomes a 64px icon rail. At 760px the shell uses 8px padding and gap, navigation becomes a sticky 61px top bar and the main panel uses the review radius. Graph and inspector stack; Browse and Review use list/detail navigation with explicit back controls. The mobile graph is 510px high, becoming 450px at 440px.

The landing content is centered at a 1100px maximum width, with 40px side space, then 24px at 850px and 18px at 640px. A floating masthead precedes the promise, paired conversation/note demonstration and evidence section. The demo's 1.65:1 columns become 1.4:1 at 850px and stack at 640px.

Documentation uses a 1160px maximum width, a floating sticky header, a 230px sticky contents panel and a separate reading panel. At 1000px the sidebar becomes 200px; at 760px it moves above the article, with an expandable two-column contents list and 8px outer margins. Long code and tables scroll within their containers. At 640px and below, the documentation header hides its GitHub link to retain room for the theme button; GitHub links remain in the article and footer.

## Elevation & Depth

Tonal layering and thin borders carry most depth. A low contact shadow supports controls; the sidebar and entry card use the panel shadow. Primary buttons and selected app navigation have a subtle inset top highlight. Search results use a stronger overlay shadow. Rounded frames do not imply that every nested section needs another shadow.

The exact dark/light control, panel and overlay shadows, focus outlines and transition values live in `.impeccable/design.json`. Its component previews inherit the primary gradient properties from `src/boardui.css`, with dark fallbacks. Light mode uses lower shadow opacity while retaining the same geometry. These treatments supersede the earlier flat-pane/no-shadow guidance.

**The Quiet Depth Rule.** Use contact shadows for controls and floating frames; keep ordinary reading sections separated by spacing and fine rules.

## Shapes

Use the shared control radius for buttons, fields and app navigation, and the panel radius for outer frames. Review, evidence and account panels use the review radius. Inset groups and documentation disclosures use the inset radius; list items and segmented options use the item radius. Compact status badges retain small corners rather than pill shapes. Mobile app navigation keeps its existing 6px radius; the mobile main frame and public mastheads tighten to 16px.

Graph nodes, folder markers and identity avatars remain circular. Preserve the three-node Brain mark and sourced agent SVGs. Their provenance remains in `public/agents/sources.json`; no replacement logos or decorative raster artwork are part of this treatment.

## Components

### Buttons

Primary actions use the theme’s contrasting gradient, action label and inset highlight. Quiet actions use the neutral control fill and a fine border; hover changes fill and border, while active state uses `selected`. App buttons have a 36px minimum height, rising to 40px on mobile. Public primary links and consent actions retain 44px targets. Disabled primary and quiet controls use a flat neutral control fill, muted label and no shadow. Preserve visible two-pixel focus outlines.

### Theme control

The native theme button appears in the app header, authentication and account headings, and landing/documentation navigation. Its sun or moon icon and accessible action label indicate the mode it will switch to. The shared control is 36px square, becoming 40px at 760px and below, with the same border, hover and keyboard focus treatment as other controls.

`src/theme.ts` is built as an external script loaded before each page’s stylesheet. It sets `html[data-theme]` from the saved `brain-theme` localStorage value and updates an existing browser theme-color meta tag. Only `light` selects light mode; missing or invalid values select dark. Native button clicks switch immediately and save the choice when storage is available. Storage events synchronize other tabs on the same origin; unavailable storage still permits switching on the current page. No system-mode preference or additional dependency is used. Without the script, dark styles remain and the nonfunctional toggle stays hidden.

### Inputs / Fields

Search is an inset wrapper with a leading SVG icon; focus changes its background and border using the current theme. Its bounded results overlay stays anchored to the field. Native selects retain browser semantics. Recall and review-reason textareas remain resizable, bordered and visibly focused; mobile text size prevents zoom on entry. Keep existing labels, disabled states and errors.

### Navigation and status

Selected app navigation uses the same contrasting gradient as primary actions, including themed text and count badges. Hovered navigation uses the neutral raised surface. Selected note and work rows use neutral fill plus an inset border. Documentation header navigation uses a quiet filled current state; its contents remain ordinary anchor links. Status badges are small bordered rectangles with explicit wording, including pending, applied and unavailable states.

### Segmented controls

Landing scene buttons and Recall's native radio group sit inside a canvas-colored inset track. Selected options use a raised neutral fill, clear text and a contact shadow. Preserve pressed or checked semantics and keyboard focus; the landing no longer uses an active underline.

### Review and readers

Review panels use a neutral header strip and grouped evidence inside a rounded frame. Keep the existing order in `src/ChangeReader.tsx` and `src/JevReview.tsx`: operation summary, expanded assessment, diff, sources, then review/undo actions and identity. Only the assessed draft is a disclosure within the assessment. Scores remain advisory, with earlier-draft and unavailable notices intact. Diff additions and removals retain explicit plus/minus signs.

Markdown, source links and backlinks remain understated. Resolved wiki links are underlined actions; unresolved links have dashed underlines. The graph retains its node, edge, selection, drag, zoom and reduced-motion behavior. This component restyling does not change data or authorization flows.

### Documentation disclosures

Tool entries use native `details`/`summary`: name, short purpose and scope badge remain visible before expansion. Opening reveals the existing inputs and constraints, adds a neutral background and changes the plus indicator to minus. Preserve anchors, focus outlines, mobile wrapping and the content's order.

### Public demonstration and account surfaces

The paired conversation and persistent note keep the existing bounded playback, manual scenes, synthetic labels and reduced-motion behavior. Account, sign-in and consent inherit the neutral controls and framing; full client names, requested permissions, callback details and Cancel/Connect actions remain visible.

App button transitions use 160ms with the existing easing curve; the landing note update uses 350ms ease-out. Busy indicators only run during work. Reduced-motion preferences remove transitions and animation while preserving state changes.

## Do's and Don'ts

### Do:

- **Do** import the shared BoardUI adaptation tokens for public, app and documentation surfaces.
- **Do** use semantic theme properties for primary actions, selected app navigation, text, icons, borders and secondary selections.
- **Do** preserve the compact type scale, readable measures and sourced SVG identities.
- **Do** retain native semantics, explicit labels, keyboard focus, mobile wrapping and reduced motion.
- **Do** preserve review order, source evidence, permission disclosures and synthetic-demo labeling.

### Don't:

- **Don't** introduce colored decorative accents, hardcoded dark-only component colors or enlarged display type.
- **Don't** treat the adaptation as an installed BoardUI, Tailwind or React Aria runtime.
- **Don't** turn every reading section into a shadowed card or remove the implemented subtle control gradients.
- **Don't** rely on grayscale differences alone to communicate status, category or changed lines.
- **Don't** change content, backend behavior or authorization to fit a component reference.
