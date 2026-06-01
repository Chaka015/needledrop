import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import AddToCollection from "@/components/AddToCollection";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

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

  // Stats
  const totalListens = user.logs.length;
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const listensThisYear = user.logs.filter(
    (l) => new Date(l.playedAt) >= startOfYear
  ).length;
  const listensThisWeek = user.logs.filter(
    (l) => new Date(l.playedAt) >= startOfWeek
  ).length;

  const featured = user.collection.filter((c) => c.isFeatured).slice(0, 4);
  const latestAdded = user.collection.filter((c) => !c.isFeatured).slice(0, 4);

  const nowSpinningAlbum = user.nowSpinning
    ? await prisma.album.findUnique({ where: { id: user.nowSpinning } })
    : null;

  const isOwnProfile = clerkId
    ? (await prisma.user.findUnique({ where: { clerkId } }))?.id === user.id
    : false;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* ── HEADER ── */}
      <div className="border-b border-zinc-800 px-6 py-10 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="shrink-0">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.username}
                width={96}
                height={96}
                className="rounded-full object-cover w-24 h-24 ring-2 ring-zinc-700"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center text-3xl font-bold text-zinc-500 ring-2 ring-zinc-700">
                {user.username[0].toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{user.username}</h1>
              {nowSpinningAlbum && (
                <span className="flex items-center gap-2 text-xs bg-zinc-800 border border-zinc-700 rounded-full px-3 py-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Now spinning: {nowSpinningAlbum.artist} — {nowSpinningAlbum.title}
                </span>
              )}
            </div>

            {user.bio && (
              <p className="mt-2 text-zinc-400 text-sm max-w-xl">{user.bio}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-6 text-sm text-zinc-400">
              <div><span className="text-zinc-100 font-semibold">{totalListens}</span> total listens</div>
              <div><span className="text-zinc-100 font-semibold">{listensThisYear}</span> this year</div>
              <div><span className="text-zinc-100 font-semibold">{listensThisWeek}</span> this week</div>
              <div><span className="text-zinc-100 font-semibold">{user.following.length}</span> following</div>
              <div><span className="text-zinc-100 font-semibold">{user.followers.length}</span> followers</div>
            </div>

            <div className="mt-5 flex flex-wrap gap-4">
              {[
                { label: "Collected", value: user.collection.length },
                { label: "Logged", value: user.logs.length },
                { label: "Wantlist", value: user.wantlist.length },
              ].map((stat) => (
                <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-lg px-5 py-3 text-center">
                  <div className="text-xl font-bold">{stat.value}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN + SIDEBAR ── */}
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col lg:flex-row gap-10">
        <div className="flex-1 min-w-0 space-y-12">

          {/* Add to Collection (own profile only) */}
          {isOwnProfile && (
            <section>
              <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-4">
                Add to Collection
              </h2>
              <AddToCollection />
            </section>
          )}

          <section>
            <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-4">Featured</h2>
            {featured.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {featured.map((c) => <AlbumTile key={c.id} album={c.album} size="lg" />)}
              </div>
            ) : (
              <EmptyState text="No featured albums yet." />
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-4">Latest Added</h2>
            {latestAdded.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {latestAdded.map((c) => <AlbumTile key={c.id} album={c.album} size="lg" />)}
              </div>
            ) : (
              <EmptyState text="Nothing added to collection yet." />
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-4">Recent Listens</h2>
            {user.logs.length > 0 ? (
              <div className="space-y-3">
                {user.logs.map((log) => (
                  <div key={log.id} className="flex gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 items-start">
                    <AlbumTile album={log.album} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{log.album.title}</span>
                        <span className="text-zinc-500 text-xs">{log.album.artist}</span>
                      </div>
                      {log.rating != null && <StarRating rating={log.rating} />}
                      {log.review && (
                        <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{log.review}</p>
                      )}
                      <div className="mt-1 flex gap-3 text-xs text-zinc-600">
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

        <aside className="w-full lg:w-64 shrink-0 space-y-8">
          <section>
            <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-4">The Setup</h2>
            {user.audioSetup ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 text-sm">
                {user.audioSetup.turntable && <SetupItem icon="💿" label="Turntable" value={user.audioSetup.turntable} />}
                {user.audioSetup.preamp && <SetupItem icon="🎚️" label="Pre-amp" value={user.audioSetup.preamp} />}
                {user.audioSetup.speakers && <SetupItem icon="🔊" label="Speakers" value={user.audioSetup.speakers} />}
                {!user.audioSetup.turntable && !user.audioSetup.preamp && !user.audioSetup.speakers && (
                  <p className="text-zinc-600 text-xs">No setup listed yet.</p>
                )}
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <p className="text-zinc-600 text-xs">No setup listed yet.</p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function AlbumTile({ album, size }: { album: { title: string; artist: string; coverUrl: string | null }; size: "sm" | "lg" }) {
  const dim = size === "lg" ? 120 : 56;
  return album.coverUrl ? (
    <Image
      src={album.coverUrl}
      alt={`${album.title} by ${album.artist}`}
      width={dim}
      height={dim}
      className={`rounded-md object-cover aspect-square ${size === "lg" ? "w-full" : "w-14 h-14 shrink-0"}`}
      unoptimized
    />
  ) : (
    <div className={`rounded-md bg-zinc-800 flex items-center justify-center text-zinc-600 text-xs ${size === "lg" ? "w-full aspect-square" : "w-14 h-14 shrink-0"}`}>
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
        <span key={i} className={`text-xs ${i < full ? "text-amber-400" : i === full && half ? "text-amber-400 opacity-50" : "text-zinc-700"}`}>★</span>
      ))}
    </div>
  );
}

function SetupItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div>
      <div className="text-zinc-500 text-xs mb-0.5">{icon} {label}</div>
      <div className="text-zinc-200">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-zinc-800 rounded-xl p-8 text-center text-zinc-600 text-sm">
      {text}
    </div>
  );
}
