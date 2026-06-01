import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const token = process.env.DISCOGS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Missing Discogs token" }, { status: 500 });
  }

  const res = await fetch(
    `https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&type=release&per_page=10`,
    {
      headers: {
        Authorization: `Discogs token=${token}`,
        "User-Agent": "NeedleDrop/1.0",
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Discogs API error" }, { status: 500 });
  }

  const data = await res.json();

  const results = data.results.map((item: any) => ({
    discogsId: String(item.id),
    title: item.title,
    artist: item.title.split(" - ")[0] ?? item.title,
    albumTitle: item.title.split(" - ")[1] ?? item.title,
    releaseYear: item.year ? parseInt(item.year) : null,
    coverUrl: item.cover_image ?? null,
    label: item.label?.[0] ?? null,
    genre: item.genre?.[0] ?? null,
  }));

  return NextResponse.json({ results });
}
