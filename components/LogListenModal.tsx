"use client";

import { useState } from "react";
import Image from "next/image";

interface Album {
  discogsId: string;
  title: string;
  artist: string;
  albumTitle?: string;
  releaseYear: number | null;
  coverUrl: string | null;
  label: string | null;
  genre: string | null;
}

interface LogListenModalProps {
  album: Album;
  onClose: () => void;
  onSuccess: () => void;
}

const FORMATS = ["Vinyl", "CD", "Cassette", "Digital", "Other"];

export default function LogListenModal({ album, onClose, onSuccess }: LogListenModalProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [format, setFormat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/logs/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        discogsId: album.discogsId,
        title: album.albumTitle ?? album.title,
        artist: album.artist,
        releaseYear: album.releaseYear,
        coverUrl: album.coverUrl,
        label: album.label,
        genre: album.genre,
        rating,
        review: review || null,
        format: format || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();
  }

  const displayRating = hoverRating ?? rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {album.coverUrl ? (
            <Image
              src={album.coverUrl}
              alt={album.title}
              width={56}
              height={56}
              className="w-14 h-14 rounded-md object-cover shrink-0"
              unoptimized
            />
          ) : (
            <div className="w-14 h-14 rounded-md bg-zinc-800 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="font-semibold truncate">{album.albumTitle ?? album.title}</div>
            <div className="text-sm text-zinc-400 truncate">{album.artist}</div>
          </div>
          <button
            onClick={onClose}
            className="ml-auto text-zinc-500 hover:text-zinc-300 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Star Rating */}
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-2">
              Rating
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star === rating ? null : star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className={`text-3xl transition-colors ${
                    displayRating && star <= displayRating
                      ? "text-amber-400"
                      : "text-zinc-700 hover:text-zinc-500"
                  }`}
                >
                  ★
                </button>
              ))}
              {rating && (
                <span className="ml-2 text-sm text-zinc-500 self-center">{rating}/5</span>
              )}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-2">
              Format
            </label>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(format === f ? "" : f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    format === f
                      ? "bg-white text-black"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Review */}
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-2">
              Review <span className="text-zinc-600 normal-case">(optional)</span>
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="What did you think?"
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors resize-none"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-40"
          >
            {loading ? "Logging..." : "Log Listen"}
          </button>
        </form>
      </div>
    </div>
  );
}
