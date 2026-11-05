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

  const { discogsId, title, artist, releaseYear, coverUrl, label, genre, condition, pressingId } =
    await req.json();

  if (!discogsId || !title || !artist) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Upsert album
  const album = await prisma.album.upsert({
    where: { discogsId },
    update: { coverUrl, label, genre },
    create: { discogsId, title, artist, releaseYear, coverUrl, label, genre },
  });

  // Add to collection (ignore if already exists)
  const existing = await prisma.collection.findUnique({
    where: { userId_albumId: { userId: user.id, albumId: album.id } },
  });

  if (existing) {
    // Remember the scanned pressing if we didn't know it yet
    if (pressingId && !existing.pressingId) {
      const entry = await prisma.collection.update({
        where: { id: existing.id },
        data: { pressingId: String(pressingId) },
      });
      return NextResponse.json({ message: "Already in collection", entry, album });
    }
    return NextResponse.json({ message: "Already in collection", entry: existing, album });
  }

  const entry = await prisma.collection.create({
    data: {
      userId: user.id,
      albumId: album.id,
      condition: condition ?? null,
      pressingId: pressingId ? String(pressingId) : null,
    },
  });

  return NextResponse.json({ entry, album });
}
