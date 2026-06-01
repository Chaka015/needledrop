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

  const { turntable, preamp, speakers } = await req.json();

  await prisma.audioSetup.upsert({
    where: { userId: user.id },
    update: { turntable, preamp, speakers },
    create: { userId: user.id, turntable, preamp, speakers },
  });

  return NextResponse.json({ ok: true });
}
