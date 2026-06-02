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
      album: { title: string; artist: string; coverUrl: string | null; discogsId: string };
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
      album: { title: string; artist: string; coverUrl: string | null; discogsId: string };
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
      album: { title: string; artist: string; coverUrl: string | null; discogsId: string };
      logId: string;
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
    return true;
  });
  const items = collapseDigests(filtered);

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-0 mb-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        {(["friends", "community"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2 text-xs font-mono uppercase tracking-widest transition-colors duration-100"
            style={{
              color: tab === t ? C.text : C.subtle,
              borderBottom: tab === t ? `2px solid ${C.accent}` : "2px solid transparent",
              marginBottom: -1,
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* Filter pills */}
      {prefsLoaded && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {FILTER_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => togglePref(key)}
              className="px-2.5 py-1 text-xs font-mono transition-colors duration-100"
              style={{
                backgroundColor: prefs[key] ? C.accent : C.surfaceRaised,
                color: prefs[key] ? C.text : C.subtle,
                borderRadius: 4,
                border: `1px solid ${prefs[key] ? C.accent : C.border}`,
              }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div className="p-8 text-center text-sm font-mono"
          style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
          {tab === "friends"
            ? "Nothing from friends yet. Follow some listeners!"
            : "No activity yet."}
        </div>
      ) : (
        <div className="space-y-2">
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
  const cardStyle = { backgroundColor: C.surface, border: `1px solid ${C.border}` };

  if (item.type === "listen") {
    const spin = spinStates[item.id];
    return (
      <div className="flex gap-4 p-4" style={cardStyle}>
        <Link href={`/${item.user.username}`} className="shrink-0">
          <Avatar user={item.user} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <Link href={`/album/${item.album.discogsId}`}>
              <AlbumArt coverUrl={item.album.coverUrl} title={item.album.title} />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono mb-0.5" style={{ color: C.muted }}>
                <Link href={`/${item.user.username}`} className="font-bold hover:underline" style={{ color: C.text }}>
                  {item.user.username}
                </Link>{" "}logged a listen
              </div>
              <Link href={`/album/${item.album.discogsId}`}>
                <div className="font-semibold text-sm truncate hover:underline" style={{ color: C.text }}>{item.album.title}</div>
              </Link>
              <div className="text-xs font-mono" style={{ color: C.muted }}>{item.album.artist}</div>
              {item.rating != null && <StarRating rating={item.rating} />}
              {item.review && <p className="mt-1 text-sm line-clamp-2" style={{ color: C.muted }}>{item.review}</p>}
              <div className="mt-1 text-xs font-mono" style={{ color: C.subtle }}>
                {item.source === "streaming" ? (
                  <span className="mr-3" style={{ color: C.muted }}>▶ STREAMING</span>
                ) : item.format ? (
                  <span className="mr-3">{item.format}</span>
                ) : null}
                {new Date(item.timestamp).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => onSpin(item.id)}
          className="shrink-0 flex items-center gap-1 px-2 py-1.5 text-xs font-mono transition-colors duration-100 self-start"
          style={{
            backgroundColor: spin?.spun ? C.accent : C.surfaceRaised,
            color: spin?.spun ? C.text : C.muted,
            borderRadius: 4,
            border: `1px solid ${spin?.spun ? C.accent : C.border}`,
          }}>
          ↻ {spin?.count ?? 0}
        </button>
      </div>
    );
  }

  if (item.type === "add") {
    return (
      <div className="flex gap-4 p-4" style={cardStyle}>
        <Link href={`/${item.user.username}`} className="shrink-0"><Avatar user={item.user} /></Link>
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <Link href={`/album/${item.album.discogsId}`}>
            <AlbumArt coverUrl={item.album.coverUrl} title={item.album.title} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono mb-0.5" style={{ color: C.muted }}>
              <Link href={`/${item.user.username}`} className="font-bold hover:underline" style={{ color: C.text }}>
                {item.user.username}
              </Link>{" "}added to collection
            </div>
            <Link href={`/album/${item.album.discogsId}`}>
              <div className="font-semibold text-sm truncate hover:underline" style={{ color: C.text }}>{item.album.title}</div>
            </Link>
            <div className="text-xs font-mono" style={{ color: C.muted }}>{item.album.artist}</div>
            <div className="mt-1 text-xs font-mono" style={{ color: C.subtle }}>
              {new Date(item.timestamp).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (item.type === "follow") {
    return (
      <div className="flex gap-4 p-4" style={cardStyle}>
        <Link href={`/${item.follower.username}`} className="shrink-0"><Avatar user={item.follower} /></Link>
        <div className="flex-1 min-w-0 flex items-center gap-2 text-sm">
          <Link href={`/${item.follower.username}`} className="font-bold hover:underline" style={{ color: C.text }}>
            {item.follower.username}
          </Link>
          <span style={{ color: C.muted }}>started following</span>
          <Link href={`/${item.following.username}`}>
            <Avatar user={item.following} size={24} />
          </Link>
          <Link href={`/${item.following.username}`} className="font-bold hover:underline" style={{ color: C.text }}>
            {item.following.username}
          </Link>
          <span className="ml-auto text-xs font-mono" style={{ color: C.subtle }}>
            {new Date(item.timestamp).toLocaleDateString()}
          </span>
        </div>
      </div>
    );
  }

  if (item.type === "mix") {
    return (
      <div className="flex gap-4 p-4" style={cardStyle}>
        <Link href={`/${item.user.username}`} className="shrink-0"><Avatar user={item.user} /></Link>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono mb-0.5" style={{ color: C.muted }}>
            <Link href={`/${item.user.username}`} className="font-bold hover:underline" style={{ color: C.text }}>
              {item.user.username}
            </Link>{" "}created a mix
          </div>
          <Link href={`/${item.user.username}/mixes/${item.mix.id}`}
            className="font-semibold text-sm hover:underline" style={{ color: C.text }}>
            {item.mix.title}
          </Link>
          <div className="mt-0.5 text-xs font-mono" style={{ color: C.subtle }}>
            {item.mix.itemCount} RECORDS · {new Date(item.timestamp).toLocaleDateString()}
          </div>
        </div>
      </div>
    );
  }

  if (item.type === "spin") {
    return (
      <div className="flex gap-4 p-4" style={cardStyle}>
        <Link href={`/${item.user.username}`} className="shrink-0"><Avatar user={item.user} /></Link>
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <AlbumArt coverUrl={item.album.coverUrl} title={item.album.title} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono mb-0.5" style={{ color: C.muted }}>
              <Link href={`/${item.user.username}`} className="font-bold hover:underline" style={{ color: C.text }}>
                {item.user.username}
              </Link>{" "}↻ spun a listen
            </div>
            <div className="font-semibold text-sm truncate" style={{ color: C.text }}>{item.album.title}</div>
            <div className="text-xs font-mono" style={{ color: C.muted }}>{item.album.artist}</div>
            <div className="mt-1 text-xs font-mono" style={{ color: C.subtle }}>
              {new Date(item.timestamp).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (item.type === "digest") {
    const day = new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return (
      <div className="flex gap-4 p-4" style={{ ...cardStyle, borderLeft: "3px solid #4A4540" }}>
        <Link href={`/${item.user.username}`} className="shrink-0"><Avatar user={item.user} /></Link>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono mb-2" style={{ color: C.muted }}>
            <Link href={`/${item.user.username}`} className="font-bold hover:underline" style={{ color: C.text }}>
              {item.user.username}
            </Link>{" "}streamed{" "}
            <span style={{ color: C.text }}>{item.count} album{item.count !== 1 ? "s" : ""}</span>
            {" "}on {day}
          </div>
          <div className="flex gap-1.5 mb-2">
            {item.albums.slice(0, 4).map((a, i) => (
              a.coverUrl ? (
                <Image key={i} src={a.coverUrl} alt={a.title} width={36} height={36}
                  className="object-cover shrink-0" style={{ width: 36, height: 36, borderRadius: 4 }} unoptimized />
              ) : (
                <div key={i} className="shrink-0" style={{ width: 36, height: 36, backgroundColor: C.surfaceRaised, borderRadius: 4 }} />
              )
            ))}
          </div>
          <p className="text-xs font-mono" style={{ color: C.subtle }}>
            Add any to your collection? → Visit their profile
          </p>
        </div>
      </div>
    );
  }

  return null;
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
