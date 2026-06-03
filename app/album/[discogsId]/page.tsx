import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import AlbumActions from "@/components/AlbumActions";
import AlbumTabsClient from "@/components/AlbumTabsClient";

interface Props {
  params: Promise<{ discogsId: string }>;
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

function MiniStars({ value }: { value: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2, fontSize: 20, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = value >= i ? 1 : value >= i - 0.5 ? 0.5 : 0;
        return (
          <span key={i} style={{ position: "relative", width: 20, height: 20, display: "inline-block" }}>
            <span style={{ position: "absolute", inset: 0, color: "var(--skin-border)" }}>★</span>
            <span style={{ position: "absolute", inset: 0, color: "var(--skin-star)", overflow: "hidden", width: `${fill * 100}%` }}>★</span>
          </span>
        );
      })}
    </span>
  );
}

interface MBTrack { number: string; title: string; length?: number }
interface MBMedium { tracks: MBTrack[] }
interface MBRelease { media?: MBMedium[]; "artist-credit"?: { artist: { id: string } }[] }

async function fetchMBTracklist(mbid: string): Promise<MBTrack[]> {
  try {
    const res = await fetch(
      `https://musicbrainz.org/ws/2/release/${mbid}?inc=recordings&fmt=json`,
      { headers: { "User-Agent": "NeedleDrop/1.0 (needledrop.app)" }, next: { revalidate: 86400 } }
    );
    if (!res.ok) return [];
    const data: MBRelease = await res.json();
    return data.media?.flatMap((m) => m.tracks) ?? [];
  } catch { return []; }
}

interface DiscogsVersion {
  id: number;
  country: string;
  year: number | null;
  label: string | null;
  catno: string | null;
  format: string | null;
  major_formats: string[];
}

