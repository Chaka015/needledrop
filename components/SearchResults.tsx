"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const C = {
  surface: "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border: "var(--skin-border)",
  text: "var(--skin-text)",
  muted: "var(--skin-muted)",
  subtle: "var(--skin-subtle)",
  accent: "var(--skin-accent)",
  accentHover: "var(--skin-accent-hover)",
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

export default function SearchResults({
  results,
  isLoggedIn,
}: {
  results: UserResult[];
  isLoggedIn: boolean;
}) {
  const [followStates, setFollowStates] = useState<Record<string, boolean>>(
    Object.fromEntries(results.map((r) => [r.id, r.isFollowing]))
  );
  const [loading, setLoading] = useState<string | null>(null);

  async function handleFollow(userId: string) {
    if (!isLoggedIn) return;
    setLoading(userId);

    const res = await fetch("/api/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: userId }),
    });

    if (res.ok) {
      const data = await res.json();
      setFollowStates((prev) => ({ ...prev, [userId]: data.following }));
    }
    setLoading(null);
  }

  if (results.length === 0) {
    return (
      <div className="p-8 text-center text-sm font-mono" style={{ border: `1px dashed #524D48`, color: "var(--skin-subtle)" }}>
        No users found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {results.map((user) => (
        <div key={user.id} className="flex items-center gap-4 p-4"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>

          {/* Avatar */}
          <Link href={`/${user.username}`} className="shrink-0">
            {user.avatarUrl ? (
              <Image src={user.avatarUrl} alt={user.username} width={48} height={48}
                className="object-cover"
                style={{ width: 48, height: 48, borderRadius: "50%", border: `1px solid ${C.border}` }}
                unoptimized />
            ) : (
              <div className="flex items-center justify-center text-lg font-bold"
                style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: C.surfaceRaised, color: C.subtle, border: `1px solid ${C.border}` }}>
                {user.username[0].toUpperCase()}
              </div>
            )}
          </Link>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <Link href={`/${user.username}`}
              className="font-semibold text-sm hover:underline"
              style={{ color: C.text }}>
              {user.username}
            </Link>
            {user.bio && (
              <p className="text-xs mt-0.5 truncate" style={{ color: C.muted }}>{user.bio}</p>
            )}
            <div className="flex gap-4 mt-1 text-xs font-mono" style={{ color: C.subtle }}>
              <span>{user.collectionCount} collected</span>
              <span>{user.logCount} logged</span>
              <span>{user.followerCount} followers</span>
            </div>
          </div>

          {/* Follow button */}
          {isLoggedIn && (
            <button
              onClick={() => handleFollow(user.id)}
              disabled={loading === user.id}
              className="shrink-0 px-4 py-2 text-xs font-mono transition-colors duration-100"
              style={{
                backgroundColor: followStates[user.id] ? C.surfaceRaised : C.accent,
                color: followStates[user.id] ? C.muted : C.text,
                borderRadius: 4,
                border: `1px solid ${followStates[user.id] ? C.border : C.accent}`,
                opacity: loading === user.id ? 0.4 : 1,
              }}
            >
              {followStates[user.id] ? "FOLLOWING" : "FOLLOW"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
