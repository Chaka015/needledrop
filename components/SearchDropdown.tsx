"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface SearchAlbum {
  id: string;
  discogsId: string;
  title: string;
  artist: string;
  releaseYear: number | null;
  coverUrl: string | null;
  label: string | null;
  genre: string | null;
  logCount: number;
  collectionCount: number;
}

export interface SearchFan {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number;
  collectionCount: number;
  logCount: number;
  isFollowing: boolean;
}

interface SearchDropdownProps {
  query: string;
  onAlbumSelect?: (album: SearchAlbum) => void;
  onFanSelect?: (fan: SearchFan) => void;
  onClose?: () => void;
}

export default function SearchDropdown({ query, onAlbumSelect, onFanSelect, onClose }: SearchDropdownProps) {
  const router = useRouter();
  const [albums, setAlbums] = useState<SearchAlbum[]>([]);
  const [fans, setFans] = useState<SearchFan[]>([]);
  const [loading, setLoading] = useState(false);
  const [albumsExpanded, setAlbumsExpanded] = useState(false);
  const [fansExpanded, setFansExpanded] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeout.current) clearTimeout(timeout.current);
    if (!query.trim()) {
      setAlbums([]);
      setFans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setAlbums(data.albums ?? []);
        setFans(data.fans ?? []);
        setAlbumsExpanded(false);
        setFansExpanded(false);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (timeout.current) clearTimeout(timeout.current); };
  }, [query]);

  if (!query.trim()) return null;

  const visibleAlbums = albums.slice(0, albumsExpanded ? 15 : 5);
  const visibleFans = fans.slice(0, fansExpanded ? 15 : 5);

  function handleAlbumClick(album: SearchAlbum) {
    if (onAlbumSelect) {
      onAlbumSelect(album);
    } else {
      router.push(`/album/${encodeURIComponent(album.discogsId)}`);
    }
    onClose?.();
  }

  function handleFanClick(fan: SearchFan) {
    if (onFanSelect) {
      onFanSelect(fan);
    } else {
      router.push(`/${fan.username}`);
    }
    onClose?.();
  }

  return (
    <div style={{
      position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100,
      background: "var(--skin-surface)", border: "1px solid var(--skin-border)",
      maxHeight: 480, overflowY: "auto",
    }}>
      {loading ? (
        <div style={{ padding: 16, textAlign: "center", fontSize: 11, fontFamily: "monospace", color: "var(--skin-subtle)" }}>
          Digging...
        </div>
      ) : albums.length === 0 && fans.length === 0 ? (
        <div style={{ padding: 16, textAlign: "center", fontSize: 11, fontFamily: "monospace", color: "var(--skin-subtle)" }}>
          No results found.
        </div>
      ) : (
        <>
          {albums.length > 0 && (
            <section>
              <SectionHeader label="Albums" extra={
                albums.length > 5 && !albumsExpanded
                  ? <ExpandBtn onClick={() => setAlbumsExpanded(true)} count={albums.length - 5} />
                  : albumsExpanded
                  ? <Link href={`/search?q=${encodeURIComponent(query)}&tab=albums`} style={expandLinkStyle} onClick={onClose}>See all →</Link>
                  : null
              } />
              {visibleAlbums.map((album) => (
                <AlbumRow key={album.id} album={album} onClick={() => handleAlbumClick(album)} onArtistClick={onClose} />
              ))}
            </section>
          )}

          {fans.length > 0 && (
            <section>
              {albums.length > 0 && <Divider />}
              <SectionHeader label="Fans" extra={
                fans.length > 5 && !fansExpanded
                  ? <ExpandBtn onClick={() => setFansExpanded(true)} count={fans.length - 5} />
                  : fansExpanded
                  ? <Link href={`/search?q=${encodeURIComponent(query)}&tab=fans`} style={expandLinkStyle} onClick={onClose}>See all →</Link>
                  : null
              } />
              {visibleFans.map((fan) => (
                <FanRow key={fan.id} fan={fan} onClick={() => handleFanClick(fan)} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components (also exported for reuse) ────────────────────────────────

export function AlbumRow({ album, onClick, onArtistClick }: {
  album: SearchAlbum;
  onClick: () => void;
  onArtistClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={rowStyle}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--skin-surface-raised)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {album.coverUrl ? (
        <Image src={album.coverUrl} alt={album.title} width={40} height={40}
          style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} unoptimized />
      ) : (
        <div style={{ width: 40, height: 40, borderRadius: 4, background: "var(--skin-surface-raised)", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--skin-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {album.title}
        </div>
        <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--skin-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <Link
            href={`/search?q=${encodeURIComponent(album.artist)}`}
            style={{ color: "inherit", textDecoration: "none" }}
            onClick={(e) => { e.stopPropagation(); onArtistClick?.(); }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--skin-accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--skin-muted)")}
          >
            {album.artist}
          </Link>
          {album.releaseYear ? ` · ${album.releaseYear}` : ""}
        </div>
      </div>
      {(album.logCount > 0 || album.collectionCount > 0) && (
        <div style={{ fontSize: 10, fontFamily: "monospace", color: "var(--skin-subtle)", flexShrink: 0, textAlign: "right", lineHeight: 1.4 }}>
          {album.logCount > 0 && <div>{album.logCount} logged</div>}
          {album.collectionCount > 0 && <div>{album.collectionCount} collected</div>}
        </div>
      )}
    </button>
  );
}

export function FanRow({ fan, onClick }: { fan: SearchFan; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={rowStyle}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--skin-surface-raised)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {fan.avatarUrl ? (
        <Image src={fan.avatarUrl} alt={fan.username} width={36} height={36}
          style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} unoptimized />
      ) : (
        <div style={{
          width: 36, height: 36, borderRadius: "50%", background: "var(--skin-surface-raised)",
          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "var(--skin-subtle)",
        }}>
          {fan.username[0].toUpperCase()}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--skin-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {fan.username}
        </div>
        <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--skin-muted)" }}>
          {fan.collectionCount} records · {fan.logCount} logged
        </div>
      </div>
    </button>
  );
}

function SectionHeader({ label, extra }: { label: string; extra?: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 14px 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--skin-subtle)" }}>
        {label}
      </span>
      {extra}
    </div>
  );
}

function ExpandBtn({ onClick, count }: { onClick: () => void; count: number }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ fontSize: 10, fontFamily: "monospace", color: "var(--skin-accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
      +{count} more
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--skin-border)", margin: "4px 0" }} />;
}

const rowStyle: React.CSSProperties = {
  width: "100%", display: "flex", alignItems: "center", gap: 10,
  padding: "8px 14px", background: "transparent", border: "none", cursor: "pointer",
  textAlign: "left", transition: "background 100ms",
};

const expandLinkStyle: React.CSSProperties = {
  fontSize: 10, fontFamily: "monospace", color: "var(--skin-accent)", textDecoration: "none",
};
