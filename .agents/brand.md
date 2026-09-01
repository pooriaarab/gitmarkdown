# GitMarkdown Brand

GitMarkdown is a collaborative Markdown editor with GitHub sync, live editing,
inline review, and assisted writing.

## Name

Write the product name as `GitMarkdown`. Keep both capital letters. Do not split
the name or shorten it in product copy.

## Promise

Help teams write and review Markdown together without leaving their GitHub
workflow.

## Audience

GitMarkdown serves developers, engineering teams, and technical writers. Assume
that readers understand repositories, branches, commits, and pull requests.

## Voice

- Be direct, calm, and specific.
- Use familiar Git and Markdown terms.
- Describe the action before its implementation detail.
- State sync, access, and review status precisely.
- Avoid hype, vague security claims, and invented guarantees.

## Product language

Prefer `repository`, `branch`, `commit`, `pull request`, `Markdown`, `comment`,
and `workspace`. Use the same term for the same object throughout a flow.

GitMarkdown authenticates users through its configured providers. Its real-time
collaboration rules require authentication. Do not claim stronger access
controls unless the implementation proves them.

## Logo assets

`src/components/ui/logo.tsx` and `public/logomark.svg` contain the primary
24-pixel mark. It combines a rounded document, a Markdown M, and a branch dot
with a short connector.

`public/logo.svg` is a separate 32-pixel asset. It uses a folded document and a
three-node branch graphic. Do not substitute one asset when its view box or
composition would change the layout.

Use the mark in the current text color. Preserve its view box, stroke widths,
spacing, and transparent background.

## Visual identity

The default interface uses neutral OKLCH tokens and Geist fonts. Light and dark
modes keep the same hierarchy.

The default `github` code theme uses this baseline. Other code themes
intentionally reskin the full interface. They derive app colors, panel colors,
borders, and syntax colors from their paired Shiki themes.

Document structure remains separate from theme choice. A selected theme can
change the interface palette, but it must not change document meaning or editor
behavior.

## Brand boundaries

- Keep editing and review controls practical and compact.
- Preserve clear states for unsaved work, sync, comments, and checks.
- Use color to support status and hierarchy, not decoration.
- Do not assign symbolic meanings to logo geometry.
- Do not promise access isolation beyond enforced rules.
- Do not describe non-GitHub themes as code-only skins.
