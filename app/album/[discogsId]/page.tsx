import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import AlbumActions from "@/components/AlbumActions";
import AlbumTabsClient from "@/components/AlbumTabsClient";
import AddToDatabaseTrigger from "@/components/AddToDatabaseTrigger";

interface Props {
  params: Promise<{ discogsId: string }>;
  searchParams: Promise<{ new?: string; id?: string }>;
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

// When mbid is unknown, search MB by title + artist, fetch the top release,
// and return both the tracklist and the release ID so we can cache it.
async function fetchMBTracklistBySearch(
  title: string,
  artist: string,
): Promise<{ tracks: MBTrack[]; mbid: string | null }> {
  try {
    const q = encodeURIComponent(`release:"${title}" AND artist:"${artist}"`);
    const searchRes = await fetch(
      `https://musicbrainz.org/ws/2/release/?query=${q}&limit=1&fmt=json`,
      { headers: { "User-Agent": "NeedleDrop/1.0 (needledrop.app)" }, next: { revalidate: 86400 } }
    );
    if (!searchRes.ok) return { tracks: [], mbid: null };
    const searchData = await searchRes.json();
    const releaseId: string | undefined = searchData.releases?.[0]?.id;
    if (!releaseId) return { tracks: [], mbid: null };

    const tracks = await fetchMBTracklist(releaseId);
    return { tracks, mbid: releaseId };
  } catch { return { tracks: [], mbid: null }; }
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

// Reusable include block so we don't repeat it in two places
const ALBUM_INCLUDES = {
  logs: { orderBy: { playedAt: "desc" as const }, include: { user: true, spins: true } },
  collection: { include: { user: true } },
  wantlist: { include: { user: true } },
  comments: {
    where: { parentId: null, deleted: false },
    orderBy: { createdAt: "desc" as const },
    take: 50,
    include: {
      user: { select: { username: true, avatarUrl: true } },
      CommentSpin: { select: { userId: true } },
      replies: {
        where: { deleted: false },
        orderBy: { createdAt: "asc" as const },
        include: {
          user: { select: { username: true, avatarUrl: true } },
          CommentSpin: { select: { userId: true } },
        },
      },
    },
  },
};

const MB_HEADERS = { "User-Agent": "NeedleDrop/1.0 (needledrop.app)" };

// Resolve a Spotify album ID → MB release via MusicBrainz URL lookup,
// then upsert the album record from MB data. Used as fallback when
// Spotify credentials aren't available.
async function ensureSpotifyAlbumViaMB(discogsId: string, spotifyId: string): Promise<void> {
  try {
    const spotifyUrl = `https://open.spotify.com/album/${spotifyId}`;
    const urlRes = await fetch(
      `https://musicbrainz.org/ws/2/url?resource=${encodeURIComponent(spotifyUrl)}&inc=release-rels&fmt=json`,
      { headers: MB_HEADERS, next: { revalidate: 86400 } }
    );
    if (!urlRes.ok) return;
    const urlData = await urlRes.json();
    const releaseId: string | undefined = urlData.relations?.find(
      (r: { type: string; release?: { id: string } }) => (r.type === "free streaming" || r.type === "streaming music") && r.release?.id
    )?.release?.id;
    if (!releaseId) return;

    const relRes = await fetch(
      `https://musicbrainz.org/ws/2/release/${releaseId}?inc=artist-credits+release-groups&fmt=json`,
      { headers: MB_HEADERS, next: { revalidate: 86400 } }
    );
    if (!relRes.ok) return;
    const rel = await relRes.json();

    const title       = rel.title ?? "Unknown Album";
    const artist      = rel["artist-credit"]?.[0]?.artist?.name ?? "Unknown Artist";
    const artistMbid  = rel["artist-credit"]?.[0]?.artist?.id ?? null;
    const releaseYear = rel.date ? parseInt(rel.date.slice(0, 4)) : null;
    const label       = rel["label-info"]?.[0]?.label?.name ?? null;
    const rgId        = rel["release-group"]?.id ?? null;
    const coverUrl    = rgId ? `https://coverartarchive.org/release-group/${rgId}/front` : null;

    await prisma.album.upsert({
      where:  { discogsId },
      update: { title, artist, artistMbid, releaseYear, label, coverUrl },
      create: { discogsId, title, artist, artistMbid, releaseYear, label, coverUrl, genre: null },
    });
  } catch { /* non-fatal */ }
}

// When a spotify:album: discogsId isn't in the DB yet, try Spotify first
// then fall back to MusicBrainz URL lookup.
async function ensureSpotifyAlbum(discogsId: string): Promise<void> {
  if (!discogsId.toLowerCase().startsWith("spotify:album:")) return;
  const spotifyId = discogsId.slice("spotify:album:".length);
  if (!spotifyId) return;

  const clientId     = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  // Try Spotify API if credentials are present
  if (clientId && clientSecret) {
    try {
      const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
        cache: "no-store",
      });
      if (tokenRes.ok) {
        const { access_token } = await tokenRes.json();
        const albumRes = await fetch(`https://api.spotify.com/v1/albums/${spotifyId}`, {
          headers: { Authorization: `Bearer ${access_token}` },
          next: { revalidate: 86400 },
        });
        if (albumRes.ok) {
          const data = await albumRes.json();
          const artist = data.artists?.[0]?.name ?? data.album_artists?.[0]?.name ?? "Unknown Artist";
          await prisma.album.upsert({
            where:  { discogsId },
            update: { title: data.name, artist, coverUrl: data.images?.[0]?.url ?? null, releaseYear: data.release_date ? parseInt(data.release_date.slice(0, 4)) : null, label: data.label ?? null },
            create: { discogsId, title: data.name, artist, coverUrl: data.images?.[0]?.url ?? null, releaseYear: data.release_date ? parseInt(data.release_date.slice(0, 4)) : null, label: data.label ?? null, genre: null },
          });
          return;
        }
      }
    } catch { /* fall through to MB */ }
  }

