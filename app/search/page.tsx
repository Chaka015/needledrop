import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import SearchPage from "@/components/SearchPage";

interface Props {
  searchParams: Promise<{ q?: string; tab?: string }>;
}

export default async function Search({ searchParams }: Props) {
  const { q, tab } = await searchParams;
  const { userId: clerkId } = await auth();

  const currentUser = clerkId
    ? await prisma.user.findUnique({
        where: { clerkId },
        include: { following: true },
      })
    : null;

  // Search users
  const users = q
    ? await prisma.user.findMany({
        where: {
          username: { contains: q, mode: "insensitive" },
          NOT: currentUser ? { id: currentUser.id } : undefined,
        },
        include: {
          followers: true,
          collection: { select: { id: true } },
          logs: { select: { id: true } },
        },
        take: 50,
      })
    : [];

  // Search albums in our DB
  const albums = q
    ? await prisma.album.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { artist: { contains: q, mode: "insensitive" } },
          ],
        },
        include: {
          logs: { select: { id: true } },
          collection: { select: { id: true } },
        },
        take: 50,
      })
    : [];

  const formattedUsers = users.map((u) => ({
    id: u.id,
    username: u.username,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    followerCount: u.followers.length,
    collectionCount: u.collection.length,
    logCount: u.logs.length,
    isFollowing: currentUser
      ? currentUser.following.some((f) => f.followingId === u.id)
      : false,
  }));

  const formattedAlbums = albums.map((a) => ({
    id: a.id,
    discogsId: a.discogsId,
    title: a.title,
    artist: a.artist,
    artistMbid: a.artistMbid,
    releaseYear: a.releaseYear,
    coverUrl: a.coverUrl,
    label: a.label,
    genre: a.genre,
    logCount: a.logs.length,
    collectionCount: a.collection.length,
  }));

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
        <SearchPage
          query={q ?? ""}
          initialTab={((tab === "fans" ? "fans" : "albums") as "fans" | "albums")}
          users={formattedUsers}
          albums={formattedAlbums}
          isLoggedIn={!!currentUser}
          discogsToken={process.env.DISCOGS_TOKEN ?? ""}
        />
    </div>
  );
}
