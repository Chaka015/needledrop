"use client";

import { useState } from "react";
import StarRatingInput from "./StarRatingInput";

const C = {
  bg:            "var(--skin-bg)",
  surface:       "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border:        "var(--skin-border)",
  text:          "var(--skin-text)",
  muted:         "var(--skin-muted)",
  subtle:        "var(--skin-subtle)",
  accent:        "var(--skin-accent)",
  accentHover:   "var(--skin-accent-hover)",
};

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
  source?: "physical" | "streaming";
}

const FORMATS = ["Vinyl", "CD", "Cassette", "Other"];

export default function LogListenModal({ album, onClose, onSuccess, source = "physical" }: LogListenModalProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [format, setFormat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
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
          format: source === "streaming" ? null : (format || null),
          source,
        }),
      });

      if (!res.ok) {
        let errMsg = "Something went wrong.";
        try { const d = await res.json(); errMsg = d.error ?? errMsg; } catch { /* non-JSON body */ }
        setError(errMsg);
        setLoading(false);
        return;
      }

      setLoading(false);
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-md p-6" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>

        <div className="flex items-center gap-4 mb-6">
          {album.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={album.coverUrl} alt={album.title}
              className="object-cover shrink-0" style={{ width: 56, height: 56, borderRadius: 4 }} />
          ) : (
            <div className="shrink-0" style={{ width: 56, height: 56, backgroundColor: C.surfaceRaised, borderRadius: 4 }} />
          )}
          <div className="min-w-0">
            <div className="font-semibold truncate" style={{ color: C.text }}>{album.albumTitle ?? album.title}</div>
            <div className="text-sm font-mono truncate" style={{ color: C.muted }}>{album.artist}</div>
          </div>
          <button onClick={onClose} className="ml-auto text-xl leading-none" style={{ color: C.subtle }}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-mono uppercase tracking-widest block mb-2" style={{ color: C.subtle }}>
              Rating <span style={{ textTransform: "none", color: C.subtle }}>(min 1★)</span>
            </label>
            <StarRatingInput rating={rating} onChange={setRating} />
          </div>

          {source === "streaming" ? (
            <div className="flex items-center gap-2 text-xs font-mono py-1" style={{ color: C.muted }}>
              <span style={{ color: C.accent }}>▶</span> STREAMING — no format required
            </div>
          ) : (
            <div>
              <label className="text-xs font-mono uppercase tracking-widest block mb-2" style={{ color: C.subtle }}>Format</label>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((f) => (
                  <button key={f} type="button" onClick={() => setFormat(format === f ? "" : f)}
                    className="px-3 py-1.5 text-xs font-mono transition-colors duration-100"
                    style={{
                      backgroundColor: format === f ? C.accent : C.surfaceRaised,
                      color: format === f ? C.text : C.muted,
                      borderRadius: 4,
                      border: `1px solid ${format === f ? C.accent : C.border}`,
                    }}>
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-mono uppercase tracking-widest block mb-2" style={{ color: C.subtle }}>
              Review <span style={{ color: C.subtle, textTransform: "none" }}>(optional)</span>
            </label>
            <textarea value={review} onChange={(e) => setReview(e.target.value)}
              placeholder="What did you think?" rows={3}
              className="w-full text-sm px-4 py-3 outline-none transition-colors duration-100 resize-none"
              style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
              onBlur={(e) => (e.currentTarget.style.borderColor = C.border)} />
          </div>

          {error && <p className="text-xs font-mono" style={{ color: "var(--skin-danger, #C0392B)" }}>{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 text-sm font-medium transition-colors duration-100"
            style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4, opacity: loading ? 0.4 : 1 }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = C.accentHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.accent)}>
            {loading ? "LOGGING..." : "LOG LISTEN"}
          </button>
        </form>
      </div>
    </div>
  );
}