  // Fallback: resolve via MusicBrainz URL lookup
  await ensureSpotifyAlbumViaMB(discogsId, spotifyId);
}

// When a mb: discogsId isn't in the DB, fetch the release group from MusicBrainz and upsert.
async function ensureMBAlbum(discogsId: string): Promise<void> {
  if (!discogsId.toLowerCase().startsWith("mb:")) return;
  const mbid = discogsId.slice(3); // strip "mb:"
  if (!mbid) return;

  try {
    // Fetch release group for title/artist/date
    const rgRes = await fetch(
      `https://musicbrainz.org/ws/2/release-group/${mbid}?inc=artist-credits&fmt=json`,
      { headers: { "User-Agent": "NeedleDrop/1.0 (needledrop.app)" }, next: { revalidate: 86400 } }
    );
    if (!rgRes.ok) return;
    const rg = await rgRes.json();

    const title = rg.title ?? "Unknown Album";
    const artist = rg["artist-credit"]?.[0]?.artist?.name
      ?? rg["artist-credit"]?.[0]?.name
      ?? "Unknown Artist";
    const artistMbid = rg["artist-credit"]?.[0]?.artist?.id ?? null;
    const releaseYear = rg["first-release-date"]
      ? parseInt(rg["first-release-date"].slice(0, 4))
      : null;

    // Try Cover Art Archive for this release group
    const coverUrl = `https://coverartarchive.org/release-group/${mbid}/front`;

    await prisma.album.upsert({
      where: { discogsId },
      update: { title, artist, artistMbid, releaseYear },
      create: { discogsId, title, artist, artistMbid, releaseYear, coverUrl, genre: null, label: null },
    });
  } catch {
    // MusicBrainz unreachable — graceful fallback page will render instead
  }
}

