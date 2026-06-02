import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import SearchResults from "@/components/SearchResults";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const { userId: clerkId } = await auth();

  const currentUser = clerkId
    ? await prisma.user.findUnique({ where: { clerkId } })
    : null;

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
        take: 20,
      })
    : [];

  const results = users.map((u) => ({
    id: u.id,
    username: u.username,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    followerCount: u.followers.length,
    collectionCount: u.collection.length,
    logCount: u.logs.length,
    isFollowing: currentUser
      ? u.followers.some((f) => f.followerId === currentUser.id)
      : false,
  }));

  const C = {
    bg: "#2D2926",
    text: "#F7F1E3",
    subtle: "#6B6560",
  };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-xs font-mono uppercase tracking-widest mb-6" style={{ color: C.subtle }}>
          {q ? `Search results for "${q}"` : "Search for users"}
        </h1>
        <SearchResults results={results} isLoggedIn={!!currentUser} />
      </div>
    </div>
  );
}
