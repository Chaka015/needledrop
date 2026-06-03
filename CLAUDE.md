# NeedleDrop — Design System & Product Guide

## Identity
NeedleDrop is a music logging and collection platform. The UI should feel like a well-organized record store — warm, purposeful, and slightly technical. Album artwork is always the star; the interface exists to frame it, not compete with it.

---

## Philosophy — The Bandcamp Spirit

NeedleDrop is a love letter to music. Every feature decision should pass this test: *does this serve the music fan, or does this serve growth metrics?* We want to make money, but never at the expense of the culture we're celebrating.

### What Bandcamp Gets Right (That We Should Too)
- **Artist-first presentation** — the artist and their work is the hero, never the platform
- **Direct support culture** — celebrate the act of buying, owning, and supporting artists directly
- **Community-defined tags** — user-defined genre/mood tags, not corporate genre buckets
- **Discovery through human taste** — through other collectors' collections and mixes, never through an algorithm
- **No algorithm** — chronological, editorial, human. We surface what the community loves, not what maximizes engagement
- **Liner notes culture** — give collectors space to write about albums the way artists write about their own work. Long-form is welcome here.
- **Adjacency discovery** — "collectors who own this also own..." powered by real collection data, not recommendation engines

### What We Add That Bandcamp Doesn't Have
- The physical collection as identity
- Pressing-level granularity
- The ritual of listening celebrated (Now Spinning, flip counter)
- Show history and live music connection
- A marketplace that puts money in artists' and collectors' hands at a fair commission

### Design Principles Derived From This
- Album art is always the star — make it big, make it beautiful
- Density should feel rich, not overwhelming
- Warm, not clinical — this is about love of music not technology
- Every empty state should feel like an invitation, not a void
- Self-expression over prescription — give users flexibility in how they present themselves
- Music in 5s and 10s — traditional music reference points (Top 5, Top 10, not arbitrary numbers)

### Things We Will Never Do
- Sell fan listening data to third parties
- Let advertisers influence what gets surfaced
- Prioritize streaming over physical ownership in any UI decision
- Make the algorithm the curator — humans curate here
- Treat a Spotify skip the same as a vinyl listen

---

## Current Roadmap (June 2026)

### Core Philosophy
- **Physical media first**: Collection is the primary experience. Streaming is acknowledged but secondary.
- **Personal curation over discovery**: Fans build their own collections and mixes; social grows organically from that.
- **Beat Discogs by**: Better UX, community features, social connection, marketplace (future).

### Immediate Priorities

#### 1. Two-Tab Now Spinning Modal
- **Collection tab**: Search fan's own records, pick one, log with optional rating/review/format
- **Streaming tab**: Search MusicBrainz API, set Now Spinning but marked as streaming (different badge color)
- Streaming listens logged separately, don't count toward "Records" stat
- Streaming logs show service icon (▶) instead of format (Vinyl/CD)

#### 2. Spotify OAuth Integration
- Fans can connect Spotify account in settings
- Auto-log recent plays in background (daily cron or on login)
- Streaming logs marked distinctly, don't inflate collection count
- Goal: frictionless streaming logging without competing with Spotify

#### 3. Mixes Feature
- Fans can create curated lists of 5-50 albums called "Mixes"
- Each mix has title, description, optional cover image
- Mixes are shareable (can be featured on profiles, e-zine)
- Mixes can only contain physical records from fan's collection (not streaming)
- URL: `/[username]/mixes/[mixId]`

#### 4. Landing Page (Logged-Out Fans)
- Hero section: "NeedleDrop — The social network for record collectors"
- **Latest Additions**: Albums added to collections in the last 7 days (global, sorted by date)
- **Most Popular**: Albums added in the last 7 days, sorted by spin count
- **Featured Mixes**: Top curated mixes from community
- CTA: "Start collecting"

#### 5. Premium / Patreon Tier
- Unlock: Custom mix covers (image upload), analytics dashboard (listening trends), early access to new features
- Messaging: "Support NeedleDrop and unlock creator tools"
- Stripe or Patreon integration

