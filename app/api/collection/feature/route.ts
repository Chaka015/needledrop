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

  // If currently featured, unfeature it and renumber the rest
  if (item.isFeatured) {
    await prisma.collection.update({
      where: { id: collectionId },
      data: { isFeatured: false, featuredPosition: null },
    });

    const remaining = await prisma.collection.findMany({
      where: { userId: user.id, isFeatured: true },
      orderBy: { featuredPosition: "asc" },
    });
    await Promise.all(
      remaining.map((c, i) =>
        prisma.collection.update({ where: { id: c.id }, data: { featuredPosition: i } })
      )
    );

    return NextResponse.json({ isFeatured: false });
  }

  // Check how many are already featured (max 5)
  const featuredCount = await prisma.collection.count({
    where: { userId: user.id, isFeatured: true },
  });

  if (featuredCount >= 5) {
    return NextResponse.json({ error: "MAX_FEATURED" }, { status: 409 });
  }

  await prisma.collection.update({
    where: { id: collectionId },
    data: { isFeatured: true, featuredPosition: featuredCount },
  });

  return NextResponse.json({ isFeatured: true });
}
