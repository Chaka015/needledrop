"use client";

import { useState } from "react";
import Image from "next/image";
import LogListenModal from "./LogListenModal";

const C = {
  surface: "#3D3834",
  surfaceRaised: "#4A4540",
  border: "#524D48",
  text: "#F7F1E3",
  muted: "#A89F94",
  subtle: "#6B6560",
  accent: "#E67E22",
};

interface Album {
  discogsId: string;
  title: string;
  artist: string;
  releaseYear: number | null;
  coverUrl: string | null;
  label: string | null;
  genre: string | null;
}

interface CollectionItem {
  id: string;
  album: Album;
}

export default function CollectionGrid({ items }: { items: CollectionItem[] }) {
  const [query, setQuery] = useState("");
  const [logTarget, setLogTarget] = useState<Album | null>(null);

  const filtered = query.trim()
    ? items.filter(
        (c) =>
          c.album.title.toLowerCase().includes(query.toLowerCase()) ||
          c.album.artist.toLowerCase().includes(query.toLowerCase())
      )
    : items.slice(0, 5);

  return (
    <div className="w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your collection..."
        className="w-full text-sm px-4 py-3 outline-none transition-colors duration-100 mb-3"
        style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
        onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
        onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
      />

      {filtered.length === 0 ? (
        <p className="text-xs font-mono text-center py-6" style={{ color: C.subtle }}>
          {query ? "No matches in your collection." : "Nothing in your collection yet."}
        </p>
      ) : (
        <div className="space-y-1">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-3"
              style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
            >
              {c.album.coverUrl ? (
                <Image src={c.album.coverUrl} alt={c.album.title} width={48} height={48}
                  className="object-cover shrink-0" style={{ width: 48, height: 48, borderRadius: 4 }} unoptimized />
              ) : (
                <div className="shrink-0" style={{ width: 48, height: 48, backgroundColor: C.surfaceRaised, borderRadius: 4 }} />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: C.text }}>{c.album.title}</div>
                <div className="text-xs font-mono truncate" style={{ color: C.muted }}>
                  {c.album.artist}{c.album.releaseYear ? ` · ${c.album.releaseYear}` : ""}
                </div>
              </div>
              <button
                onClick={() => setLogTarget(c.album)}
                className="shrink-0 px-3 py-1.5 text-xs font-mono transition-colors duration-100"
                style={{ backgroundColor: C.surfaceRaised, color: C.muted, borderRadius: 4, border: `1px solid ${C.border}` }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
              >
                LOG
              </button>
            </div>
          ))}
          {!query && items.length > 5 && (
            <p className="text-xs font-mono text-center pt-2" style={{ color: C.subtle }}>
              Showing 5 of {items.length} — search to find more
            </p>
          )}
        </div>
      )}

      {logTarget && (
        <LogListenModal
          album={{ ...logTarget, albumTitle: logTarget.title }}
          onClose={() => setLogTarget(null)}
          onSuccess={() => { setLogTarget(null); window.location.reload(); }}
        />
      )}
    </div>
  );
}
