import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import CollectionGrid from "@/components/CollectionGrid";
import AudioSetupEditor from "@/components/AudioSetupEditor";
import ImportDiscogs from "@/components/ImportDiscogs";
import RecentListens from "@/components/RecentListens";
import FeaturedGrid from "@/components/FeaturedGrid";
import FollowButton from "@/components/FollowButton";
import MixesList from "@/components/MixesList";
import SkinApplicator from "@/components/SkinApplicator";
import { getSkin, skinToVars } from "@/lib/skins";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

// CSS-variable aliases used in this server component's JSX
const C = {
  bg:           "var(--skin-bg)",
  surface:      "var(--skin-surface)",
  surfaceRaised:"var(--skin-surface-raised)",
  border:       "var(--skin-border)",
  text:         "var(--skin-text)",
  muted:        "var(--skin-muted)",
  subtle:       "var(--skin-subtle)",
  accent:       "var(--skin-accent)",
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
        include: { album: true, spins: true },
      },
      collection: {
        orderBy: { addedAt: "desc" },
        include: { album: true },
      },
      wantlist: {
        orderBy: { addedAt: "desc" },
        include: { album: true },
      },
      mixes: {
        orderBy: { updatedAt: "desc" },
        include: {
          items: {
            orderBy: { position: "asc" },
            take: 4,
            include: { album: { select: { coverUrl: true, title: true, artist: true } } },
          },
          _count: { select: { items: true } },
        },
      },
    },
  });

  if (!user) notFound();

  const currentUser = clerkId
    ? await prisma.user.findUnique({
        where: { clerkId },
        include: { following: { select: { followingId: true } } },
      })
    : null;

  const isOwnProfile = currentUser?.id === user.id;
  const isFollowing = currentUser && !isOwnProfile
    ? currentUser.following.some((f) => f.followingId === user.id)
    : false;

  const skin = getSkin(user.skin);
  const skinVars = skinToVars(skin) as React.CSSProperties;

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

  // Active = set within 60 minutes. Applies to both owner and visitor.
  // Owner: badge hidden entirely when stale; visitor: dimmed "LAST PLAYED"
  const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const nowSpinningIsActive = user.nowSpinningAt ? user.nowSpinningAt > sixtyMinutesAgo : false;

  const logs = user.logs.map((log) => ({
    id: log.id,
    rating: log.rating,
    review: log.review,
    format: log.format,
    source: log.source,
    playedAt: log.playedAt.toISOString(),
    spinCount: log.spins.length,
    userHasSpun: currentUser ? log.spins.some((s) => s.userId === currentUser.id) : false,
    album: { title: log.album.title, artist: log.album.artist, coverUrl: log.album.coverUrl },
  }));

  return (
    <div className="min-h-screen font-sans" style={{ ...skinVars, backgroundColor: C.bg, color: C.text }}>
      <SkinApplicator vars={skinVars as Record<string, string>} />

      {/* HEADER */}
      <div style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="shrink-0">
              {user.avatarUrl ? (
                <Image src={user.avatarUrl} alt={user.username} width={128} height={128}
                  className="object-cover"
                  style={{ width: 128, height: 128, borderRadius: "50%", border: `3px solid ${C.accent}` }} />
              ) : (
                <div className="flex items-center justify-center text-4xl font-bold"
                  style={{ width: 128, height: 128, borderRadius: "50%", backgroundColor: C.surface, color: C.subtle, border: `3px solid ${C.accent}` }}>
                  {user.username[0].toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.text }}>{user.username}</h1>
                {currentUser && !isOwnProfile && (
                  <FollowButton targetUserId={user.id} initialIsFollowing={isFollowing} />
                )}
                {/* ON AIR badge:
                    - Active (<60 min): red pulse, ON AIR / STREAMING label
                    - Stale (>60 min): owner sees nothing; visitor sees dimmed LAST PLAYED */}
                {nowSpinningAlbum && (nowSpinningIsActive || !isOwnProfile) && (
                  <span className="flex items-center gap-2 text-xs font-mono px-3 py-1.5"
                    style={{
                      backgroundColor: "#0D0D0D",
                      border: "1px solid #333",
                      borderRadius: 4,
                      opacity: nowSpinningIsActive ? 1 : 0.55,
                    }}>
                    {nowSpinningAlbum.coverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={nowSpinningAlbum.coverUrl} alt=""
                        style={{ width: 24, height: 24, borderRadius: 2, objectFit: "cover", flexShrink: 0 }} />
                    )}
                    {nowSpinningIsActive ? (
                      <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: "#FF3E3E" }} />
                    ) : (
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#555" }} />
                    )}
                    <span style={{ color: nowSpinningIsActive ? "#FF3E3E" : "#666" }}>
                      {!nowSpinningIsActive
                        ? "LAST PLAYED"
                        : user.nowSpinningSource === "streaming"
                        ? "STREAMING"
                        : "ON AIR"}
                    </span>
                    <span style={{ color: "#F7F1E3" }}>
                      {nowSpinningAlbum.artist} — {nowSpinningAlbum.title}
                    </span>
                  </span>
                )}
              </div>

              {user.bio && <p className="mt-2 text-sm max-w-xl" style={{ color: C.muted }}>{user.bio}</p>}

              {/* Listen counts */}
              <div className="mt-4 flex flex-wrap gap-6 text-sm font-mono" style={{ color: C.muted }}>
                {[
                  { value: totalListens, label: "TOTAL", href: `/${username}/logs` },
                  { value: listensThisYear, label: "THIS YEAR", href: `/${username}/logs?filter=year` },
                  { value: listensThisWeek, label: "THIS WEEK", href: `/${username}/logs?filter=week` },
                ].map((s) => (
                  <Link key={s.label} href={s.href} className="hover:underline">
                    <span className="font-bold" style={{ color: C.text }}>{s.value}</span>{" "}
                    <span className="text-xs" style={{ color: C.subtle }}>{s.label}</span>
                  </Link>
                ))}
                <Link href={`/${username}/following`} className="hover:underline">
                  <span className="font-bold" style={{ color: C.text }}>{user.following.length}</span>{" "}
                  <span className="text-xs" style={{ color: C.subtle }}>FOLLOWING</span>
                </Link>
                <Link href={`/${username}/followers`} className="hover:underline">
                  <span className="font-bold" style={{ color: C.text }}>{user.followers.length}</span>{" "}
                  <span className="text-xs" style={{ color: C.subtle }}>FOLLOWERS</span>
                </Link>
              </div>

              {/* Stats strip */}
              <div className="mt-5 flex flex-wrap gap-3">
                {[
                  { label: "RECORDS", value: user.collection.length },
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

        <div className="flex-1 min-w-0 space-y-12">

          <section>
            <SectionLabel>Recent Listens</SectionLabel>
            <RecentListens logs={logs} isOwnProfile={isOwnProfile} />
          </section>

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

          {isOwnProfile && (
            <section>
              <SectionLabel>My Records</SectionLabel>
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
        </div>

        {/* SIDEBAR */}
        <aside className="w-full lg:w-64 shrink-0 space-y-8">

          <section>
            <SectionLabel>Featured</SectionLabel>
            <FeaturedGrid
              items={featured.map((c) => ({ id: c.id, album: c.album }))}
              isOwnProfile={isOwnProfile}
            />
          </section>

          {user.wantlist.length > 0 && (
            <section>
              <SectionLabel>Wantlist</SectionLabel>
              <div className="grid grid-cols-4 gap-1.5">
                {user.wantlist.slice(0, 8).map((w) => (
                  <Link key={w.id} href={`/album/${w.album.discogsId}`} title={`${w.album.title} — ${w.album.artist}`}>
                    {w.album.coverUrl ? (
                      <Image src={w.album.coverUrl} alt={w.album.title} width={56} height={56}
                        className="object-cover aspect-square w-full"
                        style={{ borderRadius: 4 }} unoptimized />
                    ) : (
                      <div className="aspect-square flex items-center justify-center text-xs"
                        style={{ backgroundColor: C.surface, borderRadius: 4, color: C.subtle }}>
                        ?
                      </div>
                    )}
                  </Link>
                ))}
              </div>
              {user.wantlist.length > 8 && (
                <p className="mt-2 text-xs font-mono" style={{ color: C.subtle }}>
                  +{user.wantlist.length - 8} more
                </p>
              )}
            </section>
          )}

          <section>
            <SectionLabel>Mixes</SectionLabel>
            <MixesList
              mixes={user.mixes}
              username={username}
              isOwnProfile={isOwnProfile}
            />
          </section>

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
    <h2 className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: "var(--skin-subtle)" }}>
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
      style={{ width: size === "lg" ? "100%" : 48, height: size === "lg" ? "100%" : 48, aspectRatio: "1", backgroundColor: "var(--skin-surface)", borderRadius: 4, color: "var(--skin-subtle)", flexShrink: 0 }}>
      No art
    </div>
  );
}

function SetupItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-mono mb-0.5" style={{ color: "var(--skin-subtle)" }}>{icon} {label}</div>
      <div style={{ color: "var(--skin-text)" }}>{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-8 text-center text-sm font-mono"
      style={{ border: "1px dashed var(--skin-border)", color: "var(--skin-subtle)" }}>
      {text}
    </div>
  );
}
