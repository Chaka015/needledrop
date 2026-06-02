"use client";

import { useState } from "react";

const C = {
  surfaceRaised: "var(--skin-surface-raised)",
  border:        "var(--skin-border)",
  text:          "var(--skin-text)",
  muted:         "var(--skin-muted)",
  accent:        "var(--skin-accent)",
  accentHover:   "var(--skin-accent-hover)",
};

export default function FollowButton({
  targetUserId,
  initialIsFollowing,
}: {
  targetUserId: string;
  initialIsFollowing: boolean;
}) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId }),
    });
    if (res.ok) {
      const data = await res.json();
      setIsFollowing(data.following);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-5 py-2 text-xs font-mono transition-colors duration-100"
      style={{
        backgroundColor: isFollowing ? C.surfaceRaised : C.accent,
        color: isFollowing ? C.muted : C.text,
        borderRadius: 4,
        border: `1px solid ${isFollowing ? C.border : C.accent}`,
        opacity: loading ? 0.4 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isFollowing && !loading)
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = C.accentHover;
      }}
      onMouseLeave={(e) => {
        if (!isFollowing)
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = C.accent;
      }}
    >
      {isFollowing ? "FOLLOWING" : "FOLLOW"}
    </button>
  );
}
