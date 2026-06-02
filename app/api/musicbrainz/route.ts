import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q) return NextResponse.json({ results: [] });

  const url = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(q)}&fmt=json&limit=10`;
  const res = await fetch(url, {
    headers: { "User-Agent": "NeedleDrop/1.0 (needledrop.app)" },
  });

  if (!res.ok) return NextResponse.json({ results: [] }, { status: res.status });

  const data = await res.json();
  const results = (data.releases ?? []).map((r: {
    id: string;
    title: string;
    "artist-credit"?: { name?: string; artist?: { name: string } }[];
    date?: string;
    "cover-art-archive"?: { front?: boolean };
    "label-info"?: { label?: { name: string } }[];
  }) => ({
    mbid: r.id,
    title: r.title,
    artist: r["artist-credit"]?.[0]?.artist?.name ?? r["artist-credit"]?.[0]?.name ?? "Unknown Artist",
    year: r.date ? r.date.slice(0, 4) : null,
    hasCover: r["cover-art-archive"]?.front ?? false,
    label: r["label-info"]?.[0]?.label?.name ?? null,
  }));

  return NextResponse.json({ results });
}
