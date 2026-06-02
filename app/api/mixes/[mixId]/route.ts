import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface Params { params: Promise<{ mixId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { mixId } = await params;

  const mix = await prisma.mix.findUnique({
    where: { id: mixId },
    include: {
      user: { select: { username: true, avatarUrl: true } },
      items: {
        orderBy: { position: "asc" },
        include: { album: true },
      },
    },
  });

  if (!mix) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ mix });
}

export async function PATCH(req: Request, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mixId } = await params;
  const mix = await prisma.mix.findUnique({ where: { id: mixId }, include: { user: true } });
  if (!mix) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (mix.user.clerkId !== clerkId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { title, description, coverUrl, isPublic } = await req.json();
  const updated = await prisma.mix.update({
    where: { id: mixId },
    data: {
      title: title?.trim() ?? mix.title,
      description: description !== undefined ? (description?.trim() ?? null) : mix.description,
      coverUrl: coverUrl !== undefined ? coverUrl : mix.coverUrl,
      isPublic: isPublic !== undefined ? Boolean(isPublic) : mix.isPublic,
    },
  });

  return NextResponse.json({ mix: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mixId } = await params;
  const mix = await prisma.mix.findUnique({ where: { id: mixId }, include: { user: true } });
  if (!mix) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (mix.user.clerkId !== clerkId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.mix.delete({ where: { id: mixId } });
  return NextResponse.json({ ok: true });
}
