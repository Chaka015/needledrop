"use client";

import Image from "next/image";
import Link from "next/link";

const C = {
  surface: "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border: "var(--skin-border)",
  text: "var(--skin-text)",
  muted: "var(--skin-muted)",
  subtle: "var(--skin-subtle)",
};

interface Track {
  id: string;
  position: number;
  album: {
    discogsId: string;
    title: string;
    artist: string;
    coverUrl: string | null;
    releaseYear: number | null;
  };
}

export default function MixTrackList({ items }: { items: Track[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      {items.map((item, idx) => (
        <Link
          key={item.id}
          href={`/album/${encodeURIComponent(item.album.discogsId)}`}
          className="flex items-center gap-4 p-3 transition-colors duration-100"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.surfaceRaised)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.surface)}
        >
          <span className="text-xs font-mono w-5 text-right shrink-0" style={{ color: C.subtle }}>
            {idx + 1}
          </span>
          {item.album.coverUrl ? (
            <Image src={item.album.coverUrl} alt={item.album.title} width={40} height={40}
              className="object-cover shrink-0" style={{ width: 40, height: 40, borderRadius: 4 }} unoptimized />
          ) : (
            <div className="shrink-0" style={{ width: 40, height: 40, backgroundColor: C.surfaceRaised, borderRadius: 4 }} />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: C.text }}>{item.album.title}</div>
            <div className="text-xs font-mono truncate" style={{ color: C.muted }}>{item.album.artist}</div>
          </div>
          {item.album.releaseYear && (
            <span className="text-xs font-mono shrink-0" style={{ color: C.subtle }}>{item.album.releaseYear}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
