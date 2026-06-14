"use client";

import { useState } from "react";

const C = {
  surface:  "var(--skin-surface)",
  border:   "var(--skin-border)",
  text:     "var(--skin-text)",
  muted:    "var(--skin-muted)",
  subtle:   "var(--skin-subtle)",
  accent:   "var(--skin-accent)",
};

interface Props {
  albumId: string;
  initialGenres: string[];
}

export default function GenreEditor({ albumId, initialGenres }: Props) {
  const [value, setValue] = useState(initialGenres.join(", "));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    const genres = value.split(",").map((g) => g.trim()).filter(Boolean);
    await fetch(`/api/albums/${albumId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ genres }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: C.subtle, marginBottom: 6 }}>
        Genres
      </div>
      {initialGenres.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {initialGenres.map((g) => (
            <span key={g} style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, letterSpacing: "0.08em", color: C.muted, border: `1px solid ${C.border}`, padding: "2px 8px", borderRadius: 2 }}>
              {g}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={initialGenres.length === 0 ? "Genres from MusicBrainz" : "Comma-separated genres"}
          style={{
            flex: 1,
            background: C.surface,
            border: `1px solid ${C.border}`,
            color: C.text,
            padding: "6px 10px",
            fontSize: 12,
            fontFamily: "var(--font-nd-mono)",
            borderRadius: 0,
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = C.accent)}
          onBlur={(e) => (e.target.style.borderColor = C.border)}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saved ? "var(--skin-success, #5E9E6E)" : C.accent,
            color: "#fff",
            border: "none",
            padding: "6px 14px",
            fontSize: 12,
            fontFamily: "var(--font-nd-mono)",
            cursor: saving ? "not-allowed" : "pointer",
            borderRadius: 4,
            opacity: saving ? 0.6 : 1,
            transition: "background 100ms",
            whiteSpace: "nowrap",
          }}
        >
          {saved ? "✓ Saved" : saving ? "Saving…" : "Save"}
        </button>
      </div>
      <div style={{ fontFamily: "var(--font-nd-mono)", fontSize: 10, color: C.subtle, marginTop: 4 }}>
        Comma-separated · saved to analytics
      </div>
    </div>
  );
}
