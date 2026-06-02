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
  accentMuted:   "var(--skin-accent-muted)",
  danger:        "var(--skin-danger)",
};

interface Log {
  id: string;
  playedAt: string;
  rating: number | null;
  review: string | null;
  format: string | null;
  source: string;
  spinCount: number;
  userHasSpun: boolean;
  user: { username: string; avatarUrl: string | null };
}

interface Track {
  position: string;
  title: string;
  length?: number;
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
  spinCount: number;
  userHasSpun: boolean;
  replies: Comment[];
}

interface AlbumTabsClientProps {
  albumId: string;
  logs: Log[];
  tracks: Track[];
  pressings: Pressing[];
  initialComments: Comment[];
  currentUsername: string | null;
}

type Tab = "reviews" | "tracks" | "discussion" | "pressings";

const FORMATS = ["Vinyl", "CD", "Cassette", "Digital", "Other"];

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
          <span key={star} style={{ position: "relative", display: "inline-block" }}>
            <span style={{ color: C.border, fontSize: "0.75rem" }}>★</span>
            {(full || half) && (
              <span style={{ position: "absolute", left: 0, top: 0, overflow: "hidden", width: full ? "100%" : "50%", color: C.accent, fontSize: "0.75rem" }}>★</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(value === star ? 0 : star)}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "1rem", color: (hover || value) >= star ? C.accent : C.border }}>
          ★
        </button>
      ))}
      {value > 0 && (
        <button type="button" onClick={() => onChange(0)}
          className="text-xs font-mono ml-1"
          style={{ background: "none", border: "none", cursor: "pointer", color: C.subtle }}>
          clear
        </button>
      )}
    </div>
  );
}

function Avatar({ user }: { user: { username: string; avatarUrl: string | null } }) {
  return user.avatarUrl ? (
    <Image src={user.avatarUrl} alt={user.username} width={36} height={36}
      className="object-cover shrink-0" unoptimized
      style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${C.border}` }} />
  ) : (
    <div className="shrink-0 flex items-center justify-center text-sm font-bold"
      style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: C.surfaceRaised, color: C.subtle }}>
      {user.username[0].toUpperCase()}
    </div>
  );
}

function SmallAvatar({ user }: { user: { username: string; avatarUrl: string | null } }) {
  return user.avatarUrl ? (
    <Image src={user.avatarUrl} alt={user.username} width={28} height={28}
      className="object-cover shrink-0" unoptimized
      style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${C.border}` }} />
  ) : (
    <div className="shrink-0 flex items-center justify-center text-xs font-bold"
      style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: C.surfaceRaised, color: C.subtle }}>
      {user.username[0].toUpperCase()}
    </div>
  );
}

