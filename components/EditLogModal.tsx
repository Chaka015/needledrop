"use client";

import { useState } from "react";
import Image from "next/image";

const C = {
  surface: "#3D3834",
  surfaceRaised: "#4A4540",
  border: "#524D48",
  text: "#F7F1E3",
  muted: "#A89F94",
  subtle: "#6B6560",
  accent: "#E67E22",
  accentHover: "#CF711E",
};

const FORMATS = ["Vinyl", "CD", "Cassette", "Digital", "Other"];

interface EditLogModalProps {
  log: {
    id: string;
    rating: number | null;
    review: string | null;
    format: string | null;
    album: {
      title: string;
      artist: string;
      coverUrl: string | null;
    };
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditLogModal({ log, onClose, onSuccess }: EditLogModalProps) {
  const [rating, setRating] = useState<number | null>(log.rating);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [review, setReview] = useState(log.review ?? "");
  const [format, setFormat] = useState(log.format ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/logs/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        logId: log.id,
        rating,
        review: review || null,
        format: format || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      setSaving(false);
      return;
    }

    setSaving(false);
    onSuccess();
  }

  const displayRating = hoverRating ?? rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-md p-6" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {log.album.coverUrl ? (
            <Image src={log.album.coverUrl} alt={log.album.title} width={56} height={56}
              className="object-cover shrink-0" style={{ width: 56, height: 56, borderRadius: 4 }} unoptimized />
          ) : (
            <div className="shrink-0" style={{ width: 56, height: 56, backgroundColor: C.surfaceRaised, borderRadius: 4 }} />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate" style={{ color: C.text }}>{log.album.title}</div>
            <div className="text-sm font-mono truncate" style={{ color: C.muted }}>{log.album.artist}</div>
          </div>
          <button onClick={onClose} className="text-xl leading-none ml-auto" style={{ color: C.subtle }}>×</button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Star Rating */}
          <div>
            <label className="text-xs font-mono uppercase tracking-widest block mb-2" style={{ color: C.subtle }}>Rating</label>
            <div className="flex gap-1 items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button"
                  onClick={() => setRating(star === rating ? null : star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="text-3xl transition-colors duration-100"
                  style={{ color: displayRating && star <= displayRating ? C.accent : C.border }}>
                  ★
                </button>
              ))}
              {rating && <span className="ml-2 text-xs font-mono" style={{ color: C.muted }}>{rating}/5</span>}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="text-xs font-mono uppercase tracking-widest block mb-2" style={{ color: C.subtle }}>Format</label>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((f) => (
                <button key={f} type="button"
                  onClick={() => setFormat(format === f ? "" : f)}
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

          {/* Review */}
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

          {error && <p className="text-xs font-mono" style={{ color: "#C0392B" }}>{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full py-3 text-sm font-medium transition-colors duration-100"
            style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4, opacity: saving ? 0.4 : 1 }}
            onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = C.accentHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.accent)}>
            {saving ? "SAVING..." : "SAVE"}
          </button>
        </form>
      </div>
    </div>
  );
}
