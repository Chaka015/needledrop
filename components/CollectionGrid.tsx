"use client";

import { useState } from "react";
import Image from "next/image";
import LogListenModal from "./LogListenModal";

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

interface CollectionGridProps {
  items: CollectionItem[];
}

export default function CollectionGrid({ items }: CollectionGridProps) {
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
      {/* Search within collection */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your collection..."
        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 outline-none focus:border-zinc-400 transition-colors text-sm mb-4"
      />

      {filtered.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-6">
          {query ? "No matches in your collection." : "Nothing in your collection yet."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-3"
            >
              {c.album.coverUrl ? (
                <Image
                  src={c.album.coverUrl}
                  alt={c.album.title}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-md object-cover shrink-0"
                  unoptimized
                />
              ) : (
                <div className="w-12 h-12 rounded-md bg-zinc-800 shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{c.album.title}</div>
                <div className="text-xs text-zinc-500 truncate">
                  {c.album.artist}
                  {c.album.releaseYear ? ` · ${c.album.releaseYear}` : ""}
                </div>
              </div>

              <button
                onClick={() => setLogTarget(c.album)}
                className="shrink-0 px-3 py-2 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
              >
                Log
              </button>
            </div>
          ))}

          {!query && items.length > 5 && (
            <p className="text-xs text-zinc-600 text-center pt-2">
              Showing 5 of {items.length} — search to find more
            </p>
          )}
        </div>
      )}

      {logTarget && (
        <LogListenModal
          album={{ ...logTarget, albumTitle: logTarget.title }}
          onClose={() => setLogTarget(null)}
          onSuccess={() => {
            setLogTarget(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
