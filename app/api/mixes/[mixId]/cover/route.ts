import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

interface Params { params: Promise<{ mixId: string }> }

export async function POST(req: Request, { params }: Params) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!user.isPremium) return NextResponse.json({ error: "Premium required" }, { status: 403 });

  const { mixId } = await params;
  const mix = await prisma.mix.findUnique({ where: { id: mixId }, include: { user: true } });
  if (!mix) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (mix.user.clerkId !== clerkId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const blob = await put(`mix-covers/${mixId}-${Date.now()}`, file, { access: "public" });

  await prisma.mix.update({ where: { id: mixId }, data: { coverUrl: blob.url } });

  return NextResponse.json({ url: blob.url });
}
