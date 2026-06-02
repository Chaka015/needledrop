import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { albumId, source } = await req.json();

  await prisma.user.update({
    where: { clerkId },
    data: {
      nowSpinning: albumId ?? null,
      nowSpinningSource: albumId ? (source === "streaming" ? "streaming" : "physical") : null,
    },
  });

  return NextResponse.json({ ok: true });
}
