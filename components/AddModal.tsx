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

interface AddModalProps {
  trigger: "search";
}

export default function AddModal({ trigger }: AddModalProps) {
  const [open, setOpen] = useState(false);
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

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="block w-full text-left">
        + Search & Add Album
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-lg" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <h2 className="text-sm font-bold" style={{ color: C.text }}>Search & Add Album</h2>
          <button onClick={() => setOpen(false)} style={{ color: C.subtle }} className="text-xl leading-none">×</button>
        </div>

        <div className="px-5 pt-4 pb-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Discogs..."
              autoFocus
              className="flex-1 text-sm px-3 py-2 outline-none transition-colors duration-100"
              style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
              onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
            />
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-xs font-mono transition-colors duration-100"
              style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4, opacity: loading ? 0.4 : 1 }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = C.accentHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.accent)}>
              {loading ? "..." : "SEARCH"}
            </button>
          </form>
        </div>

        <div className="px-5 pb-5 space-y-1 max-h-96 overflow-y-auto">
          {results.map((result) => (
            <div key={result.discogsId} className="flex items-center gap-3 p-2"
              style={{ backgroundColor: C.surfaceRaised }}>
              {result.coverUrl ? (
                <Image src={result.coverUrl} alt={result.title} width={40} height={40}
                  className="object-cover shrink-0" style={{ width: 40, height: 40, borderRadius: 4 }} unoptimized />
              ) : (
                <div className="shrink-0" style={{ width: 40, height: 40, backgroundColor: C.surface, borderRadius: 4 }} />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: C.text }}>{result.albumTitle}</div>
                <div className="text-xs font-mono truncate" style={{ color: C.muted }}>
                  {result.artist}{result.releaseYear ? ` · ${result.releaseYear}` : ""}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setLogTarget(result)}
                  className="px-2 py-1.5 text-xs font-mono transition-colors duration-100"
                  style={{ backgroundColor: C.surface, color: C.muted, borderRadius: 4, border: `1px solid ${C.border}` }}>
                  LOG
                </button>
                <button onClick={() => handleAdd(result)}
                  disabled={!!adding || added.has(result.discogsId)}
                  className="px-2 py-1.5 text-xs font-mono transition-colors duration-100"
                  style={{
                    backgroundColor: added.has(result.discogsId) ? C.surfaceRaised : C.accent,
                    color: added.has(result.discogsId) ? C.subtle : C.text,
                    borderRadius: 4,
                    opacity: adding && adding !== result.discogsId ? 0.4 : 1,
                  }}>
                  {added.has(result.discogsId) ? "✓" : "+ ADD"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {logTarget && (
        <LogListenModal album={logTarget} onClose={() => setLogTarget(null)}
          onSuccess={() => { setLogTarget(null); setOpen(false); }} />
      )}
    </div>
  );
}
