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
  isFeatured: boolean;
  album: Album;
}

export default function CollectionGrid({ items }: { items: CollectionItem[] }) {
  const [query, setQuery] = useState("");
  const [logTarget, setLogTarget] = useState<Album | null>(null);
  const [featuring, setFeaturing] = useState<string | null>(null);
  const [featuredIds, setFeaturedIds] = useState<Set<string>>(
    new Set(items.filter((i) => i.isFeatured).map((i) => i.id))
  );
  const [maxError, setMaxError] = useState(false);

  const filtered = query.trim()
    ? items.filter(
        (c) =>
          c.album.title.toLowerCase().includes(query.toLowerCase()) ||
          c.album.artist.toLowerCase().includes(query.toLowerCase())
      )
    : items.slice(0, 5);

  async function handleFeature(id: string) {
    setFeaturing(id);
    setMaxError(false);

    const res = await fetch("/api/collection/feature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionId: id }),
    });

    const data = await res.json();

    if (res.status === 409 && data.error === "MAX_FEATURED") {
      setMaxError(true);
    } else if (res.ok) {
      setFeaturedIds((prev) => {
        const next = new Set(prev);
        if (data.isFeatured) next.add(id);
        else next.delete(id);
        return next;
      });
      // Reload to update the featured sidebar
      setTimeout(() => window.location.reload(), 300);
    }

    setFeaturing(null);
  }

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

      {maxError && (
        <p className="text-xs font-mono mb-2" style={{ color: "#C0392B" }}>
          Max 4 featured albums. Unfeature one first.
        </p>
      )}

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
              style={{ backgroundColor: C.surface, border: `1px solid ${c.isFeatured || featuredIds.has(c.id) ? C.accent : C.border}` }}
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
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleFeature(c.id)}
                  disabled={featuring === c.id}
                  className="px-2 py-1.5 text-xs font-mono transition-colors duration-100"
                  style={{
                    backgroundColor: featuredIds.has(c.id) ? C.accent : C.surfaceRaised,
                    color: featuredIds.has(c.id) ? C.text : C.muted,
                    borderRadius: 4,
                    border: `1px solid ${featuredIds.has(c.id) ? C.accent : C.border}`,
                  }}
                  title={featuredIds.has(c.id) ? "Unfeature" : "Feature"}
                >
                  ★
                </button>
                <button
                  onClick={() => setLogTarget(c.album)}
                  className="px-3 py-1.5 text-xs font-mono transition-colors duration-100"
                  style={{ backgroundColor: C.surfaceRaised, color: C.muted, borderRadius: 4, border: `1px solid ${C.border}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                >
                  LOG
                </button>
              </div>
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
