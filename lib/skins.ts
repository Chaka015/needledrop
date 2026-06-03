export interface SkinTokens {
  bg: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  muted: string;
  subtle: string;
  accent: string;
  accentHover: string;
  // MS Modern extended tokens
  hot: string;
  hotInk: string;
  accentInk: string;
  card: string;
  sunk: string;
  line: string;
  shadowSoft: string;
  star: string;
  live: string;
}

// Light-mode base shared by the 6 MS accent themes
function msLight(accent: string, accentHover: string, hot: string): SkinTokens {
  return {
    bg:           "#e9e7e2",
    surface:      "#ffffff",
    surfaceRaised:"#f1efe9",
    border:       "#18161d",
    text:         "#18161d",
    muted:        "#57545f",
    subtle:       "#8b8893",
    accent,
    accentHover,
    hot,
    hotInk:       "#ffffff",
    accentInk:    "#ffffff",
    card:         "#ffffff",
    sunk:         "#f1efe9",
    line:         "#e6e3dc",
    shadowSoft:   "rgba(24,22,29,.85)",
    star:         "#f3a712",
    live:         "#16a34a",
  };
}

export const SKINS: Record<string, SkinTokens> = {
  // ── Dark / "Analog" themes ──────────────────────────────────────────
  "analog-warmth": {
    bg:           "#2D2926",
    surface:      "#3D3834",
    surfaceRaised:"#4A4540",
    border:       "#524D48",
    text:         "#F7F1E3",
    muted:        "#A89F94",
    subtle:       "#6B6560",
    accent:       "#E67E22",
    accentHover:  "#CF711E",
    hot:          "#E67E22",
    hotInk:       "#F7F1E3",
    accentInk:    "#F7F1E3",
    card:         "#3D3834",
    sunk:         "#2D2926",
    line:         "#3D3834",
    shadowSoft:   "rgba(0,0,0,0.4)",
    star:         "#F3A712",
    live:         "#5E9E6E",
  },
  "silver-face": {
    bg:           "#1C1C1C",
    surface:      "#2A2A2A",
    surfaceRaised:"#363636",
    border:       "#444444",
    text:         "#EFEFEF",
    muted:        "#9E9E9E",
    subtle:       "#666666",
    accent:       "#C0C0C0",
    accentHover:  "#A8A8A8",
    hot:          "#C0C0C0",
    hotInk:       "#1C1C1C",
    accentInk:    "#1C1C1C",
    card:         "#2A2A2A",
    sunk:         "#1C1C1C",
    line:         "#363636",
    shadowSoft:   "rgba(0,0,0,0.5)",
    star:         "#F3A712",
    live:         "#4CAF82",
  },
  "midnight-black": {
    bg:           "#0D0D0D",
    surface:      "#1A1A1A",
    surfaceRaised:"#252525",
    border:       "#333333",
    text:         "#F0F0F0",
    muted:        "#999999",
    subtle:       "#555555",
    accent:       "#FF3E3E",
    accentHover:  "#E63535",
    hot:          "#FF3E3E",
    hotInk:       "#F0F0F0",
    accentInk:    "#F0F0F0",
    card:         "#1A1A1A",
    sunk:         "#0D0D0D",
    line:         "#252525",
    shadowSoft:   "rgba(0,0,0,0.6)",
    star:         "#F3A712",
    live:         "#4CAF82",
  },
  "wood-grain": {
    bg:           "#3B2F2F",
    surface:      "#4A3B35",
    surfaceRaised:"#5A4A42",
    border:       "#6A5A50",
    text:         "#F5EDD8",
    muted:        "#C4AC8E",
    subtle:       "#8A7560",
    accent:       "#D4A96A",
    accentHover:  "#BE9458",
    hot:          "#D4A96A",
    hotInk:       "#3B2F2F",
    accentInk:    "#3B2F2F",
    card:         "#4A3B35",
    sunk:         "#3B2F2F",
    line:         "#4A3B35",
    shadowSoft:   "rgba(0,0,0,0.45)",
    star:         "#F3A712",
    live:         "#5E9E6E",
  },
  "studio-console": {
    bg:           "#1A2420",
    surface:      "#243530",
    surfaceRaised:"#2E4038",
    border:       "#3A5044",
    text:         "#F0EDDE",
    muted:        "#A8B09A",
    subtle:       "#6A7860",
    accent:       "#4CAF82",
    accentHover:  "#3D9A70",
    hot:          "#4CAF82",
    hotInk:       "#1A2420",
    accentInk:    "#1A2420",
    card:         "#243530",
    sunk:         "#1A2420",
    line:         "#2E4038",
    shadowSoft:   "rgba(0,0,0,0.45)",
    star:         "#F3A712",
    live:         "#4CAF82",
  },

  // ── MS Modern light-mode accent themes ──────────────────────────────
  "ms-blue":   msLight("#2540e6", "#1d35c4", "#ff5a1f"),
  "ms-orange": msLight("#ff5a1f", "#e04d18", "#2540e6"),
  "ms-pink":   msLight("#ec2d7b", "#d0246a", "#08b5cf"),
  "ms-green":  msLight("#12a150", "#0e8a44", "#ff5a1f"),
  "ms-purple": msLight("#7b3ff2", "#6a35d4", "#f5a300"),
  "ms-cyan":   msLight("#08a5c4", "#0790aa", "#ff4d8d"),
};

export const DEFAULT_SKIN = SKINS["analog-warmth"];

export function getSkin(id: string | null | undefined): SkinTokens {
  return SKINS[id ?? "analog-warmth"] ?? DEFAULT_SKIN;
}

export function skinToVars(skin: SkinTokens): Record<string, string> {
  return {
    "--skin-bg":            skin.bg,
    "--skin-surface":       skin.surface,
    "--skin-surface-raised":skin.surfaceRaised,
    "--skin-border":        skin.border,
    "--skin-text":          skin.text,
    "--skin-muted":         skin.muted,
    "--skin-subtle":        skin.subtle,
    "--skin-accent":        skin.accent,
    "--skin-accent-hover":  skin.accentHover,
    "--skin-hot":           skin.hot,
    "--skin-hot-ink":       skin.hotInk,
    "--skin-accent-ink":    skin.accentInk,
    "--skin-card":          skin.card,
    "--skin-sunk":          skin.sunk,
    "--skin-line":          skin.line,
    "--skin-shadow-soft":   skin.shadowSoft,
    "--skin-star":          skin.star,
    "--skin-live":          skin.live,
  };
}
