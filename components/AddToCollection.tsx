"use client";

import { useState } from "react";
import Image from "next/image";
import LogListenModal from "./LogListenModal";

const C = {
  bg: "var(--skin-bg)",
  surface: "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border: "var(--skin-border)",
  text: "var(--skin-text)",
  muted: "var(--skin-muted)",
  subtle: "var(--skin-subtle)",
  accent: "var(--skin-accent)",
  accentHover: "var(--skin-accent-hover)",
};

interface DiscogsResult {
  discogsId: string;
  title: string;
  artist: string;
  albumTitle: string;
  releaseYear: number | null;
  coverUrl: string | null;
  label: string | null;
  genre: string | null;
}

export default function AddToCollection() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiscogsResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [logTarget, setLogTarget] = useState<DiscogsResult | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/discogs/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data.results ?? []);
    setLoading(false);
  }

  async function handleAdd(result: DiscogsResult) {
    setAdding(result.discogsId);
    const res = await fetch("/api/collection/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        discogsId: result.discogsId,
        title: result.albumTitle,
        artist: result.artist,
        releaseYear: result.releaseYear,
        coverUrl: result.coverUrl,
        label: result.label,
        genre: result.genre,
      }),
    });
    if (res.ok) setAdded((prev) => new Set(prev).add(result.discogsId));
    setAdding(null);
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for an album or artist..."
          className="flex-1 text-sm px-4 py-3 outline-none transition-colors duration-100"
          style={{
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            color: C.text,
            borderRadius: 0,
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
          onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-3 text-sm font-medium transition-colors duration-100"
          style={{
            backgroundColor: C.accent,
            color: C.text,
            borderRadius: 4,
            opacity: loading ? 0.4 : 1,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.accentHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.accent)}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {results.length > 0 && (
        <div className="space-y-1">
          {results.map((result) => (
            <div
              key={result.discogsId}
              className="flex items-center gap-3 p-3"
              style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
            >
              {result.coverUrl ? (
                <Image src={result.coverUrl} alt={result.title} width={48} height={48}
                  className="object-cover shrink-0" style={{ width: 48, height: 48, borderRadius: 4 }} unoptimized />
              ) : (
                <div className="shrink-0" style={{ width: 48, height: 48, backgroundColor: C.surfaceRaised, borderRadius: 4 }} />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: C.text }}>{result.albumTitle}</div>
                <div className="text-xs font-mono truncate" style={{ color: C.muted }}>
                  {result.artist}{result.releaseYear ? ` · ${result.releaseYear}` : ""}{result.label ? ` · ${result.label}` : ""}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setLogTarget(result)}
                  className="px-3 py-1.5 text-xs font-mono transition-colors duration-100"
                  style={{ backgroundColor: C.surfaceRaised, color: C.muted, borderRadius: 4, border: `1px solid ${C.border}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
                >
                  LOG
                </button>
                <button
                  onClick={() => handleAdd(result)}
                  disabled={!!adding || added.has(result.discogsId)}
                  className="px-3 py-1.5 text-xs font-mono transition-colors duration-100"
                  style={{
                    backgroundColor: added.has(result.discogsId) ? C.surfaceRaised : C.accent,
                    color: added.has(result.discogsId) ? C.subtle : C.text,
                    borderRadius: 4,
                    opacity: adding && adding !== result.discogsId ? 0.4 : 1,
                  }}
                >
                  {added.has(result.discogsId) ? "✓ ADDED" : adding === result.discogsId ? "..." : "+ ADD"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {logTarget && (
        <LogListenModal
          album={logTarget}
          onClose={() => setLogTarget(null)}
          onSuccess={() => { setLogTarget(null); window.location.reload(); }}
        />
      )}
    </div>
  );
}