async function fetchDiscogsVersions(discogsId: string): Promise<DiscogsVersion[]> {
  // Only fetch for Discogs IDs (not spotify: or mb: prefixed)
  if (!discogsId.match(/^\d+$/)) return [];
  try {
    const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN;
    const url = `https://api.discogs.com/masters/${discogsId}/versions?per_page=25`;
    const res = await fetch(url, {
      headers: { Authorization: `Discogs token=${DISCOGS_TOKEN}`, "User-Agent": "NeedleDrop/1.0" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.versions ?? []).slice(0, 25);
  } catch { return []; }
}

export default async function AlbumPage({ params }: Props) {
  const { discogsId } = await params;
  const { userId: clerkId } = await auth();

  const album = await prisma.album.findUnique({
    where: { discogsId },
    include: {
      logs: {
        orderBy: { playedAt: "desc" },
        include: { user: true, spins: true },
      },
      collection: { include: { user: true } },
      wantlist: { include: { user: true } },
      comments: {
        where: { parentId: null, deleted: false },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          user: { select: { username: true, avatarUrl: true } },
          CommentSpin: { select: { userId: true } },
          replies: {
            where: { deleted: false },
            orderBy: { createdAt: "asc" },
            include: {
              user: { select: { username: true, avatarUrl: true } },
              CommentSpin: { select: { userId: true } },
            },
          },
        },
      },
    },
  });

  if (!album) notFound();

  const currentUser = clerkId
    ? await prisma.user.findUnique({
        where: { clerkId },
        include: {
          collection: { where: { albumId: album.id } },
          wantlist: { where: { albumId: album.id } },
        },
      })
    : null;

  const logsWithRating = album.logs.filter((l) => l.rating !== null);
  const avgRating = logsWithRating.length > 0
    ? logsWithRating.reduce((sum, l) => sum + (l.rating ?? 0), 0) / logsWithRating.length
    : null;

  const inCollection = (currentUser?.collection.length ?? 0) > 0;
  const inWantlist = (currentUser?.wantlist.length ?? 0) > 0;

  // Fetch track listing and pressings in parallel
  const [tracks, pressings] = await Promise.all([
    album.mbid ? fetchMBTracklist(album.mbid) : Promise.resolve([]),
    fetchDiscogsVersions(discogsId),
  ]);

  const formattedLogs = album.logs.map((log) => ({
    id: log.id,
    playedAt: log.playedAt.toISOString(),
    rating: log.rating,
    review: log.review,
    format: log.format,
    source: log.source,
    spinCount: log.spins.length,
    userHasSpun: currentUser ? log.spins.some((s) => s.userId === currentUser.id) : false,
    user: { username: log.user.username, avatarUrl: log.user.avatarUrl },
  }));

  const formattedTracks = tracks.map((t) => ({
    position: t.number,
    title: t.title,
    length: t.length,
  }));

  const formattedPressings = pressings.map((p) => ({
    id: String(p.id),
    country: p.country,
    year: p.year,
    label: p.label,
    catno: p.catno,
    format: p.major_formats?.[0] ?? p.format,
    variant: null,
  }));

  const formattedComments = album.comments.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    user: c.user,
    spinCount: c.CommentSpin.length,
    userHasSpun: currentUser ? c.CommentSpin.some((s) => s.userId === currentUser.id) : false,
    replies: c.replies.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
      user: r.user,
      spinCount: r.CommentSpin.length,
      userHasSpun: currentUser ? r.CommentSpin.some((s) => s.userId === currentUser.id) : false,
      replies: [],
    })),
  }));

  // Build ratings histogram (10 buckets, 0.5–5 stars)
  const histData: number[] = Array(10).fill(0);
  album.logs.forEach((l) => {
    if (l.rating != null) {
      const bucket = Math.min(9, Math.round((l.rating / 0.5) - 1));
      histData[Math.max(0, bucket)]++;
    }
  });
  const histMax = Math.max(...histData, 1);

  // Who's spinning now (live listeners from collection)
  const spinningNow = album.collection.filter((c) => c.user.nowSpinning === album.id).slice(0, 5);

  function fmtK(n: number) {
    return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="ms-page">

        <Link href="/activity" className="ms-back">← Back to E-Zine</Link>

        {/* ── Album hero ──────────────────────────── */}
        <div className="ms-album-hero">
          <div>
            {album.coverUrl ? (
              <Image src={album.coverUrl} alt={album.title} width={280} height={280}
                className="object-cover"
                style={{ width: "100%", borderRadius: 4, border: `2px solid ${C.border}`, display: "block" }} unoptimized />
            ) : (
              <div style={{ width: "100%", aspectRatio: "1", background: C.surface, borderRadius: 4, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "var(--font-nd-mono)", fontSize: 13, color: C.subtle }}>No art</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              {currentUser ? (
                <AlbumActions
                  albumId={album.id}
                  discogsId={album.discogsId}
                  title={album.title}
                  artist={album.artist}
                  releaseYear={album.releaseYear}
                  coverUrl={album.coverUrl}
                  label={album.label}
                  genre={album.genre}
                  inCollection={inCollection}
                  inWantlist={inWantlist}
                />
              ) : (
                <>
                  <button className="ms-btn hot" style={{ flex: 1 }}>+ Log a listen</button>
                  <button className="ms-btn">♡ Want</button>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="ms-label">{[album.genre, album.label].filter(Boolean).join(" · ")}</div>
            <h1 className="ms-album-title">{album.title}</h1>
            {album.artistMbid ? (
              <Link href={`/artist/${album.artistMbid}`} className="ms-album-artist" style={{ textDecoration: "none" }}>
                {album.artist}
              </Link>
            ) : (
              <div className="ms-album-artist">{album.artist}</div>
            )}

            {/* Rating + listens */}
            {avgRating !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 4px", flexWrap: "wrap" }}>
                <MiniStars value={avgRating} />
                <span style={{ fontFamily: "var(--font-nd-serif)", fontSize: 22, fontWeight: 600, color: C.text }}>{avgRating.toFixed(1)}</span>
                <span className="ms-time">from {fmtK(logsWithRating.length)} listens</span>
              </div>
            )}

            {album.releaseYear && (
              <div className="ms-time" style={{ marginTop: 4 }}>{album.releaseYear}</div>
            )}

            {/* Stat strip */}
            <div className="ms-stat-strip" style={{ marginTop: 20 }}>
              <div className="ms-stat">
                <div className="n">{fmtK(album.collection.length)}</div>
                <div className="k">Own it</div>
              </div>
              <div className="ms-stat">
                <div className="n">{fmtK(album.logs.length)}</div>
                <div className="k">Listens</div>
              </div>
              <div className="ms-stat">
                <div className="n">{fmtK(album.wantlist.length)}</div>
                <div className="k">Want it</div>
              </div>
              {logsWithRating.length > 0 && (
                <div className="ms-stat" style={{ minWidth: 120 }}>
                  <div className="k" style={{ marginBottom: 8 }}>Ratings</div>
                  <div className="ms-hist">
                    {histData.map((h, i) => (
                      <i key={i} style={{ height: `${(h / histMax) * 100}%`, opacity: 0.4 + (i / 10) * 0.5 }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Two-column body ─────────────────────── */}
        <div className="ms-cols album">
          <div className="ms-stack">
            {/* Pressings — the collector signature feature */}
            {formattedPressings.length > 0 && (
              <div className="ms-box">
                <div className="ms-bar">
                  Pressings{" "}
                  <span className="cta">{formattedPressings.length} known · {formattedPressings.filter((p) => p.id).length} in system</span>
                </div>
                <div className="ms-pad">
                  <table className="ms-press">
                    <thead>
                      <tr>
                        <th>Country / Year</th>
                        <th>Label</th>
                        <th>Catalog №</th>
                        <th>Format</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formattedPressings.map((p, i) => (
                        <tr key={i}>
                          <td>
                            <span className="flag">{p.country}</span>{" "}
                            <span style={{ color: C.muted }}>{p.year}</span>
                            {inCollection && i === 0 && <span className="ms-owned">OWNED</span>}
                          </td>
                          <td style={{ color: C.muted }}>{p.label}</td>
                          <td className="catno">{p.catno}</td>
                          <td>
                            {p.format && (
                              <span className="ms-fmt" style={{ fontSize: 10 }}>{p.format}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Reviews + Discussion + Tracklist */}
            <div className="ms-box">
              <AlbumTabsClient
                albumId={album.id}
                logs={formattedLogs}
                tracks={formattedTracks}
                pressings={formattedPressings}
                initialComments={formattedComments}
                currentUsername={currentUser?.username ?? null}
              />
            </div>
          </div>

          {/* RIGHT RAIL */}
          <aside className="ms-stack">
            {/* Spinning Now */}
            <div className="ms-box">
              <div className="ms-bar hot">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <span className="ms-onair"><span className="d" /></span> SPINNING NOW
                </span>
              </div>
              {spinningNow.length > 0 ? spinningNow.map((c) => (
                <Link key={c.id} href={`/${c.user.username}`} className="ms-rail-row" style={{ textDecoration: "none" }}>
                  {c.user.avatarUrl ? (
                    <Image src={c.user.avatarUrl} alt={c.user.username} width={36} height={36}
                      className="object-cover" style={{ width: 36, height: 36, borderRadius: "50%", border: `1.5px solid ${C.border}`, flexShrink: 0 }} unoptimized />
                  ) : (
                    <div className="ms-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>{c.user.username[0].toUpperCase()}</div>
                  )}
                  <div>
                    <div className="nm">{c.user.username}</div>
                    <div className="sub">spinning now</div>
                  </div>
                </Link>
              )) : (
                <div className="ms-pad" style={{ fontSize: 13, color: C.subtle }}>
                  No one spinning right now.
                </div>
              )}
              <div className="ms-pad">
                <div style={{ fontSize: 13, color: C.muted }}>{fmtK(album.collection.length)} collectors own this</div>
              </div>
            </div>

            {/* Also by artist */}
            {album.artistMbid && (
              <div className="ms-box">
                <div className="ms-bar">Also by {album.artist.split(" ")[0]}</div>
                <div className="ms-pad">
                  <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.55, margin: "0 0 14px" }}>
                    Full discography, biography, and upcoming shows on the artist page.
                  </p>
                  <Link href={`/artist/${album.artistMbid}`} className="ms-btn" style={{ display: "block", textAlign: "center", width: "100%", textDecoration: "none" }}>
                    Go to {album.artist} →
                  </Link>
                </div>
              </div>
            )}

            {/* Marketplace teaser */}
            <div className="ms-mkt-teaser">
              <div className="hd">
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--skin-hot)", display: "inline-block", flexShrink: 0 }} />
                Marketplace · Soon
              </div>
              <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.5, margin: "10px 0 14px" }}>
                Buy &amp; sell copies of <em>{album.title}</em> peer-to-peer — lower commission than Discogs.
              </p>
              <Link href="/market" className="ms-btn" style={{ display: "block", textAlign: "center", width: "100%", textDecoration: "none" }}>
                Notify me →
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
