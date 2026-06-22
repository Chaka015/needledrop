import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { fetchAlbumDurationMs } from "@/lib/duration";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;

// 90-minute window: two entries for the same album within this are per-song duplicates
const SESSION_GAP_MS = 90 * 60 * 1000;

async function refreshToken(refreshToken: string): Promise<{ access_token: string; expires_in: number; refresh_token?: string } | null> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  return res.json();
}

interface SpotifyTrack {
  played_at: string;
  track: {
    id: string;
    type: string;
    name: string;
    artists: { name: string }[];
    album: {
      album_type: string;
      name: string;
      id: string;
      total_tracks: number;
      images: { url: string }[];
      release_date: string;
      label?: string;
      artists?: { name: string }[];
    };
  };
}

interface AlbumSession {
  spotifyAlbumId: string;
  albumName: string;
  albumArtist: string;
  coverUrl: string | null;
  releaseYear: number | null;
  label: string | null;
  playedAt: Date;
  uniqueTrackIds: Set<string>;
  totalTracks: number;
}

function groupIntoSessions(tracks: SpotifyTrack[]): AlbumSession[] {
  // One session per (albumId, calendar day) — covers non-consecutive listens across a day
  const map = new Map<string, AlbumSession>();

  for (const item of tracks) {
    const album = item.track.album;
    const playedAt = new Date(item.played_at);
    const dayKey = `${album.id}::${playedAt.getFullYear()}-${playedAt.getMonth()}-${playedAt.getDate()}`;

    if (!map.has(dayKey)) {
      const albumArtist =
        album.artists?.[0]?.name ?? item.track.artists[0]?.name ?? "Unknown Artist";
      map.set(dayKey, {
        spotifyAlbumId: album.id,
        albumName: album.name,
        albumArtist,
        coverUrl: album.images[0]?.url ?? null,
        releaseYear: album.release_date
          ? parseInt(album.release_date.slice(0, 4))
          : null,
        label: album.label ?? null,
        playedAt,
        uniqueTrackIds: new Set([item.track.id]),
        totalTracks: album.total_tracks,
      });
    } else {
      const session = map.get(dayKey)!;
      if (playedAt > session.playedAt) session.playedAt = playedAt;
      session.uniqueTrackIds.add(item.track.id);
    }
  }

  return [...map.values()];
}

// Delete per-song duplicate entries created by the old track-level sync.
// Clusters: auto-imported streaming logs for the same (userId, albumId)
// whose playedAt values are within SESSION_GAP_MS of each other.
// In each cluster, keep the most recent entry; delete the rest.
async function cleanupPerSongDuplicates(userId: string): Promise<number> {
  const logs = await prisma.listeningLog.findMany({
    where: { userId, autoImported: true, source: "streaming" },
    orderBy: [{ albumId: "asc" }, { playedAt: "asc" }],
    select: { id: true, albumId: true, playedAt: true },
  });

  const toDelete: string[] = [];

  // Group by albumId
  const byAlbum = new Map<string, typeof logs>();
  for (const log of logs) {
    const group = byAlbum.get(log.albumId) ?? [];
    group.push(log);
    byAlbum.set(log.albumId, group);
  }

  for (const albumLogs of byAlbum.values()) {
    let clusterStart = 0;
    for (let i = 1; i <= albumLogs.length; i++) {
      const isClusterEnd =
        i === albumLogs.length ||
        albumLogs[i].playedAt.getTime() - albumLogs[i - 1].playedAt.getTime() >
          SESSION_GAP_MS;

      if (isClusterEnd) {
        // Cluster: albumLogs[clusterStart..i-1]. Keep last (i-1), delete [clusterStart..i-2].
        for (let j = clusterStart; j < i - 1; j++) {
          toDelete.push(albumLogs[j].id);
        }
        clusterStart = i;
      }
    }
  }

  if (toDelete.length > 0) {
    await prisma.spin.deleteMany({ where: { logId: { in: toDelete } } });
    await prisma.listeningLog.deleteMany({ where: { id: { in: toDelete } } });
  }

  return toDelete.length;
}

