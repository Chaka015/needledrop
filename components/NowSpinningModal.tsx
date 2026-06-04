"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
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
};

interface Album {
  id: string;
  discogsId: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  releaseYear: number | null;
  label: string | null;
  genre: string | null;
}

interface CollectionItem {
  id: string;
  album: Album;
}

interface MBResult {
  mbid: string;
  title: string;
  artist: string;
  year: string | null;
  hasCover: boolean;
  label: string | null;
  _spotifyCoverUrl?: string | null; // pre-resolved cover URL (Spotify recently played)
}

interface NowSpinningModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Tab = "collection" | "streaming";

interface SpotifyRecent {
  spotifyAlbumId: string;
  title: string;
  artist: string;
  year: string | null;
  coverUrl: string | null;
}

export default function NowSpinningModal({ onClose, onSuccess }: NowSpinningModalProps) {
  const [tab, setTab] = useState<Tab>("collection");
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(true);
  const [mbResults, setMbResults] = useState<MBResult[]>([]);
  const [mbLoading, setMbLoading] = useState(false);
  const [spotifyRecent, setSpotifyRecent] = useState<SpotifyRecent[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedSource, setSelectedSource] = useState<"physical" | "streaming">("physical");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/collection")
      .then((r) => r.json())
      .then((data) => { setCollection(data.items ?? []); setCollectionLoading(false); });
    // Fetch Spotify recently played if connected
    fetch("/api/spotify/recent")
      .then((r) => r.json())
      .then((data) => setSpotifyRecent(data.tracks ?? []));
  }, []);

  useEffect(() => {
    if (tab !== "streaming") return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim()) { setMbResults([]); return; }

    setMbLoading(true);
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/musicbrainz?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setMbResults(data.results ?? []);
      setMbLoading(false);
    }, 400);

    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query, tab]);

  const filteredCollection = query.trim()
    ? collection.filter(
        (c) =>
          c.album.title.toLowerCase().includes(query.toLowerCase()) ||
          c.album.artist.toLowerCase().includes(query.toLowerCase())
      )
    : collection.slice(0, 8);

  async function handlePhysicalSpin(album: Album) {
    await fetch("/api/now-spinning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: album.id, source: "physical" }),
    });
    setSelectedSource("physical");
    setSelectedAlbum(album);
  }

  async function handleStreamingSpin(mb: MBResult) {
    const coverUrl = mb._spotifyCoverUrl !== undefined
      ? mb._spotifyCoverUrl
      : mb.hasCover
      ? `https://coverartarchive.org/release/${mb.mbid}/front-250`
      : null;

    const payload = {
      discogsId: `mb:${mb.mbid}`,
      title: mb.title,
      artist: mb.artist,
      releaseYear: mb.year ? parseInt(mb.year) : null,
      coverUrl,
      label: mb.label,
      genre: null,
    };

    const res = await fetch("/api/albums/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    const dbAlbum: Album = {
      id: data.album?.id ?? "",
      discogsId: payload.discogsId,
      title: mb.title,
      artist: mb.artist,
      coverUrl,
      releaseYear: payload.releaseYear,
      label: mb.label,
      genre: null,
    };

    await fetch("/api/now-spinning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ albumId: dbAlbum.id, source: "streaming" }),
    });

    setSelectedSource("streaming");
    setSelectedAlbum(dbAlbum);
  }

  function handleTabSwitch(t: Tab) {
    setTab(t);
    setQuery("");
    setMbResults([]);
  }

  if (selectedAlbum) {
    return (
      <LogListenModal
        album={{
          discogsId: selectedAlbum.discogsId,
          title: selectedAlbum.title,
          albumTitle: selectedAlbum.title,
          artist: selectedAlbum.artist,
          releaseYear: selectedAlbum.releaseYear,
          coverUrl: selectedAlbum.coverUrl,
          label: selectedAlbum.label,
          genre: selectedAlbum.genre,
        }}
        source={selectedSource}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-md" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <h2 className="text-sm font-bold" style={{ color: C.text }}>What are you spinning?</h2>
          <button onClick={onClose} style={{ color: C.subtle }} className="text-xl leading-none">×</button>
        </div>

        <div className="flex" style={{ borderBottom: `1px solid ${C.border}` }}>
          {(["collection", "streaming"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTabSwitch(t)}
              className="flex-1 py-2.5 text-xs font-mono uppercase tracking-widest transition-colors duration-100"
              style={{
                color: tab === t ? C.text : C.subtle,
                borderBottom: tab === t ? `2px solid ${C.accent}` : "2px solid transparent",
                backgroundColor: tab === t ? C.surfaceRaised : "transparent",
              }}
            >
              {t === "collection" ? "▼ My Records" : "▶ Streaming"}
            </button>
          ))}
        </div>

        <div className="px-5 pt-4 pb-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "collection" ? "Search your collection..." : "Search any album or artist..."}
            autoFocus
            className="w-full text-sm px-3 py-2 outline-none transition-colors duration-100"
            style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
            onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
          />
        </div>

        <div className="px-5 pb-5 space-y-1 max-h-80 overflow-y-auto">
          {tab === "collection" ? (
            collectionLoading ? (
              <p className="text-xs font-mono py-4 text-center" style={{ color: C.subtle }}>Loading collection...</p>
            ) : filteredCollection.length === 0 ? (
              <p className="text-xs font-mono py-4 text-center" style={{ color: C.subtle }}>No matches found.</p>
            ) : (
              filteredCollection.map((c) => (
                <CollectionRow key={c.id} album={c.album} onSelect={() => handlePhysicalSpin(c.album)} />
              ))
            )
          ) : (
            <>
              {/* Spotify recently played */}
              {!query.trim() && spotifyRecent.length > 0 && (
                <>
                  <p className="text-xs font-mono pt-2 pb-1" style={{ color: C.subtle }}>RECENTLY PLAYED ON SPOTIFY</p>
                  {spotifyRecent.map((r) => (
                    <button
                      key={r.spotifyAlbumId}
                      onClick={() => handleStreamingSpin({ mbid: `spotify:album:${r.spotifyAlbumId}`, title: r.title, artist: r.artist, year: r.year, hasCover: !!r.coverUrl, label: null, _spotifyCoverUrl: r.coverUrl })}
                      className="w-full flex items-center gap-3 p-2 text-left transition-colors duration-100"
                      style={{ backgroundColor: "transparent", borderRadius: 4 }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.surfaceRaised)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {r.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.coverUrl} alt={r.title} className="object-cover shrink-0" style={{ width: 40, height: 40, borderRadius: 4 }} />
                      ) : (
                        <div className="shrink-0" style={{ width: 40, height: 40, backgroundColor: C.surfaceRaised, borderRadius: 4 }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: C.text }}>{r.title}</div>
                        <div className="text-xs font-mono truncate" style={{ color: C.muted }}>{r.artist}{r.year ? ` · ${r.year}` : ""}</div>
                      </div>
                    </button>
                  ))}
                  <div style={{ height: 1, backgroundColor: C.border, margin: "8px 0" }} />
                  <p className="text-xs font-mono pb-1" style={{ color: C.subtle }}>OR SEARCH MUSICBRAINZ</p>
                </>
              )}
              {!query.trim() && spotifyRecent.length === 0 && (
                <p className="text-xs font-mono py-4 text-center" style={{ color: C.subtle }}>
                  Search any album — powered by MusicBrainz
                </p>
              )}
              {mbLoading && (
                <p className="text-xs font-mono py-4 text-center" style={{ color: C.subtle }}>Searching...</p>
              )}
              {!mbLoading && query.trim() && mbResults.length === 0 && (
                <p className="text-xs font-mono py-4 text-center" style={{ color: C.subtle }}>No results found.</p>
              )}
              {mbResults.map((r) => (
                <StreamingRow key={r.mbid} result={r} onSelect={() => handleStreamingSpin(r)} />
              ))}
            </>
          )}
        </div>

        {tab === "streaming" && (
          <div className="px-5 pb-4" style={{ borderTop: `1px solid ${C.border}` }}>
            <p className="pt-3 text-xs font-mono" style={{ color: C.subtle }}>
              ▶ Streaming listens are logged separately and don&apos;t count toward your Records stat.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CollectionRow({ album, onSelect }: { album: Album; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 p-2 text-left transition-colors duration-100"
      style={{ backgroundColor: "transparent", borderRadius: 4 }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.surfaceRaised)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      {album.coverUrl ? (
        <Image src={album.coverUrl} alt={album.title} width={40} height={40}
          className="object-cover shrink-0" style={{ width: 40, height: 40, borderRadius: 4 }} unoptimized />
      ) : (
        <div className="shrink-0" style={{ width: 40, height: 40, backgroundColor: C.surfaceRaised, borderRadius: 4 }} />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: C.text }}>{album.title}</div>
        <div className="text-xs font-mono truncate" style={{ color: C.muted }}>{album.artist}</div>
      </div>
    </button>
  );
}

function StreamingRow({ result, onSelect }: { result: MBResult; onSelect: () => void }) {
  const coverUrl = result.hasCover
    ? `https://coverartarchive.org/release/${result.mbid}/front-250`
    : null;

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 p-2 text-left transition-colors duration-100"
      style={{ backgroundColor: "transparent", borderRadius: 4 }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.surfaceRaised)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt={result.title}
          className="object-cover shrink-0" style={{ width: 40, height: 40, borderRadius: 4 }} />
      ) : (
        <div className="shrink-0 flex items-center justify-center text-xs font-mono"
          style={{ width: 40, height: 40, backgroundColor: C.surfaceRaised, borderRadius: 4, color: C.subtle }}>
          ▶
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: C.text }}>{result.title}</div>
        <div className="text-xs font-mono truncate" style={{ color: C.muted }}>
          {result.artist}{result.year ? ` · ${result.year}` : ""}
        </div>
      </div>
    </button>
  );
}
