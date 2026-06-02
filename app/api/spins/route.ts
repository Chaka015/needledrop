import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { logId } = await req.json();
  if (!logId) return NextResponse.json({ error: "Missing logId" }, { status: 400 });

  // Fetch log first — validates existence and gives us owner + album
  const log = await prisma.listeningLog.findUnique({
    where: { id: logId },
    include: { album: true },
  });
  if (!log) return NextResponse.json({ error: "Log not found" }, { status: 404 });

  const existing = await prisma.spin.findUnique({
    where: { userId_logId: { userId: user.id, logId } },
  });

  if (existing) {
    await prisma.spin.delete({ where: { id: existing.id } });
    return NextResponse.json({ spun: false });
  }

  await prisma.spin.create({ data: { userId: user.id, logId } });

  // Notify the log owner (not if spinning your own log)
  if (log.userId !== user.id) {
    await prisma.notification.create({
      data: {
        userId: log.userId,
        type: "spin",
        fromId: user.id,
        logId,
        message: `${user.username} spun your listen of ${log.album.title}`,
      },
    });
  }

  return NextResponse.json({ spun: true });
}
