"use client";

import { useState } from "react";
import Image from "next/image";
import EditLogModal from "./EditLogModal";

const C = {
  surface: "#3D3834",
  surfaceRaised: "#4A4540",
  border: "#524D48",
  text: "#F7F1E3",
  muted: "#A89F94",
  subtle: "#6B6560",
  accent: "#E67E22",
};

interface Log {
  id: string;
  rating: number | null;
  review: string | null;
  format: string | null;
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
        [logId]: {
          count: prev[logId].count + (data.spun ? 1 : -1),
          spun: data.spun,
        },
      }));
    }
  }

  if (logs.length === 0) {
    return (
      <div className="p-8 text-center text-sm font-mono" style={{ border: `1px dashed #524D48`, color: "#6B6560" }}>
        No listens logged yet.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {logs.map((log) => {
          const spin = spinStates[log.id];
          return (
            <div key={log.id} className="flex gap-4 p-3 items-start"
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
                  {log.format && <span>{log.format}</span>}
                  <span>{new Date(log.playedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 shrink-0 items-end">
                {/* Spin button */}
                <button
                  onClick={() => handleSpin(log.id)}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-mono transition-colors duration-100"
                  style={{
                    backgroundColor: spin?.spun ? C.accent : C.surfaceRaised,
                    color: spin?.spun ? C.text : C.muted,
                    borderRadius: 4,
                    border: `1px solid ${spin?.spun ? C.accent : C.border}`,
                  }}
                  onMouseEnter={(e) => !spin?.spun && (e.currentTarget.style.color = C.text)}
                  onMouseLeave={(e) => !spin?.spun && (e.currentTarget.style.color = C.muted)}
                >
                  ↻ {spin?.count ?? 0}
                </button>

                {/* Edit button - own profile only */}
                {isOwnProfile && (
                  <button
                    onClick={() => setEditTarget(log)}
                    className="px-2 py-1.5 text-xs font-mono transition-colors duration-100"
                    style={{ backgroundColor: C.surfaceRaised, color: C.subtle, borderRadius: 4, border: `1px solid ${C.border}` }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = C.subtle)}
                  >
                    EDIT
                  </button>
                )}
              </div>
            </div>
          );
        })}
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
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex gap-0.5 mt-1">
      {stars.map((star) => {
        const full = star <= Math.floor(rating);
        const half = !full && star === Math.ceil(rating) && rating % 1 !== 0;
        return (
          <span key={star} className="text-xs" style={{ position: "relative", display: "inline-block" }}>
            <span style={{ color: "#524D48" }}>★</span>
            {(full || half) && (
              <span style={{
                position: "absolute", left: 0, top: 0, overflow: "hidden",
                width: full ? "100%" : "50%", color: "#E67E22",
              }}>★</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