// Given a discogsId (any format), try to derive a "Artist Title" search
// string by hitting the relevant external API. Used to pre-fill the
// AddToDatabase modal when the album isn't in the catalogue yet.
async function deriveSearchQuery(discogsId: string): Promise<string> {
  // ── Spotify album ──────────────────────────────────────────────────────────
  if (discogsId.toLowerCase().startsWith("spotify:album:")) {
    const spotifyId = discogsId.slice("spotify:album:".length);
    try {
      const clientId     = process.env.SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
      if (!clientId || !clientSecret) throw new Error("no creds");
      const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
        cache: "no-store",
      });
      if (!tokenRes.ok) throw new Error("token fail");
      const { access_token } = await tokenRes.json();
      const albumRes = await fetch(`https://api.spotify.com/v1/albums/${spotifyId}`, {
        headers: { Authorization: `Bearer ${access_token}` },
        next: { revalidate: 3600 },
      });
      if (!albumRes.ok) throw new Error("album fail");
      const data = await albumRes.json();
      const artist = (data.artists?.[0]?.name ?? "").trim();
      const title  = (data.name ?? "").trim();
      return [artist, title].filter(Boolean).join(" ");
    } catch { /* fall through */ }
  }

  // ── MusicBrainz release group ───────────────────────────────────────────────
  if (discogsId.toLowerCase().startsWith("mb:")) {
    const mbid = discogsId.slice(3);
    try {
      const res = await fetch(
        `https://musicbrainz.org/ws/2/release-group/${mbid}?inc=artist-credits&fmt=json`,
        { headers: { "User-Agent": "NeedleDrop/1.0 (needledrop.app)" }, next: { revalidate: 3600 } }
      );
      if (!res.ok) throw new Error("mb fail");
      const data = await res.json();
      const artist = (data["artist-credit"]?.[0]?.artist?.name ?? "").trim();
      const title  = (data.title ?? "").trim();
      return [artist, title].filter(Boolean).join(" ");
    } catch { /* fall through */ }
  }

  // ── Discogs numeric release ID ─────────────────────────────────────────────
  if (/^\d+$/.test(discogsId)) {
    try {
      const token = process.env.DISCOGS_TOKEN;
      if (!token) throw new Error("no token");
      const res = await fetch(`https://api.discogs.com/releases/${discogsId}`, {
        headers: { Authorization: `Discogs token=${token}`, "User-Agent": "NeedleDrop/1.0" },
        next: { revalidate: 3600 },
      });
      if (!res.ok) throw new Error("discogs fail");
      const data = await res.json();
      const artist = (data.artists?.[0]?.name ?? "").replace(/\s*\(\d+\)$/, "").trim();
      const title  = (data.title ?? "").trim();
      return [artist, title].filter(Boolean).join(" ");
    } catch { /* fall through */ }
  }

  return "";
}

// Never serve a cached version — album records can be created moments before
// this page is first requested (race with the create → redirect flow).
export const dynamic = "force-dynamic";

