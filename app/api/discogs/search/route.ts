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

  // type=master returns one canonical entry per album — no duplicate pressings
  const res = await fetch(
    `https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&type=master&per_page=25`,
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

  const results = (data.results ?? []).map((item: any) => {
    // Discogs master title format is "Artist - Album Title"
    const dashIdx = item.title?.indexOf(" - ") ?? -1;
    const artist = dashIdx > -1 ? item.title.slice(0, dashIdx) : (item.title ?? "");
    const albumTitle = dashIdx > -1 ? item.title.slice(dashIdx + 3) : (item.title ?? "");
    return {
      discogsId: String(item.id),
      title: albumTitle,
      artist,
      releaseYear: item.year ? parseInt(item.year) : null,
      coverUrl: item.cover_image ?? null,
      label: item.label?.[0] ?? null,
      genre: item.genre?.[0] ?? null,
    };
  });

  return NextResponse.json({ results });
}
