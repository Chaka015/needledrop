"use client";

import { useState } from "react";
import Image from "next/image";
import EditLogModal from "./EditLogModal";

const C = {
  surface: "#3D3834",
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
  album: {
    title: string;
    artist: string;
    coverUrl: string | null;
  };
}

export default function RecentListens({ logs }: { logs: Log[] }) {
  const [editTarget, setEditTarget] = useState<Log | null>(null);

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
        {logs.map((log) => (
          <div key={log.id} className="flex gap-4 p-3 items-start"
            style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>

            {/* Album art */}
            {log.album.coverUrl ? (
              <Image src={log.album.coverUrl} alt={log.album.title} width={48} height={48}
                className="object-cover shrink-0" style={{ width: 48, height: 48, borderRadius: 4 }} unoptimized />
            ) : (
              <div className="shrink-0" style={{ width: 48, height: 48, backgroundColor: "#4A4540", borderRadius: 4 }} />
            )}

            {/* Info */}
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

            {/* Edit button */}
            <button
              onClick={() => setEditTarget(log)}
              className="shrink-0 px-2 py-1.5 text-xs font-mono transition-colors duration-100 self-start"
              style={{ backgroundColor: "#4A4540", color: C.subtle, borderRadius: 4, border: `1px solid ${C.border}` }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.subtle)}
            >
              EDIT
            </button>
          </div>
        ))}
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
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <div className="flex gap-0.5 mt-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="text-xs"
          style={{ color: i < full ? "#E67E22" : i === full && half ? "#E67E2280" : "#524D48" }}>★</span>
      ))}
    </div>
  );
}
