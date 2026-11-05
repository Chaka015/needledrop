"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import LogListenModal from "./LogListenModal";
import BarcodeScanner from "./BarcodeScanner";
import { FanRow, type SearchFan } from "./SearchDropdown";

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
  _spotifyCoverUrl?: string | null;
}

interface NowSpinningModalProps {
  onClose: () => void;
  onSuccess: () => void;
  /** Open with the barcode scanner already running (used by /scan). */
  startInScanMode?: boolean;
}

type Tab = "collection" | "streaming";

interface ScanCandidate {
  releaseId: string;
  masterId: string | null;
  title: string;
  artist: string;
  releaseYear: number | null;
  coverUrl: string | null;
  label: string | null;
  catalogNumber: string | null;
  format: string | null;
}

// camera → looking (hitting Discogs) → results | nomatch | error
type ScanPhase = "camera" | "looking" | "results" | "nomatch" | "error";

interface SpotifyRecent {
  spotifyAlbumId: string;
  title: string;
  artist: string;
  year: string | null;
  coverUrl: string | null;
}

export default function NowSpinningModal({ onClose, onSuccess, startInScanMode = false }: NowSpinningModalProps) {
  const [tab, setTab] = useState<Tab>("collection");
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(true);
  const [collectionExpanded, setCollectionExpanded] = useState(false);
  const [mbResults, setMbResults] = useState<MBResult[]>([]);
  const [mbLoading, setMbLoading] = useState(false);
  const [mbExpanded, setMbExpanded] = useState(false);
  const [spotifyRecent, setSpotifyRecent] = useState<SpotifyRecent[]>([]);
  const [fans, setFans] = useState<SearchFan[]>([]);
  const [fansExpanded, setFansExpanded] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedSource, setSelectedSource] = useState<"physical" | "streaming">("physical");
  const [scanning, setScanning] = useState(startInScanMode);
  const [scanPhase, setScanPhase] = useState<ScanPhase>("camera");
  const [scanResults, setScanResults] = useState<ScanCandidate[]>([]);
  const [addingReleaseId, setAddingReleaseId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fanTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/collection")
      .then((r) => r.json())
      .then((data) => { setCollection(data.items ?? []); setCollectionLoading(false); });
    fetch("/api/spotify/recent")
      .then((r) => r.json())
      .then((data) => setSpotifyRecent(data.tracks ?? []));
  }, []);

  // MusicBrainz search for streaming tab
  useEffect(() => {
    if (tab !== "streaming") return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim()) { setMbResults([]); return; }

    setMbLoading(true);
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/musicbrainz?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setMbResults(data.results ?? []);
      setMbExpanded(false);
      setMbLoading(false);
    }, 400);

    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query, tab]);

  // Fan search for both tabs
  useEffect(() => {
    if (fanTimeout.current) clearTimeout(fanTimeout.current);
    if (!query.trim()) { setFans([]); setFansExpanded(false); return; }

    fanTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setFans(data.fans ?? []);
      setFansExpanded(false);
    }, 400);

    return () => { if (fanTimeout.current) clearTimeout(fanTimeout.current); };
  }, [query]);

  const filteredCollection = query.trim()
    ? collection.filter(
        (c) =>
          c.album.title.toLowerCase().includes(query.toLowerCase()) ||
          c.album.artist.toLowerCase().includes(query.toLowerCase())
      )
    : collection.slice(0, 8);

  const visibleCollection = collectionExpanded ? filteredCollection : filteredCollection.slice(0, 5);
  const visibleMb = mbExpanded ? mbResults : mbResults.slice(0, 5);
  const visibleFans = fansExpanded ? fans : fans.slice(0, 5);

  // Opens LogListenModal only. /api/logs/add creates the log and sets Now Spinning on submit,
  // so closing the form without submitting leaves both untouched.
  function handlePhysicalSpin(album: Album) {
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

    setSelectedSource("streaming");
    setSelectedAlbum(dbAlbum);
  }

  function openScanner() {
    setScanResults([]);
    setScanPhase("camera");
    setScanning(true);
  }

  function closeScanner() {
    setScanning(false);
    setScanResults([]);
    setScanPhase("camera");
  }

  function digInstead() {
    closeScanner();
    // Wait for the input to be interactive again before focusing
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  async function handleBarcode(code: string) {
    setScanPhase("looking");
    try {
      const res = await fetch(`/api/scan/barcode?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.owned) {
        handlePhysicalSpin(data.owned as Album);
        return;
      }
      if (!res.ok) { setScanPhase("error"); return; }
      const candidates: ScanCandidate[] = data.candidates ?? [];
      setScanResults(candidates);
      setScanPhase(candidates.length > 0 ? "results" : "nomatch");
    } catch {
      setScanPhase("error");
    }
  }

  // addToCollection=false: log a spin of a record the fan doesn't own (a friend's, the shop's listening station)
  async function handleScanCandidate(c: ScanCandidate, addToCollection: boolean) {
    if (addingReleaseId) return;
    setAddingReleaseId(c.releaseId);
    try {
      const albumPayload = {
        // Match albums added via dig (master ID)
        discogsId: c.masterId ?? c.releaseId,
        title: c.title,
        artist: c.artist,
        releaseYear: c.releaseYear,
        coverUrl: c.coverUrl,
        label: c.label,
        genre: null,
      };
      const res = await fetch(addToCollection ? "/api/collection/add" : "/api/albums/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          // Keep the exact pressing on the collection row
          addToCollection ? { ...albumPayload, pressingId: c.releaseId } : albumPayload
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.album) { setScanPhase("error"); return; }

      const album: Album = {
        id: data.album.id,
        discogsId: data.album.discogsId,
        title: data.album.title,
        artist: data.album.artist,
        coverUrl: data.album.coverUrl ?? null,
        releaseYear: data.album.releaseYear ?? null,
        label: data.album.label ?? null,
        genre: data.album.genre ?? null,
      };
      if (addToCollection) {
        setCollection((prev) =>
          prev.some((item) => item.album.id === album.id)
            ? prev
            : [{ id: data.entry?.id ?? album.id, album }, ...prev]
        );
      }
      handlePhysicalSpin(album);
    } catch {
      setScanPhase("error");
    } finally {
      setAddingReleaseId(null);
    }
  }

  function handleTabSwitch(t: Tab) {
    closeScanner();
    setTab(t);
    setQuery("");
    setMbResults([]);
    setFans([]);
    setCollectionExpanded(false);
    setMbExpanded(false);
    setFansExpanded(false);
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

        {tab === "collection" && (
          <div className="px-5 pt-4">
            <button
              type="button"
              onClick={scanning ? closeScanner : openScanner}
              className={`ms-btn w-full${scanning ? "" : " fill"}`}
              aria-label={scanning ? "Close barcode scanner" : "Scan a record's barcode"}
            >
              {scanning ? "Close scanner" : "Scan record"}
            </button>
          </div>
        )}

        <div className="px-5 pt-4 pb-2 flex gap-2">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCollectionExpanded(false); if (scanning) closeScanner(); }}
            placeholder={tab === "collection" ? "Search your collection..." : "Search any album or artist..."}
            autoFocus
            className="flex-1 min-w-0 text-sm px-3 py-2 outline-none transition-colors duration-100"
            style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
            onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
          />
        </div>

        <div className="px-5 pb-5 space-y-1 max-h-[70vh] overflow-y-auto">
          {tab === "collection" && scanning ? (
            <ScanPanel
              phase={scanPhase}
              results={scanResults}
              addingReleaseId={addingReleaseId}
              onDetected={handleBarcode}
              onCancel={closeScanner}
              onPick={handleScanCandidate}
              onTryAgain={openScanner}
              onDigInstead={digInstead}
            />
          ) : tab === "collection" ? (
            <>
              {collectionLoading ? (
                <p className="text-xs font-mono py-4 text-center" style={{ color: C.subtle }}>Loading collection...</p>
              ) : filteredCollection.length === 0 && !query.trim() ? (
                <p className="text-xs font-mono py-4 text-center" style={{ color: C.subtle }}>Your collection is empty.</p>
              ) : filteredCollection.length === 0 ? (
                <p className="text-xs font-mono py-4 text-center" style={{ color: C.subtle }}>No matches in your collection.</p>
              ) : (
                <>
                  {query.trim() && (
                    <p className="text-xs font-mono pt-1 pb-1" style={{ color: C.subtle }}>MY RECORDS</p>
                  )}
                  {visibleCollection.map((c) => (
                    <CollectionRow key={c.id} album={c.album} onSelect={() => handlePhysicalSpin(c.album)} />
                  ))}
                  {filteredCollection.length > 5 && !collectionExpanded && (
                    <ExpandButton
                      count={filteredCollection.length - 5}
                      onClick={() => setCollectionExpanded(true)}
                    />
                  )}
                </>
              )}
              <FansSection query={query} fans={visibleFans} expanded={fansExpanded} total={fans.length} onExpand={() => setFansExpanded(true)} />
            </>
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
                        <div className="text-xs font-mono truncate" style={{ color: C.muted }}>
                          <ArtistLink artist={r.artist} />
                          {r.year ? ` · ${r.year}` : ""}
                        </div>
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
              {query.trim() && mbResults.length > 0 && (
                <p className="text-xs font-mono pt-1 pb-1" style={{ color: C.subtle }}>ALBUMS</p>
              )}
              {visibleMb.map((r) => (
                <StreamingRow key={r.mbid} result={r} onSelect={() => handleStreamingSpin(r)} />
              ))}
              {mbResults.length > 5 && !mbExpanded && (
                <ExpandButton count={mbResults.length - 5} onClick={() => setMbExpanded(true)} />
              )}
              <FansSection query={query} fans={visibleFans} expanded={fansExpanded} total={fans.length} onExpand={() => setFansExpanded(true)} />
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

// ── Shared sub-components ───────────────────────────────────────────────────

function ScanPanel({ phase, results, addingReleaseId, onDetected, onCancel, onPick, onTryAgain, onDigInstead }: {
  phase: ScanPhase;
  results: ScanCandidate[];
  addingReleaseId: string | null;
  onDetected: (code: string) => void;
  onCancel: () => void;
  onPick: (c: ScanCandidate, addToCollection: boolean) => void;
  onTryAgain: () => void;
  onDigInstead: () => void;
}) {
  if (phase === "camera") {
    return (
      <div className="pt-2">
        <BarcodeScanner onDetected={onDetected} onCancel={onCancel} />
      </div>
    );
  }

  if (phase === "looking") {
    return (
      <p className="text-xs font-mono py-6 text-center uppercase tracking-widest" style={{ color: "var(--skin-subtle)" }}>
        Flipping through the crates...
      </p>
    );
  }

  if (phase === "nomatch" || phase === "error") {
    return (
      <div className="py-6 text-center">
        <p className="text-sm font-medium" style={{ color: "var(--skin-text)" }}>
          {phase === "nomatch" ? "No match for that barcode" : "Couldn't reach Discogs"}
        </p>
        <p className="text-xs font-mono mt-1" style={{ color: "var(--skin-muted)" }}>
          {phase === "nomatch"
            ? "Give it another go, or dig for it by name."
            : "Something went sideways on the lookup. Try again in a sec."}
        </p>
        <div className="flex justify-center gap-3 mt-4">
          <button type="button" onClick={onTryAgain} className="ms-btn fill sm">Try again</button>
          <button type="button" onClick={onDigInstead} className="ms-btn sm">Dig instead</button>
        </div>
      </div>
    );
  }

  // results — none of these are in the fan's collection yet
  return (
    <>
      <p className="text-xs font-mono pt-2 pb-1 uppercase tracking-widest" style={{ color: "var(--skin-subtle)" }}>
        Not in your collection yet
      </p>
      {results.map((c) => {
        const meta = [c.label, c.catalogNumber].filter(Boolean).join(" · ");
        const busy = addingReleaseId === c.releaseId;
        return (
          <div
            key={c.releaseId}
            className="p-2 space-y-2"
            style={{ borderBottom: "1px solid var(--skin-border)" }}
          >
          <div className="flex items-center gap-3">
            {c.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.coverUrl} alt={c.title} className="object-cover shrink-0" style={{ width: 48, height: 48, borderRadius: 4 }} />
            ) : (
              <div className="shrink-0" style={{ width: 48, height: 48, backgroundColor: "var(--skin-surface-raised)", borderRadius: 4 }} />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: "var(--skin-text)" }}>{c.title}</div>
              <div className="text-xs truncate" style={{ color: "var(--skin-muted)" }}>
                {c.artist}{c.releaseYear ? ` · ${c.releaseYear}` : ""}
              </div>
              <div className="text-xs font-mono truncate" style={{ color: "var(--skin-subtle)" }}>
                {[meta, c.format].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onPick(c, false)}
                disabled={addingReleaseId !== null}
                className="ms-btn sm flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? "One sec..." : "Log it"}
              </button>
              <button
                type="button"
                onClick={() => onPick(c, true)}
                disabled={addingReleaseId !== null}
                className="ms-btn fill sm flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? "One sec..." : "Add + log"}
              </button>
            </div>
          </div>
        );
      })}
      <div className="flex gap-3 pt-3">
        <button type="button" onClick={onTryAgain} className="ms-btn sm">Scan again</button>
        <button type="button" onClick={onDigInstead} className="ms-btn sm">Dig instead</button>
      </div>
    </>
  );
}

function ArtistLink({ artist }: { artist: string }) {
  return (
    <Link
      href={`/search?q=${encodeURIComponent(artist)}`}
      style={{ color: "inherit", textDecoration: "none" }}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--skin-accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--skin-muted)")}
    >
      {artist}
    </Link>
  );
}

function ExpandButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-xs font-mono py-1.5 transition-colors duration-100"
      style={{ color: "var(--skin-accent)", background: "none", border: "none", cursor: "pointer", textAlign: "left", paddingLeft: 8 }}
    >
      +{count} more
    </button>
  );
}

function FansSection({ query, fans, expanded, total, onExpand }: {
  query: string;
  fans: SearchFan[];
  expanded: boolean;
  total: number;
  onExpand: () => void;
}) {
  if (!query.trim() || fans.length === 0) return null;
  return (
    <>
      <div style={{ height: 1, backgroundColor: "var(--skin-border)", margin: "8px 0" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 4 }}>
        <p className="text-xs font-mono" style={{ color: "var(--skin-subtle)" }}>FANS</p>
        {total > fans.length && !expanded && (
          <ExpandButton count={total - fans.length} onClick={onExpand} />
        )}
        {expanded && (
          <Link
            href={`/search?q=${encodeURIComponent(query)}&tab=fans`}
            className="text-xs font-mono"
            style={{ color: "var(--skin-accent)", textDecoration: "none" }}
          >
            See all →
          </Link>
        )}
      </div>
      {fans.map((fan) => (
        <FanRow
          key={fan.id}
          fan={fan}
          onClick={() => { window.location.href = `/${fan.username}`; }}
        />
      ))}
    </>
  );
}

function CollectionRow({ album, onSelect }: { album: Album; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 p-2 text-left transition-colors duration-100"
      style={{ backgroundColor: "transparent", borderRadius: 4 }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--skin-surface-raised)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      {album.coverUrl ? (
        <Image src={album.coverUrl} alt={album.title} width={40} height={40}
          className="object-cover shrink-0" style={{ width: 40, height: 40, borderRadius: 4 }} unoptimized />
      ) : (
        <div className="shrink-0" style={{ width: 40, height: 40, backgroundColor: "var(--skin-surface-raised)", borderRadius: 4 }} />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: "var(--skin-text)" }}>{album.title}</div>
        <div className="text-xs font-mono truncate" style={{ color: "var(--skin-muted)" }}>
          <ArtistLink artist={album.artist} />
          {album.releaseYear ? ` · ${album.releaseYear}` : ""}
        </div>
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
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--skin-surface-raised)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt={result.title}
          className="object-cover shrink-0" style={{ width: 40, height: 40, borderRadius: 4 }} />
      ) : (
        <div className="shrink-0 flex items-center justify-center text-xs font-mono"
          style={{ width: 40, height: 40, backgroundColor: "var(--skin-surface-raised)", borderRadius: 4, color: "var(--skin-subtle)" }}>
          ▶
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: "var(--skin-text)" }}>{result.title}</div>
        <div className="text-xs font-mono truncate" style={{ color: "var(--skin-muted)" }}>
          <ArtistLink artist={result.artist} />
          {result.year ? ` · ${result.year}` : ""}
        </div>
      </div>
    </button>
  );
}
