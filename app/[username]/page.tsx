import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import AudioSetupEditor from "@/components/AudioSetupEditor";
import MyRecordsSection from "@/components/MyRecordsSection";
import RecentListens from "@/components/RecentListens";
import FeaturedGrid from "@/components/FeaturedGrid";
import FollowButton from "@/components/FollowButton";
import MessageButton from "@/components/MessageButton";
import MixesList from "@/components/MixesList";
import SkinApplicator from "@/components/SkinApplicator";
import FlipCounter from "@/components/FlipCounter";
import QuickLogWidget from "@/components/QuickLogWidget";
import { getSkin, skinToVars } from "@/lib/skins";
import { refreshNowPlaying, type NowPlayingInfo } from "@/lib/spotify-server";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

const C = {
  bg:           "var(--skin-bg)",
  surface:      "var(--skin-surface)",
  surfaceRaised:"var(--skin-surface-raised)",
  border:       "var(--skin-border)",
  text:         "var(--skin-text)",
  muted:        "var(--skin-muted)",
  subtle:       "var(--skin-subtle)",
  accent:       "var(--skin-accent)",
  hot:          "var(--skin-hot)",
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

  // Stats for odometer — aggregate across ALL logs, not just the 10 fetched for display
  const [totalMsResult, listensLogged] = await Promise.all([
    prisma.listeningLog.aggregate({ where: { userId: user.id }, _sum: { durationMs: true } }),
    prisma.listeningLog.count({ where: { userId: user.id } }),
  ]);
  const recordsOwned = user.collection.length;
  const totalListeningMs = Number(totalMsResult._sum.durationMs ?? BigInt(0));
  const hoursListened = Math.round(totalListeningMs / 3_600_000);

  const featured = user.collection.filter((c) => c.isFeatured).slice(0, 8);
  const latestAdded = user.collection.filter((c) => !c.isFeatured).slice(0, 8);

  const now = new Date();
  const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Server-side: always call Spotify currently-playing before rendering so
  // every page load (not just every 15 min) reflects the live track.
  let nowPlaying: NowPlayingInfo | null = null;
  if (user.spotifyConnected) {
    try { nowPlaying = await refreshNowPlaying(user.id); } catch { /* Spotify unreachable */ }
  }

  // Prefer live Spotify data; fall back to whatever is in DB
  let nowSpinningAlbum: { discogsId: string; title: string; artist: string; coverUrl: string | null } | null = null;
  let nowSpinningIsActive = false;

  if (nowPlaying) {
    nowSpinningAlbum = {
      discogsId: nowPlaying.discogsId,
      title:     nowPlaying.title,
      artist:    nowPlaying.artist,
      coverUrl:  nowPlaying.coverUrl,
    };
    nowSpinningIsActive = true;
  } else if (user.nowSpinning) {
    const dbAlbum = await prisma.album.findUnique({ where: { id: user.nowSpinning } });
    if (dbAlbum) {
      nowSpinningAlbum = {
        discogsId: dbAlbum.discogsId,
        title:     dbAlbum.title,
        artist:    dbAlbum.artist,
        coverUrl:  dbAlbum.coverUrl,
      };
      nowSpinningIsActive = user.nowSpinningAt ? user.nowSpinningAt > sixtyMinutesAgo : false;
    }
  }

  function mapLog(log: NonNullable<typeof user>["logs"][number]) {
    return {
      id: log.id,
      rating: log.rating,
      review: log.review,
      format: log.format,
      source: log.source,
      playedAt: log.playedAt.toISOString(),
      spinCount: log.spins.length,
      userHasSpun: currentUser ? log.spins.some((s) => s.userId === currentUser.id) : false,
      album: { discogsId: log.album.discogsId, title: log.album.title, artist: log.album.artist, coverUrl: log.album.coverUrl },
    };
  }

  let logs = user.logs.map(mapLog);

  // Pin the Now Spinning log to the top of Recent Listens.
  // The take:10 query may not include it (e.g. set before our log-on-spin fix),
  // so we fetch it explicitly and prepend if it's not already first.
  if (user.nowSpinning) {
    const nsLog = await prisma.listeningLog.findFirst({
      where: { userId: user.id, albumId: user.nowSpinning },
      orderBy: { playedAt: "desc" },
      include: { album: true, spins: true },
    });
    if (nsLog && logs[0]?.id !== nsLog.id) {
      logs = [mapLog(nsLog), ...logs.filter((l) => l.id !== nsLog.id)].slice(0, 10);
    }
  }

  // First name for possessives
  const firstName = user.username;

  return (
    <div className="min-h-screen" style={{ ...skinVars as React.CSSProperties, backgroundColor: C.bg, color: C.text }}>
      <SkinApplicator vars={skinVars as Record<string, string>} />

      <div className="ms-page">

        {/* ── Odometer strip ──────────────────────────────── */}
        <div className="ms-odo-wrap" style={{ marginBottom: 20 }}>
          <div className="ms-odo-cell">
            <div className="k">Records owned</div>
            <OdometerCell value={recordsOwned} />
          </div>
          <div className="ms-odo-cell">
            <div className="k">Listens logged</div>
            <OdometerCell value={listensLogged} />
          </div>
          <div className="ms-odo-cell">
            <div className="k">Hours with music</div>
            <span style={{ display: "inline-flex", alignItems: "flex-end" }}>
              <OdometerCell value={hoursListened} />
              <span className="ms-odo-suffix">hrs</span>
            </span>
          </div>
          <div className="ms-odo-cell">
            <div className="k">Following / Fans</div>
            <OdometerCell value={user.followers.length} />
          </div>
        </div>

        {/* ── Two-column layout ───────────────────────────── */}
        <div className="ms-cols profile">

          {/* LEFT RAIL */}
          <div className="ms-stack">

            {/* Avatar + identity card */}
            <div className="ms-box">
              {/* Avatar */}
              <div style={{ width: "100%", aspectRatio: "1", background: C.surface, borderBottom: `2px solid ${C.border}`, position: "relative" }}>
                {user.avatarUrl ? (
                  <Image src={user.avatarUrl} alt={user.username} fill className="object-cover" unoptimized />
                ) : (
                  <div style={{ inset: 0, position: "absolute", display: "grid", placeItems: "center" }}>
                    <span style={{ fontSize: 60, fontWeight: 700, color: C.subtle }}>
                      {user.username[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <div className="ms-pad" style={{ paddingBottom: 8 }}>
                <div className="ms-prof-name">{user.username}</div>
                <div className="ms-online" style={{ marginTop: 6 }}>
                  <span className="d" /> ONLINE NOW
                </div>
                {user.bio && <div className="ms-mood"><b>"{user.bio}"</b></div>}
              </div>

              {/* Contact buttons */}
              <div className="ms-contact">
                {isOwnProfile ? (
                  <>
                    <Link href="/settings" className="ms-cbtn">Edit</Link>
                    <Link href={`/${username}/analytics`} className="ms-cbtn">Record Room</Link>
                  </>
                ) : (
                  <>
                    <FollowButton targetUserId={user.id} initialIsFollowing={isFollowing} />
                    <MessageButton username={user.username} />
                  </>
                )}
              </div>

              <div className="ms-url">needledrop.fm/{user.username}</div>
            </div>

            {/* Stats table */}
            <div className="ms-box">
              <div className="ms-bar">{firstName}&apos;s Stats</div>
              <table className="ms-stats-table">
                <tbody>
                  <tr>
                    <td>Member since</td>
                    <td>{new Date(user.createdAt).getFullYear()}</td>
                  </tr>
                  <tr>
                    <td>Records</td>
                    <td>{user.collection.length.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Listens</td>
                    <td><Link href={`/${username}/logs`} style={{ color: "var(--skin-accent)" }}>{user.logs.length.toLocaleString()}</Link></td>
                  </tr>
                  <tr>
                    <td>Wantlist</td>
                    <td><Link href={`/${username}/wantlist`} style={{ color: "var(--skin-accent)" }}>{user.wantlist.length.toLocaleString()}</Link></td>
                  </tr>
                  <tr>
                    <td>Following</td>
                    <td><Link href={`/${username}/following`} style={{ color: "var(--skin-accent)" }}>{user.following.length.toLocaleString()}</Link></td>
                  </tr>
                  <tr>
                    <td>Fans</td>
                    <td><Link href={`/${username}/followers`} style={{ color: "var(--skin-accent)" }}>{user.followers.length.toLocaleString()}</Link></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Listening time */}
            <div className="ms-box">
              <div className="ms-bar">Time with music</div>
              <div className="ms-pad">
                <FlipCounter totalMs={totalListeningMs} />
              </div>
            </div>

            {/* The Setup */}
            <div className="ms-box">
              <div className="ms-bar">The Setup</div>
              {isOwnProfile ? (
                <div className="ms-pad"><AudioSetupEditor initial={user.audioSetup} /></div>
              ) : (
                <div className="ms-pad" style={{ paddingTop: 12 }}>
                  {user.audioSetup?.turntable && <SetupItem icon="💿" label="TURNTABLE" value={user.audioSetup.turntable} />}
                  {user.audioSetup?.preamp && <SetupItem icon="🎚️" label="PRE-AMP" value={user.audioSetup.preamp} />}
                  {user.audioSetup?.speakers && <SetupItem icon="🔊" label="SPEAKERS" value={user.audioSetup.speakers} />}
                  {!user.audioSetup?.turntable && !user.audioSetup?.preamp && !user.audioSetup?.speakers && (
                    <p style={{ fontSize: 13, color: C.subtle, fontFamily: "var(--font-nd-mono)" }}>No setup listed yet.</p>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="ms-stack">

            {/* Now Spinning + Log a Listen side by side */}
            {(nowSpinningAlbum || isOwnProfile) && (
              <div style={{ display: "grid", gridTemplateColumns: nowSpinningAlbum && isOwnProfile ? "1fr 1fr" : "1fr", gap: 0 }}>
                {nowSpinningAlbum && (
                  <div className="ms-box" style={{ borderRight: isOwnProfile ? "none" : undefined, borderRadius: isOwnProfile ? "4px 0 0 4px" : undefined }}>
                    <div className="ms-bar accent">
                      Now Spinning{" "}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span className="ms-eq"><i /><i /><i /><i /></span>
                      </span>
                    </div>
                    <div className="ms-pad ms-now">
                      {nowSpinningAlbum.coverUrl && (
                        <Link href={`/album/${encodeURIComponent(nowSpinningAlbum.discogsId ?? "")}`}>
                          <Image src={nowSpinningAlbum.coverUrl} alt={nowSpinningAlbum.title}
                            width={72} height={72} className="object-cover"
                            style={{ width: 72, height: 72, borderRadius: 4, border: `2px solid var(--skin-border)`, flexShrink: 0 }}
                            unoptimized />
                        </Link>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div className="t" style={{ fontSize: 14 }}>{nowSpinningAlbum.title}</div>
                        <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{nowSpinningAlbum.artist}</div>
                        <div className="nowmeta" style={{ marginTop: 8 }}>
                          {nowSpinningIsActive
                            ? <span className="ms-onair"><span className="d" /> ON AIR</span>
                            : <span style={{ opacity: 0.55 }}>LAST PLAYED</span>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isOwnProfile && (
                  <div className="ms-box" style={{ borderRadius: nowSpinningAlbum ? "0 4px 4px 0" : undefined }}>
                    <div className="ms-bar accent">+ Log a listen</div>
                    <div className="ms-pad"><QuickLogWidget /></div>
                  </div>
                )}
              </div>
            )}

            {/* Featured / Top shelf */}
            <div className="ms-box">
              <div className="ms-bar">{firstName}&apos;s Top {featured.length > 0 ? featured.length : ""} Records</div>
              {featured.length > 0 ? (
                <div className="ms-top8">
                  {featured.map((c, i) => (
                    <div className="cell" key={c.id}>
                      <span className="ms-ribbon">{i + 1}</span>
                      <Link href={`/album/${encodeURIComponent(c.album.discogsId)}`}>
                        {c.album.coverUrl ? (
                          <Image src={c.album.coverUrl} alt={c.album.title} width={118} height={118}
                            className="object-cover aspect-square w-full"
                            style={{ borderRadius: 4, border: `2px solid var(--skin-border)`, display: "block" }} unoptimized />
                        ) : (
                          <div style={{ aspectRatio: "1", background: C.surface, borderRadius: 4, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 11, color: C.subtle, fontFamily: "var(--font-nd-mono)" }}>No art</span>
                          </div>
                        )}
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ms-pad">
                  <FeaturedGrid
                    items={[]}
                    isOwnProfile={isOwnProfile}
                  />
                </div>
              )}
            </div>

            {/* Recent listens */}
            <div className="ms-box">
              <div className="ms-bar">Recent Listens <span className="cta"><Link href={`/${username}/logs`} style={{ color: "inherit" }}>see all →</Link></span></div>
              <div style={{ padding: "4px 0" }}>
                <RecentListens logs={logs} isOwnProfile={isOwnProfile} />
              </div>
            </div>

            {/* Latest added */}
            {latestAdded.length > 0 && (
              <div className="ms-box">
                <div className="ms-bar">Latest Added to Collection</div>
                <div className="ms-pad">
                  <div className="ms-shelf">
                    {latestAdded.map((c) => (
                      <div className="c" key={c.id}>
                        <Link href={`/album/${encodeURIComponent(c.album.discogsId)}`}>
                          {c.album.coverUrl ? (
                            <Image src={c.album.coverUrl} alt={c.album.title} width={130} height={130}
                              className="object-cover aspect-square w-full"
                              style={{ borderRadius: 4, border: `2px solid var(--skin-border)`, display: "block" }} unoptimized />
                          ) : (
                            <div style={{ aspectRatio: "1", background: C.surface, borderRadius: 4, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 11, color: C.subtle }}>No art</span>
                            </div>
                          )}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Mixes + Wantlist side by side */}
            {(user.mixes.length > 0 || user.wantlist.length > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: user.mixes.length > 0 && user.wantlist.length > 0 ? "1fr 1fr" : "1fr", gap: 0 }}>
                {/* Mixes */}
                {user.mixes.length > 0 && (
                  <div className="ms-box" style={{
                    borderRight: user.wantlist.length > 0 ? "none" : undefined,
                    borderRadius: user.wantlist.length > 0 ? "4px 0 0 4px" : undefined,
                  }}>
                    <div className="ms-bar">Mixes <span className="cta">{user.mixes.length} total</span></div>
                    <div>
                      {user.mixes.slice(0, 5).map((m) => (
                        <Link key={m.id} href={`/${username}/mixes/${m.id}`} className="ms-mix" style={{ textDecoration: "none" }}>
                          <div style={{ display: "flex", flexShrink: 0 }}>
                            {m.items.slice(0, 3).map((item, i) => (
                              item.album.coverUrl ? (
                                <Image key={i} src={item.album.coverUrl} alt={item.album.title} width={44} height={44}
                                  className="object-cover"
                                  style={{ width: 44, height: 44, borderRadius: 4, border: `2px solid var(--skin-border)`, marginLeft: i > 0 ? -12 : 0, boxShadow: i > 0 ? "-2px 0 4px rgba(0,0,0,0.3)" : "none" }} unoptimized />
                              ) : (
                                <div key={i} style={{ width: 44, height: 44, borderRadius: 4, background: C.surface, border: `2px solid ${C.border}`, marginLeft: i > 0 ? -12 : 0 }} />
                              )
                            ))}
                          </div>
                          <div>
                            <div className="ti">{m.title}</div>
                            <div className="sub">{m._count.items} records</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Wantlist */}
                {user.wantlist.length > 0 && (
                  <div className="ms-box" style={{ borderRadius: user.mixes.length > 0 ? "0 4px 4px 0" : undefined }}>
                    <div className="ms-bar">Wantlist <span className="cta"><Link href={`/${username}/wantlist`} style={{ color: "inherit" }}>{user.wantlist.length} records →</Link></span></div>
                    <div className="ms-pad">
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(56px, 1fr))", gap: 6 }}>
                        {user.wantlist.slice(0, 12).map((w) => (
                          <Link key={w.id} href={`/album/${encodeURIComponent(w.album.discogsId)}`} title={`${w.album.title} — ${w.album.artist}`}>
                            {w.album.coverUrl ? (
                              <Image src={w.album.coverUrl} alt={w.album.title} width={56} height={56}
                                className="object-cover aspect-square w-full"
                                style={{ borderRadius: 4, border: `2px solid var(--skin-border)`, display: "block" }} unoptimized />
                            ) : (
                              <div style={{ aspectRatio: "1", background: C.surface, borderRadius: 4, border: `2px solid ${C.border}` }} />
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Full collection — own profile */}
            {isOwnProfile && (
              <MyRecordsSection
                totalCount={user.collection.length}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Static odometer cell (server-rendered, no animation)
function OdometerCell({ value }: { value: number }) {
  const str = value.toLocaleString();
  return (
    <span className="ms-odo">
      {str.split("").map((c, i) => (
        <span key={i} className={c === "," ? "sep" : "d"}>{c}</span>
      ))}
    </span>
  );
}

function SetupItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--skin-subtle)", marginBottom: 2 }}>{icon} {label}</div>
      <div style={{ color: "var(--skin-text)", fontSize: 13 }}>{value}</div>
    </div>
  );
}
