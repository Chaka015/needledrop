"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const C = {
  bg:            "var(--skin-bg)",
  surface:       "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border:        "var(--skin-border)",
  text:          "var(--skin-text)",
  muted:         "var(--skin-muted)",
  subtle:        "var(--skin-subtle)",
  accent:        "var(--skin-accent)",
};

// Discriminated union for all feed event types
export type FeedItem =
  | {
      type: "listen";
      id: string;
      timestamp: string;
      user: { username: string; avatarUrl: string | null };
      album: { title: string; artist: string; artistMbid: string | null; coverUrl: string | null; discogsId: string };
      rating: number | null;
      review: string | null;
      format: string | null;
      source: string;
      autoImported: boolean;
      spinCount: number;
      userHasSpun: boolean;
    }
  | {
      type: "digest";
      id: string;
      timestamp: string;
      user: { username: string; avatarUrl: string | null };
      albums: { title: string; artist: string; coverUrl: string | null; discogsId: string }[];
      count: number;
    }
  | {
      type: "add";
      id: string;
      timestamp: string;
      user: { username: string; avatarUrl: string | null };
      album: { title: string; artist: string; artistMbid: string | null; coverUrl: string | null; discogsId: string };
    }
  | {
      type: "follow";
      id: string;
      timestamp: string;
      follower: { username: string; avatarUrl: string | null };
      following: { username: string; avatarUrl: string | null };
    }
  | {
      type: "mix";
      id: string;
      timestamp: string;
      user: { username: string; avatarUrl: string | null };
      mix: { id: string; title: string; itemCount: number };
    }
  | {
      type: "spin";
      id: string;
      timestamp: string;
      user: { username: string; avatarUrl: string | null };
      album: { title: string; artist: string; artistMbid: string | null; coverUrl: string | null; discogsId: string };
      logId: string;
    }
  | {
      type: "join";
      id: string;
      timestamp: string;
      user: { id: string; username: string; avatarUrl: string | null };
      initialIsFollowing: boolean;
    };

interface FeedPreferences {
  showListens: boolean;
  showAdds: boolean;
  showFollows: boolean;
  showMixes: boolean;
  showSpins: boolean;
}

const DEFAULT_PREFS: FeedPreferences = {
  showListens: true,
  showAdds: true,
  showFollows: true,
  showMixes: true,
  showSpins: false,
};

const FILTER_LABELS: { key: keyof FeedPreferences; label: string }[] = [
  { key: "showListens", label: "LISTENS" },
  { key: "showAdds", label: "ADDS" },
  { key: "showFollows", label: "FOLLOWS" },
  { key: "showMixes", label: "MIXES" },
  { key: "showSpins", label: "SPINS" },
];

