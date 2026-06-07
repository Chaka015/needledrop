"use client";

import { useState } from "react";

const C = {
  surface: "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border: "var(--skin-border)",
  text: "var(--skin-text)",
  muted: "var(--skin-muted)",
  subtle: "var(--skin-subtle)",
  accent: "var(--skin-accent)",
  accentHover: "var(--skin-accent-hover)",
};

export default function ImportDiscogs() {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<{ imported: number; skipped: number; total: number } | null>(null);
  const [error, setError] = useState("");

  async function handleImport() {
    if (!username.trim()) {
      setError("Please enter your Discogs username.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    const res = await fetch("/api/discogs/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discogsUsername: username.trim() }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Import failed.");
    } else {
      setResult(data);
      setTimeout(() => window.location.reload(), 2000);
    }

    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Your Discogs username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={loading}
        className="w-full px-3 py-2 text-xs font-mono"
        style={{
          backgroundColor: C.surface,
          color: C.text,
          border: `1px solid ${C.border}`,
          borderRadius: 0,
          outline: "none",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
        onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
      />
      <button
        onClick={handleImport}
        disabled={loading}
        className="w-full py-3 text-xs font-mono transition-colors duration-100"
        style={{
          backgroundColor: loading ? C.surfaceRaised : C.surface,
          color: loading ? C.subtle : C.muted,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          opacity: loading ? 0.6 : 1,
        }}
        onMouseEnter={(e) => !loading && (e.currentTarget.style.color = C.text)}
        onMouseLeave={(e) => !loading && (e.currentTarget.style.color = C.muted)}
      >
        {loading ? "IMPORTING FROM DISCOGS... (THIS MAY TAKE A MINUTE)" : "↓ IMPORT FROM DISCOGS"}
      </button>

      {result && (
        <p className="text-xs font-mono" style={{ color: C.accent }}>
          ✓ Imported {result.imported} new records, {result.skipped} already in collection. Reloading...
        </p>
      )}

      {error && (
        <p className="text-xs font-mono" style={{ color: "var(--skin-danger, #C0392B)" }}>{error}</p>
      )}
    </div>
  );
}
