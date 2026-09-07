---
name: ascii-ui-design
description: Creates multiple distinct, colored ASCII interface mockups and publishes them into Mockdeck. Use when the user asks to brainstorm, sketch, wireframe, compare, or redesign a UI in the terminal.
compatibility: Requires the pi-mockdeck extension and its mockdeck_publish tool.
---

# ASCII UI Design

Create decision-ready interface concepts, not ASCII decoration.

## Workflow

1. Read the user's brief and the relevant product or UI files when available.
2. Identify the primary user, task, information hierarchy, target terminal viewport, and important states.
3. Generate the requested number of concepts. Make each structurally different: hierarchy, navigation, density, or interaction model must change.
4. Publish each concept separately with `mockdeck_publish`.
5. Finish with a compact comparison of the concepts and invite the user to browse them with `/mockups`.

Do not implement application code during this workflow unless explicitly asked after a concept is selected.

## Canvas rules

- Supply one string per visible row in `canvas`.
- Keep borders aligned after color tags are removed.
- Prefer Unicode box drawing, block, and quadrant characters where they improve clarity.
- Design for terminal cells, not pixels. Avoid fragile whitespace art.
- Include realistic labels and data instead of lorem ipsum.
- Show important empty, loading, error, or selected states when relevant.
- Keep each concept within its declared viewport.
- Use concise notes to explain trade-offs that are not visible in the canvas.

## Color

Never emit ANSI, OSC, C0, or terminal control sequences. Mockdeck accepts only these semantic tags:

- `[accent]...[/]` — active navigation and primary actions
- `[success]...[/]` — healthy or completed states
- `[warning]...[/]` — attention states
- `[error]...[/]` — failures and destructive states
- `[info]...[/]` — informational emphasis
- `[muted]...[/]` — secondary content
- `[dim]...[/]` — guides and disabled content
- `[text]...[/]` — normal content

Tags have zero visible width. Close a colored segment with `[/]`. Do not nest tags.

## Quality bar

Before publishing each concept, mechanically check:

- Every opening tag has a closing tag.
- Borders align when tags are ignored.
- The concept is meaningfully different from the others.
- Primary action, current location, and major status are obvious.
- Notes describe trade-offs rather than restating the canvas.
- `title`, `variant`, `viewport`, `canvas`, `notes`, and useful `tags` are supplied.
