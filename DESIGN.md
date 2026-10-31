---
name: "Brain"
description: "A clean monochrome field index for connected notes."
colors:
  "canvas": "#f6f6f6"
  "paper": "#ffffff"
  "rail": "#191919"
  "rail-raised": "#303030"
  "ink": "#222222"
  "muted": "#666666"
  "line": "#e2e2e2"
  "accent": "#252525"
  "accent-strong": "#050505"
  "accent-soft": "#ededed"
  "brain": "#292929"
  "projects": "#4b4b4b"
  "areas": "#626262"
  "resources": "#737373"
  "archives": "#777777"
  "list-selected": "#e4e4e4"
  "list-hover": "#ececec"
  "rail-selected": "#eeeeee"
  "reading-text": "#4f4f4f"
typography:
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
    fontWeight: 450
  graph-hub:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 550
  code:
    fontFamily: "ui-monospace, SFMono-Regular, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.7
rounded:
  "inline": "3px"
  "small": "4px"
  "icon": "5px"
  "control": "6px"
  "navigation": "7px"
  "container": "8px"
  "overlay": "10px"
  "mark": "14px"
  "circle": "50%"
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
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 13px"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
  button-quiet:
    backgroundColor: "{colors.paper}"
    textColor: "#5a5a5a"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 13px"
  button-quiet-hover:
    backgroundColor: "{colors.accent-soft}"
  button-icon:
    textColor: "#6d6d6d"
    rounded: "{rounded.icon}"
    width: "30px"
    height: "30px"
  button-text:
    textColor: "{colors.accent-strong}"
    size: "12px"
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
    backgroundColor: "{colors.rail-selected}"
    textColor: "#323232"
  page-row:
    rounded: "{rounded.navigation}"
    padding: "14px 13px"
  page-row-selected:
    backgroundColor: "{colors.list-selected}"
  status-chip:
    textColor: "#6a6a6a"
    rounded: "{rounded.icon}"
    padding: "4px 7px"
    size: "11px"
  graph-node:
    width: "9px"
    height: "9px"
    rounded: "{rounded.circle}"
  wiki-link:
    backgroundColor: "#efefef"
    textColor: "#565656"
    rounded: "{rounded.inline}"
    padding: "0 1px"
  diff-container:
    backgroundColor: "#fafafa"
    rounded: "{rounded.container}"
    padding: "12px 0"
---

# Design System: Brain

## Overview

**Creative North Star: "The Monochrome Field Index"**

Brain uses a clean, minimalist black-and-white interface for exploring connected notes. The black navigation rail anchors pale working space and white reading surfaces; compact controls and explicit labels keep the knowledge itself prominent. Neutral grays express hierarchy without decorative color.

The implemented system uses one system sans for interface and reading text, fine dividers, restrained rounded controls, and flat panes. Graph selection adds a ring, stronger connections, and a readable caption; reading expands into a generous white column. This record describes the current source implementation after the user’s explicit monochrome revision, not an approved image composition.

**Key Characteristics:**

- Black navigation, off-white graph space, and white reading panes.
- Compact interface typography paired with spacious reading line height.
- Flat panes separated by fine rules; shadows reserved for search overlays.
- Text, shape, and selection treatment carry meaning alongside grayscale markers.

## Colors

The palette is neutral grayscale throughout, with black accents and a white paper surface. Frontmatter values are normative; the source is `src/styles.css`.

### Primary

- **Charcoal accent** (`accent`): primary actions, checkbox state, caret, and general keyboard focus. `accent-strong` darkens the primary hover state; `accent-soft` supports subtle control interaction.

### Neutral

- **Black rail** (`rail`, `rail-raised`): persistent navigation and its hover layer, with pale text and an inverted active item (`rail-selected`).
- **Canvas and paper** (`canvas`, `paper`): graph working space and reading/header surfaces, separated by `line`.
- **Ink and secondary ink** (`ink`, `muted`, `reading-text`): headings, supporting metadata, and long-form note text.
- **Collection grays** (`brain`, `projects`, `areas`, `resources`, `archives`): small graph and collection markers. The dark rail uses lighter local marker values for contrast. Text labels remain the identifying cue.
- **List state tones** (`list-hover`, `list-selected`): hover and current item in Pages and Changes.

