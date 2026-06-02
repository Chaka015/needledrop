"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import LogListenModal from "./LogListenModal";

const C = {
  bg: "#2D2926",
  surface: "#3D3834",
  surfaceRaised: "#4A4540",
  border: "#524D48",
  text: "#F7F1E3",
  muted: "#A89F94",
  subtle: "#6B6560",
  accent: "#E67E22",
  accentHover: "#CF711E",
};

interface Album {
  id: string;
  discogsId: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  releaseYear: number | null;
  label: string | null;
  genre: string | null;
}

interface CollectionItem {
  id: string;
  album: Album;
}

interface NowSpinningModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function NowSpinningModal({ onClose, onSuccess }: NowSpinningModalProps) {
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);

  useEffect(() => {
    fetch("/api/collection")
      .then((r) => r.json())
      .then((data) => { setCollection(data.items ?? []); setLoading(false); });
  }, []);

  const filtered = query.trim()
    ? collection.filter(
        (c) =>
          c.album.title.toLowerCase().includes(query.toLowerCase()) ||
          c.album.artist.toLowerCase().includes(query.toLowerCase())
      )
    : collection.slice(0, 8);

  async function handleSpin(album: Album) {
    // Set now spinning
    await fetch("/api/now-spinning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: album.id }),
    });
    // Show log modal for rating/review
    setSelectedAlbum(album);
  }

  if (selectedAlbum) {
    return (
      <LogListenModal
        album={{
          discogsId: selectedAlbum.discogsId,
          title: selectedAlbum.title,
          albumTitle: selectedAlbum.title,
          artist: selectedAlbum.artist,
          releaseYear: selectedAlbum.releaseYear,
          coverUrl: selectedAlbum.coverUrl,
          label: selectedAlbum.label,
          genre: selectedAlbum.genre,
        }}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-md" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: C.text }}>What are you spinning?</h2>
            <p className="text-xs font-mono mt-0.5" style={{ color: C.subtle }}>Pick from your collection</p>
          </div>
          <button onClick={onClose} style={{ color: C.subtle }} className="text-xl leading-none">×</button>
        </div>

        <div className="px-5 pt-4 pb-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your collection..."
            autoFocus
            className="w-full text-sm px-3 py-2 outline-none transition-colors duration-100"
            style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
            onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
          />
        </div>

        <div className="px-5 pb-5 space-y-1 max-h-80 overflow-y-auto">
          {loading ? (
            <p className="text-xs font-mono py-4 text-center" style={{ color: C.subtle }}>Loading collection...</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs font-mono py-4 text-center" style={{ color: C.subtle }}>No matches found.</p>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSpin(c.album)}
                className="w-full flex items-center gap-3 p-2 text-left transition-colors duration-100"
                style={{ backgroundColor: "transparent", borderRadius: 4 }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.surfaceRaised)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                {c.album.coverUrl ? (
                  <Image src={c.album.coverUrl} alt={c.album.title} width={40} height={40}
                    className="object-cover shrink-0" style={{ width: 40, height: 40, borderRadius: 4 }} unoptimized />
                ) : (
                  <div className="shrink-0" style={{ width: 40, height: 40, backgroundColor: C.surfaceRaised, borderRadius: 4 }} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: C.text }}>{c.album.title}</div>
                  <div className="text-xs font-mono truncate" style={{ color: C.muted }}>{c.album.artist}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
