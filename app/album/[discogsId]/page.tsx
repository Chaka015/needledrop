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

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Album header */}
        <div className="flex gap-8 mb-10">
          {album.coverUrl ? (
            <Image src={album.coverUrl} alt={album.title} width={180} height={180}
              className="object-cover shrink-0"
              style={{ width: 180, height: 180, borderRadius: 4 }} unoptimized />
          ) : (
            <div className="shrink-0 flex items-center justify-center text-sm font-mono"
              style={{ width: 180, height: 180, backgroundColor: C.surface, borderRadius: 4, color: C.subtle }}>
              No art
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: C.text }}>{album.title}</h1>
            {album.artistMbid ? (
              <Link href={`/artist/${album.artistMbid}`}
                className="text-lg font-mono hover:underline" style={{ color: C.muted }}>
                {album.artist}
              </Link>
            ) : (
              <p className="text-lg font-mono" style={{ color: C.muted }}>{album.artist}</p>
            )}
            <div className="flex gap-4 text-xs font-mono mt-1 mb-4" style={{ color: C.subtle }}>
              {album.releaseYear && <span>{album.releaseYear}</span>}
              {album.label && <span>{album.label}</span>}
              {album.genre && <span>{album.genre}</span>}
            </div>

            <div className="flex gap-4 mb-6">
              {[
                { label: "LOGGED", value: album.logs.length },
                { label: "COLLECTED", value: album.collection.length },
                { label: "WANTLISTED", value: album.wantlist.length },
              ].map((s) => (
                <div key={s.label} className="px-4 py-2 text-center"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                  <div className="text-lg font-bold font-mono" style={{ color: C.text }}>{s.value}</div>
                  <div className="text-xs font-mono" style={{ color: C.subtle }}>{s.label}</div>
                </div>
              ))}
              {avgRating !== null && (
                <div className="px-4 py-2 text-center"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                  <div className="text-lg font-bold font-mono" style={{ color: C.accent }}>
                    {avgRating.toFixed(1)}
                  </div>
                  <div className="text-xs font-mono" style={{ color: C.subtle }}>AVG RATING</div>
                </div>
              )}
            </div>

            {currentUser && (
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
            )}
          </div>
        </div>

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
  );
}
