import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ActivityFeed from "@/components/ActivityFeed";
import Image from "next/image";
import Link from "next/link";

const C = {
  bg: "#2D2926",
  surface: "#3D3834",
  border: "#524D48",
  text: "#F7F1E3",
  muted: "#A89F94",
  subtle: "#6B6560",
  accent: "#E67E22",
};

export default async function ActivityPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/");

  const currentUser = await prisma.user.findUnique({
    where: { clerkId },
    include: { following: true },
  });

  if (!currentUser) redirect("/");

  const followingIds = currentUser.following.map((f) => f.followingId);

  // Live listeners - users with nowSpinning set
  const liveListeners = await prisma.user.findMany({
    where: { nowSpinning: { not: null } },
    include: { collection: { include: { album: true } } },
    take: 10,
  });

  const liveListenersWithAlbum = await Promise.all(
    liveListeners.map(async (u) => {
      const album = u.nowSpinning
        ? await prisma.album.findUnique({ where: { id: u.nowSpinning } })
        : null;
      return { user: u, album };
    })
  );

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

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Live Listeners */}
        {liveListenersWithAlbum.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: C.subtle }}>
              🔴 Live Now
            </h2>
            <div className="flex flex-wrap gap-3">
              {liveListenersWithAlbum.map(({ user, album }) => (
                <Link key={user.id} href={`/${user.username}`}
                  className="flex items-center gap-2 px-3 py-2 transition-colors duration-100"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 4 }}>
                  {user.avatarUrl ? (
                    <Image src={user.avatarUrl} alt={user.username} width={24} height={24}
                      className="object-cover"
                      style={{ width: 24, height: 24, borderRadius: "50%" }} unoptimized />
                  ) : (
                    <div className="flex items-center justify-center text-xs font-bold"
                      style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: "#4A4540", color: C.subtle }}>
                      {user.username[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold" style={{ color: C.text }}>{user.username}</div>
                    {album && (
                      <div className="text-xs font-mono truncate max-w-32" style={{ color: C.muted }}>
                        {album.artist} — {album.title}
                      </div>
                    )}
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse ml-1" style={{ backgroundColor: C.accent }} />
                </Link>
              ))}
            </div>
          </section>
        )}

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
