"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const C = {
  border:  "var(--skin-border)",
  text:    "var(--skin-text)",
  accent:  "var(--skin-accent)",
  subtle:  "var(--skin-subtle)",
  surface: "var(--skin-surface)",
};

interface FeaturedItem {
  id: string;
  album: {
    discogsId: string;
    title: string;
    artist: string;
    coverUrl: string | null;
  };
}

function Tile({
  item,
  isOwnProfile,
  hoverId,
  removing,
  onHover,
  onUnfeature,
}: {
  item: FeaturedItem;
  isOwnProfile: boolean;
  hoverId: string | null;
  removing: string | null;
  onHover: (id: string | null) => void;
  onUnfeature: (id: string) => void;
}) {
  const hovered = hoverId === item.id;
  const isRemoving = removing === item.id;
  return (
    <div
      className="relative"
      style={{ aspectRatio: "1" }}
      onMouseEnter={() => isOwnProfile && onHover(item.id)}
      onMouseLeave={() => onHover(null)}
    >
      <Link href={`/album/${encodeURIComponent(item.album.discogsId)}`} className="block w-full h-full" title={`${item.album.title} — ${item.album.artist}`}>
        {item.album.coverUrl ? (
          <Image
            src={item.album.coverUrl}
            alt={`${item.album.title} by ${item.album.artist}`}
            fill
            className="object-cover"
            style={{ borderRadius: 4 }}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs"
            style={{ backgroundColor: C.surface, borderRadius: 4, color: C.subtle }}>
            No art
          </div>
        )}
      </Link>
      {isOwnProfile && hovered && (
        <div className="absolute inset-0 flex items-start justify-end p-1"
          style={{ borderRadius: 4, background: "rgba(0,0,0,0.4)" }}>
          <button
            onClick={() => onUnfeature(item.id)}
            disabled={isRemoving}
            className="flex items-center justify-center w-6 h-6 text-sm transition-colors duration-100"
            style={{ backgroundColor: C.accent, borderRadius: 4, color: C.text, opacity: isRemoving ? 0.4 : 1 }}
            title="Remove from featured"
          >
            ★
          </button>
        </div>
      )}
    </div>
  );
}

export default function FeaturedGrid({ items, isOwnProfile }: { items: FeaturedItem[]; isOwnProfile: boolean }) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  async function handleUnfeature(id: string) {
    setRemoving(id);
    const res = await fetch("/api/collection/feature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionId: id }),
    });
    if (res.ok) setRemoved((prev) => new Set(prev).add(id));
    setRemoving(null);
  }

  const visible = items.filter((i) => !removed.has(i.id));

  if (visible.length === 0) {
    return (
      <div className="p-4 text-center text-xs font-mono"
        style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
        {isOwnProfile ? "★ star records to feature them" : "No featured albums yet."}
      </div>
    );
  }

  const tileProps = (item: FeaturedItem) => ({
    item, isOwnProfile, hoverId, removing,
    onHover: setHoverId,
    onUnfeature: handleUnfeature,
  });

  // 5 items: hero spotlight above 2×2 grid
  if (visible.length === 5) {
    const [hero, ...grid] = visible;
    return (
      <div className="space-y-1">
        <Tile {...tileProps(hero)} />
        <div className="grid grid-cols-2 gap-1">
          {grid.map((item) => <Tile key={item.id} {...tileProps(item)} />)}
        </div>
      </div>
    );
  }

  // 4 items: clean 2×2 grid
  if (visible.length === 4) {
    return (
      <div className="grid grid-cols-2 gap-1">
        {visible.map((item) => <Tile key={item.id} {...tileProps(item)} />)}
      </div>
    );
  }

  // 3 items: 1 full-width + 2-col row
  if (visible.length === 3) {
    return (
      <div className="space-y-1">
        <Tile {...tileProps(visible[0])} />
        <div className="grid grid-cols-2 gap-1">
          {visible.slice(1).map((item) => <Tile key={item.id} {...tileProps(item)} />)}
        </div>
      </div>
    );
  }

  // 1–2 items: 2-col grid (1 item fills one cell, 2 items fill both)
  return (
    <div className={`grid gap-1 ${visible.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
      {visible.map((item) => <Tile key={item.id} {...tileProps(item)} />)}
    </div>
  );
}
