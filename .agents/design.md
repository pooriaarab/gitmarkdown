# GitMarkdown Design System

This file defines GitMarkdown's implemented visual language. Use it when you
change the product interface or create related visual material.

## Overview

GitMarkdown is a dense, practical workspace for writing and reviewing Markdown.
Its main surfaces are the repository tree, file tabs, editor, code viewer,
comments, checks, and assisted-writing panel.

The interface uses a paper-like editor within a bordered application shell.
Focus mode removes most navigation so the document becomes the primary surface.

The default `github` theme uses the tokens in `src/app/globals.css`. A selected
non-GitHub code theme intentionally overrides the full app palette through
`CodeThemeStyle`. The document model and layout remain unchanged.

## Colors

The default light palette uses neutral OKLCH values:

- Background and card: `oklch(1 0 0)`.
- Foreground: `oklch(0.145 0 0)`.
- Primary: `oklch(0.205 0 0)`.
- Muted and accent: `oklch(0.97 0 0)`.
- Muted foreground: `oklch(0.556 0 0)`.
- Border and input: `oklch(0.922 0 0)`.
- Ring: `oklch(0.708 0 0)`.
- Sidebar: `oklch(0.985 0 0)`.
- Destructive: `oklch(0.577 0.245 27.325)`.

The default dark palette reverses the neutral range:

- Background: `oklch(0.145 0 0)`.
- Card and popover: `oklch(0.205 0 0)`.
- Foreground: `oklch(0.985 0 0)`.
- Primary: `oklch(0.922 0 0)`.
- Muted and accent: `oklch(0.269 0 0)`.
- Border: `oklch(1 0 0 / 10%)`.
- Input: `oklch(1 0 0 / 15%)`.
- Ring: `oklch(0.556 0 0)`.
- Destructive: `oklch(0.704 0.191 22.216)`.

Search matches use yellow overlays. Active comments use orange overlays.
Writing checks use red for original text and green for suggestions.

Non-GitHub themes derive background, foreground, primary, card, muted, accent,
border, input, ring, and sidebar values from paired Shiki themes. They also
replace ProseMirror syntax colors.

## Typography

Use Geist for interface and document text. Use Geist Mono for code, shortcuts,
file data, and diffs. Both families load through `src/app/layout.tsx`.

The editor heading scale is:

- H1: `2em`, weight `700`, line height `1.25`.
- H2: `1.5em`, weight `600`, line height `1.3`.
- H3: `1.25em`, weight `600`, line height `1.4`.
- H4: `1em`, weight `600`, line height `1.4`.
- H5 and H6: `0.875em`, weight `600`, line height `1.4`.

H1 and H2 use a bottom border. H6 uses the muted foreground color.

Pierre diff views use a 12-pixel font, `1.5` line height, and two-space tabs.
These values do not control the raw code viewer.

## Layout

The desktop shell stacks the app header, file tabs, editor header, and editor
toolbar around the content area. The file sidebar sits left. Comments and
assisted-writing tools sit right.

The ProseMirror canvas uses `2.5rem 4rem` padding and `8rem` bottom padding.
Below 768 pixels, it uses `1.5rem 1.25rem 4rem`.

Focus mode hides the app header, editor header, mobile toolbar, and tab bar. It
fades the desktop toolbar until hover or keyboard focus. The transition lasts
`0.3s`. Content centers at a maximum width of 720 pixels and scales to `1.1em`.
The exit control stays fixed 12 pixels from the top and right edges.

## Elevation & Depth

Borders provide most separation. Use `1px solid var(--border)` between panels,
headers, tables, and controls.

The editor paper uses two restrained shadows:

- Light: `0 0 0 1px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(0, 0, 0, 0.04)`.
- Dark: `0 0 0 1px rgba(255, 255, 255, 0.06), 0 2px 8px rgba(0, 0, 0, 0.3)`.

Reserve stronger shadows for temporary overlays. Do not add decorative depth to
the main workspace.

## Shapes

The base radius is `0.625rem`. Derived radii are:

- Small: base minus 4 pixels.
- Medium: base minus 2 pixels.
- Large: the base value.
- Extra large: base plus 4 pixels.
- Two extra large: base plus 8 pixels.

Use smaller radii for controls. Use larger radii for cards, dialogs, and sheets.
Tables and diff containers can remain square when alignment is more important.

## Components

- App header: product identity, repository context, presence, and sync actions.
- File sidebar: repository tree and Markdown file navigation.
- Tab bar: open files and active-file state.
- Editor toolbar: formatting actions with compact spacing and sticky placement.
- ProseMirror editor: headings, lists, tasks, tables, quotes, code, and images.
- Code viewer: syntax layer below a transparent editable textarea.
- Comment surfaces: yellow default markers and orange active markers.
- Writing checks: red original lines and green suggestion lines.
- Presence cursor: a two-pixel caret with a user-colored label.
- Focus mode: centered writing canvas with an unobtrusive exit control.

The primary 24-pixel logo combines a document, Markdown M, branch dot, and
connector. Keep it in the current text color. Preserve the original geometry.

## Do's and Don'ts

- Do use semantic tokens instead of hard-coded neutral colors.
- Do test light, dark, and one non-GitHub theme after visual changes.
- Do preserve the code viewer's aligned highlight and input layers.
- Do keep sync, comment, check, and unsaved states distinct.
- Do keep focus mode free of nonessential navigation.
- Do preserve editor padding and readable line length.
- Don't assume a selected code theme affects syntax alone.
- Don't change document structure when applying a visual theme.
- Don't use color as the only signal for an important state.
- Don't invent logo meaning, access guarantees, or unsupported brand claims.
