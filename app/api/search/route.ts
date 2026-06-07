import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { searchArtists } from "@/lib/musicbrainz";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) return NextResponse.json({ albums: [], fans: [], artists: [] });

  const { userId: clerkId } = await auth();
  const currentUser = clerkId
    ? await prisma.user.findUnique({
        where: { clerkId },
        select: { id: true, following: { select: { followingId: true } } },
      })
    : null;

  const [albums, fans, artists] = await Promise.all([
    prisma.album.findMany({
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
      take: 15,
      orderBy: { logs: { _count: "desc" } },
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { bio: { contains: q, mode: "insensitive" } },
        ],
        NOT: currentUser ? { id: currentUser.id } : undefined,
      },
      include: {
        followers: { select: { id: true } },
        collection: { select: { id: true } },
        logs: { select: { id: true } },
      },
      take: 15,
    }),
    searchArtists(q),
  ]);

  return NextResponse.json({
    albums: albums.map((a) => ({
      id: a.id,
      discogsId: a.discogsId,
      title: a.title,
      artist: a.artist,
      releaseYear: a.releaseYear,
      coverUrl: a.coverUrl,
      label: a.label,
      genre: a.genre,
      logCount: a.logs.length,
      collectionCount: a.collection.length,
    })),
    fans: fans.map((u) => ({
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
    })),
    artists: artists.map((a) => ({
      mbid: a.id,
      name: a.name,
      disambiguation: a.disambiguation,
      type: a.type,
      area: a.area?.name,
      beginYear: a["life-span"]?.begin?.slice(0, 4),
      ended: a["life-span"]?.ended ?? false,
    })),
  });
}
