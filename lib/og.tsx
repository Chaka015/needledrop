// Shared pieces for the Open Graph share cards (app/**/opengraph-image.tsx).
// ImageResponse (Satori) only does flexbox: every div with more than one
// child needs display: flex, and there is no CSS grid.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";

export const OG_SIZE = { width: 1200, height: 630 };

export const INK = "#0D0D0D";
export const BG = "#F4F1EA";
export const ACCENT = "#ff5a1f";
export const MUTED = "#4A4742";
export const SUBTLE = "#7A7570";
export const WHITE = "#FFFFFF";

export const SANS = "Hanken Grotesk";
export const MONO = "Space Mono";

// ── Fonts (bundled OFL files, never fetched at request time) ──────────────
type OgFont = { name: string; data: Buffer; weight: 400 | 700; style: "normal" };
let fontsPromise: Promise<OgFont[]> | null = null;

export function loadFonts(): Promise<OgFont[]> {
  fontsPromise ??= Promise.all([
    readFile(join(process.cwd(), "assets/fonts/HankenGrotesk-Bold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/SpaceMono-Regular.ttf")),
    readFile(join(process.cwd(), "assets/fonts/SpaceMono-Bold.ttf")),
  ]).then(([sans, mono, monoBold]) => [
    { name: SANS, data: sans, weight: 700, style: "normal" },
    { name: MONO, data: mono, weight: 400, style: "normal" },
    { name: MONO, data: monoBold, weight: 700, style: "normal" },
  ]);
  return fontsPromise;
}

// ── Cover art ─────────────────────────────────────────────────────────────
// Remote covers (Discogs, Cover Art Archive, Spotify) are fetched server-side
// and inlined as data URLs. Any failure returns null → placeholder tile.
export async function fetchCover(url: string | null | undefined): Promise<string | null> {
  if (!url || !/^https?:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "NeedleDrop/1.0", Accept: "image/jpeg,image/png,image/*;q=0.8" },
      signal: AbortSignal.timeout(3000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    // Satori decodes JPEG, PNG and GIF only
    if (!/^image\/(jpeg|jpg|png|gif)$/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > 4_000_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export function fetchCovers(urls: (string | null | undefined)[]): Promise<(string | null)[]> {
  return Promise.all(urls.map(fetchCover));
}

// ── Text helpers ──────────────────────────────────────────────────────────
export function truncate(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Font size so a single line of `text` fits `width` (rough average glyph width). */
export function fitSize(text: string, width: number, max: number, min: number, glyph = 0.56): number {
  const size = Math.floor(width / (Math.max(text.length, 1) * glyph));
  return Math.max(min, Math.min(max, size));
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}

// ── Building blocks ───────────────────────────────────────────────────────
export function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%", height: "100%", display: "flex", position: "relative",
        background: BG, border: `6px solid ${INK}`, fontFamily: SANS, color: INK,
      }}
    >
      {children}
    </div>
  );
}

export function Disc({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: size, background: INK, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        style={{
          width: size * 0.44, height: size * 0.44, borderRadius: size, background: WHITE,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <div style={{ width: size * 0.36, height: size * 0.36, borderRadius: size, background: ACCENT, display: "flex" }} />
      </div>
    </div>
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <Disc size={Math.round(size * 1.15)} />
      <div style={{ display: "flex", marginLeft: Math.round(size * 0.35), fontFamily: SANS, fontWeight: 700, fontSize: size, letterSpacing: -0.5 }}>
        <span style={{ color: INK }}>Needle</span>
        <span style={{ color: ACCENT }}>Drop</span>
      </div>
    </div>
  );
}

export function Cover({ src, size, shadow = 10, border = 4 }: { src: string | null; size: number; shadow?: number; border?: number }) {
  const box = {
    width: size, height: size, flexShrink: 0,
    border: `${border}px solid ${INK}`,
    boxShadow: `${shadow}px ${shadow}px 0 ${INK}`,
  };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} width={size} height={size} alt="" style={{ ...box, objectFit: "cover" }} />;
  }
  return (
    <div style={{ ...box, display: "flex", alignItems: "center", justifyContent: "center", background: WHITE }}>
      <Disc size={Math.round(size * 0.42)} />
    </div>
  );
}

export function MonoLabel({ children, size = 22, color = MUTED }: { children: ReactNode; size?: number; color?: string }) {
  return (
    <div style={{ display: "flex", fontFamily: MONO, fontSize: size, letterSpacing: 1, textTransform: "uppercase", color }}>
      {children}
    </div>
  );
}

// ── The site-wide default card (also used for private mixes) ──────────────
export function DefaultCard({ covers }: { covers: (string | null)[] }) {
  const strip = covers.slice(0, 7);
  return (
    <Frame>
      <div
        style={{
          display: "flex", flexDirection: "column", width: "100%",
          justifyContent: strip.length > 0 ? "space-between" : "center",
          padding: strip.length > 0 ? "58px 60px 70px" : "0 60px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Wordmark size={strip.length > 0 ? 64 : 88} />
          <div style={{ display: "flex", fontSize: 42, fontWeight: 700, marginTop: 24, letterSpacing: -0.5 }}>
            The social network for record collectors
          </div>
          <div style={{ display: "flex", marginTop: 6 }}>
            <MonoLabel size={20} color={SUBTLE}>Log every spin · Show off the shelf · Dig through other fans&apos; crates</MonoLabel>
          </div>
        </div>
        {strip.length > 0 && (
          <div style={{ display: "flex" }}>
            {strip.map((c, i) => (
              <div key={i} style={{ display: "flex", marginRight: i < strip.length - 1 ? 18 : 0 }}>
                <Cover src={c} size={136} shadow={8} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Frame>
  );
}
