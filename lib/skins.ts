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
}

export const SKINS: Record<string, SkinTokens> = {
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
  },
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
  };
}
