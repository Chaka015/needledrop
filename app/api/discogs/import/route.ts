import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const token = process.env.DISCOGS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Missing Discogs token" }, { status: 500 });
  }

  const { discogsUsername } = await req.json();
  if (!discogsUsername) {
    return NextResponse.json({ error: "Missing Discogs username" }, { status: 400 });
  }

  let page = 1;
  let totalPages = 1;
  let imported = 0;
  let skipped = 0;

  while (page <= totalPages) {
    const res = await fetch(
      `https://api.discogs.com/users/${discogsUsername}/collection/folders/0/releases?token=${token}&per_page=100&page=${page}`,
      { headers: { "User-Agent": "NeedleDrop/1.0" } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Discogs API error" }, { status: 500 });
    }

    const data = await res.json();
    totalPages = data.pagination.pages;

    for (const item of data.releases) {
      const info = item.basic_information;

      const discogsId = String(info.id);
      const title = info.title ?? "Unknown";
      const artist = info.artists?.[0]?.name ?? "Unknown";
      const releaseYear = info.year ?? null;
      const coverUrl = info.cover_image ?? info.thumb ?? null;
      const label = info.labels?.[0]?.name ?? null;
      const genre = info.genres?.[0] ?? null;

      // Upsert album
      const album = await prisma.album.upsert({
        where: { discogsId },
        update: { coverUrl, label, genre },
        create: { discogsId, title, artist, releaseYear, coverUrl, label, genre },
      });

      // Add to collection if not already there
      const existing = await prisma.collection.findUnique({
        where: { userId_albumId: { userId: user.id, albumId: album.id } },
      });

      if (!existing) {
        await prisma.collection.create({
          data: { userId: user.id, albumId: album.id },
        });
        imported++;
      } else {
        skipped++;
      }
    }

    page++;

    // Respect Discogs rate limit (60 req/min)
    await new Promise((r) => setTimeout(r, 1000));
  }

  return NextResponse.json({ imported, skipped, total: imported + skipped });
}
