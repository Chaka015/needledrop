import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await req.json();

  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  if (username.length < 3 || username.length > 30) {
    return NextResponse.json(
      { error: "Username must be 3–30 characters." },
      { status: 400 }
    );
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return NextResponse.json(
      { error: "Only letters, numbers, and underscores allowed." },
      { status: 400 }
    );
  }

  // Check availability
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json(
      { error: "That username is already taken." },
      { status: 409 }
    );
  }

  await prisma.user.update({
    where: { clerkId },
    data: { username },
  });

  return NextResponse.json({ username });
}
