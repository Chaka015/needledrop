import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import AddToCollection from "@/components/AddToCollection";
import CollectionGrid from "@/components/CollectionGrid";
import AudioSetupEditor from "@/components/AudioSetupEditor";
import ImportDiscogs from "@/components/ImportDiscogs";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

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

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const { userId: clerkId } = await auth();

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      audioSetup: true,
      followers: true,
      following: true,
      logs: {
        orderBy: { playedAt: "desc" },
        take: 10,
        include: { album: true },
      },
      collection: {
        orderBy: { addedAt: "desc" },
        include: { album: true },
      },
      wantlist: true,
    },
  });

  if (!user) notFound();

  const totalListens = user.logs.length;
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const listensThisYear = user.logs.filter((l) => new Date(l.playedAt) >= startOfYear).length;
  const listensThisWeek = user.logs.filter((l) => new Date(l.playedAt) >= startOfWeek).length;

  const featured = user.collection.filter((c) => c.isFeatured).slice(0, 4);
  const latestAdded = user.collection.filter((c) => !c.isFeatured).slice(0, 4);

  const nowSpinningAlbum = user.nowSpinning
    ? await prisma.album.findUnique({ where: { id: user.nowSpinning } })
    : null;

  const isOwnProfile = clerkId
    ? (await prisma.user.findUnique({ where: { clerkId } }))?.id === user.id
    : false;

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg, color: C.text }}>

      {/* HEADER */}
      <div style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="shrink-0">
              {user.avatarUrl ? (
                <Image src={user.avatarUrl} alt={user.username} width={96} height={96}
                  className="object-cover"
                  style={{ width: 96, height: 96, borderRadius: "50%", border: `2px solid ${C.border}` }} />
              ) : (
                <div className="flex items-center justify-center text-3xl font-bold"
                  style={{ width: 96, height: 96, borderRadius: "50%", backgroundColor: C.surface, color: C.subtle, border: `2px solid ${C.border}` }}>
                  {user.username[0].toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.text }}>{user.username}</h1>
                {nowSpinningAlbum && (
                  <span className="flex items-center gap-2 text-xs font-mono px-3 py-1"
                    style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.accent, borderRadius: 4 }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: C.accent }} />
                    NOW SPINNING: {nowSpinningAlbum.artist} — {nowSpinningAlbum.title}
                  </span>
                )}
              </div>

              {user.bio && <p className="mt-2 text-sm max-w-xl" style={{ color: C.muted }}>{user.bio}</p>}

              <div className="mt-4 flex flex-wrap gap-6 text-sm font-mono" style={{ color: C.muted }}>
                {[
                  { value: totalListens, label: "TOTAL" },
                  { value: listensThisYear, label: "THIS YEAR" },
                  { value: listensThisWeek, label: "THIS WEEK" },
                  { value: user.following.length, label: "FOLLOWING" },
                  { value: user.followers.length, label: "FOLLOWERS" },
                ].map((s) => (
                  <div key={s.label}>
                    <span className="font-bold" style={{ color: C.text }}>{s.value}</span>{" "}
                    <span className="text-xs" style={{ color: C.subtle }}>{s.label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {[
                  { label: "COLLECTED", value: user.collection.length },
                  { label: "LOGGED", value: user.logs.length },
                  { label: "WANTLIST", value: user.wantlist.length },
                ].map((stat) => (
                  <div key={stat.label} className="px-5 py-3 text-center"
                    style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                    <div className="text-xl font-bold font-mono" style={{ color: C.text }}>{stat.value}</div>
                    <div className="text-xs font-mono mt-0.5" style={{ color: C.subtle }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN + SIDEBAR */}
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col lg:flex-row gap-10">

        {/* MAIN */}
        <div className="flex-1 min-w-0 space-y-12">

          {isOwnProfile && (
            <section>
              <SectionLabel>Add to Collection</SectionLabel>
              <div className="space-y-4">
                <ImportDiscogs />
                <AddToCollection />
              </div>
            </section>
          )}

          {isOwnProfile && (
            <section>
              <SectionLabel>My Collection</SectionLabel>
              <CollectionGrid
                items={user.collection.map((c) => ({
                  id: c.id,
                  isFeatured: c.isFeatured,
                  album: {
                    discogsId: c.album.discogsId,
                    title: c.album.title,
                    artist: c.album.artist,
                    releaseYear: c.album.releaseYear,
                    coverUrl: c.album.coverUrl,
                    label: c.album.label,
                    genre: c.album.genre,
                  },
                }))}
              />
            </section>
          )}

          {/* Latest Added */}
          <section>
            <SectionLabel>Latest Added</SectionLabel>
            {latestAdded.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {latestAdded.map((c) => <AlbumTile key={c.id} album={c.album} size="lg" />)}
              </div>
            ) : (
              <EmptyState text="Nothing added to collection yet." />
            )}
          </section>

          {/* Recent Listens */}
          <section>
            <SectionLabel>Recent Listens</SectionLabel>
            {user.logs.length > 0 ? (
              <div className="space-y-2">
                {user.logs.map((log) => (
                  <div key={log.id} className="flex gap-4 p-3 items-start"
                    style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                    <AlbumTile album={log.album} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: C.text }}>{log.album.title}</span>
                        <span className="text-xs font-mono" style={{ color: C.muted }}>{log.album.artist}</span>
                      </div>
                      {log.rating != null && <StarRating rating={log.rating} />}
                      {log.review && <p className="mt-1 text-sm line-clamp-2" style={{ color: C.muted }}>{log.review}</p>}
                      <div className="mt-1 flex gap-3 text-xs font-mono" style={{ color: C.subtle }}>
                        {log.format && <span>{log.format}</span>}
                        <span>{new Date(log.playedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="No listens logged yet." />
            )}
          </section>
        </div>

        {/* SIDEBAR */}
        <aside className="w-full lg:w-64 shrink-0 space-y-8">

          {/* Featured 2x2 */}
          <section>
            <SectionLabel>Featured</SectionLabel>
            {featured.length > 0 ? (
              <div className="grid grid-cols-2 gap-1">
                {featured.map((c) => (
                  <div key={c.id} style={{ aspectRatio: "1" }}>
                    <AlbumTile album={c.album} size="lg" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs font-mono"
                style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
                {isOwnProfile ? "★ star albums in your collection to feature them" : "No featured albums yet."}
              </div>
            )}
          </section>

          {/* The Setup */}
          <section>
            <SectionLabel>The Setup</SectionLabel>
            {isOwnProfile ? (
              <AudioSetupEditor initial={user.audioSetup} />
            ) : (
              <div className="p-5 space-y-4 text-sm" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                {user.audioSetup?.turntable && <SetupItem icon="💿" label="TURNTABLE" value={user.audioSetup.turntable} />}
                {user.audioSetup?.preamp && <SetupItem icon="🎚️" label="PRE-AMP" value={user.audioSetup.preamp} />}
                {user.audioSetup?.speakers && <SetupItem icon="🔊" label="SPEAKERS" value={user.audioSetup.speakers} />}
                {!user.audioSetup?.turntable && !user.audioSetup?.preamp && !user.audioSetup?.speakers && (
                  <p className="text-xs font-mono" style={{ color: C.subtle }}>No setup listed yet.</p>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: "#6B6560" }}>
      {children}
    </h2>
  );
}

function AlbumTile({ album, size }: { album: { title: string; artist: string; coverUrl: string | null }; size: "sm" | "lg" }) {
  const dim = size === "lg" ? 120 : 48;
  return album.coverUrl ? (
    <Image src={album.coverUrl} alt={`${album.title} by ${album.artist}`} width={dim} height={dim}
      className="object-cover aspect-square"
      style={{ width: size === "lg" ? "100%" : 48, height: size === "lg" ? "100%" : 48, borderRadius: 4, flexShrink: 0 }}
      unoptimized />
  ) : (
    <div className="flex items-center justify-center text-xs"
      style={{ width: size === "lg" ? "100%" : 48, height: size === "lg" ? "100%" : 48, aspectRatio: "1", backgroundColor: "#3D3834", borderRadius: 4, color: "#6B6560", flexShrink: 0 }}>
      No art
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <div className="flex gap-0.5 mt-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="text-xs"
          style={{ color: i < full ? "#E67E22" : i === full && half ? "#E67E2280" : "#524D48" }}>★</span>
      ))}
    </div>
  );
}

function SetupItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-mono mb-0.5" style={{ color: "#6B6560" }}>{icon} {label}</div>
      <div style={{ color: "#F7F1E3" }}>{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-8 text-center text-sm font-mono" style={{ border: `1px dashed #524D48`, color: "#6B6560" }}>
      {text}
    </div>
  );
}
