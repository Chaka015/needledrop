import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;

async function refreshToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

interface SpotifyTrack {
  played_at: string;
  track: {
    type: string;       // "track" for music, "episode" for podcasts
    name: string;
    artists: { name: string }[];
    album: {
      album_type: string; // "album" | "single" | "compilation" | "podcast"
      name: string;
      id: string;
      images: { url: string }[];
      release_date: string;
      label?: string;
    };
  };
}

export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user?.spotifyAccessToken || !user?.spotifyRefreshToken) {
    return NextResponse.json({ error: "Spotify not connected" }, { status: 400 });
  }

  let accessToken = user.spotifyAccessToken;

  // Refresh if expired
  if (user.spotifyTokenExpiry && user.spotifyTokenExpiry < new Date()) {
    const refreshed = await refreshToken(user.spotifyRefreshToken);
    if (!refreshed) return NextResponse.json({ error: "Token refresh failed" }, { status: 400 });
    accessToken = refreshed.access_token;
    await prisma.user.update({
      where: { clerkId },
      data: {
        spotifyAccessToken: accessToken,
        spotifyTokenExpiry: new Date(Date.now() + refreshed.expires_in * 1000),
      },
    });
  }

  const res = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=20", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return NextResponse.json({ error: "Spotify API error" }, { status: res.status });

  const data = await res.json();
  const tracks: SpotifyTrack[] = data.items ?? [];

  let imported = 0;
  let skipped = 0;

  for (const item of tracks) {
    const track = item.track;
    // Skip podcasts and episodes
    if (track.type === "episode" || track.album?.album_type === "podcast") { skipped++; continue; }

    const playedAt = new Date(item.played_at);
    const discogsId = `spotify:album:${track.album.id}`;

    const album = await prisma.album.upsert({
      where: { discogsId },
      update: { coverUrl: track.album.images[0]?.url ?? null },
      create: {
        discogsId,
        title: track.album.name,
        artist: track.artists[0]?.name ?? "Unknown Artist",
        releaseYear: track.album.release_date ? parseInt(track.album.release_date.slice(0, 4)) : null,
        coverUrl: track.album.images[0]?.url ?? null,
        genre: null,
        label: null,
      },
    });

    // Deduplicate: skip if we already logged this album at this exact time
    const existing = await prisma.listeningLog.findFirst({
      where: { userId: user.id, albumId: album.id, playedAt },
    });

    if (existing) { skipped++; continue; }

    await prisma.listeningLog.create({
      data: {
        userId: user.id,
        albumId: album.id,
        format: null,
        source: "streaming",
        autoImported: true,
        playedAt,
      },
    });
    imported++;
  }

  await prisma.user.update({
    where: { clerkId },
    data: { spotifyLastSyncedAt: new Date() },
  });

  return NextResponse.json({ imported, skipped, total: tracks.length });
}
