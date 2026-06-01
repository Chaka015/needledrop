"use client";

import { useState } from "react";
import Image from "next/image";

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

    if (res.ok) {
      setAdded((prev) => new Set(prev).add(result.discogsId));
    }
    setAdding(null);
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for an album or artist..."
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 outline-none focus:border-zinc-400 transition-colors text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-3 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-40"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result) => (
            <div
              key={result.discogsId}
              className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-3"
            >
              {result.coverUrl ? (
                <Image
                  src={result.coverUrl}
                  alt={result.title}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-md object-cover shrink-0"
                  unoptimized
                />
              ) : (
                <div className="w-12 h-12 rounded-md bg-zinc-800 shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{result.albumTitle}</div>
                <div className="text-xs text-zinc-500 truncate">
                  {result.artist}
                  {result.releaseYear ? ` · ${result.releaseYear}` : ""}
                  {result.label ? ` · ${result.label}` : ""}
                </div>
              </div>

              <button
                onClick={() => handleAdd(result)}
                disabled={!!adding || added.has(result.discogsId)}
                className="shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40
                  bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              >
                {added.has(result.discogsId)
                  ? "✓ Added"
                  : adding === result.discogsId
                  ? "Adding..."
                  : "+ Add"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