**The Monochrome Rule.** Use black, white, and neutral grays throughout the interface. The user explicitly rejected colored decorative accents.

## Typography

**Interface and body font:** one system sans stack, recorded in frontmatter. **Code font:** the native monospace stack. There is no separate display face or promotional display scale.

The hierarchy is compact and quiet. Titles use modest weight and slightly tightened spacing; reading text gets more line height than navigation and metadata. The implemented sizes are role-specific, not a mathematically regular scale.

### Hierarchy

- **Headline:** full note titles use `headline`; the entry heading is locally larger (32px, 1.35 line height). Narrow full-note titles use 29px.
- **Title:** view headings and inspector note titles use `title`; view headings step to 24px and 23px at smaller widths.
- **Body:** full Markdown uses `body`; inspector Markdown uses `body-compact`, increasing to 14px on wide desktops and stacked mobile views.
- **Markdown hierarchy:** heading sizes are 26px, 20px, 17px, and 15px, weight 600, with 1.45 line height. Inspector level-two headings are 15px, or 17px on mobile.
- **Controls and navigation:** buttons use `button`; navigation uses `navigation`. Supporting labels and metadata generally range from 10px to 12px.
- **Graph:** regular captions use `graph-label`; hubs use `graph-hub`. Selected captions become weight 600.
- **Code:** diff lines use `code`; inline Markdown code is 0.88em of its context.

**The Reading Measure Rule.** Keep full-page note content and change readers within the implemented 70ch measure; compact previews use the inspector’s available width.

## Layout

The desktop app is a viewport-height flex shell (`100dvh`, minimum height 500px) with clipped outer overflow. The navigation, note list, and reading/inspector regions own their scroll behavior. Persistent surfaces meet at fine dividers rather than floating in cards.

The base rail is 216px wide, the search header 69px tall, and the inspector 328px wide. Pages and Changes use a 296px list alongside a flexible reader. The full reader has 42px top, 52px horizontal, and 60px bottom padding. Header horizontal padding is 28px. Repeated gaps and padding center on the frontmatter spacing values, with smaller local adjustments for dense controls.

| Condition | Implemented change |
| --- | --- |
| Width at least 1500px | Rail grows to 232px; inspector to 380px; inspector text and graph labels increase slightly. |
| Width at most 1150px | Rail becomes 190px; inspector 300px; page list 260px; horizontal spacing tightens. |
| Width at most 950px | Rail becomes a 70px icon strip; collections move to a select in Graph and Pages. |
| Width at most 760px | Navigation becomes a sticky 61px top bar; body scrolls naturally; graph and reader stack; page lists cap at 300px high; graph panel is 510px high. |
| Width at most 440px | Navigation labels hide; graph is 450px high; non-hub captions appear only for selected, hovered, or keyboard-focused notes. Selected hub captions retain the selected placement. |
| Width at least 951px and height at most 800px | Rail spacing compresses and its decorative footnote hides; the rail remains independently scrollable. |

## Elevation & Depth

The interface is flat by default. Black, off-white, white, and fine gray borders create the hierarchy. Search results are the single elevated overlay. Focus and graph selection use outlines rather than elevation.

### Shadow Vocabulary

- **Search overlay:** `var(--shadow-overlay)`; the exact source value and purpose are recorded in the sidecar.
- **Search focus:** a 2px gray ring on the wrapper when the field has focus. It indicates state rather than depth.

**The Flat Pane Rule.** Use surface tone and fine borders to separate persistent panes. Reserve the overlay shadow for transient search results.

## Shapes

Most controls are small rounded rectangles: control, icon, navigation, and container radii are distinct frontmatter tokens. Panes themselves meet squarely. Graph nodes and collection markers are circles; selected nodes add an offset outline. Inline links have a small corner radius, while the entry mark and favicon are more rounded square brand containers.

Thin single-pixel borders separate panes, outline quiet actions, and contain the diff. Selection is communicated by inversion in navigation, a soft filled row in lists, and a ring plus caption on the graph. Icons are thin SVG strokes, not decorative illustrations. The favicon is a black rounded square with a white three-node network; the current build requires no raster artwork.

