"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const C = {
  surface:       "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border:        "var(--skin-border)",
  text:          "var(--skin-text)",
  muted:         "var(--skin-muted)",
  subtle:        "var(--skin-subtle)",
  accent:        "var(--skin-accent)",
  accentHover:   "var(--skin-accent-hover)",
};

interface UserResult {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number;
  collectionCount: number;
  logCount: number;
  isFollowing: boolean;
}

interface AlbumResult {
  id?: string;
  discogsId: string;
  title: string;
  artist: string;
  releaseYear: number | null;
  coverUrl: string | null;
  label: string | null;
  genre: string | null;
  logCount?: number;
  collectionCount?: number;
}

interface Props {
  query: string;
  initialTab: "users" | "albums";
  users: UserResult[];
  albums: AlbumResult[];
  isLoggedIn: boolean;
  discogsToken: string;
}

export default function SearchPage({ query, initialTab, users, albums, isLoggedIn, discogsToken }: Props) {
  const [tab, setTab] = useState<"users" | "albums">(initialTab);
  const [visibleUsers, setVisibleUsers] = useState(5);
  const [visibleAlbums, setVisibleAlbums] = useState(5);
  const [followStates, setFollowStates] = useState<Record<string, boolean>>(
    Object.fromEntries(users.map((u) => [u.id, u.isFollowing]))
  );
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  // Discogs album search for albums not in DB
  const [discogsResults, setDiscogsResults] = useState<AlbumResult[]>([]);
  const [discogsLoading, setDiscogsLoading] = useState(false);
  const [discogsVisible, setDiscogsVisible] = useState(5);

  async function loadDiscogsResults() {
    if (!query || discogsResults.length > 0) return;
    setDiscogsLoading(true);
    const res = await fetch(`/api/discogs/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setDiscogsResults(data.results ?? []);
    setDiscogsLoading(false);
  }

  async function handleFollow(userId: string) {
    if (!isLoggedIn) return;
    setFollowLoading(userId);
    const res = await fetch("/api/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: userId }),
    });
    if (res.ok) {
      const data = await res.json();
      setFollowStates((prev) => ({ ...prev, [userId]: data.following }));
    }
    setFollowLoading(null);
  }

  return (
    <div>
      <h1 className="text-xs font-mono uppercase tracking-widest mb-6" style={{ color: C.subtle }}>
        {query ? `Results for "${query}"` : "Search"}
      </h1>

      {/* Tabs */}
      <div className="flex gap-0 mb-6" style={{ borderBottom: `1px solid ${C.border}` }}>
        {(["users", "albums"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); if (t === "albums") loadDiscogsResults(); }}
            className="px-5 py-2 text-xs font-mono uppercase tracking-widest transition-colors duration-100"
            style={{
              color: tab === t ? C.text : C.subtle,
              borderBottom: tab === t ? `2px solid ${C.accent}` : "2px solid transparent",
              marginBottom: -1,
            }}>
            {t} {t === "users" ? `(${users.length})` : `(${albums.length})`}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === "users" && (
        <div className="space-y-2">
          {users.length === 0 ? (
            <EmptyState text="No users found." />
          ) : (
            <>
              {users.slice(0, visibleUsers).map((user) => (
                <div key={user.id} className="flex items-center gap-4 p-4"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                  <Link href={`/${user.username}`} className="shrink-0">
                    {user.avatarUrl ? (
                      <Image src={user.avatarUrl} alt={user.username} width={48} height={48}
                        className="object-cover"
                        style={{ width: 48, height: 48, borderRadius: "50%", border: `1px solid ${C.border}` }}
                        unoptimized />
                    ) : (
                      <div className="flex items-center justify-center text-lg font-bold"
                        style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: C.surfaceRaised, color: C.subtle }}>
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/${user.username}`} className="font-semibold text-sm hover:underline" style={{ color: C.text }}>
                      {user.username}
                    </Link>
                    {user.bio && <p className="text-xs mt-0.5 truncate" style={{ color: C.muted }}>{user.bio}</p>}
                    <div className="flex gap-4 mt-1 text-xs font-mono" style={{ color: C.subtle }}>
                      <span>{user.collectionCount} records</span>
                      <span>{user.logCount} logged</span>
                      <span>{user.followerCount} followers</span>
                    </div>
                  </div>
                  {isLoggedIn && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleFollow(user.id)} disabled={followLoading === user.id}
                        className="px-4 py-2 text-xs font-mono transition-colors duration-100"
                        style={{
                          backgroundColor: followStates[user.id] ? C.surfaceRaised : C.accent,
                          color: followStates[user.id] ? C.muted : C.text,
                          borderRadius: 4,
                          border: `1px solid ${followStates[user.id] ? C.border : C.accent}`,
                          opacity: followLoading === user.id ? 0.4 : 1,
                        }}>
                        {followStates[user.id] ? "FOLLOWING" : "FOLLOW"}
                      </button>
                      <a href={`/messages/${user.username}`}
                        className="px-4 py-2 text-xs font-mono transition-colors duration-100"
                        style={{ backgroundColor: C.surfaceRaised, color: C.muted, borderRadius: 4, border: `1px solid ${C.border}` }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}>
                        MESSAGE
                      </a>
                    </div>
                  )}
                </div>
              ))}
              {users.length > visibleUsers && (
                <LoadMore
                  label={`Load more users (${users.length - visibleUsers} remaining)`}
                  onClick={() => setVisibleUsers((v) => v + 10)}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Albums tab */}
      {tab === "albums" && (
        <div className="space-y-6">
          {/* DB albums */}
          {albums.length > 0 && (
            <div>
              <h2 className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: C.subtle }}>
                On NeedleDrop
              </h2>
              <div className="space-y-2">
                {albums.slice(0, visibleAlbums).map((album) => (
                  <AlbumRow key={album.discogsId} album={album} showStats />
                ))}
                {albums.length > visibleAlbums && (
                  <LoadMore
                    label={`Load more (${albums.length - visibleAlbums} remaining)`}
                    onClick={() => setVisibleAlbums((v) => v + 10)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Discogs search */}
          <div>
            <h2 className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: C.subtle }}>
              From Discogs
            </h2>
            {discogsLoading ? (
              <p className="text-xs font-mono" style={{ color: C.subtle }}>Searching Discogs...</p>
            ) : discogsResults.length === 0 ? (
              <EmptyState text="No Discogs results found." />
            ) : (
              <div className="space-y-2">
                {discogsResults.slice(0, discogsVisible).map((album) => (
                  <AlbumRow key={album.discogsId} album={album} />
                ))}
                {discogsResults.length > discogsVisible && (
                  <LoadMore
                    label={`Load more (${discogsResults.length - discogsVisible} remaining)`}
                    onClick={() => setDiscogsVisible((v) => v + 10)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AlbumRow({ album, showStats }: { album: AlbumResult; showStats?: boolean }) {
  return (
    <Link href={`/album/${album.discogsId}`}
      className="flex items-center gap-4 p-3 transition-colors duration-100"
      style={{ backgroundColor: "#3D3834", border: `1px solid #524D48`, display: "flex" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#4A4540")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#3D3834")}>
      {album.coverUrl ? (
        <Image src={album.coverUrl} alt={album.title} width={48} height={48}
          className="object-cover shrink-0" style={{ width: 48, height: 48, borderRadius: 4 }} unoptimized />
      ) : (
        <div className="shrink-0 flex items-center justify-center text-xs"
          style={{ width: 48, height: 48, backgroundColor: "#4A4540", borderRadius: 4, color: "#6B6560" }}>
          No art
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate" style={{ color: "#F7F1E3" }}>{album.title}</div>
        <div className="text-xs font-mono truncate" style={{ color: "#A89F94" }}>
          {album.artist}{album.releaseYear ? ` · ${album.releaseYear}` : ""}
          {album.label ? ` · ${album.label}` : ""}
        </div>
        {showStats && (
          <div className="flex gap-3 mt-0.5 text-xs font-mono" style={{ color: "#6B6560" }}>
            {album.logCount !== undefined && <span>{album.logCount} logged</span>}
            {album.collectionCount !== undefined && <span>{album.collectionCount} collected</span>}
          </div>
        )}
      </div>
    </Link>
  );
}

function LoadMore({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full py-2 text-xs font-mono transition-colors duration-100"
      style={{ backgroundColor: "#3D3834", color: "#A89F94", border: `1px solid #524D48`, borderRadius: 4 }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#F7F1E3")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#A89F94")}>
      {label}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-8 text-center text-sm font-mono"
      style={{ border: `1px dashed #524D48`, color: "#6B6560" }}>
      {text}
    </div>
  );
}
