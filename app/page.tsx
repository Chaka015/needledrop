import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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

export default async function Home() {
  const { userId: clerkId } = await auth();

  let username: string | null = null;
  if (clerkId) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { username: true },
    });
    username = user?.username ?? null;
    if (username) {
      redirect(`/${username}`);
    }
  }

  // Community data for logged-out landing page
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [latestAdded, popularAlbums, featuredMixes] = await Promise.all([
    // Latest additions to any collection in last 7 days
    prisma.collection.findMany({
      where: { addedAt: { gte: sevenDaysAgo } },
      orderBy: { addedAt: "desc" },
      take: 8,
      include: { album: true, user: { select: { username: true } } },
      distinct: ["albumId"],
    }),
    // Most popular: albums with most collection adds in last 7 days
    prisma.collection.groupBy({
      by: ["albumId"],
      where: { addedAt: { gte: sevenDaysAgo } },
      _count: { albumId: true },
      orderBy: { _count: { albumId: "desc" } },
      take: 8,
    }),
    // Top mixes by item count
    prisma.mix.findMany({
      orderBy: { updatedAt: "desc" },
      take: 4,
      include: {
        user: { select: { username: true } },
        items: {
          take: 4,
          orderBy: { position: "asc" },
          include: { album: { select: { coverUrl: true } } },
        },
        _count: { select: { items: true } },
      },
    }),
  ]);

  // Resolve popular album details
  const popularAlbumIds = popularAlbums.map((p) => p.albumId);
  const popularAlbumDetails = await prisma.album.findMany({
    where: { id: { in: popularAlbumIds } },
  });
  const popularWithCount = popularAlbums.map((p) => ({
    album: popularAlbumDetails.find((a) => a.id === p.albumId)!,
    count: p._count.albumId,
  })).filter((p) => p.album);

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg, color: C.text }}>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 text-center md:text-left">
          <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: C.subtle }}>
            For record collectors
          </p>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-4" style={{ color: C.text }}>
            Needle<span style={{ color: C.accent }}>Drop</span>
          </h1>
          <p className="text-lg mb-2" style={{ color: C.muted }}>
            The social network for record collectors.
          </p>
          <p className="text-sm mb-8 max-w-md" style={{ color: C.subtle }}>
            Log what you&apos;re spinning, build your collection, discover what others are playing.
          </p>
          <SignInButton mode="modal">
            <button
              className="px-8 py-3 text-sm font-medium transition-colors duration-100"
              style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4 }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#CF711E")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.accent)}>
              Start collecting →
            </button>
          </SignInButton>
        </div>

        <div className="shrink-0">
          <Image
            src="/nd_splashpage.png"
            alt="NeedleDrop"
            width={260}
            height={260}
            priority
            className="opacity-90"
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-20 space-y-14">

        {/* Latest Additions */}
        {latestAdded.length > 0 && (
          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: C.subtle }}>
              Latest Additions — Last 7 Days
            </h2>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {latestAdded.map((c) => (
                <Link key={c.id} href={`/album/${c.album.discogsId}`} title={`${c.album.title} — ${c.album.artist}`}
                  className="group">
                  {c.album.coverUrl ? (
                    <Image src={c.album.coverUrl} alt={c.album.title} width={120} height={120}
                      className="object-cover aspect-square w-full transition-opacity duration-100 group-hover:opacity-80"
                      style={{ borderRadius: 4 }} unoptimized />
                  ) : (
                    <div className="aspect-square flex items-center justify-center text-xs font-mono"
                      style={{ backgroundColor: C.surface, borderRadius: 4, color: C.subtle, border: `1px solid ${C.border}` }}>
                      ?
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Most Popular */}
        {popularWithCount.length > 0 && (
          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: C.subtle }}>
              Most Popular — Last 7 Days
            </h2>
            <div className="space-y-1">
              {popularWithCount.map(({ album, count }, idx) => (
                <Link key={album.id} href={`/album/${album.discogsId}`}
                  className="flex items-center gap-4 p-3 transition-colors duration-100"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.surfaceRaised)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.surface)}>
                  <span className="text-xs font-mono w-5 text-right shrink-0" style={{ color: C.subtle }}>
                    {idx + 1}
                  </span>
                  {album.coverUrl ? (
                    <Image src={album.coverUrl} alt={album.title} width={40} height={40}
                      className="object-cover shrink-0" style={{ width: 40, height: 40, borderRadius: 4 }} unoptimized />
                  ) : (
                    <div className="shrink-0" style={{ width: 40, height: 40, backgroundColor: C.surfaceRaised, borderRadius: 4 }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: C.text }}>{album.title}</div>
                    <div className="text-xs font-mono truncate" style={{ color: C.muted }}>{album.artist}</div>
                  </div>
                  <span className="text-xs font-mono shrink-0" style={{ color: C.subtle }}>+{count}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured Mixes */}
        {featuredMixes.length > 0 && (
          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: C.subtle }}>
              Featured Mixes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {featuredMixes.map((mix) => (
                <Link key={mix.id} href={`/${mix.user.username}/mixes/${mix.id}`}
                  className="flex items-center gap-4 p-4 transition-colors duration-100"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.surfaceRaised)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.surface)}>
                  <div className="shrink-0 grid grid-cols-2 gap-0.5" style={{ width: 56, height: 56 }}>
                    {[0, 1, 2, 3].map((i) => {
                      const item = mix.items[i];
                      return item?.album.coverUrl ? (
                        <Image key={i} src={item.album.coverUrl} alt="" width={27} height={27}
                          className="object-cover" style={{ width: 27, height: 27 }} unoptimized />
                      ) : (
                        <div key={i} style={{ width: 27, height: 27, backgroundColor: C.surfaceRaised }} />
                      );
                    })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: C.text }}>{mix.title}</div>
                    <div className="text-xs font-mono" style={{ color: C.subtle }}>
                      {mix._count.items} RECORDS · {mix.user.username}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA strip */}
        <div className="py-10 text-center" style={{ borderTop: `1px solid ${C.border}` }}>
          <p className="text-sm mb-4" style={{ color: C.muted }}>
            Join the community. Start logging your collection.
          </p>
          <SignInButton mode="modal">
            <button
              className="px-8 py-3 text-sm font-medium transition-colors duration-100"
              style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4 }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#CF711E")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.accent)}>
              Sign up free →
            </button>
          </SignInButton>
        </div>
      </div>
    </div>
  );
}