export default function ActivityFeed({
  friendItems,
  globalItems,
}: {
  friendItems: FeedItem[];
  globalItems: FeedItem[];
}) {
  const [tab, setTab] = useState<"friends" | "community">("friends");
  const [prefs, setPrefs] = useState<FeedPreferences>(DEFAULT_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [spinStates, setSpinStates] = useState<Record<string, { count: number; spun: boolean }>>(() => {
    const s: Record<string, { count: number; spun: boolean }> = {};
    [...friendItems, ...globalItems].forEach((item) => {
      if (item.type === "listen") s[item.id] = { count: item.spinCount, spun: item.userHasSpun };
    });
    return s;
  });

  useEffect(() => {
    fetch("/api/feed-preferences")
      .then((r) => r.json())
      .then((data) => {
        if (data.prefs) setPrefs({ ...DEFAULT_PREFS, ...data.prefs });
        setPrefsLoaded(true);
      })
      .catch(() => setPrefsLoaded(true));
  }, []);

  async function togglePref(key: keyof FeedPreferences) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await fetch("/api/feed-preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
  }

  async function handleSpin(logId: string) {
    const res = await fetch("/api/spins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId }),
    });
    if (res.ok) {
      const data = await res.json();
      setSpinStates((prev) => ({
        ...prev,
        [logId]: { count: (prev[logId]?.count ?? 0) + (data.spun ? 1 : -1), spun: data.spun },
      }));
    }
  }

  const allItems = tab === "friends" ? friendItems : globalItems;

  // Collapse consecutive auto-imported streaming listens from the same user+day into digest cards
  function collapseDigests(raw: FeedItem[]): FeedItem[] {
    const out: FeedItem[] = [];
    const digestMap = new Map<string, { idx: number; item: Extract<FeedItem, { type: "digest" }> }>();

    for (const item of raw) {
      if (item.type === "listen" && item.source === "streaming" && item.autoImported) {
        const day = item.timestamp.slice(0, 10); // YYYY-MM-DD
        const key = `${item.user.username}:${day}`;
        const existing = digestMap.get(key);
        if (existing) {
          existing.item.count++;
          if (existing.item.albums.length < 4) existing.item.albums.push(item.album);
        } else {
          const digest: Extract<FeedItem, { type: "digest" }> = {
            type: "digest",
            id: `digest:${key}`,
            timestamp: item.timestamp,
            user: item.user,
            albums: [item.album],
            count: 1,
          };
          digestMap.set(key, { idx: out.length, item: digest });
          out.push(digest);
        }
      } else {
        out.push(item);
      }
    }
    return out;
  }

  const filtered = allItems.filter((item) => {
    if (item.type === "listen") return prefs.showListens;
    if (item.type === "add") return prefs.showAdds;
    if (item.type === "follow") return prefs.showFollows;
    if (item.type === "mix") return prefs.showMixes;
    if (item.type === "spin") return prefs.showSpins;
    if (item.type === "join") return tab === "community"; // only in community tab
    return true;
  });
  const items = collapseDigests(filtered);

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div className="ms-tabs" style={{ border: "none", margin: 0 }}>
          <button className={"ms-tab" + (tab === "friends" ? " on" : "")} onClick={() => setTab("friends")}>Following</button>
          <button className={"ms-tab" + (tab === "community" ? " on" : "")} onClick={() => setTab("community")}>Community</button>
        </div>
      </div>

      {/* Filter pills */}
      {prefsLoaded && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {FILTER_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => togglePref(key)}
              className="ms-fmt"
              style={{
                background: prefs[key] ? "var(--skin-accent)" : "var(--skin-surface)",
                color: prefs[key] ? "var(--skin-accent-ink)" : "var(--skin-muted)",
                borderColor: prefs[key] ? "var(--skin-accent)" : "var(--skin-border)",
                cursor: "pointer",
              }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", fontSize: 13, border: "1px dashed var(--skin-border)", color: "var(--skin-subtle)", fontFamily: "var(--font-nd-mono)" }}>
          {tab === "friends"
            ? "Nothing from fans you follow yet. Find some listeners!"
            : "No activity yet."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {items.map((item) => (
            <FeedCard key={`${item.type}-${item.id}`} item={item} spinStates={spinStates} onSpin={handleSpin} />
          ))}
        </div>
      )}
    </div>
  );
}

function Avatar({ user, size = 36 }: { user: { username: string; avatarUrl: string | null }; size?: number }) {
  return user.avatarUrl ? (
    <Image src={user.avatarUrl} alt={user.username} width={size} height={size}
      className="object-cover shrink-0"
      style={{ width: size, height: size, borderRadius: "50%", border: `1px solid ${C.border}` }}
      unoptimized />
  ) : (
    <div className="flex items-center justify-center text-xs font-bold shrink-0"
      style={{ width: size, height: size, borderRadius: "50%", backgroundColor: C.surfaceRaised, color: C.subtle }}>
      {user.username[0].toUpperCase()}
    </div>
  );
}

function AlbumArt({ coverUrl, title, size = 40 }: { coverUrl: string | null; title: string; size?: number }) {
  return coverUrl ? (
    <Image src={coverUrl} alt={title} width={size} height={size}
      className="object-cover shrink-0"
      style={{ width: size, height: size, borderRadius: 4 }} unoptimized />
  ) : (
    <div className="shrink-0" style={{ width: size, height: size, backgroundColor: C.surfaceRaised, borderRadius: 4 }} />
  );
}

