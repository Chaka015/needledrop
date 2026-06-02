import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({ where: { clerkId } });
  if (!currentUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { targetUserId } = await req.json();
  if (!targetUserId || targetUserId === currentUser.id) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: currentUser.id,
        followingId: targetUserId,
      },
    },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  } else {
    await prisma.follow.create({
      data: { followerId: currentUser.id, followingId: targetUserId },
    });
    return NextResponse.json({ following: true });
  }
}
