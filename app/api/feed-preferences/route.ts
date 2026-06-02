import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export interface FeedPreferences {
  showListens: boolean;
  showAdds: boolean;
  showFollows: boolean;
  showMixes: boolean;
  showSpins: boolean;
}

export const DEFAULT_PREFS: FeedPreferences = {
  showListens: true,
  showAdds: true,
  showFollows: true,
  showMixes: true,
  showSpins: false,
};

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { feedPreferences: true },
  });

  const prefs = { ...DEFAULT_PREFS, ...(user?.feedPreferences as Partial<FeedPreferences> ?? {}) };
  return NextResponse.json({ prefs });
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const prefs: FeedPreferences = {
    showListens: body.showListens ?? true,
    showAdds: body.showAdds ?? true,
    showFollows: body.showFollows ?? true,
    showMixes: body.showMixes ?? true,
    showSpins: body.showSpins ?? false,
  };

  await prisma.user.update({
    where: { clerkId },
    data: { feedPreferences: prefs as object },
  });

  return NextResponse.json({ prefs });
}
