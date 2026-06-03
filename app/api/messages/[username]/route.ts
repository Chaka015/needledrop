import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface Params { params: Promise<{ username: string }> }

// GET /api/messages/[username] — full thread + mark received as read
export async function GET(_req: Request, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await params;
  const [me, other] = await Promise.all([
    prisma.user.findUnique({ where: { clerkId } }),
    prisma.user.findUnique({ where: { username } }),
  ]);
  if (!me || !other) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { fromId: me.id, toId: other.id },
        { fromId: other.id, toId: me.id },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  // Mark unread messages from the other user as read
  await prisma.message.updateMany({
    where: { fromId: other.id, toId: me.id, read: false },
    data: { read: true },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      mine: m.fromId === me.id,
      read: m.read,
    })),
    other: { username: other.username, avatarUrl: other.avatarUrl },
  });
}

// POST /api/messages/[username] — send a message
export async function POST(req: Request, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await params;
  const [me, other] = await Promise.all([
    prisma.user.findUnique({ where: { clerkId } }),
    prisma.user.findUnique({ where: { username } }),
  ]);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!other) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (me.id === other.id) return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const message = await prisma.message.create({
    data: { fromId: me.id, toId: other.id, content: content.trim() },
  });

  // Notify the recipient
  await prisma.notification.create({
    data: {
      userId: other.id,
      type: "message",
      fromId: me.id,
      message: `${me.username} sent you a message`,
      url: `/messages/${me.username}`,
    },
  });

  return NextResponse.json({
    message: {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      mine: true,
      read: false,
    },
  });
}
