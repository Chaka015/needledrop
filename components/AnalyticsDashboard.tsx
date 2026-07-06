"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import MonthlyCalendarChart, { type DailyData } from "@/components/MonthlyCalendarChart";
import type { TimeRange, GenreDetail, DecadeDetail } from "@/lib/analytics";

const C = {
  bg:            "var(--skin-bg)",
  surface:       "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border:        "var(--skin-border)",
  text:          "var(--skin-text)",
  muted:         "var(--skin-muted)",
  subtle:        "var(--skin-subtle)",
  accent:        "var(--skin-accent)",
};

const GENRE_COLORS = [
  "#E67E22","#C0392B","#5E9E6E","#7B8FA1","#B8860B",
  "#8E6B3E","#6B6B8A","#7A9E7E","#A0674B","#5B7FA6",
];

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.subtle, marginBottom: 12 }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, dim }: { label: string; value: string | number; dim?: boolean }) {
  return (
    <div style={{ padding: "12px 16px", textAlign: "center", backgroundColor: C.surface, border: `1px solid ${C.border}`, opacity: dim ? 0.65 : 1 }}>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-nd-mono)", color: C.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, fontFamily: "var(--font-nd-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function VelocityChart({ data }: { data: { month: string; label: string; count: number; isCurrent: boolean }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const W = 480, H = 160, pl = 36, pr = 16, pt = 16, pb = 40;
  const pw = W - pl - pr;
  const ph = H - pt - pb;

  const pts = data.map((d, i) => ({
    x: pl + (i / (data.length - 1)) * pw,
    y: pt + (1 - d.count / max) * ph,
    ...d,
  }));

  const polyPts = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const fillPts = [
    ...pts.map((p) => `${p.x},${p.y}`),
    `${pts[pts.length - 1].x},${pt + ph}`,
    `${pts[0].x},${pt + ph}`,
  ].join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      {/* Grid lines */}
      {[0, 0.5, 1].map((frac) => {
        const y = pt + (1 - frac) * ph;
        return (
          <g key={frac}>
            <line x1={pl} x2={pl + pw} y1={y} y2={y} stroke={C.border} strokeWidth={0.5} strokeDasharray="2,4" />
            <text x={pl - 4} y={y + 4} textAnchor="end" fill={C.subtle} fontSize={9} fontFamily="var(--font-nd-mono)">
              {Math.round(frac * max)}
            </text>
          </g>
        );
      })}
      {/* Fill */}
      <polygon points={fillPts} fill={C.accent} opacity={0.1} />
      {/* Line */}
      <polyline points={polyPts} fill="none" stroke={C.accent} strokeWidth={1.5} strokeLinejoin="round" />
      {/* Dots + labels */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={p.isCurrent ? 4 : 2.5}
            fill={p.isCurrent ? C.accent : C.bg}
            stroke={C.accent} strokeWidth={1.5} />
          {(i % 2 === 0 || p.isCurrent) && (
            <text x={p.x} y={pt + ph + 16} textAnchor="middle"
              fill={p.isCurrent ? C.accent : C.subtle}
              fontSize={9} fontFamily="var(--font-nd-mono)"
              fontWeight={p.isCurrent ? "700" : "400"}>
              {p.label}
            </text>
          )}
          {p.isCurrent && p.count > 0 && (
            <text x={p.x} y={p.y - 8} textAnchor="middle"
              fill={C.accent} fontSize={10} fontFamily="var(--font-nd-mono)" fontWeight="700">
              {p.count}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

type ModalState =
  | { type: "genre"; data: GenreDetail }
  | { type: "decade"; data: DecadeDetail }
  | null;

function Modal({ state, onClose }: { state: ModalState; onClose: () => void }) {
  if (!state) return null;

  const title = state.type === "genre"
    ? state.data.genre
    : `${state.data.decade}s`;

  const topAlbums = state.data.topAlbums;
  const topArtists = state.type === "genre" ? state.data.topArtists : null;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.surface, border: `1px solid ${C.border}`, maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${C.border}`, backgroundColor: C.surfaceRaised }}>
          <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted }}>
            {state.type === "genre" ? "Genre" : "Decade"} · {title}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.subtle, fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>
        </div>

        <div style={{ padding: 16 }}>
          {topArtists && topArtists.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <SectionLabel>Top Artists</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {topArtists.map((a, i) => (
                  <div key={a.artist} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}` }}>
                    <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, color: C.subtle, width: 14 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 13, color: C.text }}>{a.artist}</span>
                    <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 11, fontWeight: 700, color: C.accent }}>{a.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topAlbums.length > 0 && (
            <div>
              <SectionLabel>Top Albums</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {topAlbums.map((a, i) => (
                  <Link key={a.discogsId} href={`/album/${encodeURIComponent(a.discogsId)}`}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, textDecoration: "none" }}>
                    <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, color: C.subtle, width: 14 }}>{i + 1}</span>
                    {a.coverUrl ? (
                      <Image src={a.coverUrl} alt={a.title} width={28} height={28} unoptimized
                        style={{ width: 28, height: 28, borderRadius: 2, objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 28, height: 28, backgroundColor: C.bg, borderRadius: 2, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                      <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, color: C.muted }}>{a.artist}</div>
                    </div>
                    <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 11, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{a.count}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {topAlbums.length === 0 && (!topArtists || topArtists.length === 0) && (
            <p style={{ fontFamily: "var(--font-nd-mono)", fontSize: 12, color: C.subtle }}>No data for this period.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────

export interface DashboardProps {
  username: string;
  range: TimeRange;

  stats: { total: number; physical: number; streaming: number; wantlistCount: number };
  genres: GenreDetail[];
  velocity: { month: string; label: string; count: number; isCurrent: boolean }[];
  formatPreference: { format: string; count: number; avgRating: number | null }[];
  decades: DecadeDetail[];
  collectionBreadth: { artists: number; albums: number; avgPerArtist: number };
  wantlistOverlap: { totalSpins: number; spinsOnWantlist: number; pct: number };
  dailyData: DailyData;
  calendarYear: number;
  calendarMonth: number;
  topArtists: { artist: string; count: number; mbid: string | null }[];
  topAlbums: { title: string; artist: string; coverUrl: string | null; discogsId: string; count: number }[];
  formatBreakdown: { format: string; count: number; pct: number }[];
  ratingDist: { avgRating: number | null; ratedCount: number; buckets: { star: number; count: number }[] };
}

const RANGES: { key: TimeRange; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
  { key: "all", label: "All Time" },
];

export default function AnalyticsDashboard(props: DashboardProps) {
  const { username, range, stats, genres, velocity, formatPreference, decades,
    collectionBreadth, wantlistOverlap, dailyData, calendarYear, calendarMonth,
    topArtists, topAlbums, formatBreakdown, ratingDist } = props;

  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);

  const openGenreModal = useCallback((g: GenreDetail) => setModal({ type: "genre", data: g }), []);
  const openDecadeModal = useCallback((d: DecadeDetail) => setModal({ type: "decade", data: d }), []);
  const closeModal = useCallback(() => setModal(null), []);

  function setRange(r: TimeRange) {
    router.push(`/${username}/analytics?range=${r}`);
  }

  const maxDecade = Math.max(...decades.map((d) => d.count), 1);
  const maxFormat = Math.max(...formatBreakdown.map((f) => f.count), 1);
  const maxRating = Math.max(...ratingDist.buckets.map((b) => b.count), 1);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, color: C.text, fontFamily: "var(--font-nd-sans, Inter, sans-serif)" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto", padding: "40px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <Link href={`/${username}`} style={{ fontFamily: "var(--font-nd-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, textDecoration: "none", display: "inline-block", marginBottom: 8 }}>
            ← {username}
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: C.text, margin: 0 }}>Listening Analytics</h1>
        </div>

        {/* ── Time Range Selector ──────────────────────────── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)}
              style={{
                fontFamily: "var(--font-nd-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
                padding: "7px 16px", borderRadius: 4, border: `1px solid ${r.key === range ? C.accent : C.border}`,
                background: r.key === range ? C.accent : "transparent",
                color: r.key === range ? "#fff" : C.muted,
                cursor: "pointer", transition: "all 100ms",
              }}>
              {r.label}
            </button>
          ))}
        </div>

        {/* ── Stat Strip ──────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-7">
          <StatCard label="Total Spins" value={stats.total} />
          <StatCard label="Physical" value={stats.physical} />
          <StatCard label="Streaming" value={stats.streaming} />
          <StatCard label="On Needle" value={stats.wantlistCount} dim />
        </div>

        {/* ── Genre + Velocity ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 items-start">

          {/* Genre Breakdown */}
          <section className="lg:col-span-2" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, padding: 20 }}>
            <SectionLabel>Genre Breakdown</SectionLabel>
            {genres.length === 0 ? (
              <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 12, color: C.subtle, padding: "16px 0" }}>
                Add genres to your albums to see this. Visit any album page → Genres.
              </div>
            ) : (
              <>
                {/* Stacked bar */}
                <div style={{ display: "flex", height: 28, borderRadius: 2, overflow: "hidden", marginBottom: 16, gap: 1 }}>
                  {genres.map((g, i) => (
                    <button key={g.genre}
                      title={`${g.genre} · ${g.pct.toFixed(0)}%`}
                      onClick={() => openGenreModal(g)}
                      style={{
                        flex: g.count, minWidth: 4, height: "100%",
                        background: GENRE_COLORS[i % GENRE_COLORS.length],
                        border: "none", cursor: "pointer", transition: "opacity 100ms",
                        opacity: 0.85,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.85")}
                    />
                  ))}
                </div>

                {/* Genre legend */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {genres.map((g, i) => (
                    <button key={g.genre} onClick={() => openGenreModal(g)}
                      style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: "4px 0", textAlign: "left", width: "100%" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, flexShrink: 0, background: GENRE_COLORS[i % GENRE_COLORS.length] }} />
                      <span style={{ flex: 1, fontSize: 13, color: C.text }}>{g.genre}</span>
                      <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 11, color: C.muted }}>{g.count}</span>
                      <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, color: C.subtle, width: 36, textAlign: "right" }}>{g.pct.toFixed(0)}%</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Listening Velocity */}
          <section style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, padding: 20 }}>
            <SectionLabel>Listening Velocity</SectionLabel>
            <VelocityChart data={velocity} />
            <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, color: C.subtle, marginTop: 8, textAlign: "center" }}>
              Albums logged · last 12 months
            </div>
          </section>
        </div>

        {/* ── Format Preference + Collection + Decade + Wantlist ──── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

          {/* Left col */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Format Preference */}
            <section style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, padding: 20 }}>
              <SectionLabel>Format Preference Score</SectionLabel>
              {formatPreference.length === 0 ? (
                <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 12, color: C.subtle }}>Not enough data (need ≥2 listens per format).</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {formatPreference.map((f) => (
                    <div key={f.format} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 11, color: C.muted, minWidth: 72 }}>{f.format}</span>
                      {f.avgRating !== null ? (
                        <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 12, color: "var(--skin-star, #f3a712)" }}>
                          {"★".repeat(Math.round(f.avgRating))}{"☆".repeat(5 - Math.round(f.avgRating))}
                        </span>
                      ) : null}
                      {f.avgRating !== null ? (
                        <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 13, fontWeight: 700, color: C.text }}>{f.avgRating.toFixed(1)}</span>
                      ) : null}
                      <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, color: C.subtle, marginLeft: "auto" }}>
                        {f.avgRating === null ? `${f.count} spins` : `${f.count} spins`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Decade Breakdown */}
            <section style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, padding: 20 }}>
              <SectionLabel>Decade Breakdown</SectionLabel>
              {decades.length === 0 ? (
                <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 12, color: C.subtle }}>No release year data available.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {decades.map((d) => (
                    <button key={d.decade} onClick={() => openDecadeModal(d)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", width: "100%" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 11, color: C.muted, width: 40 }}>{d.decade}s</span>
                        <div style={{ flex: 1, height: 8, backgroundColor: C.surfaceRaised, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(d.count / maxDecade) * 100}%`, backgroundColor: C.accent, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, color: C.subtle, width: 36, textAlign: "right" }}>{d.pct.toFixed(0)}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right col */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Collection Breadth */}
            <section style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, padding: 20 }}>
              <SectionLabel>Collection Breadth · All Time</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 28, fontWeight: 700, color: C.text, lineHeight: 1 }}>{collectionBreadth.artists}</div>
                  <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginTop: 4 }}>Artists</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 28, fontWeight: 700, color: C.text, lineHeight: 1 }}>{collectionBreadth.albums}</div>
                  <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginTop: 4 }}>Albums</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 28, fontWeight: 700, color: C.accent, lineHeight: 1 }}>{collectionBreadth.avgPerArtist}</div>
                  <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.subtle, marginTop: 4 }}>Avg / Artist</div>
                </div>
              </div>
            </section>

            {/* Wantlist Overlap */}
            <section style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, padding: 20 }}>
              <SectionLabel>Wantlist Overlap</SectionLabel>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 36, fontWeight: 700, color: C.accent }}>{wantlistOverlap.pct.toFixed(1)}</span>
                <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 16, color: C.muted, marginLeft: 4 }}>%</span>
              </div>
              <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 11, color: C.subtle, lineHeight: 1.6 }}>
                {wantlistOverlap.spinsOnWantlist} of {wantlistOverlap.totalSpins} spins are albums on your want list
              </div>
              {wantlistOverlap.totalSpins > 0 && (
                <div style={{ marginTop: 12, height: 6, backgroundColor: C.surfaceRaised, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${wantlistOverlap.pct}%`, backgroundColor: C.accent, borderRadius: 3 }} />
                </div>
              )}
            </section>

            {/* Monthly Calendar */}
            <section>
              <SectionLabel>Monthly Activity · {new Date(calendarYear, calendarMonth).toLocaleString("default", { month: "long", year: "numeric" })}</SectionLabel>
              <MonthlyCalendarChart dailyData={dailyData} year={calendarYear} month={calendarMonth} />
            </section>
          </div>
        </div>

        {/* ── Top Artists + Top Albums ─────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

          <section style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, padding: 20 }}>
            <SectionLabel>Top Artists</SectionLabel>
            {topArtists.length === 0 ? (
              <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 12, color: C.subtle }}>No listens in this period.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {topArtists.map((a, i) => (
                  <div key={a.artist} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}` }}>
                    <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, color: C.subtle, width: 16 }}>{i + 1}</span>
                    {a.mbid ? (
                      <Link href={`/artist/${a.mbid}`} style={{ flex: 1, fontSize: 13, color: C.text, textDecoration: "none" }} className="hover:underline">{a.artist}</Link>
                    ) : (
                      <span style={{ flex: 1, fontSize: 13, color: C.text }}>{a.artist}</span>
                    )}
                    <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 11, fontWeight: 700, color: C.accent }}>{a.count}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, padding: 20 }}>
            <SectionLabel>Top Albums</SectionLabel>
            {topAlbums.length === 0 ? (
              <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 12, color: C.subtle }}>No listens in this period.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {topAlbums.map((a, i) => (
                  <Link key={a.discogsId} href={`/album/${encodeURIComponent(a.discogsId)}`}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, textDecoration: "none" }}>
                    <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, color: C.subtle, width: 16, flexShrink: 0 }}>{i + 1}</span>
                    {a.coverUrl ? (
                      <Image src={a.coverUrl} alt={a.title} width={32} height={32} unoptimized
                        style={{ width: 32, height: 32, borderRadius: 2, objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 32, height: 32, backgroundColor: C.bg, borderRadius: 2, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                      <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, color: C.muted }}>{a.artist}</div>
                    </div>
                    <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 11, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{a.count}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Format Breakdown + Rating Distribution ───────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <section style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, padding: 20 }}>
            <SectionLabel>Format Breakdown</SectionLabel>
            {formatBreakdown.length === 0 ? (
              <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 12, color: C.subtle }}>No data.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {formatBreakdown.map((f) => (
                  <div key={f.format}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 11, color: C.muted }}>{f.format}</span>
                      <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, color: C.subtle }}>{f.count} ({f.pct.toFixed(0)}%)</span>
                    </div>
                    <div style={{ height: 4, backgroundColor: C.surfaceRaised, borderRadius: 2 }}>
                      <div style={{ height: 4, width: `${(f.count / maxFormat) * 100}%`, backgroundColor: C.accent, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, padding: 20 }}>
            <SectionLabel>Rating Distribution</SectionLabel>
            {ratingDist.avgRating !== null && (
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 28, fontWeight: 700, color: C.accent }}>{ratingDist.avgRating.toFixed(2)}</span>
                <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 11, color: C.subtle, marginLeft: 8 }}>avg rating ({ratingDist.ratedCount} rated)</span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64 }}>
              {ratingDist.buckets.map(({ star, count }) => {
                const h = Math.max((count / maxRating) * 56, count > 0 ? 4 : 0);
                return (
                  <div key={star} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
                    <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 9, color: C.subtle }}>{count || ""}</span>
                    <div style={{ height: h, width: "100%", backgroundColor: C.accent, opacity: 0.75, minHeight: count > 0 ? 4 : 0, borderRadius: 2 }} />
                    <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 9, color: C.subtle }}>{"★".repeat(star)}</span>
                  </div>
                );
              })}
            </div>
            {ratingDist.ratedCount === 0 && (
              <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 12, color: C.subtle }}>No ratings yet.</div>
            )}
          </section>
        </div>

      </div>

      {/* Modal */}
      <Modal state={modal} onClose={closeModal} />
    </div>
  );
}
