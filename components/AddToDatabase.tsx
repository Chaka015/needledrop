"use client";

import { useState, useRef } from "react";
import LogListenModal from "./LogListenModal";

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
  success:       "var(--skin-live)",
  danger:        "var(--skin-danger, #C0392B)",
};

const FORMAT_OPTIONS = ["Vinyl", "CD", "Cassette", "Digital"];

interface SpotifyResult {
  _source: "spotify";
  spotifyId: string;
  title: string;
  artist: string;
  year: string | null;
  coverUrl: string | null;
}

interface MBResult {
  _source: "musicbrainz";
  mbid: string;
  title: string;
  artist: string;
  year: string | null;
  coverUrl: string | null;
  label: string | null;
  catalogNumber: string | null;
  formats: string[];
}

type SearchResult = SpotifyResult | MBResult;

interface CreatedAlbum {
  id: string;
  discogsId: string;
  title: string;
  artist: string;
  releaseYear: number | null;
  coverUrl: string | null;
  label: string | null;
  genre: string | null;
}

type Step = "search" | "form" | "logging";

interface Props {
  onClose: () => void;
}

export default function AddToDatabase({ onClose }: Props) {
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [releaseYear, setReleaseYear] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [label, setLabel] = useState("");
  const [catalogNumber, setCatalogNumber] = useState("");
  const [formats, setFormats] = useState<string[]>([]);
  const [genreTags, setGenreTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdAlbum, setCreatedAlbum] = useState<CreatedAlbum | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      // Try Spotify first
      const spotifyRes = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`);
      const spotifyData = await spotifyRes.json();
      const spotifyResults: SpotifyResult[] = (spotifyData.results ?? []).map((r: Omit<SpotifyResult, "_source">) => ({
        ...r,
        _source: "spotify" as const,
      }));

      if (spotifyResults.length > 0) {
        setResults(spotifyResults);
        setSearching(false);
        return;
      }

      // Fallback to MusicBrainz
      const mbRes = await fetch(`/api/musicbrainz?q=${encodeURIComponent(q)}`);
      const mbData = await mbRes.json();
      const mbResults: MBResult[] = (mbData.results ?? []).map((r: {
        mbid: string;
        title: string;
        artist: string;
        year: string | null;
        hasCover: boolean;
        label: string | null;
        catalogNumber: string | null;
        formats: string[];
      }) => ({
        _source: "musicbrainz" as const,
        mbid: r.mbid,
        title: r.title,
        artist: r.artist,
        year: r.year,
        coverUrl: r.hasCover ? `https://coverartarchive.org/release/${r.mbid}/front-250` : null,
        label: r.label,
        catalogNumber: r.catalogNumber,
        formats: r.formats,
      }));

      setResults(mbResults);
      setSearching(false);
    }, 400);
  }

  function selectResult(r: SearchResult) {
    setSelected(r);
    setTitle(r.title);
    setArtist(r.artist);
    setReleaseYear(r.year ?? "");
    setCoverUrl(r.coverUrl ?? "");
    setError("");

    if (r._source === "musicbrainz") {
      setLabel(r.label ?? "");
      setCatalogNumber(r.catalogNumber ?? "");
      // Map MB formats to our known format names where possible
      const knownFormats = r.formats.flatMap((f) => {
        const lower = f.toLowerCase();
        if (lower.includes("vinyl") || lower.includes("12") || lower.includes("7")) return ["Vinyl"];
        if (lower.includes("cd")) return ["CD"];
        if (lower.includes("cassette")) return ["Cassette"];
        if (lower.includes("digital")) return ["Digital"];
        return [];
      }).filter((f) => FORMAT_OPTIONS.includes(f));
      setFormats([...new Set(knownFormats)]);
    } else {
      setLabel("");
      setCatalogNumber("");
      setFormats([]);
    }
    setGenreTags([]);
    setTagInput("");
    setStep("form");
  }

  function toggleFormat(f: string) {
    setFormats((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
  }

  function addTag(tag: string) {
    const t = tag.trim().toLowerCase();
    if (t && !genreTags.includes(t)) setGenreTags((prev) => [...prev, t]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setGenreTags((prev) => prev.filter((t) => t !== tag));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Album title is required."); return; }
    if (!artist.trim()) { setError("Artist is required."); return; }
    if (!releaseYear) { setError("Release year is required."); return; }
    if (!label.trim()) { setError("Label is required."); return; }
    if (!catalogNumber.trim()) { setError("Catalog number is required."); return; }
    if (formats.length === 0) { setError("Select at least one format."); return; }

    setSubmitting(true);
    setError("");

    const spotifyId = selected?._source === "spotify" ? (selected as SpotifyResult).spotifyId : undefined;
    const mbid = selected?._source === "musicbrainz" ? (selected as MBResult).mbid : undefined;

    const res = await fetch("/api/albums/add-to-database", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        artist: artist.trim(),
        releaseYear: releaseYear ? parseInt(releaseYear) : null,
        coverUrl: coverUrl || null,
        label: label.trim(),
        catalogNumber: catalogNumber.trim(),
        formats,
        genreTags,
        spotifyId,
        mbid,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to add album.");
      setSubmitting(false);
      return;
    }

    const data = await res.json();
    const album = data.album;

    // Set now spinning before opening the log modal
    await fetch("/api/now-spinning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: album.id, source: "physical" }),
    });

    setCreatedAlbum({
      id: album.id,
      discogsId: album.discogsId,
      title: album.title,
      artist: album.artist,
      releaseYear: album.releaseYear,
      coverUrl: album.coverUrl,
      label: album.label,
      genre: album.genre,
    });

    setSubmitting(false);
    setStep("logging");
  }

  if (step === "logging" && createdAlbum) {
    return (
      <LogListenModal
        album={{
          discogsId: createdAlbum.discogsId,
          title: createdAlbum.title,
          albumTitle: createdAlbum.title,
          artist: createdAlbum.artist,
          releaseYear: createdAlbum.releaseYear,
          coverUrl: createdAlbum.coverUrl,
          label: createdAlbum.label,
          genre: createdAlbum.genre,
        }}
        source="physical"
        onClose={onClose}
        onSuccess={() => { window.location.href = `/album/${encodeURIComponent(createdAlbum.discogsId)}`; }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-lg"
        style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: C.text }}>
              {step === "search" ? "Add Album to Database" : "Fill in Album Details"}
            </h2>
            {step === "form" && (
              <button
                onClick={() => { setStep("search"); setError(""); }}
                className="text-xs font-mono mt-0.5 transition-colors duration-100"
                style={{ color: C.accent }}>
                ← Back to search results
              </button>
            )}
          </div>
          <button onClick={onClose} style={{ color: C.subtle }} className="text-xl leading-none">×</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">

          {/* ── Search step ── */}
          {step === "search" && (
            <div className="px-5 pt-4 pb-5">
              <input
                type="text"
                value={query}
                onChange={handleQueryChange}
                placeholder="Search Spotify or MusicBrainz..."
                autoFocus
                className="w-full text-sm px-3 py-2.5 outline-none transition-colors duration-100 mb-4"
                style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
              />

              {searching && (
                <p className="text-xs font-mono text-center py-4" style={{ color: C.subtle }}>Searching...</p>
              )}
              {!searching && query && results.length === 0 && (
                <p className="text-xs font-mono text-center py-4" style={{ color: C.subtle }}>No results found.</p>
              )}
              {!searching && !query && (
                <p className="text-xs font-mono text-center py-6" style={{ color: C.subtle }}>
                  Searches Spotify first, falls back to MusicBrainz.
                </p>
              )}

              <div className="space-y-1">
                {results.map((r, i) => (
                  <SearchResultRow key={i} result={r} onSelect={() => selectResult(r)} />
                ))}
              </div>

              <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 text-xs font-mono uppercase tracking-widest transition-colors duration-100"
                  style={{ backgroundColor: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 4 }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.muted)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
                  Back to Album Page
                </button>
              </div>
            </div>
          )}

          {/* ── Form step ── */}
          {step === "form" && (
            <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">

              {/* Cover + Title/Artist */}
              <div className="flex gap-4">
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt={title}
                    className="shrink-0 object-cover" style={{ width: 72, height: 72, borderRadius: 4 }} />
                ) : (
                  <div className="shrink-0 flex items-center justify-center text-xs font-mono"
                    style={{ width: 72, height: 72, backgroundColor: C.surfaceRaised, borderRadius: 4, color: C.subtle }}>
                    NO ART
                  </div>
                )}
                <div className="flex-1 space-y-2 min-w-0">
                  <div>
                    <label className="text-xs font-mono uppercase tracking-widest block mb-1" style={{ color: C.subtle }}>
                      Album Title *
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full text-sm px-3 py-2 outline-none transition-colors duration-100"
                      style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
                      onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono uppercase tracking-widest block mb-1" style={{ color: C.subtle }}>
                      Artist(s) *
                    </label>
                    <input
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      className="w-full text-sm px-3 py-2 outline-none transition-colors duration-100"
                      style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
                      onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
                    />
                  </div>
                </div>
              </div>

              {/* Release Year + Label */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest block mb-1" style={{ color: C.subtle }}>
                    Release Year *
                  </label>
                  <input
                    value={releaseYear}
                    onChange={(e) => setReleaseYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="YYYY"
                    className="w-full text-sm px-3 py-2 outline-none transition-colors duration-100"
                    style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
                  />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase tracking-widest block mb-1" style={{ color: C.subtle }}>
                    Label *
                  </label>
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full text-sm px-3 py-2 outline-none transition-colors duration-100"
                    style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
                  />
                </div>
              </div>

              {/* Catalog Number */}
              <div>
                <label className="text-xs font-mono uppercase tracking-widest block mb-1" style={{ color: C.subtle }}>
                  Catalog Number *
                </label>
                <input
                  value={catalogNumber}
                  onChange={(e) => setCatalogNumber(e.target.value)}
                  placeholder="e.g. WARPCD123"
                  className="w-full text-sm px-3 py-2 outline-none transition-colors duration-100"
                  style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
                />
              </div>

              {/* Formats */}
              <div>
                <label className="text-xs font-mono uppercase tracking-widest block mb-2" style={{ color: C.subtle }}>
                  Formats *{" "}
                  <span style={{ textTransform: "none", letterSpacing: 0 }}>(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {FORMAT_OPTIONS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFormat(f)}
                      className="px-3 py-1.5 text-xs font-mono transition-colors duration-100"
                      style={{
                        backgroundColor: formats.includes(f) ? C.accent : C.surfaceRaised,
                        color: formats.includes(f) ? C.text : C.muted,
                        borderRadius: 4,
                        border: `1px solid ${formats.includes(f) ? C.accent : C.border}`,
                      }}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genre Tags */}
              <div>
                <label className="text-xs font-mono uppercase tracking-widest block mb-2" style={{ color: C.subtle }}>
                  Genre Tags
                </label>
                {genreTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {genreTags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs font-mono"
                        style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 4, color: C.muted }}>
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)}
                          style={{ color: C.subtle, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
                    }}
                    placeholder="Add a tag, press Enter"
                    className="flex-1 text-sm px-3 py-2 outline-none transition-colors duration-100"
                    style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
                    onBlur={(e) => { e.currentTarget.style.borderColor = C.border; if (tagInput.trim()) addTag(tagInput); }}
                  />
                  <button
                    type="button"
                    onClick={() => addTag(tagInput)}
                    className="px-3 py-2 text-xs font-mono transition-colors duration-100"
                    style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.muted, borderRadius: 4 }}>
                    + ADD
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs font-mono" style={{ color: C.danger }}>{error}</p>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 text-sm font-medium transition-colors duration-100"
                  style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4, opacity: submitting ? 0.4 : 1 }}
                  onMouseEnter={(e) => !submitting && (e.currentTarget.style.backgroundColor = C.accentHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.accent)}>
                  {submitting ? "ADDING TO CATALOG..." : "ADD & LOG NOW SPINNING"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 text-xs font-mono uppercase tracking-widest transition-colors duration-100"
                  style={{ backgroundColor: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 4 }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.muted)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}>
                  Back to Album Page
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchResultRow({ result, onSelect }: { result: SearchResult; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 p-2 text-left transition-colors duration-100"
      style={{ backgroundColor: "transparent", borderRadius: 4 }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.surfaceRaised)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
      {result.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={result.coverUrl} alt={result.title}
          className="object-cover shrink-0" style={{ width: 48, height: 48, borderRadius: 4 }} />
      ) : (
        <div className="shrink-0 flex items-center justify-center text-xs font-mono"
          style={{ width: 48, height: 48, backgroundColor: C.surfaceRaised, borderRadius: 4, color: C.subtle }}>
          ?
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: C.text }}>{result.title}</div>
        <div className="text-xs font-mono truncate" style={{ color: C.muted }}>
          {result.artist}{result.year ? ` · ${result.year}` : ""}
        </div>
      </div>
      <span
        className="text-xs font-mono shrink-0 px-1.5 py-0.5"
        style={{
          color: result._source === "spotify" ? C.success : C.subtle,
          backgroundColor: C.surfaceRaised,
          borderRadius: 4,
        }}>
        {result._source === "spotify" ? "SPOTIFY" : "MB"}
      </span>
    </button>
  );
}
