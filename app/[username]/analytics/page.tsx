import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import Image from "next/image";
import MonthlyCalendarChart, { type DailyData } from "@/components/MonthlyCalendarChart";

interface Props { params: Promise<{ username: string }> }

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: C.subtle }}>
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-4 py-3 text-center" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
      <div className="text-2xl font-bold font-mono" style={{ color: C.text }}>{value}</div>
      <div className="text-xs font-mono mt-0.5" style={{ color: C.subtle }}>{label}</div>
    </div>
  );
}

export default async function AnalyticsPage({ params }: Props) {
  const { username } = await params;
  const { userId: clerkId } = await auth();

  const profileUser = await prisma.user.findUnique({ where: { username } });
  if (!profileUser) notFound();

  // Only own profile can view analytics
  const viewer = clerkId ? await prisma.user.findUnique({ where: { clerkId } }) : null;
  const isOwner = viewer?.id === profileUser.id;
  if (!isOwner) redirect(`/${username}`);

  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const logs = await prisma.listeningLog.findMany({
    where: { userId: profileUser.id, playedAt: { gte: twelveMonthsAgo } },
    include: { album: true },
    orderBy: { playedAt: "asc" },
  });

  const allLogs = await prisma.listeningLog.findMany({
    where: { userId: profileUser.id },
    select: { rating: true, source: true, format: true, playedAt: true },
  });

  // ── Monthly counts ────────────────────────────────────────────────────────
  const monthlyMap: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] = 0;
  }
  for (const log of logs) {
    const key = `${log.playedAt.getFullYear()}-${String(log.playedAt.getMonth() + 1).padStart(2, "0")}`;
    if (key in monthlyMap) monthlyMap[key]++;
  }
  const months = Object.entries(monthlyMap);
  const maxMonthly = Math.max(...months.map(([, v]) => v), 1);

  // ── Daily counts for current month (calendar view) ────────────────────────
  const dailyData: DailyData = {};
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthLogs = logs.filter((l) => l.playedAt >= thisMonthStart);
  for (const log of thisMonthLogs) {
    const key = `${log.playedAt.getFullYear()}-${String(log.playedAt.getMonth() + 1).padStart(2, "0")}-${String(log.playedAt.getDate()).padStart(2, "0")}`;
    if (!dailyData[key]) dailyData[key] = [];
    dailyData[key].push({
      discogsId: log.album.discogsId,
      title: log.album.title,
      artist: log.album.artist,
      coverUrl: log.album.coverUrl,
      format: log.format,
      source: log.source,
      rating: log.rating,
    });
  }

  // ── Top artists ────────────────────────────────────────────────────────────
  const artistCount: Record<string, { count: number; mbid: string | null; coverUrl: string | null }> = {};
  for (const log of logs) {
    const key = log.album.artist;
    if (!artistCount[key]) artistCount[key] = { count: 0, mbid: log.album.artistMbid, coverUrl: log.album.coverUrl };
    artistCount[key].count++;
  }
  const topArtists = Object.entries(artistCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  // ── Top albums ─────────────────────────────────────────────────────────────
  const albumCount: Record<string, { count: number; title: string; artist: string; coverUrl: string | null; discogsId: string }> = {};
  for (const log of logs) {
    const key = log.albumId;
    if (!albumCount[key]) albumCount[key] = { count: 0, title: log.album.title, artist: log.album.artist, coverUrl: log.album.coverUrl, discogsId: log.album.discogsId };
    albumCount[key].count++;
  }
  const topAlbums = Object.entries(albumCount)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  // ── Format breakdown ───────────────────────────────────────────────────────
  const formatMap: Record<string, number> = {};
  for (const log of allLogs) {
    const fmt = log.source === "streaming" ? "Streaming" : (log.format ?? "Unknown");
    formatMap[fmt] = (formatMap[fmt] ?? 0) + 1;
  }
  const formats = Object.entries(formatMap).sort((a, b) => b[1] - a[1]);
  const totalLogs = allLogs.length;

  // ── Ratings distribution ──────────────────────────────────────────────────
  const ratedLogs = allLogs.filter((l) => l.rating !== null);
  const ratingBuckets: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const log of ratedLogs) {
    const bucket = String(Math.round(log.rating!));
    if (bucket in ratingBuckets) ratingBuckets[bucket]++;
  }
  const avgRating = ratedLogs.length > 0
    ? ratedLogs.reduce((s, l) => s + l.rating!, 0) / ratedLogs.length
    : null;

  // ── Stats summary ──────────────────────────────────────────────────────────
  const physicalLogs = allLogs.filter((l) => l.source === "physical");
  const streamingLogs = allLogs.filter((l) => l.source === "streaming");
  const thisYear = allLogs.filter((l) => l.playedAt.getFullYear() === now.getFullYear());

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <Link href={`/${username}`} className="text-xs font-mono hover:underline mb-2 block" style={{ color: C.subtle }}>
              ← {username}
            </Link>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.text }}>Listening Analytics</h1>
            <p className="text-xs font-mono mt-1" style={{ color: C.muted }}>Last 12 months</p>
          </div>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <StatCard label="TOTAL SPINS" value={totalLogs} />
          <StatCard label="THIS YEAR" value={thisYear.length} />
          <StatCard label="PHYSICAL" value={physicalLogs.length} />
          <StatCard label="STREAMING" value={streamingLogs.length} />
        </div>

        {/* Monthly activity calendar */}
        <section className="mb-10">
          <SectionLabel>Monthly Activity</SectionLabel>
          <MonthlyCalendarChart
            dailyData={dailyData}
            year={now.getFullYear()}
            month={now.getMonth()}
          />
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Top Artists */}
          <section>
            <SectionLabel>Top Artists (12 mo)</SectionLabel>
            <div className="space-y-1">
              {topArtists.length === 0 ? (
                <div className="p-4 text-xs font-mono" style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>No listens yet.</div>
              ) : topArtists.map(([artist, data], i) => (
                <div key={artist} className="flex items-center gap-3 px-3 py-2"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                  <span className="text-xs font-mono w-4" style={{ color: C.subtle }}>{i + 1}</span>
                  {data.mbid ? (
                    <Link href={`/artist/${data.mbid}`} className="flex-1 text-sm truncate hover:underline" style={{ color: C.text }}>
                      {artist}
                    </Link>
                  ) : (
                    <span className="flex-1 text-sm truncate" style={{ color: C.text }}>{artist}</span>
                  )}
                  <span className="text-xs font-bold font-mono shrink-0" style={{ color: C.accent }}>{data.count}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Top Albums */}
          <section>
            <SectionLabel>Top Albums (12 mo)</SectionLabel>
            <div className="space-y-1">
              {topAlbums.length === 0 ? (
                <div className="p-4 text-xs font-mono" style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>No listens yet.</div>
              ) : topAlbums.map(([, data], i) => (
                <Link href={`/album/${encodeURIComponent(data.discogsId)}`} key={data.discogsId}
                  className="flex items-center gap-3 px-3 py-2 transition-colors duration-100"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, display: "flex" }}>
                  <span className="text-xs font-mono w-4 shrink-0" style={{ color: C.subtle }}>{i + 1}</span>
                  {data.coverUrl ? (
                    <Image src={data.coverUrl} alt={data.title} width={32} height={32}
                      className="object-cover shrink-0" unoptimized
                      style={{ width: 32, height: 32, borderRadius: 2 }} />
                  ) : (
                    <div className="shrink-0" style={{ width: 32, height: 32, backgroundColor: C.surfaceRaised, borderRadius: 2 }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate" style={{ color: C.text }}>{data.title}</div>
                    <div className="text-xs font-mono truncate" style={{ color: C.muted }}>{data.artist}</div>
                  </div>
                  <span className="text-xs font-bold font-mono shrink-0" style={{ color: C.accent }}>{data.count}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Format breakdown */}
          <section>
            <SectionLabel>Format Breakdown</SectionLabel>
            <div className="p-4 space-y-2" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
              {formats.length === 0 ? (
                <p className="text-xs font-mono" style={{ color: C.subtle }}>No data.</p>
              ) : formats.map(([fmt, count]) => {
                const pct = totalLogs > 0 ? (count / totalLogs) * 100 : 0;
                return (
                  <div key={fmt}>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span style={{ color: C.muted }}>{fmt}</span>
                      <span style={{ color: C.subtle }}>{count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div style={{ height: 4, backgroundColor: C.surfaceRaised, borderRadius: 2 }}>
                      <div style={{ height: 4, width: `${pct}%`, backgroundColor: C.accent, borderRadius: 2 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Ratings distribution */}
          <section>
            <SectionLabel>Rating Distribution</SectionLabel>
            <div className="p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
              {avgRating !== null && (
                <div className="mb-4">
                  <span className="text-3xl font-bold font-mono" style={{ color: C.accent }}>{avgRating.toFixed(2)}</span>
                  <span className="text-xs font-mono ml-2" style={{ color: C.subtle }}>avg rating ({ratedLogs.length} rated)</span>
                </div>
              )}
              <div className="flex items-end gap-2" style={{ height: 64 }}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const count = ratingBuckets[String(star)] ?? 0;
                  const max = Math.max(...Object.values(ratingBuckets), 1);
                  const h = Math.max((count / max) * 56, count > 0 ? 4 : 0);
                  return (
                    <div key={star} className="flex flex-col items-center gap-1 flex-1">
                      <span className="text-xs font-mono" style={{ color: C.subtle, fontSize: "0.6rem" }}>{count || ""}</span>
                      <div style={{ height: h, width: "100%", backgroundColor: C.accent, opacity: 0.8, minHeight: count > 0 ? 4 : 0 }} />
                      <span className="text-xs font-mono" style={{ color: C.subtle }}>{"★".repeat(star)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}
