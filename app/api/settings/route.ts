import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { avatarUrl, bio, skin } = await req.json();

  await prisma.user.update({
    where: { clerkId },
    data: {
      avatarUrl: avatarUrl ?? null,
      bio: bio ?? null,
      skin: skin ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
