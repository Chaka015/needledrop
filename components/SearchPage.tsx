"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

const DIGS_KEY = "needledrop_recent_digs";
const MAX_DIGS = 10;

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
  initialTab: "fans" | "albums";
  users: UserResult[];
  albums: AlbumResult[];
  isLoggedIn: boolean;
  discogsToken: string;
}

export default function SearchPage({ query, initialTab, users, albums, isLoggedIn, discogsToken }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"fans" | "albums">(initialTab);
  const [visibleUsers, setVisibleUsers] = useState(5);
  const [visibleAlbums, setVisibleAlbums] = useState(5);
  const [followStates, setFollowStates] = useState<Record<string, boolean>>(
    Object.fromEntries(users.map((u) => [u.id, u.isFollowing]))
  );
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [recentDigs, setRecentDigs] = useState<string[]>([]);

  // Discogs album search for albums not in DB
  const [discogsResults, setDiscogsResults] = useState<AlbumResult[]>([]);
  const [discogsLoading, setDiscogsLoading] = useState(false);
  const [discogsVisible, setDiscogsVisible] = useState(5);

  // Load recent digs from localStorage, save the current query into the list
  useEffect(() => {
    let stored: string[] = [];
    try {
      const raw = localStorage.getItem(DIGS_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch { /* ignore */ }

    if (query.trim()) {
      // Deduplicate (case-insensitive), newest first
      const deduped = stored.filter((q) => q.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...deduped].slice(0, MAX_DIGS);
      try { localStorage.setItem(DIGS_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      setRecentDigs(updated);
    } else {
      setRecentDigs(stored);
    }
  }, [query]);

  // Auto-load Discogs when albums tab is shown on mount
  useEffect(() => {
    if (tab === "albums" && query) loadDiscogsResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function removeDig(term: string) {
    setRecentDigs((prev) => {
      const updated = prev.filter((q) => q !== term);
      try { localStorage.setItem(DIGS_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }

  function clearAllDigs() {
    setRecentDigs([]);
    try { localStorage.removeItem(DIGS_KEY); } catch { /* ignore */ }
  }

  function redig(term: string) {
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <div>
      <h1 className="text-xs font-mono uppercase tracking-widest mb-6" style={{ color: C.subtle }}>
        {query ? `Results for "${query}"` : "Dig"}
      </h1>

      {/* Tabs — Albums first, Fans second */}
      <div className="flex gap-0 mb-6" style={{ borderBottom: `1px solid ${C.border}` }}>
        {(["albums", "fans"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === "albums") loadDiscogsResults(); }}
            className="px-5 py-2 text-xs font-mono uppercase tracking-widest transition-colors duration-100"
            style={{
              color: tab === t ? C.text : C.subtle,
              borderBottom: tab === t ? `2px solid ${C.accent}` : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {t} {t === "albums" ? `(${albums.length})` : `(${users.length})`}
          </button>
        ))}
      </div>

      {/* Albums tab */}
      {tab === "albums" && (
        <div className="space-y-6">
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

      {/* Fans tab */}
      {tab === "fans" && (
        <div className="space-y-2">
          {users.length === 0 ? (
            <EmptyState text="No fans found." />
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
                      <button
                        onClick={() => handleFollow(user.id)}
                        disabled={followLoading === user.id}
                        className="px-4 py-2 text-xs font-mono transition-colors duration-100"
                        style={{
                          backgroundColor: followStates[user.id] ? C.surfaceRaised : C.accent,
                          color: followStates[user.id] ? C.muted : C.text,
                          borderRadius: 4,
                          border: `1px solid ${followStates[user.id] ? C.border : C.accent}`,
                          opacity: followLoading === user.id ? 0.4 : 1,
                        }}
                      >
                        {followStates[user.id] ? "FOLLOWING" : "FOLLOW"}
                      </button>
                      <a
                        href={`/messages/${user.username}`}
                        className="px-4 py-2 text-xs font-mono transition-colors duration-100"
                        style={{ backgroundColor: C.surfaceRaised, color: C.muted, borderRadius: 4, border: `1px solid ${C.border}` }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                      >
                        MESSAGE
                      </a>
                    </div>
                  )}
                </div>
              ))}
              {users.length > visibleUsers && (
                <LoadMore
                  label={`Load more fans (${users.length - visibleUsers} remaining)`}
                  onClick={() => setVisibleUsers((v) => v + 10)}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Recent Digs — only shown when there is history */}
      {recentDigs.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontFamily: "var(--font-nd-mono)", textTransform: "uppercase", letterSpacing: "0.1em", color: C.subtle }}>
              Recent Digs
            </span>
            <button
              onClick={clearAllDigs}
              style={{
                fontSize: 10, fontFamily: "var(--font-nd-mono)", background: "none", border: "none",
                cursor: "pointer", color: C.subtle, padding: 0, transition: "color 100ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.muted)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.subtle)}
            >
              Clear all
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {recentDigs.map((term) => (
              <div
                key={term}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  backgroundColor: C.surface, border: `1px solid ${C.border}`,
                  padding: "8px 12px", transition: "background 100ms",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.backgroundColor = C.surfaceRaised)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.backgroundColor = C.surface)}
              >
                {/* Clickable area: re-run the search */}
                <button
                  onClick={() => redig(term)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", gap: 8,
                    background: "none", border: "none", cursor: "pointer",
                    textAlign: "left", padding: 0,
                  }}
                >
                  <span style={{ fontSize: 12, color: C.subtle, flexShrink: 0 }}>⚲</span>
                  <span style={{ fontSize: 13, color: C.muted, fontFamily: "var(--font-nd-mono)" }}>{term}</span>
                </button>

                {/* Remove individual dig */}
                <button
                  onClick={() => removeDig(term)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: C.subtle, fontSize: 16, lineHeight: 1, padding: "0 2px",
                    transition: "color 100ms", flexShrink: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.muted)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.subtle)}
                  aria-label={`Remove "${term}" from recent digs`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AlbumRow({ album, showStats, noLink }: { album: AlbumResult; showStats?: boolean; noLink?: boolean }) {
  const inner = (
    <>
      {album.coverUrl ? (
        <Image src={album.coverUrl} alt={album.title} width={48} height={48}
          className="object-cover shrink-0" style={{ width: 48, height: 48, borderRadius: 4 }} unoptimized />
      ) : (
        <div className="shrink-0 flex items-center justify-center text-xs"
          style={{ width: 48, height: 48, backgroundColor: "var(--skin-surface-raised)", borderRadius: 4, color: "var(--skin-subtle)" }}>
          No art
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate" style={{ color: "var(--skin-text)" }}>{album.title}</div>
        <div className="text-xs font-mono truncate" style={{ color: "var(--skin-muted)" }}>
          {album.artist}{album.releaseYear ? ` · ${album.releaseYear}` : ""}
          {album.label ? ` · ${album.label}` : ""}
        </div>
        {showStats && (
          <div className="flex gap-3 mt-0.5 text-xs font-mono" style={{ color: "var(--skin-subtle)" }}>
            {album.logCount !== undefined && <span>{album.logCount} logged</span>}
            {album.collectionCount !== undefined && <span>{album.collectionCount} collected</span>}
          </div>
        )}
      </div>
    </>
  );

  if (noLink) {
    return (
      <div className="flex items-center gap-4 p-3"
        style={{ backgroundColor: "var(--skin-surface)", border: `1px solid ${C.border}` }}>
        {inner}
      </div>
    );
  }
  return (
    <Link
      href={`/album/${encodeURIComponent(album.discogsId)}`}
      className="flex items-center gap-4 p-3 transition-colors duration-100"
      style={{ backgroundColor: "var(--skin-surface)", border: `1px solid ${C.border}`, display: "flex" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = "var(--skin-surface-raised)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = "var(--skin-surface)")}>
      {inner}
    </Link>
  );
}

function LoadMore({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-2 text-xs font-mono transition-colors duration-100"
      style={{ backgroundColor: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 4 }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--skin-text)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}>
      {label}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-8 text-center text-sm font-mono"
      style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
      {text}
    </div>
  );
}