function FeedCard({
  item,
  spinStates,
  onSpin,
}: {
  item: FeedItem;
  spinStates: Record<string, { count: number; spun: boolean }>;
  onSpin: (logId: string) => void;
}) {
  const verb = item.type === "listen"
    ? (item.source === "streaming" ? "streamed" : "logged a listen")
    : "";

  if (item.type === "listen") {
    const spin = spinStates[item.id];
    return (
      <article className="ms-box ms-listen">
        <div className="ms-listen-cover">
          <Link href={`/album/${encodeURIComponent(item.album.discogsId)}`}>
            <AlbumArt coverUrl={item.album.coverUrl} title={item.album.title} size={104} />
          </Link>
        </div>
        <div>
          <div className="ms-listen-head">
            <Link href={`/${item.user.username}`} style={{ flexShrink: 0 }}><Avatar user={item.user} size={30} /></Link>
            <span className="ms-listen-who">
              <b><Link href={`/${item.user.username}`} style={{ color: "inherit" }}>{item.user.username}</Link></b>{" "}
              <span className="v">{verb}</span>
            </span>
            <span className="ms-time" style={{ marginLeft: "auto" }}>{relTime(item.timestamp)}</span>
          </div>
          <Link href={`/album/${encodeURIComponent(item.album.discogsId)}`} style={{ textDecoration: "none" }}>
            <div className="ms-listen-title">{item.album.title}</div>
          </Link>
          {item.album.artistMbid ? (
            <Link href={`/artist/${item.album.artistMbid}`} className="ms-listen-artist" style={{ textDecoration: "none" }}>{item.album.artist}</Link>
          ) : (
            <div className="ms-listen-artist">{item.album.artist}</div>
          )}
          <div className="ms-listen-meta">
            {item.rating != null && <StarRating rating={item.rating} />}
            {item.format && (
              <span className={"ms-fmt" + (item.source === "streaming" ? " stream" : "")}>
                {item.source === "streaming" ? "STREAM" : item.format}
              </span>
            )}
          </div>
          {item.review && <p className="ms-listen-text">{item.review}</p>}
          <div className="ms-listen-foot">
            <button
              className={"ms-spin" + (spin?.spun ? " on" : "")}
              onClick={() => onSpin(item.id)}
            >
              <span className="g">↻</span>
              <span>{spin?.count ?? 0}</span>
            </button>
            <button className="ms-act">notes</button>
            <button className="ms-act" style={{ marginLeft: "auto" }}>+ Add to Mix</button>
          </div>
        </div>
      </article>
    );
  }

  if (item.type === "add") {
    return (
      <div className="ms-box" style={{ display: "flex", gap: 16, padding: 16, alignItems: "center" }}>
        <Link href={`/${item.user.username}`} style={{ flexShrink: 0 }}><Avatar user={item.user} /></Link>
        <Link href={`/album/${encodeURIComponent(item.album.discogsId)}`} style={{ flexShrink: 0 }}>
          <AlbumArt coverUrl={item.album.coverUrl} title={item.album.title} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 2 }}>
            <Link href={`/${item.user.username}`} style={{ fontWeight: 700, color: C.text }}>{item.user.username}</Link>
            {" "}added to collection
          </div>
          <Link href={`/album/${encodeURIComponent(item.album.discogsId)}`} style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{item.album.title}</Link>
          {item.album.artistMbid ? (
            <Link href={`/artist/${item.album.artistMbid}`} style={{ display: "block", fontSize: 12, color: C.muted, fontFamily: "var(--font-nd-mono)" }}>{item.album.artist}</Link>
          ) : (
            <div style={{ fontSize: 12, color: C.muted, fontFamily: "var(--font-nd-mono)" }}>{item.album.artist}</div>
          )}
        </div>
        <span className="ms-time">{relTime(item.timestamp)}</span>
      </div>
    );
  }

  if (item.type === "follow") {
    return (
      <div className="ms-box" style={{ display: "flex", gap: 12, padding: 16, alignItems: "center", flexWrap: "wrap" }}>
        <Link href={`/${item.follower.username}`} style={{ flexShrink: 0 }}><Avatar user={item.follower} size={32} /></Link>
        <Link href={`/${item.follower.username}`} style={{ fontWeight: 700, color: C.text }}>{item.follower.username}</Link>
        <span style={{ color: C.muted, fontSize: 13 }}>is now listening to</span>
        <Link href={`/${item.following.username}`} style={{ flexShrink: 0 }}><Avatar user={item.following} size={24} /></Link>
        <Link href={`/${item.following.username}`} style={{ fontWeight: 700, color: C.text }}>{item.following.username}</Link>
        <span className="ms-time" style={{ marginLeft: "auto" }}>{relTime(item.timestamp)}</span>
      </div>
    );
  }

  if (item.type === "mix") {
    return (
      <div className="ms-box" style={{ display: "flex", gap: 16, padding: 16, alignItems: "center" }}>
        <Link href={`/${item.user.username}`} style={{ flexShrink: 0 }}><Avatar user={item.user} /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 2 }}>
            <Link href={`/${item.user.username}`} style={{ fontWeight: 700, color: C.text }}>{item.user.username}</Link>
            {" "}dropped a new mix
          </div>
          <Link href={`/${item.user.username}/mixes/${item.mix.id}`}
            style={{ fontFamily: "var(--font-nd-serif)", fontSize: 17, fontWeight: 600, color: C.text }}>
            {item.mix.title}
          </Link>
          <div className="ms-time" style={{ marginTop: 2 }}>{item.mix.itemCount} RECORDS · {relTime(item.timestamp)}</div>
        </div>
      </div>
    );
  }

  if (item.type === "spin") {
    return (
      <div className="ms-box" style={{ display: "flex", gap: 16, padding: 16, alignItems: "center" }}>
        <Link href={`/${item.user.username}`} style={{ flexShrink: 0 }}><Avatar user={item.user} /></Link>
        <Link href={`/album/${encodeURIComponent(item.album.discogsId)}`} style={{ flexShrink: 0 }}>
          <AlbumArt coverUrl={item.album.coverUrl} title={item.album.title} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 2 }}>
            <Link href={`/${item.user.username}`} style={{ fontWeight: 700, color: C.text }}>{item.user.username}</Link>
            {" "}↻ spun a listen
          </div>
          <Link href={`/album/${encodeURIComponent(item.album.discogsId)}`} style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{item.album.title}</Link>
          {item.album.artistMbid ? (
            <Link href={`/artist/${item.album.artistMbid}`} style={{ display: "block", fontSize: 12, color: C.muted, fontFamily: "var(--font-nd-mono)" }}>{item.album.artist}</Link>
          ) : (
            <div style={{ fontSize: 12, color: C.muted, fontFamily: "var(--font-nd-mono)" }}>{item.album.artist}</div>
          )}
        </div>
        <span className="ms-time">{relTime(item.timestamp)}</span>
      </div>
    );
  }

  if (item.type === "digest") {
    const day = new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return (
      <div className="ms-box" style={{ display: "flex", gap: 16, padding: 16, borderLeft: "4px solid var(--skin-surface-raised)" }}>
        <Link href={`/${item.user.username}`} style={{ flexShrink: 0 }}><Avatar user={item.user} /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>
            <Link href={`/${item.user.username}`} style={{ fontWeight: 700, color: C.text }}>{item.user.username}</Link>
            {" "}▶ streamed{" "}
            <span style={{ color: C.text }}>{item.count} album{item.count !== 1 ? "s" : ""}</span>
            {" "}on {day}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {item.albums.slice(0, 4).map((a, i) => (
              a.coverUrl ? (
                <Image key={i} src={a.coverUrl} alt={a.title} width={36} height={36}
                  className="object-cover" style={{ width: 36, height: 36, borderRadius: 4, flexShrink: 0 }} unoptimized />
              ) : (
                <div key={i} style={{ width: 36, height: 36, background: C.surfaceRaised, borderRadius: 4, flexShrink: 0 }} />
              )
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (item.type === "join") {
    return <JoinCard item={item} />;
  }

  return null;
}

function relTime(ts: string): string {
  const delta = Date.now() - new Date(ts).getTime();
  const m = Math.floor(delta / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function JoinCard({ item }: { item: Extract<FeedItem, { type: "join" }> }) {
  const [isFollowing, setIsFollowing] = useState(item.initialIsFollowing);
  const [loading, setLoading] = useState(false);

  async function handleFollow() {
    setLoading(true);
    const res = await fetch("/api/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: item.user.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setIsFollowing(data.following);
    }
    setLoading(false);
  }

  const cardStyle = { backgroundColor: C.surface, border: `1px solid ${C.border}` };
  return (
    <div className="flex items-center gap-4 p-4" style={cardStyle}>
      <Link href={`/${item.user.username}`} className="shrink-0">
        <Avatar user={item.user} />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="text-sm" style={{ color: C.muted }}>
          <Link href={`/${item.user.username}`} className="font-bold hover:underline" style={{ color: C.text }}>
            {item.user.username}
          </Link>{" "}just joined NeedleDrop 👋
        </div>
        <div className="text-xs font-mono mt-0.5" style={{ color: C.subtle }}>
          {new Date(item.timestamp).toLocaleDateString()}
        </div>
      </div>
      <button
        onClick={handleFollow}
        disabled={loading}
        className="shrink-0 px-4 py-2 text-xs font-mono transition-colors duration-100"
        style={{
          backgroundColor: isFollowing ? C.surfaceRaised : C.accent,
          color: isFollowing ? C.muted : C.text,
          borderRadius: 4,
          border: `1px solid ${isFollowing ? C.border : C.accent}`,
          opacity: loading ? 0.4 : 1,
        }}>
        {isFollowing ? "FOLLOWING" : "FOLLOW"}
      </button>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 mt-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const full = star <= Math.floor(rating);
        const half = !full && star === Math.ceil(rating) && rating % 1 !== 0;
        return (
          <span key={star} className="text-xs" style={{ position: "relative", display: "inline-block" }}>
            <span style={{ color: C.border }}>★</span>
            {(full || half) && (
              <span style={{ position: "absolute", left: 0, top: 0, overflow: "hidden", width: full ? "100%" : "50%", color: C.accent }}>★</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