export default async function AlbumPage({ params, searchParams }: Props) {
  const { discogsId } = await params;
  const { id: albumDbId } = await searchParams;
  const { userId: clerkId } = await auth();

  let album = await prisma.album.findUnique({
    where: { discogsId },
    include: ALBUM_INCLUDES,
  });

  // If the discogsId lookup missed, try by DB primary key first — this is
  // guaranteed to find a record that was just written (no pooler lag on PK
  // lookups), and is passed via ?id= when navigating from AddToDatabase.
  if (!album && albumDbId) {
    album = await prisma.album.findUnique({
      where: { id: albumDbId },
      include: ALBUM_INCLUDES,
    }) ?? null;
  }

  // Case-insensitive fallback — handles SPOTIFY:ALBUM: vs spotify:album: mismatch
  if (!album) {
    album = await prisma.album.findFirst({
      where: { discogsId: { equals: discogsId, mode: "insensitive" } },
      include: ALBUM_INCLUDES,
    }) ?? null;
  }

  // Self-heal for spotify: fetch from Spotify API and upsert, then retry.
  if (!album && discogsId.toLowerCase().startsWith("spotify:album:")) {
    await ensureSpotifyAlbum(discogsId);
    album = await prisma.album.findUnique({
      where: { discogsId },
      include: ALBUM_INCLUDES,
    });
  }

  // Self-heal for mb: release group IDs linked from the artist discography.
  if (!album && discogsId.toLowerCase().startsWith("mb:")) {
    await ensureMBAlbum(discogsId);
    album = await prisma.album.findUnique({
      where: { discogsId },
      include: ALBUM_INCLUDES,
    });
  }

  // Generic retry — one short pause for any remaining timing edge cases.
  if (!album) {
    await new Promise((r) => setTimeout(r, 400));
    album = await prisma.album.findUnique({
      where: { discogsId },
      include: ALBUM_INCLUDES,
    });
  }

  // Complete fallback — auto-open the add modal instead of a dead end
  if (!album) {
    // Try to derive a pre-filled search term from the external ID so the
    // AddToDatabase modal opens with results already loaded.
    const searchQuery = await deriveSearchQuery(discogsId);
    return (
      <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.text }}>
        <div className="ms-page">
          <Link href="/activity" className="ms-back">← Back to E-Zine</Link>
          <div className="ms-box" style={{ maxWidth: 560, margin: "40px auto" }}>
            <div className="ms-bar hot">Album not in catalogue</div>
            <div className="ms-pad" style={{ padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💿</div>
              <h2 style={{ fontFamily: "var(--font-nd-serif)", fontSize: 24, fontWeight: 600, margin: "0 0 12px", color: C.text }}>
                Album not found — add it?
              </h2>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, margin: "0 0 24px" }}>
                This album isn&apos;t in the NeedleDrop catalogue yet. Search below to add it and give it a proper home.
              </p>
              <AddToDatabaseTrigger autoOpen initialQuery={searchQuery} />
            </div>
          </div>
        </div>
      </div>
    );
  }

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

  // Self-heal missing artistMbid — look up by name and cache it
  if (!album.artistMbid) {
    try {
      const q = encodeURIComponent(`artist:"${album.artist}"`);
      const res = await fetch(
        `https://musicbrainz.org/ws/2/artist?query=${q}&limit=5&fmt=json`,
        { headers: { "User-Agent": "NeedleDrop/1.0 (needledrop.app)" }, next: { revalidate: 86400 } }
      );
      if (res.ok) {
        const data = await res.json();
        // Prefer artists (not labels/etc) with a high score
        const match = (data.artists ?? []).find(
          (a: { id: string; type?: string; score?: number }) =>
            !a.type || a.type === "Group" || a.type === "Person"
        );
        const mbid: string | undefined = match?.id;
        if (mbid) {
          await prisma.album.update({ where: { id: album.id }, data: { artistMbid: mbid } });
          album = { ...album, artistMbid: mbid };
        }
      }
    } catch { /* non-fatal */ }
  }

  // Fetch track listing and pressings.
  // If album.mbid is missing (e.g. added via Spotify search), search MB by
  // title+artist to find the release, then cache the mbid for future loads.
  let trackResult: { tracks: MBTrack[]; mbid: string | null };
  if (album.mbid) {
    trackResult = { tracks: await fetchMBTracklist(album.mbid), mbid: album.mbid };
  } else {
    trackResult = await fetchMBTracklistBySearch(album.title, album.artist);
    if (trackResult.mbid) {
      // Cache for future page loads — non-fatal if it fails
      await prisma.album.update({ where: { id: album.id }, data: { mbid: trackResult.mbid } }).catch(() => {});
    }
  }

  const [tracks, pressings] = await Promise.all([
    Promise.resolve(trackResult.tracks),
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
