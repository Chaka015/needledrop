import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    title,
    artist,
    releaseYear,
    coverUrl,
    label,
    catalogNumber,
    formats,
    genreTags,
    spotifyId,
    mbid,
    visibility = "hidden",
  } = await req.json();

  if (!title || !artist) {
    return NextResponse.json({ error: "Title and artist are required" }, { status: 400 });
  }

  let discogsId: string;
  if (spotifyId) {
    discogsId = `spotify:album:${spotifyId}`;
  } else if (mbid) {
    discogsId = `mb:${mbid}`;
  } else {
    discogsId = `catalog:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  const album = await prisma.album.upsert({
    where: { discogsId },
    update: {
      title,
      artist,
      releaseYear: releaseYear ?? null,
      coverUrl: coverUrl ?? null,
      label: label ?? null,
      catalogNumber: catalogNumber ?? null,
      formats: formats ?? null,
      genreTags: genreTags ?? null,
      spotifyId: spotifyId ?? null,
      isInCatalog: true,
      visibility,
      ...(mbid ? { mbid } : {}),
    },
    create: {
      discogsId,
      title,
      artist,
      releaseYear: releaseYear ?? null,
      coverUrl: coverUrl ?? null,
      label: label ?? null,
      catalogNumber: catalogNumber ?? null,
      formats: formats ?? null,
      genreTags: genreTags ?? null,
      spotifyId: spotifyId ?? null,
      isInCatalog: true,
      visibility,
      mbid: mbid ?? null,
    },
  });

  return NextResponse.json({
    album: { ...album, durationMs: album.durationMs !== null ? Number(album.durationMs) : null },
  });
}
