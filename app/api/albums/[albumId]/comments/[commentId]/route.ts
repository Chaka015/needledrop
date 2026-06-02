import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface Params { params: Promise<{ albumId: string; commentId: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await params;
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const comment = await prisma.albumComment.findUnique({ where: { id: commentId } });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.albumComment.update({
    where: { id: commentId },
    data: { deleted: true },
  });

  return NextResponse.json({ ok: true });
}
