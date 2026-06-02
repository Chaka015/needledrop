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

interface Person {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number;
  collectionCount: number;
  logCount: number;
  isFollowing: boolean;
}

export default function FollowList({ people, isLoggedIn }: { people: Person[]; isLoggedIn: boolean }) {
  const [sort, setSort] = useState<"az" | "za">("az");
  const [followStates, setFollowStates] = useState<Record<string, boolean>>(
    Object.fromEntries(people.map((p) => [p.id, p.isFollowing]))
  );
  const [loading, setLoading] = useState<string | null>(null);

  const sorted = [...people].sort((a, b) => {
    return sort === "az"
      ? a.username.localeCompare(b.username)
      : b.username.localeCompare(a.username);
  });

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

  return (
    <div>
      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-mono" style={{ color: C.subtle }}>SORT:</span>
        {[{ id: "az", label: "A–Z" }, { id: "za", label: "Z–A" }].map((s) => (
          <button key={s.id} onClick={() => setSort(s.id as "az" | "za")}
            className="px-3 py-1 text-xs font-mono transition-colors duration-100"
            style={{
              backgroundColor: sort === s.id ? C.accent : C.surface,
              color: sort === s.id ? C.text : C.muted,
              borderRadius: 4,
              border: `1px solid ${sort === s.id ? C.accent : C.border}`,
            }}>
            {s.label}
          </button>
        ))}
        <span className="text-xs font-mono ml-2" style={{ color: C.subtle }}>{people.length} total</span>
      </div>

      {sorted.length === 0 ? (
        <div className="p-8 text-center text-sm font-mono"
          style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
          No one here yet.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((person) => (
            <div key={person.id} className="flex items-center gap-4 p-4"
              style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
              <Link href={`/${person.username}`} className="shrink-0">
                {person.avatarUrl ? (
                  <Image src={person.avatarUrl} alt={person.username} width={48} height={48}
                    className="object-cover"
                    style={{ width: 48, height: 48, borderRadius: "50%", border: `1px solid ${C.border}` }}
                    unoptimized />
                ) : (
                  <div className="flex items-center justify-center text-lg font-bold"
                    style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: C.surfaceRaised, color: C.subtle }}>
                    {person.username[0].toUpperCase()}
                  </div>
                )}
              </Link>

              <div className="flex-1 min-w-0">
                <Link href={`/${person.username}`} className="font-semibold text-sm hover:underline" style={{ color: C.text }}>
                  {person.username}
                </Link>
                {person.bio && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: C.muted }}>{person.bio}</p>
                )}
                <div className="flex gap-4 mt-1 text-xs font-mono" style={{ color: C.subtle }}>
                  <span>{person.collectionCount} records</span>
                  <span>{person.logCount} logged</span>
                  <span>{person.followerCount} followers</span>
                </div>
              </div>

              {isLoggedIn && (
                <button onClick={() => handleFollow(person.id)} disabled={loading === person.id}
                  className="shrink-0 px-4 py-2 text-xs font-mono transition-colors duration-100"
                  style={{
                    backgroundColor: followStates[person.id] ? C.surfaceRaised : C.accent,
                    color: followStates[person.id] ? C.muted : C.text,
                    borderRadius: 4,
                    border: `1px solid ${followStates[person.id] ? C.border : C.accent}`,
                    opacity: loading === person.id ? 0.4 : 1,
                  }}>
                  {followStates[person.id] ? "FOLLOWING" : "FOLLOW"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