### Future (Not Yet)
- Marketplace (box it out, don't build)
- Community leaderboards
- Better onboarding flows
- Advanced analytics

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

---

## Vision — The Stereo Tower

The profile page should feel like the face of a classic stereo tower — each section is its own component in a rack system:

- **Header** → the display panel (username, stats, now spinning)
- **Collection / Featured** → the tuner face (dial, presets)
- **Recent Listens** → the VU meter / tape deck
- **The Setup** → the back panel or spec plate
- **Sidebar** → the right rack unit

This metaphor should inform layout decisions: sections feel modular, self-contained, with clear borders between them like physical units stacked in a rack.

---

## Skins System

Users can choose a "skin" that changes the visual language of their entire profile. The skin is stored on the `User` model as a `skin` field.

Each skin maps to a set of CSS variable overrides. The current default is **Analog Warmth**.

### Planned Skins

| Skin | Vibe | Key Colors |
|---|---|---|
| **Analog Warmth** *(default)* | Espresso, terracotta, warm | `#2D2926` bg, `#E67E22` accent |
| **Silver Face** | Brushed aluminum, 70s Marantz/Sansui | Silver, black, warm white |
| **Midnight Black** | Matte black, cool grey, red VU meters | `#0D0D0D` bg, `#FF3E3E` accent |
| **Wood Grain** | Warm oak, cream fascia, vintage Technics | Tan, oak, cream |
| **Studio Console** | Dark green, cream labels, SSL/Neve vibe | Forest green, cream |

### Implementation Notes
- Skin config lives in `lib/skins.ts` — a map of skin name → CSS variable overrides
- Profile page reads `user.skin` and applies the correct variable set
- Skin picker lives in settings page
- All components use CSS variables, never hardcoded colors, so skins work automatically

---

## Vision — Live Listening & Physical Media

### The "Now Spinning" Flow
Physical listening is intentional and ritualistic — it should be treated differently from streaming.

**Physical logging flow:**
- A persistent **"What are you spinning?"** action — always visible in the nav
- Fan searches their collection, picks the record, confirms
- This simultaneously: logs the listen AND sets the Now Spinning badge on their profile
- Now Spinning stays live until the fan spins something new (which auto-replaces it)
- No "stop" button needed — the badge is a statement, not a timer

**Now Spinning badge:**
- Pulsing accent-colored dot + "NOW SPINNING: Artist — Album"
- Visible on profile header
- Visible in activity feed and friend profiles
- After 60 minutes: switches to "LAST PLAYED" with dimmed badge

### Physical vs Digital — Kept Separate
- **Physical** (vinyl, CD, cassette): manual, intentional, logged via "What are you spinning?"
- **Digital** (Spotify, Apple Music, Tidal, etc.): automated, pulled via OAuth, runs in background
- Both appear in the listening log but are visually distinguished by format
- Goal: support any streaming service via OAuth, not just Spotify

### Social Live Feed Vision
- Activity feed showing notable actions: listens, adds, features, follows
- "Who's spinning right now" — a live feed of active Now Spinning fans
- This makes the platform feel like a virtual listening room
- Marketplace is a long-term future feature — box it out but don't build yet

---

## Navigation Plan

Top nav like Letterboxd — clean, always visible. Submenus for:
- Search (any album or artist)
- Import from Discogs
- "What are you spinning?" (prominent physical logging action)
- Social / e-zine feed
- Profile link

---

## Language & Terminology

NeedleDrop has its own vocabulary. Never use generic tech/social media terms. Always use the music-native equivalents.

### Never say → Always say
- Users → Fans
- Content → Music / Albums / Records
- Feed → E-zine (the social feed)
- Posts → Entries / Logs
- Followers → Fans
- Following → Listening to
- Like / Heart → Spin (↻)
- Dashboard → Record Room
- Profile → Liner Notes (or just Profile)
- Notifications → Alerts
- Messages → Notes
- Settings → Preferences
- Search → Dig (as in crate digging)
- Trending → Hot Right Now
- Recommended → You Might Dig This
- Activity → Latest Spins / Latest Drops

### Tone
- Warm, conversational, music-obsessive
- Written like a music journalist or passionate collector
- Never corporate, never algorithmic-sounding
- Celebrate ownership, ritual, and discovery
- Think: a really good record store clerk, not a tech startup

---

## Tech Stack

- **Frontend**: Next.js 16.2.6, React 19, TypeScript
- **Styling**: Tailwind CSS 4, CSS variables for skins
- **Database**: PostgreSQL (Neon), Prisma 5.22
- **Auth**: Clerk
- **APIs**: Discogs, MusicBrainz, Spotify, NewsAPI, Setlist.fm, Bandsintown
- **Deployment**: Vercel
- **Storage**: Vercel Blob

---

## Brand Values

NeedleDrop is a passion project, but a sustainable one. We're building for fans, not algorithms. Every feature is tested against the question: *Does this serve the fan or the growth metric?*

We celebrate:
- Ownership over streaming
- Ritual over convenience
- Community over algorithm
- Human curation over AI recommendations
- Fair commission over extraction