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

  const { logId, rating, review, format } = await req.json();

  if (!logId) {
    return NextResponse.json({ error: "Missing logId" }, { status: 400 });
  }

  // Verify ownership
  const log = await prisma.listeningLog.findUnique({ where: { id: logId } });
  if (!log || log.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.listeningLog.update({
    where: { id: logId },
    data: {
      rating: rating ?? null,
      review: review || null,
      format: format || null,
    },
  });

  return NextResponse.json({
    log: { ...updated, durationMs: updated.durationMs !== null ? Number(updated.durationMs) : null },
  });
}
