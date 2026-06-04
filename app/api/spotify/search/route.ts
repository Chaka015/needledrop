import { NextResponse } from "next/server";

async function getClientCredentialsToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q) return NextResponse.json({ results: [] });

  const token = await getClientCredentialsToken();
  if (!token) return NextResponse.json({ results: [] });

  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=10`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) return NextResponse.json({ results: [] }, { status: res.status });

  const data = await res.json();

  const results = (data.albums?.items ?? []).map((album: {
    id: string;
    name: string;
    artists: { name: string }[];
    release_date: string;
    images: { url: string }[];
  }) => ({
    spotifyId: album.id,
    title: album.name,
    artist: album.artists.map((a) => a.name).join(", "),
    year: album.release_date ? album.release_date.slice(0, 4) : null,
    coverUrl: album.images?.[0]?.url ?? null,
  }));

  return NextResponse.json({ results });
}
