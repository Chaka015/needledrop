import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;

async function refreshIfNeeded(user: {
  spotifyAccessToken: string;
  spotifyRefreshToken: string | null;
  spotifyTokenExpiry: Date | null;
  clerkId: string;
}): Promise<string> {
  if (user.spotifyTokenExpiry && user.spotifyTokenExpiry > new Date()) {
    return user.spotifyAccessToken;
  }
  if (!user.spotifyRefreshToken) return user.spotifyAccessToken;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: user.spotifyRefreshToken }),
  });
  if (!res.ok) return user.spotifyAccessToken;
  const tokens = await res.json();
  await prisma.user.update({
    where: { clerkId: user.clerkId },
    data: { spotifyAccessToken: tokens.access_token, spotifyTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000) },
  });
  return tokens.access_token;
}

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ tracks: [] });

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { spotifyAccessToken: true, spotifyRefreshToken: true, spotifyTokenExpiry: true, spotifyConnected: true },
  });
  if (!user?.spotifyConnected || !user.spotifyAccessToken) return NextResponse.json({ tracks: [] });

  const accessToken = await refreshIfNeeded({
    spotifyAccessToken: user.spotifyAccessToken,
    spotifyRefreshToken: user.spotifyRefreshToken,
    spotifyTokenExpiry: user.spotifyTokenExpiry,
    clerkId,
  });

  const res = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=10", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return NextResponse.json({ tracks: [] });

  const data = await res.json();
  const tracks = (data.items ?? [])
    .filter((item: { track: { type: string; album: { album_type: string } } }) =>
      item.track.type === "track" && item.track.album?.album_type !== "podcast"
    )
    .map((item: {
      track: {
        name: string;
        artists: { name: string }[];
        album: { id: string; name: string; images: { url: string }[]; release_date: string };
      };
    }) => ({
      mbid: `spotify:album:${item.track.album.id}`,
      spotifyAlbumId: item.track.album.id,
      title: item.track.album.name,
      artist: item.track.artists[0]?.name ?? "Unknown",
      year: item.track.album.release_date?.slice(0, 4) ?? null,
      coverUrl: item.track.album.images[0]?.url ?? null,
    }));

  // Deduplicate by album ID
  const seen = new Set<string>();
  const unique = tracks.filter((t: { spotifyAlbumId: string }) => {
    if (seen.has(t.spotifyAlbumId)) return false;
    seen.add(t.spotifyAlbumId);
    return true;
  });

  return NextResponse.json({ tracks: unique });
}
