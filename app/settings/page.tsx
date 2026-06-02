import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SettingsClient from "@/components/SettingsClient";

export default async function SettingsPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/");

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { username: true, avatarUrl: true, bio: true, skin: true, spotifyId: true },
  });

  if (!user) redirect("/");

  return <SettingsClient user={user} />;
}
