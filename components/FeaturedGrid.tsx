"use client";

import { useState } from "react";
import Image from "next/image";

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
    title: string;
    artist: string;
    coverUrl: string | null;
    discogsId?: string;
  };
}

function AlbumTile({
  item,
  size,
  isOwnProfile,
  isHovered,
  isRemoving,
  onHover,
  onUnfeature,
}: {
  item: FeaturedItem;
  size: "hero" | "grid";
  isOwnProfile: boolean;
  isHovered: boolean;
  isRemoving: boolean;
  onHover: (id: string | null) => void;
  onUnfeature: (id: string) => void;
}) {
  return (
    <div
      className="relative"
      style={{ aspectRatio: "1" }}
      onMouseEnter={() => isOwnProfile && onHover(item.id)}
      onMouseLeave={() => onHover(null)}
    >
      {item.album.coverUrl ? (
        <Image
          src={item.album.coverUrl}
          alt={`${item.album.title} by ${item.album.artist}`}
          width={size === "hero" ? 240 : 120}
          height={size === "hero" ? 240 : 120}
          className="object-cover"
          style={{ width: "100%", height: "100%", borderRadius: 4 }}
          unoptimized
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs"
          style={{ backgroundColor: C.surface, borderRadius: 4, color: C.subtle }}>
          No art
        </div>
      )}

      {/* Hover overlay */}
      {isOwnProfile && isHovered && (
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

  const [hero, ...rest] = visible;

  const tileProps = (item: FeaturedItem, size: "hero" | "grid") => ({
    item,
    size,
    isOwnProfile,
    isHovered: hoverId === item.id,
    isRemoving: removing === item.id,
    onHover: setHoverId,
    onUnfeature: handleUnfeature,
  });

  return (
    <div className="space-y-1">
      {/* Hero — full width spotlight */}
      <AlbumTile {...tileProps(hero, "hero")} />

      {/* 2×2 grid of remaining up to 4 */}
      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-1">
          {rest.slice(0, 4).map((item) => (
            <AlbumTile key={item.id} {...tileProps(item, "grid")} />
          ))}
        </div>
      )}
    </div>
  );
}
