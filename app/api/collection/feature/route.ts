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

  const { collectionId } = await req.json();
  if (!collectionId) {
    return NextResponse.json({ error: "Missing collectionId" }, { status: 400 });
  }

  // Verify ownership
  const item = await prisma.collection.findUnique({ where: { id: collectionId } });
  if (!item || item.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If currently featured, just unfeature it
  if (item.isFeatured) {
    await prisma.collection.update({
      where: { id: collectionId },
      data: { isFeatured: false },
    });
    return NextResponse.json({ isFeatured: false });
  }

  // Check how many are already featured (max 4)
  const featuredCount = await prisma.collection.count({
    where: { userId: user.id, isFeatured: true },
  });

  if (featuredCount >= 4) {
    return NextResponse.json({ error: "MAX_FEATURED" }, { status: 409 });
  }

  await prisma.collection.update({
    where: { id: collectionId },
    data: { isFeatured: true },
  });

  return NextResponse.json({ isFeatured: true });
}
