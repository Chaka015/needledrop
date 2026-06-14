import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface Params { params: Promise<{ albumId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { albumId } = await params;
  const body = await req.json();

  if (!Array.isArray(body.genres)) {
    return NextResponse.json({ error: "genres must be an array" }, { status: 400 });
  }

  const genres: string[] = body.genres
    .map((g: unknown) => (typeof g === "string" ? g.trim() : ""))
    .filter((g: string) => g.length > 0);

  await prisma.album.update({ where: { id: albumId }, data: { genres } });
  return NextResponse.json({ ok: true, genres });
}
