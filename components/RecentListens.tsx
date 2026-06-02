"use client";

import { useState } from "react";
import Image from "next/image";
import EditLogModal from "./EditLogModal";

const C = {
  surface:       "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border:        "var(--skin-border)",
  text:          "var(--skin-text)",
  muted:         "var(--skin-muted)",
  subtle:        "var(--skin-subtle)",
  accent:        "var(--skin-accent)",
};

interface Log {
  id: string;
  rating: number | null;
  review: string | null;
  format: string | null;
  source: string;
  playedAt: string;
  spinCount: number;
  userHasSpun: boolean;
  album: {
    title: string;
    artist: string;
    coverUrl: string | null;
  };
}

export default function RecentListens({ logs, isOwnProfile }: { logs: Log[]; isOwnProfile: boolean }) {
  const [editTarget, setEditTarget] = useState<Log | null>(null);
  const [spinStates, setSpinStates] = useState<Record<string, { count: number; spun: boolean }>>(
    Object.fromEntries(logs.map((l) => [l.id, { count: l.spinCount, spun: l.userHasSpun }]))
  );

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
        [logId]: { count: prev[logId].count + (data.spun ? 1 : -1), spun: data.spun },
      }));
    }
  }

  if (logs.length === 0) {
    return (
      <div className="p-8 text-center text-sm font-mono"
        style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
        No listens logged yet.
      </div>
    );
  }

  // First 4 always visible, rest scrollable
  const first4 = logs.slice(0, 4);
  const rest = logs.slice(4);

  function LogEntry({ log }: { log: Log }) {
    const spin = spinStates[log.id];
    return (
      <div className="flex gap-4 p-3 items-start"
        style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
        {log.album.coverUrl ? (
          <Image src={log.album.coverUrl} alt={log.album.title} width={48} height={48}
            className="object-cover shrink-0" style={{ width: 48, height: 48, borderRadius: 4 }} unoptimized />
        ) : (
          <div className="shrink-0" style={{ width: 48, height: 48, backgroundColor: C.surfaceRaised, borderRadius: 4 }} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: C.text }}>{log.album.title}</span>
            <span className="text-xs font-mono" style={{ color: C.muted }}>{log.album.artist}</span>
          </div>
          {log.rating != null && <StarRating rating={log.rating} />}
          {log.review && (
            <p className="mt-1 text-sm line-clamp-2" style={{ color: C.muted }}>{log.review}</p>
          )}
          <div className="mt-1 flex gap-3 text-xs font-mono" style={{ color: C.subtle }}>
            {log.source === "streaming" ? (
              <span style={{ color: C.muted }}>▶ STREAMING</span>
            ) : log.format ? (
              <span>{log.format}</span>
            ) : null}
            <span>{new Date(log.playedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0 items-end">
          <button onClick={() => handleSpin(log.id)}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-mono transition-colors duration-100"
            style={{
              backgroundColor: spin?.spun ? C.accent : C.surfaceRaised,
              color: spin?.spun ? C.text : C.muted,
              borderRadius: 4,
              border: `1px solid ${spin?.spun ? C.accent : C.border}`,
            }}>
            ↻ {spin?.count ?? 0}
          </button>
          {isOwnProfile && (
            <button onClick={() => setEditTarget(log)}
              className="px-2 py-1.5 text-xs font-mono transition-colors duration-100"
              style={{ backgroundColor: C.surfaceRaised, color: C.subtle, borderRadius: 4, border: `1px solid ${C.border}` }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.subtle)}>
              EDIT
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {first4.map((log) => <LogEntry key={log.id} log={log} />)}
        {rest.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1"
            style={{ scrollbarWidth: "thin", scrollbarColor: `${C.border} transparent` }}>
            {rest.map((log) => <LogEntry key={log.id} log={log} />)}
          </div>
        )}
      </div>

      {editTarget && (
        <EditLogModal
          log={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => { setEditTarget(null); window.location.reload(); }}
        />
      )}
    </>
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
            <span style={{ color: "var(--skin-border)" }}>★</span>
            {(full || half) && (
              <span style={{ position: "absolute", left: 0, top: 0, overflow: "hidden", width: full ? "100%" : "50%", color: "var(--skin-accent)" }}>★</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
