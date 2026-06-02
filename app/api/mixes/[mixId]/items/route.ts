import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface Params { params: Promise<{ mixId: string }> }

// POST — add a collection album to the mix
export async function POST(req: Request, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mixId } = await params;
  const mix = await prisma.mix.findUnique({ where: { id: mixId }, include: { user: true, _count: { select: { items: true } } } });
  if (!mix) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (mix.user.clerkId !== clerkId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (mix._count.items >= 50) return NextResponse.json({ error: "Mix is full (50 albums max)" }, { status: 400 });

  const { collectionItemId } = await req.json();
  const collItem = await prisma.collection.findUnique({
    where: { id: collectionItemId },
    include: { album: true },
  });
  if (!collItem) return NextResponse.json({ error: "Collection item not found" }, { status: 404 });

  const position = mix._count.items + 1;

  const item = await prisma.mixItem.create({
    data: { mixId, albumId: collItem.albumId, position },
    include: { album: true },
  });

  return NextResponse.json({ item });
}

// DELETE — remove an item by albumId
export async function DELETE(req: Request, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mixId } = await params;
  const mix = await prisma.mix.findUnique({ where: { id: mixId }, include: { user: true } });
  if (!mix) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (mix.user.clerkId !== clerkId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { albumId } = await req.json();
  await prisma.mixItem.deleteMany({ where: { mixId, albumId } });

  // Renumber positions
  const remaining = await prisma.mixItem.findMany({ where: { mixId }, orderBy: { position: "asc" } });
  for (let i = 0; i < remaining.length; i++) {
    await prisma.mixItem.update({ where: { id: remaining[i].id }, data: { position: i + 1 } });
  }

  return NextResponse.json({ ok: true });
}
