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

  const { logId } = await req.json();
  if (!logId) {
    return NextResponse.json({ error: "Missing logId" }, { status: 400 });
  }

  const existing = await prisma.spin.findUnique({
    where: { userId_logId: { userId: user.id, logId } },
  });

  if (existing) {
    await prisma.spin.delete({ where: { id: existing.id } });
    return NextResponse.json({ spun: false });
  } else {
    await prisma.spin.create({ data: { userId: user.id, logId } });
    return NextResponse.json({ spun: true });
  }
}
