"use client";

import { useState } from "react";
import LogListenModal from "./LogListenModal";

const C = {
  surface: "#3D3834",
  surfaceRaised: "#4A4540",
  border: "#524D48",
  text: "#F7F1E3",
  muted: "#A89F94",
  subtle: "#6B6560",
  accent: "#E67E22",
  accentHover: "#CF711E",
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
  const [addingCollection, setAddingCollection] = useState(false);
  const [addingWantlist, setAddingWantlist] = useState(false);
  const [showLog, setShowLog] = useState(false);

  async function handleAddToCollection() {
    setAddingCollection(true);
    const res = await fetch("/api/collection/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discogsId, title, artist, releaseYear, coverUrl, label, genre }),
    });
    if (res.ok) setInCollection(true);
    setAddingCollection(false);
  }

  async function handleAddToWantlist() {
    setAddingWantlist(true);
    const res = await fetch("/api/wantlist/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discogsId, title, artist, releaseYear, coverUrl, label, genre }),
    });
    if (res.ok) setInWantlist(true);
    setAddingWantlist(false);
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
          onClick={handleAddToCollection}
          disabled={inCollection || addingCollection}
          className="px-4 py-2 text-xs font-mono transition-colors duration-100"
          style={{
            backgroundColor: inCollection ? C.surfaceRaised : C.surface,
            color: inCollection ? C.subtle : C.muted,
            borderRadius: 4,
            border: `1px solid ${C.border}`,
            opacity: addingCollection ? 0.4 : 1,
          }}
        >
          {inCollection ? "✓ IN COLLECTION" : "+ ADD TO COLLECTION"}
        </button>

        <button
          onClick={handleAddToWantlist}
          disabled={inWantlist || addingWantlist}
          className="px-4 py-2 text-xs font-mono transition-colors duration-100"
          style={{
            backgroundColor: inWantlist ? C.surfaceRaised : C.surface,
            color: inWantlist ? C.subtle : C.muted,
            borderRadius: 4,
            border: `1px solid ${C.border}`,
            opacity: addingWantlist ? 0.4 : 1,
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
