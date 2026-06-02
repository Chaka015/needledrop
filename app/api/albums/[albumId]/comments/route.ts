import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface Params { params: Promise<{ albumId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { albumId } = await params;
  const comments = await prisma.albumComment.findMany({
    where: { albumId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { username: true, avatarUrl: true } } },
  });
  return NextResponse.json({ comments });
}

export async function POST(req: Request, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { albumId } = await params;
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { content, parentId } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Empty comment" }, { status: 400 });

  const comment = await prisma.albumComment.create({
    data: {
      userId: user.id,
      albumId,
      content: content.trim(),
      ...(parentId ? { parentId } : {}),
    },
    include: { user: { select: { username: true, avatarUrl: true } } },
  });

  return NextResponse.json({ comment });
}
