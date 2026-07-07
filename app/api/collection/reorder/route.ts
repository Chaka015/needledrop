import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST — reorder the fan's featured (Top 5) records
export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { collectionIds } = await req.json();
  if (!Array.isArray(collectionIds) || collectionIds.length === 0) {
    return NextResponse.json({ error: "Missing collectionIds" }, { status: 400 });
  }

  const items = await prisma.collection.findMany({
    where: { id: { in: collectionIds }, userId: user.id, isFeatured: true },
  });

  if (items.length !== collectionIds.length) {
    return NextResponse.json({ error: "Invalid collectionIds" }, { status: 400 });
  }

  await Promise.all(
    collectionIds.map((id: string, i: number) =>
      prisma.collection.update({ where: { id }, data: { featuredPosition: i } })
    )
  );

  return NextResponse.json({ ok: true });
}
