"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
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

interface AlbumResult {
  discogsId: string;
  title: string;
  artist: string;
  releaseYear: number | null;
  coverUrl: string | null;
  label: string | null;
  genre: string | null;
  source: "collection" | "discogs";
}

interface CollectionAlbum {
  album: {
    discogsId: string;
    title: string;
    artist: string;
    releaseYear: number | null;
    coverUrl: string | null;
    label: string | null;
    genre: string | null;
  };
}

export default function QuickLogWidget() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AlbumResult[]>([]);
  const [collection, setCollection] = useState<CollectionAlbum[]>([]);
  const [selected, setSelected] = useState<AlbumResult | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/collection")
      .then((r) => r.json())
      .then((data) => setCollection(data.items ?? []));
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim()) { setResults([]); return; }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const q = query.toLowerCase();
      // Filter collection first
      const collectionMatches: AlbumResult[] = collection
        .filter((c) =>
          c.album.title.toLowerCase().includes(q) ||
          c.album.artist.toLowerCase().includes(q)
        )
        .slice(0, 4)
        .map((c) => ({ ...c.album, source: "collection" as const }));

      // Discogs search
      let discogsResults: AlbumResult[] = [];
      try {
        const res = await fetch(`/api/discogs/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        discogsResults = (data.results ?? []).slice(0, 4).map((r: {
          discogsId: string; title: string; artist: string;
          releaseYear: number | null; coverUrl: string | null;
          label: string | null; genre: string | null;
        }) => ({ ...r, source: "discogs" as const }));
      } catch { /* ignore */ }

      setResults([...collectionMatches, ...discogsResults]);
      setSearching(false);
    }, 300);
  }, [query, collection]);

  if (selected) {
    return (
      <LogListenModal
        album={{
          discogsId: selected.discogsId,
          title: selected.title,
          albumTitle: selected.title,
          artist: selected.artist,
          releaseYear: selected.releaseYear,
          coverUrl: selected.coverUrl,
          label: selected.label,
          genre: selected.genre,
        }}
        source="physical"
        onClose={() => setSelected(null)}
        onSuccess={() => { setSelected(null); window.location.reload(); }}
      />
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: C.subtle }}>
        Log a Listen
      </h2>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your collection or any album..."
          className="w-full text-sm px-3 py-2 outline-none transition-colors duration-100"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
          onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
          onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
        />
        {searching && (
          <span className="absolute right-3 top-2 text-xs font-mono" style={{ color: C.subtle }}>...</span>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-0.5">
          {results.map((r) => (
            <button
              key={`${r.source}-${r.discogsId}`}
              onClick={() => { setSelected(r); setQuery(""); }}
              className="w-full flex items-center gap-3 p-2 text-left transition-colors duration-100"
              style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.surfaceRaised)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.surface)}
            >
              {r.coverUrl ? (
                <Image src={r.coverUrl} alt={r.title} width={36} height={36}
                  className="object-cover shrink-0" style={{ width: 36, height: 36, borderRadius: 2 }} unoptimized />
              ) : (
                <div className="shrink-0" style={{ width: 36, height: 36, backgroundColor: C.surfaceRaised }} />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate" style={{ color: C.text }}>{r.title}</div>
                <div className="text-xs font-mono truncate" style={{ color: C.muted }}>{r.artist}</div>
              </div>
              {r.source === "collection" && (
                <span className="text-xs font-mono shrink-0" style={{ color: C.subtle }}>▼ OWNED</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
