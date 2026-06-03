import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { refreshNowPlaying } from "@/lib/spotify-server";

export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ ok: false });

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, spotifyConnected: true },
  });
  if (!user?.spotifyConnected) {
    return NextResponse.json({ ok: false, reason: "not_connected" });
  }

  const playing = await refreshNowPlaying(user.id);

  return NextResponse.json({
    ok: true,
    playing: playing ? { title: playing.title, artist: playing.artist } : null,
  });
}
