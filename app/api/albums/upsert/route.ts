import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { discogsId, title, artist, releaseYear, coverUrl, label, genre } = await req.json();
  if (!discogsId || !title || !artist) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const album = await prisma.album.upsert({
    where: { discogsId },
    update: { coverUrl, label, genre },
    create: { discogsId, title, artist, releaseYear, coverUrl, label, genre },
  });

  return NextResponse.json({ album });
}
