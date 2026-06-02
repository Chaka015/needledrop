import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { setlistFmId, artistMbid, venueName, venueCity, showDate } = await req.json();
  if (!setlistFmId) return NextResponse.json({ error: "Missing setlistFmId" }, { status: 400 });

  await prisma.showAttendance.upsert({
    where: { userId_setlistFmId: { userId: user.id, setlistFmId } },
    update: {},
    create: {
      userId: user.id,
      setlistFmId,
      artistMbid: artistMbid ?? "",
      venueName: venueName ?? "",
      venueCity: venueCity ?? "",
      showDate: showDate ? new Date(showDate) : new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { setlistFmId } = await req.json();
  await prisma.showAttendance.deleteMany({ where: { userId: user.id, setlistFmId } });

  return NextResponse.json({ ok: true });
}