export default function AlbumTabsClient({
  albumId, logs: initialLogs, tracks, pressings, initialComments, currentUsername,
}: AlbumTabsClientProps) {
  const isLoggedIn = !!currentUsername;

  const [activeTab, setActiveTab] = useState<Tab>("reviews");

  // ── Logs state ──────────────────────────────────────────────────────────────
  const [logs, setLogs] = useState<Log[]>(initialLogs);
  const [spinState, setSpinState] = useState<Record<string, { count: number; active: boolean }>>(() => {
    const init: Record<string, { count: number; active: boolean }> = {};
    for (const l of initialLogs) init[l.id] = { count: l.spinCount, active: l.userHasSpun };
    return init;
  });
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ rating: 0, review: "", format: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  // ── Comments state ───────────────────────────────────────────────────────────
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [postingReply, setPostingReply] = useState(false);
  const [commentSpinState, setCommentSpinState] = useState<Record<string, { count: number; active: boolean }>>(() => {
    const init: Record<string, { count: number; active: boolean }> = {};
    function seed(c: Comment) {
      init[c.id] = { count: c.spinCount, active: c.userHasSpun };
      for (const r of c.replies) seed(r);
    }
    for (const c of initialComments) seed(c);
    return init;
  });

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "reviews",    label: "Logs",       count: logs.length },
    { key: "tracks",     label: "Tracks",     count: tracks.length },
    { key: "discussion", label: "Discussion", count: comments.length },
    { key: "pressings",  label: "Pressings",  count: pressings.length },
  ];

  // ── Handlers: Logs ──────────────────────────────────────────────────────────

  async function handleSpin(logId: string) {
    if (!isLoggedIn) return;
    const prev = spinState[logId] ?? { count: 0, active: false };
    setSpinState((s) => ({
      ...s,
      [logId]: { count: prev.active ? prev.count - 1 : prev.count + 1, active: !prev.active },
    }));
    await fetch("/api/spins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId }),
    });
  }

  function startEdit(log: Log) {
    setEditingLogId(log.id);
    setEditForm({ rating: log.rating ?? 0, review: log.review ?? "", format: log.format ?? "" });
  }

  async function handleSaveEdit(logId: string) {
    setSavingEdit(true);
    const res = await fetch("/api/logs/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId, rating: editForm.rating || null, review: editForm.review || null, format: editForm.format || null }),
    });
    if (res.ok) {
      setLogs((prev) => prev.map((l) =>
        l.id === logId ? { ...l, rating: editForm.rating || null, review: editForm.review || null, format: editForm.format || null } : l
      ));
      setEditingLogId(null);
    }
    setSavingEdit(false);
  }

  async function handleDeleteLog(logId: string) {
    setDeletingLogId(logId);
    const res = await fetch(`/api/logs/${logId}`, { method: "DELETE" });
    if (res.ok) {
      setLogs((prev) => prev.filter((l) => l.id !== logId));
      setSpinState((s) => { const n = { ...s }; delete n[logId]; return n; });
    }
    setDeletingLogId(null);
  }

  // ── Handlers: Comments ──────────────────────────────────────────────────────

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
      const c: Comment = { ...data.comment, spinCount: 0, userHasSpun: false, replies: [] };
      setComments((prev) => [c, ...prev]);
      setCommentSpinState((s) => ({ ...s, [c.id]: { count: 0, active: false } }));
      setNewComment("");
    }
    setPosting(false);
  }

  async function handleReply(parentId: string) {
    if (!replyContent.trim()) return;
    setPostingReply(true);
    const res = await fetch(`/api/albums/${albumId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyContent, parentId }),
    });
    if (res.ok) {
      const data = await res.json();
      const reply: Comment = { ...data.comment, spinCount: 0, userHasSpun: false, replies: [] };
      setComments((prev) => prev.map((c) =>
        c.id === parentId ? { ...c, replies: [...c.replies, reply] } : c
      ));
      setCommentSpinState((s) => ({ ...s, [reply.id]: { count: 0, active: false } }));
      setReplyContent("");
      setReplyingToId(null);
    }
    setPostingReply(false);
  }

  async function handleDeleteComment(commentId: string, parentId?: string) {
    const res = await fetch(`/api/albums/${albumId}/comments/${commentId}`, { method: "DELETE" });
    if (res.ok) {
      if (parentId) {
        setComments((prev) => prev.map((c) =>
          c.id === parentId ? { ...c, replies: c.replies.filter((r) => r.id !== commentId) } : c
        ));
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    }
  }

  async function handleCommentSpin(commentId: string) {
    if (!isLoggedIn) return;
    const prev = commentSpinState[commentId] ?? { count: 0, active: false };
    setCommentSpinState((s) => ({
      ...s,
      [commentId]: { count: prev.active ? prev.count - 1 : prev.count + 1, active: !prev.active },
    }));
    await fetch("/api/comment-spins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });
  }

  // ── Render helpers ──────────────────────────────────────────────────────────

  function renderCommentCard(c: Comment, parentId?: string) {
    const cs = commentSpinState[c.id] ?? { count: c.spinCount, active: c.userHasSpun };
    const isOwn = currentUsername === c.user.username;
    return (
      <div key={c.id} className="p-3" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
        <div className="flex gap-2">
          <Link href={`/${c.user.username}`} className="shrink-0">
            <SmallAvatar user={c.user} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <Link href={`/${c.user.username}`} className="text-sm font-semibold hover:underline" style={{ color: C.text }}>
                {c.user.username}
              </Link>
              <span className="text-xs font-mono" style={{ color: C.subtle }}>
                {new Date(c.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm" style={{ color: C.muted }}>{c.content}</p>
            <div className="flex items-center gap-3 mt-2">
              {/* Spin/like button */}
              <button onClick={() => handleCommentSpin(c.id)}
                className="flex items-center gap-1 text-xs font-mono transition-colors duration-100"
                style={{ color: cs.active ? C.accent : C.subtle, background: "none", border: "none", cursor: isLoggedIn ? "pointer" : "default" }}>
                ♥ {cs.count > 0 ? cs.count : ""}
              </button>
              {/* Reply button */}
              {isLoggedIn && !parentId && (
                <button onClick={() => setReplyingToId(replyingToId === c.id ? null : c.id)}
                  className="text-xs font-mono transition-colors duration-100"
                  style={{ color: replyingToId === c.id ? C.accent : C.subtle, background: "none", border: "none", cursor: "pointer" }}>
                  reply
                </button>
              )}
              {/* Delete button */}
              {isOwn && (
                <button onClick={() => handleDeleteComment(c.id, parentId)}
                  className="text-xs font-mono transition-colors duration-100"
                  style={{ color: C.subtle, background: "none", border: "none", cursor: "pointer" }}>
                  delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Inline reply form */}
        {replyingToId === c.id && (
          <div className="mt-3 ml-10">
            <div className="flex gap-2">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`Reply to ${c.user.username}…`}
                rows={2}
                className="flex-1 text-sm px-3 py-2 outline-none resize-none"
                style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
              />
              <div className="flex flex-col gap-1">
                <button onClick={() => handleReply(c.id)} disabled={postingReply || !replyContent.trim()}
                  className="px-3 py-1.5 text-xs font-mono transition-colors duration-100"
                  style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4, opacity: postingReply ? 0.4 : 1 }}>
                  {postingReply ? "…" : "POST"}
                </button>
                <button onClick={() => { setReplyingToId(null); setReplyContent(""); }}
                  className="px-3 py-1.5 text-xs font-mono transition-colors duration-100"
                  style={{ backgroundColor: C.surfaceRaised, color: C.muted, borderRadius: 4, border: `1px solid ${C.border}` }}>
                  cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Replies */}
        {c.replies.length > 0 && (
          <div className="mt-3 ml-10 space-y-2">
            {c.replies.map((r) => renderCommentCard(r, c.id))}
          </div>
        )}
      </div>
    );
  }

  function renderLogCard(log: Log) {
    const ss = spinState[log.id] ?? { count: log.spinCount, active: log.userHasSpun };
    const isOwn = currentUsername === log.user.username;
    const isEditing = editingLogId === log.id;
    const isDeleting = deletingLogId === log.id;

    if (isEditing) {
      return (
        <div key={log.id} className="p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.accent}` }}>
          <div className="flex items-center gap-2 mb-3">
            <Link href={`/${log.user.username}`} className="text-sm font-semibold hover:underline" style={{ color: C.text }}>
              {log.user.username}
            </Link>
            <span className="text-xs font-mono" style={{ color: C.subtle }}>{new Date(log.playedAt).toLocaleDateString()}</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xs font-mono mb-1" style={{ color: C.subtle }}>RATING</div>
              <StarPicker value={editForm.rating} onChange={(v) => setEditForm((f) => ({ ...f, rating: v }))} />
            </div>
            <div>
              <div className="text-xs font-mono mb-1" style={{ color: C.subtle }}>FORMAT</div>
              <div className="flex gap-1 flex-wrap">
                {FORMATS.map((f) => (
                  <button key={f} type="button" onClick={() => setEditForm((ef) => ({ ...ef, format: ef.format === f ? "" : f }))}
                    className="px-2 py-1 text-xs font-mono transition-colors duration-100"
                    style={{
                      borderRadius: 4, border: `1px solid ${C.border}`,
                      backgroundColor: editForm.format === f ? C.accent : C.surfaceRaised,
                      color: editForm.format === f ? C.text : C.muted,
                    }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-mono mb-1" style={{ color: C.subtle }}>REVIEW</div>
              <textarea
                value={editForm.review}
                onChange={(e) => setEditForm((f) => ({ ...f, review: e.target.value }))}
                rows={3}
                className="w-full text-sm px-3 py-2 outline-none resize-none"
                style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleSaveEdit(log.id)} disabled={savingEdit}
                className="px-4 py-2 text-xs font-mono transition-colors duration-100"
                style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4, opacity: savingEdit ? 0.4 : 1 }}>
                {savingEdit ? "SAVING…" : "SAVE"}
              </button>
              <button onClick={() => setEditingLogId(null)}
                className="px-4 py-2 text-xs font-mono transition-colors duration-100"
                style={{ backgroundColor: C.surfaceRaised, color: C.muted, borderRadius: 4, border: `1px solid ${C.border}` }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={log.id} className="flex gap-4 p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, opacity: isDeleting ? 0.4 : 1 }}>
        <Link href={`/${log.user.username}`} className="shrink-0">
          <Avatar user={log.user} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
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
            </div>
            {isOwn && (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEdit(log)}
                  className="text-xs font-mono transition-colors duration-100"
                  style={{ color: C.subtle, background: "none", border: "none", cursor: "pointer" }}>
                  edit
                </button>
                <button onClick={() => handleDeleteLog(log.id)} disabled={isDeleting}
                  className="text-xs font-mono transition-colors duration-100"
                  style={{ color: C.subtle, background: "none", border: "none", cursor: "pointer" }}>
                  delete
                </button>
              </div>
            )}
          </div>
          {log.review && <p className="mt-1 text-sm" style={{ color: C.muted }}>{log.review}</p>}
          <div className="mt-1.5 flex gap-3 items-center text-xs font-mono" style={{ color: C.subtle }}>
            <span>{new Date(log.playedAt).toLocaleDateString()}</span>
            <button
              onClick={() => handleSpin(log.id)}
              className="flex items-center gap-1 transition-colors duration-100"
              style={{
                color: ss.active ? C.accent : C.subtle,
                background: "none", border: "none",
                cursor: isLoggedIn ? "pointer" : "default",
              }}>
              ↻ {ss.count}
            </button>
          </div>
        </div>
      </div>
    );
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
              marginBottom: -1, background: "none", border: "none", cursor: "pointer",
              borderBottomColor: activeTab === t.key ? C.accent : "transparent",
              borderBottomWidth: 2,
              borderBottomStyle: "solid",
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

      {/* Logs tab */}
      {activeTab === "reviews" && (
        logs.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono" style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
            No one has logged this album yet.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => renderLogCard(log))}
          </div>
        )
      )}

      {/* Tracks tab */}
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

      {/* Discussion tab */}
      {activeTab === "discussion" && (
        <div className="space-y-4">
          {isLoggedIn && (
            <form onSubmit={handleComment} className="space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add your thoughts…"
                rows={3}
                className="w-full text-sm px-3 py-2 outline-none transition-colors duration-100 resize-none"
                style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
              />
              <button type="submit" disabled={posting || !newComment.trim()}
                className="px-4 py-2 text-xs font-mono transition-colors duration-100"
                style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4, opacity: posting ? 0.4 : 1 }}>
                {posting ? "POSTING…" : "POST"}
              </button>
            </form>
          )}
          {comments.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono" style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
              No discussion yet. Be the first.
            </div>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => renderCommentCard(c))}
            </div>
          )}
        </div>
      )}

      {/* Pressings tab */}
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
