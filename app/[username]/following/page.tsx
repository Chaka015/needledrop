import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import FollowList from "@/components/FollowList";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function FollowersPage({ params }: Props) {
  const { username } = await params;
  const { userId: clerkId } = await auth();

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      followers: {
        include: { follower: { include: { followers: true, collection: { select: { id: true } }, logs: { select: { id: true } } } } },
      },
    },
  });

  if (!user) notFound();

  const currentUser = clerkId
    ? await prisma.user.findUnique({ where: { clerkId }, include: { following: true } })
    : null;

  const people = user.followers.map((f) => ({
    id: f.follower.id,
    username: f.follower.username,
    avatarUrl: f.follower.avatarUrl,
    bio: f.follower.bio,
    followerCount: f.follower.followers.length,
    collectionCount: f.follower.collection.length,
    logCount: f.follower.logs.length,
    isFollowing: currentUser
      ? currentUser.following.some((ff) => ff.followingId === f.follower.id)
      : false,
  }));

  const C = { bg: "#2D2926", text: "#F7F1E3", subtle: "#6B6560" };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-xs font-mono uppercase tracking-widest mb-6" style={{ color: C.subtle }}>
          {username} — Followers
        </h1>
        <FollowList people={people} isLoggedIn={!!currentUser} />
      </div>
    </div>
  );
}
