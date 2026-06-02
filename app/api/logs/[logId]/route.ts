import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface Params { params: Promise<{ logId: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { logId } = await params;
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const log = await prisma.listeningLog.findUnique({ where: { id: logId } });
  if (!log) return NextResponse.json({ error: "Log not found" }, { status: 404 });
  if (log.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Delete associated spins first
  await prisma.spin.deleteMany({ where: { logId } });
  await prisma.listeningLog.delete({ where: { id: logId } });

  return NextResponse.json({ ok: true });
}
