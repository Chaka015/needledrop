"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const C = {
  surfaceRaised: "var(--skin-surface-raised)",
  border:        "var(--skin-border)",
  text:          "var(--skin-text)",
  muted:         "var(--skin-muted)",
  subtle:        "var(--skin-subtle)",
  accent:        "var(--skin-accent)",
  accentHover:   "var(--skin-accent-hover)",
  danger:        "#C0392B",
};

interface Props {
  wantlistId: string;
  albumId: string;
  discogsId: string;
  title: string;
  artist: string;
  releaseYear: number | null;
  coverUrl: string | null;
  label: string | null;
  genre: string | null;
}

export default function WantlistActions({ wantlistId, albumId, discogsId, title, artist, releaseYear, coverUrl, label, genre }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function moveToCollection() {
    setLoading(true);
    // Add to collection
    await fetch("/api/collection/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discogsId, title, artist, releaseYear, coverUrl, label, genre }),
    });
    // Remove from wantlist
    await fetch("/api/wantlist/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wantlistId }),
    });
    setLoading(false);
    router.refresh();
  }

  async function removeFromWantlist() {
    setLoading(true);
    await fetch("/api/wantlist/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wantlistId }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-1.5 shrink-0">
      <button
        onClick={moveToCollection}
        disabled={loading}
        className="px-2.5 py-1 text-xs font-mono transition-colors duration-100"
        style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4, opacity: loading ? 0.4 : 1 }}
        title="Move to collection"
      >
        + OWN
      </button>
      <button
        onClick={removeFromWantlist}
        disabled={loading}
        className="px-2.5 py-1 text-xs font-mono transition-colors duration-100"
        style={{ backgroundColor: "transparent", color: C.subtle, border: `1px solid ${C.border}`, borderRadius: 4, opacity: loading ? 0.4 : 1 }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.danger; (e.currentTarget as HTMLButtonElement).style.borderColor = C.danger; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.subtle; (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; }}
        title="Remove from wantlist"
      >
        ×
      </button>
    </div>
  );
}
