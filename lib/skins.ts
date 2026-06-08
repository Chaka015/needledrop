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

// ── MS Modern accent definitions ─────────────────────────────────
export const MS_ACCENTS = [
  { id: "blue",   name: "Electric Blue", color: "#2540e6", hot: "#ff5a1f", hover: "#1d35c4" },
  { id: "orange", name: "Tangerine",     color: "#ff5a1f", hot: "#2540e6", hover: "#e04d18" },
  { id: "pink",   name: "Hot Pink",      color: "#ec2d7b", hot: "#08b5cf", hover: "#d0246a" },
  { id: "green",  name: "Acid Green",    color: "#12a150", hot: "#ff5a1f", hover: "#0e8a44" },
  { id: "purple", name: "Grape",         color: "#7b3ff2", hot: "#f5a300", hover: "#6a35d4" },
  { id: "cyan",   name: "Cyan",          color: "#08a5c4", hot: "#ff4d8d", hover: "#0790aa" },
] as const;

export type AccentId = typeof MS_ACCENTS[number]["id"];
export type ThemeMode = "light" | "dark";

// Encode accent + mode into a single skin ID: "ms-blue-light"
export function buildSkinId(accent: AccentId | string, mode: ThemeMode): string {
  return `ms-${accent}-${mode}`;
}

// Decode a skin ID back to accent + mode
export function parseSkinId(skinId: string | null | undefined): { accent: string; mode: ThemeMode } {
  const match = (skinId ?? "").match(/^ms-(\w+)-(light|dark)$/);
  if (match) return { accent: match[1], mode: match[2] as ThemeMode };
  return { accent: "blue", mode: "light" };
}

// Light-mode base shared by all 6 MS accent themes
function msLight(accent: string, accentHover: string, hot: string): SkinTokens {
  return {
    bg:           "#F4F1EA",
    surface:      "#ffffff",
    surfaceRaised:"#F0EDE5",
    border:       "#000000",
    text:         "#0D0D0D",
    muted:        "#4A4742",
    subtle:       "#7A7570",
    accent,
    accentHover,
    hot,
    hotInk:       "#ffffff",
    accentInk:    "#ffffff",
    card:         "#ffffff",
    sunk:         "#EDE9E0",
    line:         "#DDD9D0",
    shadowSoft:   "rgba(0,0,0,1)",
    star:         "#f3a712",
    live:         "#16a34a",
  };
}

// Dark-mode base (MS dark palette from the design handoff)
function msDark(accent: string, accentHover: string, hot: string): SkinTokens {
  return {
    bg:           "#131217",
    surface:      "#1e1c25",
    surfaceRaised:"#252330",
    border:       "#3b3845",
    text:         "#f1eef6",
    muted:        "#a8a5b2",
    subtle:       "#76737e",
    accent,
    accentHover,
    hot,
    hotInk:       "#ffffff",
    accentInk:    "#ffffff",
    card:         "#1e1c25",
    sunk:         "#17161c",
    line:         "#2c2a35",
    shadowSoft:   "rgba(0,0,0,.55)",
    star:         "#f3a712",
    live:         "#16a34a",
  };
}

export const SKINS: Record<string, SkinTokens> = {
  // ── Light themes ──────────────────────────────────────────────
  "ms-blue-light":   msLight("#2540e6", "#1d35c4", "#ff5a1f"),
  "ms-orange-light": msLight("#ff5a1f", "#e04d18", "#2540e6"),
  "ms-pink-light":   msLight("#ec2d7b", "#d0246a", "#08b5cf"),
  "ms-green-light":  msLight("#12a150", "#0e8a44", "#ff5a1f"),
  "ms-purple-light": msLight("#7b3ff2", "#6a35d4", "#f5a300"),
  "ms-cyan-light":   msLight("#08a5c4", "#0790aa", "#ff4d8d"),

  // ── Dark themes ───────────────────────────────────────────────
  "ms-blue-dark":    msDark("#2540e6", "#1d35c4", "#ff5a1f"),
  "ms-orange-dark":  msDark("#ff5a1f", "#e04d18", "#2540e6"),
  "ms-pink-dark":    msDark("#ec2d7b", "#d0246a", "#08b5cf"),
  "ms-green-dark":   msDark("#12a150", "#0e8a44", "#ff5a1f"),
  "ms-purple-dark":  msDark("#7b3ff2", "#6a35d4", "#f5a300"),
  "ms-cyan-dark":    msDark("#08a5c4", "#0790aa", "#ff4d8d"),
};

export const DEFAULT_SKIN_ID = "ms-orange-light";
export const DEFAULT_SKIN = SKINS[DEFAULT_SKIN_ID];

export function getSkin(id: string | null | undefined): SkinTokens {
  return SKINS[id ?? DEFAULT_SKIN_ID] ?? DEFAULT_SKIN;
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