## Components

### Buttons

Compact, sentence-case actions use the primary, quiet, icon, and text variants in frontmatter. Primary actions have white text on charcoal and darken on hover. Quiet actions have a fine border and pale hover fill. Icon actions are compact square controls with subtle background feedback; text actions remain unboxed. Primary and quiet controls have a 36px minimum height. Disabled buttons reduce opacity to 0.48. General keyboard focus is a 2px accent outline offset by 3px; rail controls use a pale outline.

### Inputs / Fields

Search sits in a pale rounded wrapper with a leading SVG icon; the wrapper has a focus-within ring. The field itself is unboxed. Search results form a bounded, scrollable white overlay with the overlay radius and shadow. The password field uses a thin gray border, white fill, 13px padding, and the navigation radius. Collection filtering is a native select with a fine border and compact radius. Checkboxes use the neutral accent.

### Navigation

The dark rail uses softly rounded rows with 12px gaps. Active navigation inverts to a pale fill with dark text; inactive hover raises the black surface tone. Collections retain explicit labels and small gray markers. Counts use tabular numerals. Narrow layouts transition from an icon strip to a top bar; accessible names remain when visible labels disappear.

### List items and status chips

Pages and Changes use flat rows, a pale hover tone, and a slightly darker selected fill. Page titles truncate within the list; reading content wraps. Activity uses a small rounded SVG icon tile plus a text status. The change reader adds a thin current-color outline around its status chip. Status wording and icons carry meaning; status hues remain neutral.

### Graph nodes

Nodes represent whole notes, with larger dots and stronger labels for hubs. Selection adds an offset ring and a white bordered caption. Hover or keyboard focus emphasizes the active note’s direct connections and dims unrelated elements; selected note identity persists. Dot scaling and edge emphasis transition over 220ms. At the narrowest breakpoint, only hub and active captions remain visible; unselected hub labels sit above their nodes so selected captions keep their lower position. Pan and zoom change the graph transform, while the legend and zoom controls remain anchored to the graph panel.

### Reader and links

White reader panes use readable Markdown, understated source rows, and fine section dividers. Resolved wiki links are neutral tinted inline buttons with an underline; unresolved links have a dashed underline. Code uses a gray background and monospace; code blocks and tables scroll when needed. Backlinks are text rows with small SVG icons. Attachments are represented as text, rather than shipping decorative imagery.

### Recall

Recall uses the white reader surface with a bounded 800px working column, centered horizontally within the workspace while its text stays left-aligned. Its introductory heading is 18px; explanatory text and excerpts are 13px, question input and result titles 14px, and controls 12px. The question field uses the neutral canvas fill. Category choices are native radios presented as a wrapping segmented group, with charcoal selection and visible keyboard focus. Operational details sit in a native disclosure. Evidence is separated by fine rules; conflicts retain explicit warning icons and labels in the same monochrome palette. Narrow layouts wrap categories and move the submit action onto its own row.

### Change diff

The diff is a softly rounded, bordered container with a near-white background. Added and removed rows use adjacent gray tones and explicit plus/minus signs. Monospace text wraps inside each line. The reason, actor, outcome, source evidence, and operation identity remain outside the diff in the same reading column.

Button color transitions use 160ms and the shared easing curve; graph edges and dots use 220ms. Refresh spins while busy. Reduced-motion preference removes transitions and animation throughout the app.

## Do's and Don'ts

### Do:

- **Do** preserve the black rail, off-white working canvas, and white reading surfaces.
- **Do** pair grayscale collection dots and activity states with explicit names or symbols.
- **Do** use the selected graph ring and caption, with connection emphasis on selection, hover, or keyboard focus.
- **Do** keep keyboard focus visible and honor reduced-motion preferences.
- **Do** use concise sentence-case interface text and readable, flowing note content.

### Don't:

- **Don’t** reintroduce violet or other colored decorative accents.
- **Don’t** turn the open graph or reader into a stack of shadowed dashboard cards.
- **Don’t** add decorative display headlines or labels above headings.
- **Don’t** rely on subtle differences between folder grays to identify a collection.
- **Don’t** show the collection filter in Changes, where it does not filter the activity list.
