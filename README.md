# Mockdeck

A safe, theme-aware ASCII UI mockup studio for [Pi](https://github.com/badlogic/pi-mono). Generate several interface concepts with an agent, browse them instantly in a keyboard-driven TUI, and send the selected direction back into your implementation workflow.

```text
╭─ MOCKDECK ─────────────────────────────────────────────────────────╮
│ [Gallery]  Preview  Notes                              4 concepts │
├──────────────────────┬─────────────────────────────────────────────┤
│  01 Calm dashboard  │  ╭───────────────────────────────────────╮ │
│ ▶02 Dense dashboard │  │ [accent]Energy overview[/]            │ │
│  03 Mobile cards    │  │  1,240 customers   72 overdue         │ │
│                     │  ╰───────────────────────────────────────╯ │
╰──────────────────────┴─────────────────────────────────────────────╯
```

## Features

- `/mockup <brief>` generates multiple structurally distinct concepts.
- `/mockups` opens the gallery.
- Semantic, Pi-theme-aware colors without accepting unsafe raw ANSI.
- Gallery, full preview, and design-notes views.
- Copy, delete, Markdown export, and “use this concept” actions.
- Atomic project-local persistence and indexed O(1) artifact lookup.
- Responsive narrow-terminal fallback.
- Bundled `ascii-ui-design` skill.

## Install

From a local checkout:

```bash
pi install /absolute/path/to/pi-mockdeck
```

After publishing:

```bash
pi install git:github.com/OWNER/pi-mockdeck
# or
pi install npm:pi-mockdeck
```

For one run:

```bash
pi -e ./extensions/index.ts
```

## Usage

```text
/mockup Design three alternatives for a supplier billing dashboard
/mockups
```

Gallery keys:

| Key | Action |
|---|---|
| `↑`/`↓`, `j`/`k`, `←`/`→`, `h`/`l` | Change concept |
| `Tab` / `Shift+Tab` | Change view |
| `1`–`9` | Jump to concept |
| `Enter` or `u` | Put an implementation prompt in the editor |
| `g` | Generate related concepts |
| `c` | Copy plain ASCII |
| `e` | Export Markdown |
| `d` | Delete after confirmation |
| `Esc` or `q` | Close |

## Configuration

Global configuration: `~/.pi/agent/mockdeck.json`

Project configuration: `.pi/mockdeck.json`

Project values override global values:

```json
{
  "storageDir": ".pi/mockdeck",
  "autoOpenAfterGeneration": true,
  "solidBackground": true,
  "defaultVariantCount": 4,
  "defaultViewport": { "width": 100, "height": 30 },
  "maxArtifacts": 500,
  "maxCanvasLines": 120,
  "maxLineWidth": 500
}
```

Relative storage paths resolve from the active project's root. Artifacts are JSON source documents under `<storageDir>/artifacts`; Markdown exports go under `<storageDir>/exports`. Set `solidBackground` to `false` only when terminal transparency behind the gallery is desired.

## Color markup

Models publish semantic tags rather than terminal escapes:

```text
[accent]Selected tab[/]  [success]● Healthy[/]  [warning]3 overdue[/]
```

Supported tones: `text`, `muted`, `dim`, `accent`, `success`, `warning`, `error`, and `info`. Raw terminal control characters are stripped before persistence and rendering.

## Development

```bash
npm install
npm run verify
```

The package targets Node.js 22.19+ and Pi 0.85.1+.

## Publishing checklist

1. Replace the placeholder repository owner in `package.json`.
2. Add a screenshot or MP4 under the package's `pi.image` or `pi.video` metadata.
3. Run `npm run verify` and `npm pack --dry-run`.
4. Create a GitHub repository and push a tagged release.
5. Optionally publish the same package to npm.

## Security

Pi extensions execute with the user's full permissions. Mockdeck never executes generated mockup content. It strips terminal control characters, recognizes only a small semantic color vocabulary, validates dimensions, and writes artifacts beneath a configurable storage directory.

## License

MIT
