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
  const mapped = (data.releases ?? []).map((r: {
    id: string;
    title: string;
    "artist-credit"?: { name?: string; artist?: { name: string } }[];
    date?: string;
    "cover-art-archive"?: { front?: boolean };
    "label-info"?: { label?: { name: string }; "catalog-number"?: string }[];
    media?: { format?: string }[];
  }) => ({
    mbid: r.id,
    title: r.title,
    artist: r["artist-credit"]?.[0]?.artist?.name ?? r["artist-credit"]?.[0]?.name ?? "Unknown Artist",
    year: r.date ? r.date.slice(0, 4) : null,
    hasCover: r["cover-art-archive"]?.front ?? false,
    label: r["label-info"]?.[0]?.label?.name ?? null,
    catalogNumber: r["label-info"]?.[0]?.["catalog-number"] ?? null,
    formats: r.media ? [...new Set(r.media.map((m) => m.format).filter(Boolean))] : [],
  }));

  // Deduplicate by title+artist, preferring releases that have cover art
  const seen = new Map<string, typeof mapped[0]>();
  for (const r of mapped) {
    const key = `${r.title.toLowerCase()}::${r.artist.toLowerCase()}`;
    const existing = seen.get(key);
    if (!existing || (!existing.hasCover && r.hasCover)) {
      seen.set(key, r);
    }
  }
  const results = [...seen.values()];

  return NextResponse.json({ results });
}
