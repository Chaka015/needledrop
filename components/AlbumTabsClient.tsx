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

interface Log {
  id: string;
  playedAt: string;
  rating: number | null;
  review: string | null;
  format: string | null;
  source: string;
  spinCount: number;
  user: { username: string; avatarUrl: string | null };
}

interface Track {
  position: string;
  title: string;
  length?: number; // ms
}

interface Pressing {
  id: string;
  country: string;
  year: number | null;
  label: string | null;
  catno: string | null;
  format: string | null;
  variant: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { username: string; avatarUrl: string | null };
}

interface AlbumTabsClientProps {
  albumId: string;
  logs: Log[];
  tracks: Track[];
  pressings: Pressing[];
  initialComments: Comment[];
  isLoggedIn: boolean;
}

type Tab = "reviews" | "tracks" | "discussion" | "pressings";

function msToMinSec(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 mt-0.5">
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

export default function AlbumTabsClient({ albumId, logs, tracks, pressings, initialComments, isLoggedIn }: AlbumTabsClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("reviews");
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "reviews", label: "Logs", count: logs.length },
    { key: "tracks", label: "Tracks", count: tracks.length },
    { key: "discussion", label: "Discussion", count: comments.length },
    { key: "pressings", label: "Pressings", count: pressings.length },
  ];

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/albums/${albumId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment }),
    });
    if (res.ok) {
      const data = await res.json();
      setComments((prev) => [data.comment, ...prev]);
      setNewComment("");
    }
    setPosting(false);
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-0 mb-6" style={{ borderBottom: `1px solid ${C.border}` }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="px-4 py-2 text-xs font-mono uppercase tracking-widest transition-colors duration-100"
            style={{
              color: activeTab === t.key ? C.text : C.subtle,
              borderBottom: activeTab === t.key ? `2px solid ${C.accent}` : "2px solid transparent",
              marginBottom: -1,
            }}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 text-xs" style={{ color: activeTab === t.key ? C.muted : C.subtle }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reviews / Logs */}
      {activeTab === "reviews" && (
        logs.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono" style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
            No one has logged this album yet.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-4 p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                <Link href={`/${log.user.username}`} className="shrink-0">
                  {log.user.avatarUrl ? (
                    <Image src={log.user.avatarUrl} alt={log.user.username} width={36} height={36}
                      className="object-cover" style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${C.border}` }} unoptimized />
                  ) : (
                    <div className="flex items-center justify-center text-sm font-bold"
                      style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: C.surfaceRaised, color: C.subtle }}>
                      {log.user.username[0].toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <Link href={`/${log.user.username}`} className="font-semibold text-sm hover:underline" style={{ color: C.text }}>
                      {log.user.username}
                    </Link>
                    {log.source === "streaming" ? (
                      <span className="text-xs font-mono" style={{ color: C.muted }}>▶</span>
                    ) : log.format ? (
                      <span className="text-xs font-mono" style={{ color: C.subtle }}>{log.format}</span>
                    ) : null}
                  </div>
                  {log.rating != null && <StarRating rating={log.rating} />}
                  {log.review && <p className="mt-1 text-sm" style={{ color: C.muted }}>{log.review}</p>}
                  <div className="mt-1 flex gap-3 text-xs font-mono" style={{ color: C.subtle }}>
                    <span>{new Date(log.playedAt).toLocaleDateString()}</span>
                    <span>↻ {log.spinCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Track listing */}
      {activeTab === "tracks" && (
        tracks.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono" style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
            Track listing not available.
          </div>
        ) : (
          <div className="space-y-0.5">
            {tracks.map((t) => (
              <div key={t.position} className="flex items-center gap-4 px-3 py-2"
                style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                <span className="text-xs font-mono w-6 text-right shrink-0" style={{ color: C.subtle }}>{t.position}</span>
                <span className="flex-1 text-sm truncate" style={{ color: C.text }}>{t.title}</span>
                {t.length && (
                  <span className="text-xs font-mono shrink-0" style={{ color: C.subtle }}>{msToMinSec(t.length)}</span>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Discussion */}
      {activeTab === "discussion" && (
        <div className="space-y-4">
          {isLoggedIn && (
            <form onSubmit={handleComment} className="space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add your thoughts..."
                rows={3}
                className="w-full text-sm px-3 py-2 outline-none transition-colors duration-100 resize-none"
                style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
              />
              <button type="submit" disabled={posting || !newComment.trim()}
                className="px-4 py-2 text-xs font-mono transition-colors duration-100"
                style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4, opacity: posting ? 0.4 : 1 }}>
                {posting ? "POSTING..." : "POST"}
              </button>
            </form>
          )}
          {comments.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono" style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
              No discussion yet. Be the first.
            </div>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Link href={`/${c.user.username}`} className="text-sm font-semibold hover:underline" style={{ color: C.text }}>
                      {c.user.username}
                    </Link>
                    <span className="text-xs font-mono" style={{ color: C.subtle }}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: C.muted }}>{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pressings */}
      {activeTab === "pressings" && (
        pressings.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono" style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
            No pressing data available.
          </div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-5 gap-3 px-3 py-1 text-xs font-mono" style={{ color: C.subtle }}>
              <span>YEAR</span><span>COUNTRY</span><span>LABEL</span><span>CAT #</span><span>FORMAT</span>
            </div>
            {pressings.map((p) => (
              <div key={p.id} className="grid grid-cols-5 gap-3 px-3 py-2 text-xs font-mono"
                style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
                <span>{p.year ?? "—"}</span>
                <span>{p.country}</span>
                <span className="truncate" style={{ color: C.muted }}>{p.label ?? "—"}</span>
                <span className="truncate" style={{ color: C.muted }}>{p.catno ?? "—"}</span>
                <span style={{ color: C.subtle }}>{p.format ?? "—"}</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
