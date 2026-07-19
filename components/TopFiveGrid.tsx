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

interface TopFiveItem {
  id: string;
  album: {
    discogsId: string;
    title: string;
    artist: string;
    coverUrl: string | null;
  };
}

export default function TopFiveGrid({ items, isOwnProfile }: { items: TopFiveItem[]; isOwnProfile: boolean }) {
  const [order, setOrder] = useState<TopFiveItem[]>(items);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  async function handleUnfeature(id: string) {
    setRemoving(id);
    const res = await fetch("/api/collection/feature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionId: id }),
    });
    if (res.ok) setOrder((prev) => prev.filter((i) => i.id !== id));
    setRemoving(null);
  }

  function persistOrder(next: TopFiveItem[]) {
    fetch("/api/collection/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionIds: next.map((i) => i.id) }),
    });
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    setOrder((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((i) => i.id === dragId);
      const toIdx = next.findIndex((i) => i.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      persistOrder(next);
      return next;
    });
    setDragId(null);
    setDragOverId(null);
  }

  if (order.length === 0) {
    return (
      <div className="ms-pad">
        <div className="p-4 text-center text-xs font-mono"
          style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
          {isOwnProfile ? "★ star records to feature them" : "No featured albums yet."}
        </div>
      </div>
    );
  }

  return (
    <div className="ms-top8">
      {order.map((item, i) => {
        const hovered = hoverId === item.id;
        const isRemoving = removing === item.id;
        const isDragOver = isOwnProfile && dragOverId === item.id && dragId !== item.id;
        return (
          <div
            className="cell"
            key={item.id}
            draggable={isOwnProfile}
            onMouseEnter={() => isOwnProfile && setHoverId(item.id)}
            onMouseLeave={() => setHoverId(null)}
            onDragStart={() => setDragId(item.id)}
            onDragOver={(e) => {
              if (!isOwnProfile) return;
              e.preventDefault();
              setDragOverId(item.id);
            }}
            onDragLeave={() => setDragOverId((prev) => (prev === item.id ? null : prev))}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(item.id);
            }}
            onDragEnd={() => {
              setDragId(null);
              setDragOverId(null);
            }}
            style={{
              cursor: isOwnProfile ? "grab" : undefined,
              opacity: dragId === item.id ? 0.4 : 1,
              outline: isDragOver ? `2px solid ${C.accent}` : undefined,
              outlineOffset: isDragOver ? -2 : undefined,
            }}
          >
            <span className="ms-ribbon">{i + 1}</span>
            <Link href={`/album/${encodeURIComponent(item.album.discogsId)}`}>
              {item.album.coverUrl ? (
                <Image src={item.album.coverUrl} alt={item.album.title} width={118} height={118}
                  className="object-cover aspect-square w-full"
                  style={{ borderRadius: 4, border: `2px solid var(--skin-border)`, display: "block" }} unoptimized />
              ) : (
                <div style={{ aspectRatio: "1", background: C.surface, borderRadius: 4, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 11, color: C.subtle, fontFamily: "var(--font-nd-mono)" }}>No art</span>
                </div>
              )}
            </Link>
            {isOwnProfile && hovered && (
              <div className="absolute inset-0 flex items-start justify-end p-1"
                style={{ borderRadius: 4, background: "rgba(0,0,0,0.4)", pointerEvents: "none" }}>
                <button
                  onClick={() => handleUnfeature(item.id)}
                  disabled={isRemoving}
                  className="flex items-center justify-center w-6 h-6 text-sm transition-colors duration-100"
                  style={{ backgroundColor: C.accent, borderRadius: 4, color: C.text, opacity: isRemoving ? 0.4 : 1, pointerEvents: "auto" }}
                  title="Remove from Top 5"
                >
                  ★
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
