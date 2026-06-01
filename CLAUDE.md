# NeedleDrop — Design System

## Identity
NeedleDrop is a music logging and collection platform. The UI should feel like a well-organized record store — warm, purposeful, and slightly technical. Album artwork is always the star; the interface exists to frame it, not compete with it.

---

## Color Palette — "Analog Warmth"

| Role | Token | Value |
|---|---|---|
| Background | `--color-bg` | `#2D2926` |
| Surface / Cards | `--color-surface` | `#3D3834` |
| Surface Raised | `--color-surface-raised` | `#4A4540` |
| Border | `--color-border` | `#524D48` |
| Text Primary | `--color-text` | `#F7F1E3` |
| Text Muted | `--color-text-muted` | `#A89F94` |
| Text Subtle | `--color-text-subtle` | `#6B6560` |
| Accent | `--color-accent` | `#E67E22` |
| Accent Hover | `--color-accent-hover` | `#CF711E` |
| Accent Muted | `--color-accent-muted` | `#E67E2220` |
| Success | `--color-success` | `#5E9E6E` |
| Danger | `--color-danger` | `#C0392B` |

### Rules
- Never use pure black (`#000`) or pure white (`#FFF`) — always pull from the palette
- Album art will bring its own color; UI colors must stay neutral enough not to clash
- The accent (`#E67E22`) is for interactive elements only — buttons, links, active states
- Hover states use `--color-accent-hover`; disabled states drop to 40% opacity

---

## Typography

### Fonts
- **Body / UI**: `Inter` or system sans-serif — clean, legible, warm at small sizes
- **Monospace accents**: `JetBrains Mono` or `IBM Plex Mono` — for stats, counts, labels, metadata, timestamps, ratings

### Usage
- Section labels (e.g. "LATEST ADDED", "THE SETUP"): monospace, uppercase, `0.65rem`, `tracking-widest`, `--color-text-subtle`
- Stats and counts: monospace, bold
- Album titles: sans-serif, semibold
- Artist names / metadata: sans-serif, muted
- Body text / reviews: sans-serif, regular, `--color-text`

### Scale
- `xs`: `0.75rem` — metadata, timestamps, labels
- `sm`: `0.875rem` — body, list items
- `base`: `1rem` — default
- `lg`: `1.125rem` — card titles
- `xl`–`2xl`: headings, username display

---

## Components

### Shape Language
- **All containers**: square corners (`border-radius: 0`) — cards, modals, inputs, panels
- **Buttons only**: `4px` radius — just enough to distinguish from containers
- **Album art**: `4px` radius — consistent with buttons
- Never use fully rounded (`rounded-full`) except avatar images

### Borders
- Use `1px solid --color-border` on all cards and surfaces
- No drop shadows — depth comes from background color stacking, not shadows
- Dividers: `1px solid --color-border` at 50% opacity

### Cards
```
background: --color-surface
border: 1px solid --color-border
border-radius: 0
padding: 16px
```

### Buttons
- **Primary**: `--color-accent` bg, `--color-text` text, `4px` radius
- **Secondary**: `--color-surface-raised` bg, `--color-text-muted` text
- **Ghost**: transparent bg, `--color-border` border
- All buttons: `transition: background 100ms ease` — snappy, not floaty

### Inputs
- Square corners
- `--color-surface` background
- `--color-border` border, transitions to `--color-accent` on focus
- No box shadows on focus — border color change only

### Stats / Counts
- Always monospace
- Large number + small muted label below
- No decoration — let the number speak

---

## Interaction

### Transitions
- Duration: `100ms` for all hover/active states — snappy and confident
- Property: `background-color`, `border-color`, `color`, `opacity`
- No transform animations, no bounces, no slides
- Exception: modals fade in at `150ms`

### States
- **Hover**: shift background one step up the surface scale, or apply accent tint
- **Active/pressed**: darken by 10%
- **Disabled**: 40% opacity, cursor not-allowed
- **Focus**: accent border color, no outline ring

---

## Layout & Density

### Spacing Scale
Use a consistent 4px base unit: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

### Density Rules
- **Functional sections** (search, collection lists, logs): compact — `12px` padding, tight row gaps
- **Editorial sections** (featured grid, profile header): spacious — `24–40px` padding
- Max content width: `1152px` (`max-w-6xl`)
- Sidebar width: `256px`

### Grid
- Featured albums: 4-column grid, equal square tiles
- Collection list: single column rows, compact
- Recent listens: single column rows with art + metadata

---

## Visual Hierarchy

### The Album Art Rule
Album artwork should never be cropped awkwardly or displayed below `48px`. Preferred sizes:
- Featured: `full width of column ÷ 4` (square)
- List rows: `48px × 48px`
- Modal header: `56px × 56px`

Art and text carry equal visual weight — don't let one dominate the other.

### Section Labels
All section headers follow this pattern:
```
SECTION NAME  ←  monospace, uppercase, text-subtle, tracking-widest, text-xs
```
No decorative lines, no icons in headers — the label alone is sufficient.

---

## Do / Don't

| Do | Don't |
|---|---|
| Use monospace for all numeric/stat displays | Use serif fonts anywhere |
| Keep transitions at 100ms | Use spring or bounce animations |
| Let album art set the color mood per card | Add colored backgrounds behind album art |
| Use sharp corners on all containers | Round cards or modals |
| Stack surfaces using the palette steps | Use drop shadows for depth |
| Keep accent color for interactive elements only | Use accent as a decorative color |
