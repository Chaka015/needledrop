import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ActivityFeed from "@/components/ActivityFeed";
import Image from "next/image";
import Link from "next/link";
import type { FeedItem } from "@/components/ActivityFeed";

const C = {
  bg: "#2D2926",
  surface: "#3D3834",
  surfaceRaised: "#4A4540",
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
  const LIMIT = 40;

  // Live listeners
  const liveListeners = await prisma.user.findMany({
    where: { nowSpinning: { not: null } },
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

  // Fetch all event types for both friend + global streams
  async function fetchStream(userIds: string[] | null): Promise<FeedItem[]> {
    const filter = userIds ? { userId: { in: userIds } } : {};
    const followerFilter = userIds ? { followerId: { in: userIds } } : {};

    const [logs, adds, follows, mixes, spins] = await Promise.all([
      prisma.listeningLog.findMany({
        where: filter,
        orderBy: { playedAt: "desc" },
        take: LIMIT,
        include: { user: true, album: true, spins: true },
      }),
      prisma.collection.findMany({
        where: filter,
        orderBy: { addedAt: "desc" },
        take: LIMIT,
        include: { user: true, album: true },
      }),
      prisma.follow.findMany({
        where: followerFilter,
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        include: {
          follower: { select: { id: true, username: true, avatarUrl: true } },
          following: { select: { id: true, username: true, avatarUrl: true } },
        },
      }),
      prisma.mix.findMany({
        where: userIds ? { userId: { in: userIds } } : {},
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        include: { user: true, _count: { select: { items: true } } },
      }),
      prisma.spin.findMany({
        where: userIds ? { userId: { in: userIds } } : {},
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        include: {
          user: true,
          log: { include: { album: true } },
        },
      }),
    ]);

    const items: FeedItem[] = [
      ...logs.map((l): FeedItem => ({
        type: "listen",
        id: l.id,
        timestamp: l.playedAt.toISOString(),
        user: { username: l.user.username, avatarUrl: l.user.avatarUrl },
        album: { title: l.album.title, artist: l.album.artist, coverUrl: l.album.coverUrl, discogsId: l.album.discogsId },
        rating: l.rating,
        review: l.review,
        format: l.format,
        source: l.source,
        spinCount: l.spins.length,
        userHasSpun: currentUser ? l.spins.some((s) => s.userId === currentUser.id) : false,
      })),
      ...adds.map((a): FeedItem => ({
        type: "add",
        id: a.id,
        timestamp: a.addedAt.toISOString(),
        user: { username: a.user.username, avatarUrl: a.user.avatarUrl },
        album: { title: a.album.title, artist: a.album.artist, coverUrl: a.album.coverUrl, discogsId: a.album.discogsId },
      })),
      ...follows.map((f): FeedItem => ({
        type: "follow",
        id: f.id,
        timestamp: f.createdAt.toISOString(),
        follower: { username: f.follower.username, avatarUrl: f.follower.avatarUrl },
        following: { username: f.following.username, avatarUrl: f.following.avatarUrl },
      })),
      ...mixes.map((m): FeedItem => ({
        type: "mix",
        id: m.id,
        timestamp: m.createdAt.toISOString(),
        user: { username: m.user.username, avatarUrl: m.user.avatarUrl },
        mix: { id: m.id, title: m.title, itemCount: m._count.items },
      })),
      ...spins.map((s): FeedItem => ({
        type: "spin",
        id: s.id,
        timestamp: s.createdAt.toISOString(),
        user: { username: s.user.username, avatarUrl: s.user.avatarUrl },
        album: { title: s.log.album.title, artist: s.log.album.artist, coverUrl: s.log.album.coverUrl, discogsId: s.log.album.discogsId },
        logId: s.logId,
      })),
    ];

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 60);
  }

  const [friendItems, globalItems] = await Promise.all([
    followingIds.length > 0 ? fetchStream(followingIds) : Promise.resolve([] as FeedItem[]),
    fetchStream(null),
  ]);

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Live Listeners */}
        {liveListenersWithAlbum.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: C.subtle }}>
              Live Now
            </h2>
            <div className="flex flex-wrap gap-3">
              {liveListenersWithAlbum.map(({ user, album }) => (
                <Link key={user.id} href={`/${user.username}`}
                  className="flex items-center gap-2 px-3 py-2 transition-colors duration-100"
                  style={{ backgroundColor: "#0D0D0D", border: "1px solid #333", borderRadius: 4 }}>
                  {user.avatarUrl ? (
                    <Image src={user.avatarUrl} alt={user.username} width={24} height={24}
                      className="object-cover"
                      style={{ width: 24, height: 24, borderRadius: "50%" }} unoptimized />
                  ) : (
                    <div className="flex items-center justify-center text-xs font-bold"
                      style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: C.surfaceRaised, color: C.subtle }}>
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
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse ml-1" style={{ backgroundColor: "#FF3E3E" }} />
                </Link>
              ))}
            </div>
          </section>
        )}

        <h1 className="text-xs font-mono uppercase tracking-widest mb-6" style={{ color: C.subtle }}>
          Social Feed
        </h1>
        <ActivityFeed friendItems={friendItems} globalItems={globalItems} />
      </div>
    </div>
  );
}
