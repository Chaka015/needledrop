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

  const { discogsId, title, artist, releaseYear, coverUrl, label, genre } = await req.json();

  if (!discogsId || !title || !artist) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const album = await prisma.album.upsert({
    where: { discogsId },
    update: { coverUrl, label, genre },
    create: { discogsId, title, artist, releaseYear, coverUrl, label, genre },
  });

  const existing = await prisma.wantlist.findUnique({
    where: { userId_albumId: { userId: user.id, albumId: album.id } },
  });

  if (existing) {
    return NextResponse.json({ message: "Already in wantlist" });
  }

  await prisma.wantlist.create({
    data: { userId: user.id, albumId: album.id },
  });

  return NextResponse.json({ ok: true });
}
