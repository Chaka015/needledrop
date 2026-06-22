"use client";

import { useState } from "react";
import LogListenModal from "./LogListenModal";

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

interface AlbumActionsProps {
  albumId: string;
  discogsId: string;
  title: string;
  artist: string;
  releaseYear: number | null;
  coverUrl: string | null;
  label: string | null;
  genre: string | null;
  inCollection: boolean;
  inWantlist: boolean;
}

export default function AlbumActions({
  albumId, discogsId, title, artist, releaseYear, coverUrl, label, genre,
  inCollection: initialInCollection,
  inWantlist: initialInWantlist,
}: AlbumActionsProps) {
  const [inCollection, setInCollection] = useState(initialInCollection);
  const [inWantlist, setInWantlist] = useState(initialInWantlist);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [loadingWantlist, setLoadingWantlist] = useState(false);
  const [showLog, setShowLog] = useState(false);

  async function handleToggleCollection() {
    setLoadingCollection(true);
    if (inCollection) {
      const res = await fetch("/api/collection/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId }),
      });
      if (res.ok) setInCollection(false);
    } else {
      const res = await fetch("/api/collection/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discogsId, title, artist, releaseYear, coverUrl, label, genre }),
      });
      if (res.ok) setInCollection(true);
    }
    setLoadingCollection(false);
  }

  async function handleToggleWantlist() {
    setLoadingWantlist(true);
    if (inWantlist) {
      const res = await fetch("/api/wantlist/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId }),
      });
      if (res.ok) setInWantlist(false);
    } else {
      const res = await fetch("/api/wantlist/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discogsId, title, artist, releaseYear, coverUrl, label, genre }),
      });
      if (res.ok) setInWantlist(true);
    }
    setLoadingWantlist(false);
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setShowLog(true)}
          className="px-4 py-2 text-xs font-mono transition-colors duration-100"
          style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4 }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.accentHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.accent)}
        >
          LOG LISTEN
        </button>

        <button
          onClick={handleToggleCollection}
          disabled={loadingCollection}
          className="px-4 py-2 text-xs font-mono transition-colors duration-100"
          style={{
            backgroundColor: inCollection ? C.surfaceRaised : C.surface,
            color: inCollection ? C.subtle : C.muted,
            borderRadius: 4,
            border: `1px solid ${C.border}`,
            opacity: loadingCollection ? 0.4 : 1,
          }}
        >
          {inCollection ? "✓ IN COLLECTION" : "+ ADD TO COLLECTION"}
        </button>

        <button
          onClick={handleToggleWantlist}
          disabled={loadingWantlist}
          className="px-4 py-2 text-xs font-mono transition-colors duration-100"
          style={{
            backgroundColor: inWantlist ? C.surfaceRaised : C.surface,
            color: inWantlist ? C.subtle : C.muted,
            borderRadius: 4,
            border: `1px solid ${C.border}`,
            opacity: loadingWantlist ? 0.4 : 1,
          }}
        >
          {inWantlist ? "✓ WANTLISTED" : "+ WANTLIST"}
        </button>
      </div>

      {showLog && (
        <LogListenModal
          album={{ discogsId, title, albumTitle: title, artist, releaseYear, coverUrl, label, genre }}
          onClose={() => setShowLog(false)}
          onSuccess={() => { setShowLog(false); window.location.reload(); }}
        />
      )}
    </>
  );
}
