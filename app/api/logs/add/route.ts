import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { fetchAlbumDurationMs } from "@/lib/duration";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { discogsId, title, artist, releaseYear, coverUrl, label, genre, rating, review, format, source, mbid } =
    await req.json();

  if (!discogsId || !title || !artist) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const album = await prisma.album.upsert({
    where: { discogsId },
    update: { coverUrl, label, genre, ...(mbid ? { mbid } : {}) },
    create: { discogsId, title, artist, releaseYear, coverUrl, label, genre, mbid: mbid ?? null },
  });

  // Fetch duration asynchronously (don't block the response on MusicBrainz)
  const durationMs = await fetchAlbumDurationMs({ mbid: album.mbid, title, artist });

  const log = await prisma.listeningLog.create({
    data: {
      userId: user.id,
      albumId: album.id,
      rating: rating ?? null,
      review: review ?? null,
      format: format ?? null,
      source: source === "streaming" ? "streaming" : "physical",
      durationMs: BigInt(durationMs),
    },
  });

  return NextResponse.json({ log, album });
}
