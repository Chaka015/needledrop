import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/messages/unread — total unread count for the badge
export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ count: 0 });

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ count: 0 });

  const count = await prisma.message.count({
    where: { toId: user.id, read: false },
  });

  return NextResponse.json({ count });
}
