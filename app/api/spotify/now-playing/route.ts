import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;

async function getAccessToken(user: {
  clerkId: string;
  spotifyAccessToken: string;
  spotifyRefreshToken: string | null;
  spotifyTokenExpiry: Date | null;
}): Promise<string | null> {
  if (user.spotifyTokenExpiry && user.spotifyTokenExpiry > new Date()) {
    return user.spotifyAccessToken;
  }
  if (!user.spotifyRefreshToken) return null;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: user.spotifyRefreshToken }),
  });
  if (!res.ok) return null;
  const tokens = await res.json();
  await prisma.user.update({
    where: { clerkId: user.clerkId },
    data: { spotifyAccessToken: tokens.access_token, spotifyTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000) },
  });
  return tokens.access_token;
}

export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ ok: false });

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      id: true, clerkId: true,
      spotifyConnected: true, spotifyAccessToken: true,
      spotifyRefreshToken: true, spotifyTokenExpiry: true,
    },
  });
  if (!user?.spotifyConnected || !user.spotifyAccessToken) return NextResponse.json({ ok: false });

  const token = await getAccessToken(user as Parameters<typeof getAccessToken>[0]);
  if (!token) return NextResponse.json({ ok: false });

  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${token}` },
  });

  // 204 = nothing playing
  if (res.status === 204 || !res.ok) return NextResponse.json({ ok: true, playing: null });

  const data = await res.json();
  if (!data?.item || data.item.type !== "track") return NextResponse.json({ ok: true, playing: null });

  const albumId = data.item.album.id;
  const discogsId = `spotify:album:${albumId}`;
  const coverUrl = data.item.album.images?.[0]?.url ?? null;

  // Upsert album record
  const album = await prisma.album.upsert({
    where: { discogsId },
    update: { coverUrl },
    create: {
      discogsId,
      title: data.item.album.name,
      artist: data.item.artists?.[0]?.name ?? "Unknown Artist",
      releaseYear: data.item.album.release_date ? parseInt(data.item.album.release_date.slice(0, 4)) : null,
      coverUrl,
    },
  });

  // Update user's Now Spinning
  await prisma.user.update({
    where: { id: user.id },
    data: {
      nowSpinning: album.id,
      nowSpinningSource: "streaming",
      nowSpinningAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    playing: { title: album.title, artist: album.artist },
  });
}
