import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      collection: {
        orderBy: { addedAt: "desc" },
        include: { album: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    items: user.collection.map((c) => ({
      id: c.id,
      album: {
        id: c.album.id,
        discogsId: c.album.discogsId,
        title: c.album.title,
        artist: c.album.artist,
        coverUrl: c.album.coverUrl,
        releaseYear: c.album.releaseYear,
      },
    })),
  });
}
