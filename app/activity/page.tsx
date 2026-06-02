import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ActivityFeed from "@/components/ActivityFeed";

export default async function ActivityPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/");

  const currentUser = await prisma.user.findUnique({
    where: { clerkId },
    include: { following: true },
  });

  if (!currentUser) redirect("/");

  const followingIds = currentUser.following.map((f) => f.followingId);

  const followingLogs = followingIds.length > 0
    ? await prisma.listeningLog.findMany({
        where: { userId: { in: followingIds } },
        orderBy: { playedAt: "desc" },
        take: 50,
        include: { user: true, album: true, spins: true },
      })
    : [];

  const everyoneLogs = await prisma.listeningLog.findMany({
    orderBy: { playedAt: "desc" },
    take: 50,
    include: { user: true, album: true, spins: true },
  });

  function formatLogs(logs: typeof everyoneLogs) {
    return logs.map((log) => ({
      id: log.id,
      playedAt: log.playedAt.toISOString(),
      rating: log.rating,
      review: log.review,
      format: log.format,
      spinCount: log.spins.length,
      userHasSpun: currentUser ? log.spins.some((s) => s.userId === currentUser.id) : false,
      user: { username: log.user.username, avatarUrl: log.user.avatarUrl },
      album: { title: log.album.title, artist: log.album.artist, coverUrl: log.album.coverUrl },
    }));
  }

  const C = { bg: "#2D2926", text: "#F7F1E3", subtle: "#6B6560" };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-xs font-mono uppercase tracking-widest mb-6" style={{ color: C.subtle }}>
          Social Feed
        </h1>
        <ActivityFeed
          followingLogs={formatLogs(followingLogs)}
          everyoneLogs={formatLogs(everyoneLogs)}
        />
      </div>
    </div>
  );
}