export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user?.spotifyAccessToken || !user?.spotifyRefreshToken) {
    return NextResponse.json({ error: "Spotify not connected" }, { status: 400 });
  }

  let accessToken = user.spotifyAccessToken;

  if (!user.spotifyTokenExpiry || user.spotifyTokenExpiry < new Date()) {
    const refreshed = await refreshToken(user.spotifyRefreshToken);
    if (!refreshed) {
      await prisma.user.update({
        where: { clerkId },
        data: { spotifyConnected: false, spotifyAccessToken: null, spotifyRefreshToken: null },
      });
      return NextResponse.json(
        { error: "Spotify token expired. Please reconnect Spotify in settings." },
        { status: 401 }
      );
    }
    accessToken = refreshed.access_token;
    await prisma.user.update({
      where: { clerkId },
      data: {
        spotifyAccessToken: accessToken,
        spotifyTokenExpiry: new Date(Date.now() + refreshed.expires_in * 1000),
        ...(refreshed.refresh_token ? { spotifyRefreshToken: refreshed.refresh_token } : {}),
      },
    });
  }

  const res = await fetch(
    "https://api.spotify.com/v1/me/player/recently-played?limit=20",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return NextResponse.json({ error: "Spotify API error" }, { status: res.status });

  const data = await res.json();
  const rawTracks: SpotifyTrack[] = data.items ?? [];

  // Drop podcasts / episodes before grouping
  const tracks = rawTracks.filter(
    (item) =>
      item.track.type !== "episode" &&
      item.track.album?.album_type !== "podcast"
  );

  const sessions = groupIntoSessions(tracks);

  let imported = 0;
  let skipped = 0;

  for (const session of sessions) {
    // Require >50% of the album's tracks to have been played — partial listens don't count
    if (session.totalTracks > 0 && session.uniqueTrackIds.size / session.totalTracks < 0.5) {
      skipped++;
      continue;
    }

    const discogsId = `spotify:album:${session.spotifyAlbumId}`;

    const album = await prisma.album.upsert({
      where: { discogsId },
      update: {
        title:       session.albumName,
        artist:      session.albumArtist,
        coverUrl:    session.coverUrl,
        releaseYear: session.releaseYear,
        label:       session.label,
      },
      create: {
        discogsId,
        title:       session.albumName,
        artist:      session.albumArtist,
        releaseYear: session.releaseYear,
        coverUrl:    session.coverUrl,
        genre:       null,
        label:       session.label,
      },
    });

    // Skip if we already have an auto-imported log for this album on the same calendar day
    const startOfDay = new Date(session.playedAt);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const existing = await prisma.listeningLog.findFirst({
      where: { userId: user.id, albumId: album.id, autoImported: true, playedAt: { gte: startOfDay, lt: endOfDay } },
    });
    if (existing) { skipped++; continue; }

    const durationMs = await fetchAlbumDurationMs({
      mbid: album.mbid,
      title: album.title,
      artist: album.artist,
    });

    await prisma.listeningLog.create({
      data: {
        userId:       user.id,
        albumId:      album.id,
        format:       null,
        source:       "streaming",
        autoImported: true,
        playedAt:     session.playedAt,
        durationMs:   BigInt(durationMs),
      },
    });
    imported++;
  }

  // One-time cleanup: remove any per-song duplicate entries from old sync behaviour
  const cleaned = await cleanupPerSongDuplicates(user.id);

  const now = new Date();
  await prisma.user.update({
    where: { clerkId },
    data: { spotifyLastSyncedAt: now },
  });

  return NextResponse.json({
    imported,
    skipped,
    cleaned,
    total: sessions.length,
    syncedAt: now.toISOString(),
  });
}
