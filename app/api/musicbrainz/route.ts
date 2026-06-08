import { NextResponse } from "next/server";

const MB_HEADERS = { "User-Agent": "NeedleDrop/1.0 (needledrop.app)" };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Artist tags lookup: ?mbid=xxx returns top genre tags for the artist
  const mbid = searchParams.get("mbid");
  if (mbid) {
    const res = await fetch(
      `https://musicbrainz.org/ws/2/artist/${mbid}?inc=tags&fmt=json`,
      { headers: MB_HEADERS, next: { revalidate: 86400 } }
    );
    if (!res.ok) return NextResponse.json({ tags: [] });
    const data = await res.json();
    const tags: string[] = (data.tags ?? [])
      .sort((a: { count: number }, b: { count: number }) => b.count - a.count)
      .slice(0, 5)
      .map((t: { name: string }) => t.name);
    return NextResponse.json({ tags });
  }

  const q = searchParams.get("q");
  if (!q) return NextResponse.json({ results: [] });

  const url = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(q)}&fmt=json&limit=10`;
  const res = await fetch(url, { headers: MB_HEADERS });

  if (!res.ok) return NextResponse.json({ results: [] }, { status: res.status });

  const data = await res.json();
  const mapped = (data.releases ?? []).map((r: {
    id: string;
    title: string;
    "artist-credit"?: { name?: string; artist?: { id: string; name: string } }[];
    date?: string;
    "cover-art-archive"?: { front?: boolean };
    "label-info"?: { label?: { name: string }; "catalog-number"?: string }[];
    media?: { format?: string }[];
  }) => ({
    mbid: r.id,
    title: r.title,
    artist: r["artist-credit"]?.[0]?.artist?.name ?? r["artist-credit"]?.[0]?.name ?? "Unknown Artist",
    artistMbid: r["artist-credit"]?.[0]?.artist?.id ?? null,
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
