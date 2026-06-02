import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { wantlistId } = await req.json();
  const item = await prisma.wantlist.findUnique({ where: { id: wantlistId } });
  if (!item || item.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.wantlist.delete({ where: { id: wantlistId } });
  return NextResponse.json({ ok: true });
}
