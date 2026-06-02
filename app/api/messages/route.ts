import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/messages — inbox: one entry per conversation, sorted by most recent message
export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: { OR: [{ fromId: user.id }, { toId: user.id }] },
    orderBy: { createdAt: "desc" },
    include: {
      from: { select: { id: true, username: true, avatarUrl: true } },
      to:   { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  // Group into conversations keyed by the other user's id
  const convMap = new Map<string, {
    user: { id: string; username: string; avatarUrl: string | null };
    lastMessage: string;
    lastAt: string;
    unread: number;
  }>();

  for (const m of messages) {
    const other = m.fromId === user.id ? m.to : m.from;
    if (!convMap.has(other.id)) {
      convMap.set(other.id, {
        user: other,
        lastMessage: m.content,
        lastAt: m.createdAt.toISOString(),
        unread: !m.read && m.toId === user.id ? 1 : 0,
      });
    } else {
      const conv = convMap.get(other.id)!;
      if (!m.read && m.toId === user.id) conv.unread++;
    }
  }

  return NextResponse.json({ conversations: Array.from(convMap.values()) });
}
