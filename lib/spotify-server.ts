import { prisma } from "./prisma";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;

export interface NowPlayingInfo {
  albumDbId: string;
  discogsId: string;
  title: string;
  artist: string;
  coverUrl: string | null;
}

async function getFreshToken(userId: string, accessToken: string, refreshToken: string | null, expiry: Date | null): Promise<string | null> {
  if (expiry && expiry > new Date()) return accessToken;
  if (!refreshToken) return null;

  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    cache: "no-store",
  });

  if (!r.ok) {
    await prisma.user.update({
      where: { id: userId },
      data: { spotifyConnected: false, spotifyAccessToken: null, spotifyRefreshToken: null },
    });
    return null;
  }

  const t = await r.json();
  await prisma.user.update({
    where: { id: userId },
    data: {
      spotifyAccessToken: t.access_token,
      spotifyTokenExpiry: new Date(Date.now() + t.expires_in * 1000),
      ...(t.refresh_token ? { spotifyRefreshToken: t.refresh_token } : {}),
    },
  });
  return t.access_token;
}

// Check Spotify currently-playing for a user, upsert the Album record,
// update user.nowSpinning in DB, and return the playing info.
// Returns null when nothing is playing (204) or Spotify is paused.
// Designed to be called from both the API route and server components.
export async function refreshNowPlaying(userId: string): Promise<NowPlayingInfo | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      spotifyConnected: true,
      spotifyAccessToken: true,
      spotifyRefreshToken: true,
      spotifyTokenExpiry: true,
    },
  });
  if (!user?.spotifyConnected || !user.spotifyAccessToken) return null;

  const token = await getFreshToken(
    userId,
    user.spotifyAccessToken,
    user.spotifyRefreshToken,
    user.spotifyTokenExpiry,
  );
  if (!token) return null;

  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  // 204 = nothing queued / nothing playing — leave nowSpinning as-is
  if (res.status === 204) return null;
  if (!res.ok) return null;

  const data = await res.json();

  // Paused or not a music track — don't overwrite the last active track
  if (!data?.is_playing || data.item?.type !== "track") return null;

  const spotifyAlbumId = data.item.album.id;
  const discogsId = `spotify:album:${spotifyAlbumId}`;
  const coverUrl = data.item.album.images?.[0]?.url ?? null;
  const albumArtist =
    data.item.album.artists?.[0]?.name ??
    data.item.artists?.[0]?.name ??
    "Unknown Artist";

  const album = await prisma.album.upsert({
    where: { discogsId },
    update: {
      title:       data.item.album.name,
      artist:      albumArtist,
      coverUrl,
      releaseYear: data.item.album.release_date
        ? parseInt(data.item.album.release_date.slice(0, 4))
        : null,
    },
    create: {
      discogsId,
      title:       data.item.album.name,
      artist:      albumArtist,
      coverUrl,
      releaseYear: data.item.album.release_date
        ? parseInt(data.item.album.release_date.slice(0, 4))
        : null,
      genre: null,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      nowSpinning:       album.id,
      nowSpinningSource: "streaming",
      nowSpinningAt:     new Date(),
    },
  });

  return {
    albumDbId: album.id,
    discogsId: album.discogsId,
    title:     album.title,
    artist:    album.artist,
    coverUrl:  album.coverUrl,
  };
}
