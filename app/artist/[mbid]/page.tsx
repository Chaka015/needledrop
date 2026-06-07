import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { fetchArtist, fetchArtistReleases, fetchWikipediaSummary } from "@/lib/musicbrainz";
import { fetchArtistNews } from "@/lib/newsapi";
import ArtistShowsClient from "@/components/ArtistShowsClient";

interface Props {
  params: Promise<{ mbid: string }>;
}

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

const RELEASE_TYPES = [
  { key: "Album", label: "Albums" },
  { key: "Single", label: "Singles" },
  { key: "EP", label: "EPs" },
  { key: "Live", label: "Live" },
  { key: "Compilation", label: "Compilations" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: C.subtle }}>
      {children}
    </h2>
  );
}

export default async function ArtistPage({ params }: Props) {
  const { mbid } = await params;
  const { userId: clerkId } = await auth();

  const [artist, releases] = await Promise.all([
    fetchArtist(mbid),
    fetchArtistReleases(mbid),
  ]);

  if (!artist) notFound();

  const news = await fetchArtistNews(artist.name);

  // Find Wikipedia URL from MusicBrainz relations
  const wikiUrl = artist.relations?.find((r) => r.type === "wikipedia" && r.url?.resource)?.url?.resource;
  const wikiTitle = wikiUrl ? decodeURIComponent(wikiUrl.split("/wiki/")[1] ?? "") : artist.name;
  const wikiSummary = await fetchWikipediaSummary(wikiTitle);

  // Count NeedleDrop collectors who own albums by this artist
  const collectorCount = await prisma.collection.count({
    where: { album: { artist: { contains: artist.name, mode: "insensitive" } } },
  });

  // Group releases by type
  const grouped: Record<string, typeof releases> = {};
  for (const r of releases) {
    const type = r["primary-type"] ?? "Other";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(r);
  }
  // Sort each group by date desc
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }

  const currentUser = clerkId
    ? await prisma.user.findUnique({ where: { clerkId }, select: { id: true } })
    : null;

  const tags = (artist.tags ?? []).sort((a, b) => b.count - a.count).slice(0, 8);

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* HEADER */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ color: C.text }}>{artist.name}</h1>
          {artist.disambiguation && (
            <p className="text-sm font-mono mb-3" style={{ color: C.muted }}>{artist.disambiguation}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono" style={{ color: C.subtle }}>
            {artist.type && <span>{artist.type.toUpperCase()}</span>}
            {artist.area?.name && <span>{artist.area.name}</span>}
            {artist["life-span"]?.begin && (
              <span>{artist["life-span"].begin.slice(0, 4)}{artist["life-span"].ended ? ` – ${artist["life-span"].end?.slice(0, 4) ?? ""}` : " – present"}</span>
            )}
            {collectorCount > 0 && (
              <span style={{ color: C.accent }}>{collectorCount} NeedleDrop {collectorCount === 1 ? "collector" : "collectors"}</span>
            )}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map((t) => (
                <span key={t.name} className="px-2 py-0.5 text-xs font-mono"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.muted }}>
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 min-w-0 space-y-12">

            {/* BIOGRAPHY */}
            {wikiSummary && (
              <section>
                <SectionLabel>Biography</SectionLabel>
                <div className="p-5 text-sm leading-relaxed" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.muted }}>
                  <p className="line-clamp-6">{wikiSummary}</p>
                  <a href={wikiUrl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(artist.name)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-block mt-3 text-xs font-mono hover:underline" style={{ color: C.accent }}>
                    Read more on Wikipedia →
                  </a>
                </div>
              </section>
            )}

            {/* NEWS */}
            {news.length > 0 && (
              <section>
                <SectionLabel>Latest News</SectionLabel>
                <div className="space-y-1">
                  {news.map((article, i) => (
                    <a key={i} href={article.url} target="_blank" rel="noopener noreferrer"
                      className="block p-4 transition-colors duration-100"
                      style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.borderColor = C.accent)}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.borderColor = C.border)}>
                      <div className="text-sm font-semibold mb-1 hover:underline" style={{ color: C.text }}>
                        {article.title}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono" style={{ color: C.subtle }}>
                        <span style={{ color: C.muted }}>{article.source}</span>
                        <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* DISCOGRAPHY */}
            <section>
              <SectionLabel>Discography</SectionLabel>
              {RELEASE_TYPES.filter((t) => grouped[t.key]?.length).map(({ key, label }) => (
                <div key={key} className="mb-8">
                  <h3 className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: C.muted }}>{label}</h3>
                  <div className="space-y-1">
                    {grouped[key].map((r) => {
                      const coverUrl = `https://coverartarchive.org/release-group/${r.id}/front-250`;
                      return (
                        <div key={r.id} className="flex items-center gap-3 p-3"
                          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={coverUrl} alt={r.title} className="object-cover shrink-0"
                            style={{ width: 40, height: 40, borderRadius: 4 }}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.nextSibling as HTMLElement).style.display = "block"; }} />
                          <div className="shrink-0" style={{ width: 40, height: 40, backgroundColor: C.surfaceRaised, borderRadius: 4, display: "none" }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate" style={{ color: C.text }}>{r.title}</div>
                            {r.date && (
                              <div className="text-xs font-mono" style={{ color: C.subtle }}>{r.date.slice(0, 4)}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {Object.keys(grouped).length === 0 && (
                <p className="text-xs font-mono" style={{ color: C.subtle }}>No releases found on MusicBrainz.</p>
              )}
            </section>
          </div>

          {/* SIDEBAR */}
          <aside className="w-full lg:w-72 shrink-0 space-y-8">
            <ArtistShowsClient artistMbid={mbid} artistName={artist.name} userId={currentUser?.id ?? null} />
          </aside>
        </div>
      </div>
    </div>
  );
}
