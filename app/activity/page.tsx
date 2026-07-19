import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ActivityFeed from "@/components/ActivityFeed";
import Image from "next/image";
import Link from "next/link";
import type { FeedItem } from "@/components/ActivityFeed";

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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [logs, adds, follows, mixes, spins, joins] = await Promise.all([
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
      // Joins only for community (global) stream, last 30 days, completed onboarding
      userIds === null
        ? prisma.user.findMany({
            where: {
              createdAt: { gte: thirtyDaysAgo },
              NOT: { username: { startsWith: "user_" } },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          })
        : Promise.resolve([] as Awaited<ReturnType<typeof prisma.user.findMany>>),
    ]);

    const items: FeedItem[] = [
      ...logs.map((l): FeedItem => ({
        type: "listen",
        id: l.id,
        timestamp: l.playedAt.toISOString(),
        user: { username: l.user.username, avatarUrl: l.user.avatarUrl },
        album: { title: l.album.title, artist: l.album.artist, artistMbid: l.album.artistMbid, coverUrl: l.album.coverUrl, discogsId: l.album.discogsId },
        rating: l.rating,
        review: l.review,
        format: l.format,
        source: l.source,
        autoImported: l.autoImported,
        spinCount: l.spins.length,
        userHasSpun: currentUser ? l.spins.some((s) => s.userId === currentUser.id) : false,
      })),
      ...adds.map((a): FeedItem => ({
        type: "add",
        id: a.id,
        timestamp: a.addedAt.toISOString(),
        user: { username: a.user.username, avatarUrl: a.user.avatarUrl },
        album: { title: a.album.title, artist: a.album.artist, artistMbid: a.album.artistMbid, coverUrl: a.album.coverUrl, discogsId: a.album.discogsId },
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
        album: { title: s.log.album.title, artist: s.log.album.artist, artistMbid: s.log.album.artistMbid, coverUrl: s.log.album.coverUrl, discogsId: s.log.album.discogsId },
        logId: s.logId,
      })),
      ...joins.map((u): FeedItem => ({
        type: "join",
        id: u.id,
        timestamp: u.createdAt.toISOString(),
        user: { id: u.id, username: u.username, avatarUrl: u.avatarUrl },
        initialIsFollowing: currentUser ? followingIds.includes(u.id) : false,
      })),
    ];

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 60);
  }

  // Popular this week (top albums by listen count last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const popularAlbums = await prisma.album.findMany({
    where: { logs: { some: { playedAt: { gte: sevenDaysAgo } } } },
    include: { _count: { select: { logs: true } } },
    orderBy: { logs: { _count: "desc" } },
    take: 5,
  });

  // User's wantlist for rail
  const wantlist = await prisma.wantlist.findMany({
    where: { userId: currentUser.id },
    take: 5,
    include: { album: true },
  });

  const [friendItems, globalItems] = await Promise.all([
    followingIds.length > 0 ? fetchStream(followingIds) : Promise.resolve([] as FeedItem[]),
    fetchStream(null),
  ]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--skin-bg)", color: "var(--skin-text)" }}>
      <div className="ms-page">
        <h1 className="ms-h1">What&apos;s spinning</h1>

        <div className="ms-cols feed">
          {/* MAIN FEED */}
          <div>
            <ActivityFeed friendItems={friendItems} globalItems={globalItems} />
          </div>

          {/* RIGHT RAIL */}
          <aside className="ms-stack">

            {/* ON AIR NOW */}
            {liveListenersWithAlbum.length > 0 && (
              <div className="ms-box">
                <div className="ms-bar hot">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <span className="ms-onair"><span className="d" /></span> ON AIR NOW
                  </span>
                </div>
                {liveListenersWithAlbum.map(({ user, album }) => (
                  <Link key={user.id} href={`/${user.username}`} className="ms-rail-row" style={{ textDecoration: "none" }}>
                    {user.avatarUrl ? (
                      <Image src={user.avatarUrl} alt={user.username} width={36} height={36}
                        className="object-cover" style={{ width: 36, height: 36, borderRadius: "50%", border: "1.5px solid var(--skin-border)", flexShrink: 0 }} unoptimized />
                    ) : (
                      <div className="ms-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>{user.username[0].toUpperCase()}</div>
                    )}
                    <div>
                      <div className="nm">{user.username}</div>
                      <div className="sub">{album ? `${album.artist} — ${album.title}` : "spinning now"}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Popular this week */}
            {popularAlbums.length > 0 && (
              <div className="ms-box">
                <div className="ms-bar">Hot Right Now</div>
                {popularAlbums.map((a, i) => (
                  <div key={a.id} className="ms-rail-row">
                    <span className="rk">{String(i + 1).padStart(2, "0")}</span>
                    <Link href={`/album/${encodeURIComponent(a.discogsId)}`} style={{ flexShrink: 0 }}>
                      {a.coverUrl ? (
                        <Image src={a.coverUrl} alt={a.title} width={40} height={40}
                          className="object-cover" style={{ width: 40, height: 40, borderRadius: 4, border: "1.5px solid var(--skin-border)" }} unoptimized />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 4, background: "var(--skin-surface-raised)" }} />
                      )}
                    </Link>
                    <div>
                      <Link href={`/album/${encodeURIComponent(a.discogsId)}`} className="nm" style={{ display: "block", textDecoration: "none" }}>{a.title}</Link>
                      {a.artistMbid ? (
                        <Link href={`/artist/${a.artistMbid}`} className="sub" style={{ display: "block", textDecoration: "none" }}>{a.artist}</Link>
                      ) : (
                        <div className="sub">{a.artist}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Wantlist */}
            {wantlist.length > 0 && (
              <div className="ms-box">
                <div className="ms-bar">On your wantlist</div>
                {wantlist.map((w) => (
                  <div key={w.id} className="ms-rail-row">
                    <Link href={`/album/${encodeURIComponent(w.album.discogsId)}`} style={{ flexShrink: 0 }}>
                      {w.album.coverUrl ? (
                        <Image src={w.album.coverUrl} alt={w.album.title} width={40} height={40}
                          className="object-cover" style={{ width: 40, height: 40, borderRadius: 4, border: "1.5px solid var(--skin-border)" }} unoptimized />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 4, background: "var(--skin-surface-raised)" }} />
                      )}
                    </Link>
                    <div>
                      <Link href={`/album/${encodeURIComponent(w.album.discogsId)}`} className="nm" style={{ display: "block", textDecoration: "none" }}>{w.album.title}</Link>
                      {w.album.artistMbid ? (
                        <Link href={`/artist/${w.album.artistMbid}`} className="sub" style={{ display: "block", textDecoration: "none" }}>{w.album.artist}</Link>
                      ) : (
                        <div className="sub">{w.album.artist}</div>
                      )}
                    </div>
                  </div>
                ))}
                <div className="ms-pad">
                  <Link href={`/${currentUser.username}/wantlist`} className="ms-btn sm" style={{ display: "block", textAlign: "center", textDecoration: "none", width: "100%" }}>
                    View full wantlist
                  </Link>
                </div>
              </div>
            )}

          </aside>
        </div>
      </div>
    </div>
  );
}
