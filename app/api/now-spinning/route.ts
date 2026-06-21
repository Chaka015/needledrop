import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { albumId, source, format } = await req.json();
  const logSource = source === "streaming" ? "streaming" : "physical";

  const user = await prisma.user.update({
    where: { clerkId },
    data: {
      nowSpinning: albumId ?? null,
      nowSpinningSource: albumId ? logSource : null,
      nowSpinningAt: albumId ? new Date() : null,
    },
    select: { id: true },
  });

  if (albumId) {
    await prisma.listeningLog.create({
      data: {
        userId: user.id,
        albumId,
        source: logSource,
        format: logSource === "physical" ? (format ?? null) : null,
        playedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
