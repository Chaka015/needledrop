"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const C = {
  surface: "#3D3834",
  surfaceRaised: "#4A4540",
  border: "#524D48",
  text: "#F7F1E3",
  muted: "#A89F94",
  subtle: "#6B6560",
  accent: "#E67E22",
};

interface FeedLog {
  id: string;
  playedAt: string;
  rating: number | null;
  review: string | null;
  format: string | null;
  spinCount: number;
  userHasSpun: boolean;
  user: { username: string; avatarUrl: string | null };
  album: { title: string; artist: string; coverUrl: string | null };
}

export default function ActivityFeed({
  followingLogs,
  everyoneLogs,
}: {
  followingLogs: FeedLog[];
  everyoneLogs: FeedLog[];
}) {
  const [tab, setTab] = useState<"friends" | "community">("friends");
  const [spinStates, setSpinStates] = useState<Record<string, { count: number; spun: boolean }>>(
    Object.fromEntries(
      [...followingLogs, ...everyoneLogs].map((l) => [
        l.id,
        { count: l.spinCount, spun: l.userHasSpun },
      ])
    )
  );

  const logs = tab === "friends" ? followingLogs : everyoneLogs;

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

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-0 mb-6" style={{ borderBottom: `1px solid ${C.border}` }}>
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

      {logs.length === 0 ? (
        <div className="p-8 text-center text-sm font-mono"
          style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
          {tab === "friends"
            ? "Nothing from friends yet. Follow some listeners!"
            : "No activity yet."}
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const spin = spinStates[log.id];
            return (
              <div key={log.id} className="flex gap-4 p-4"
                style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>

                <Link href={`/${log.user.username}`} className="shrink-0">
                  {log.user.avatarUrl ? (
                    <Image src={log.user.avatarUrl} alt={log.user.username} width={36} height={36}
                      className="object-cover"
                      style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${C.border}` }}
                      unoptimized />
                  ) : (
                    <div className="flex items-center justify-center text-sm font-bold"
                      style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: C.surfaceRaised, color: C.subtle }}>
                      {log.user.username[0].toUpperCase()}
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    {log.album.coverUrl && (
                      <Image src={log.album.coverUrl} alt={log.album.title} width={40} height={40}
                        className="object-cover shrink-0"
                        style={{ width: 40, height: 40, borderRadius: 4 }} unoptimized />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono mb-0.5" style={{ color: C.muted }}>
                        <Link href={`/${log.user.username}`} className="font-bold hover:underline" style={{ color: C.text }}>
                          {log.user.username}
                        </Link>{" "}logged a listen
                      </div>
                      <div className="font-semibold text-sm truncate" style={{ color: C.text }}>{log.album.title}</div>
                      <div className="text-xs font-mono" style={{ color: C.muted }}>{log.album.artist}</div>
                      {log.rating != null && <StarRating rating={log.rating} />}
                      {log.review && (
                        <p className="mt-1 text-sm line-clamp-2" style={{ color: C.muted }}>{log.review}</p>
                      )}
                      <div className="mt-1 text-xs font-mono" style={{ color: C.subtle }}>
                        {log.format && <span className="mr-3">{log.format}</span>}
                        {new Date(log.playedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={() => handleSpin(log.id)}
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
          })}
        </div>
      )}
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
            <span style={{ color: "#524D48" }}>★</span>
            {(full || half) && (
              <span style={{ position: "absolute", left: 0, top: 0, overflow: "hidden", width: full ? "100%" : "50%", color: "#E67E22" }}>★</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
