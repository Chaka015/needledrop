import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/mixes?username=xxx — fetch user's mixes
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");
  if (!username) return NextResponse.json({ error: "Missing username" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const mixes = await prisma.mix.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      items: {
        orderBy: { position: "asc" },
        take: 4,
        include: { album: { select: { coverUrl: true, title: true, artist: true } } },
      },
      _count: { select: { items: true } },
    },
  });

  return NextResponse.json({ mixes });
}

// POST /api/mixes — create a mix
export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { title, description } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const mix = await prisma.mix.create({
    data: { userId: user.id, title: title.trim(), description: description?.trim() ?? null },
  });

  return NextResponse.json({ mix });
}
