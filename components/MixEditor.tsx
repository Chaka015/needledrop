"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const C = {
  surface:       "var(--skin-surface)",
  surfaceRaised: "var(--skin-surface-raised)",
  border:        "var(--skin-border)",
  text:          "var(--skin-text)",
  muted:         "var(--skin-muted)",
  subtle:        "var(--skin-subtle)",
  accent:        "var(--skin-accent)",
  accentHover:   "var(--skin-accent-hover)",
  danger:        "#C0392B",
};

interface CollectionItem {
  id: string;
  album: {
    id: string;
    title: string;
    artist: string;
    coverUrl: string | null;
  };
}

interface MixEditorProps {
  mixId: string;
  username: string;
  isPublic: boolean;
  isPremium?: boolean;
  currentCoverUrl?: string | null;
}

export default function MixEditor({ mixId, username, isPublic: initialIsPublic, isPremium, currentCoverUrl }: MixEditorProps) {
  const router = useRouter();
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState(currentCoverUrl ?? null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/collection")
      .then((r) => r.json())
      .then((data) => setCollection(data.items ?? []));
  }, [open]);

  const filtered = query.trim()
    ? collection.filter(
        (c) =>
          c.album.title.toLowerCase().includes(query.toLowerCase()) ||
          c.album.artist.toLowerCase().includes(query.toLowerCase())
      )
    : collection.slice(0, 12);

  async function handleAdd(item: CollectionItem) {
    setAdding(true);
    const res = await fetch(`/api/mixes/${mixId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionItemId: item.id }),
    });
    setAdding(false);
    if (res.ok) {
      setOpen(false);
      setQuery("");
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this mix?")) return;
    await fetch(`/api/mixes/${mixId}`, { method: "DELETE" });
    router.push(`/${username}`);
  }

  async function togglePublic() {
    const next = !isPublic;
    setIsPublic(next);
    await fetch(`/api/mixes/${mixId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: next }),
    });
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/mixes/${mixId}/cover`, { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      setCoverUrl(data.url);
      router.refresh();
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleRemoveCover() {
    await fetch(`/api/mixes/${mixId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coverUrl: null }),
    });
    setCoverUrl(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-mono uppercase tracking-widest" style={{ color: C.subtle }}>Edit Mix</h3>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="px-4 py-2 text-xs font-mono transition-colors duration-100"
          style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4 }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.accentHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.accent)}>
          + ADD RECORD
        </button>
        <button
          onClick={togglePublic}
          className="px-4 py-2 text-xs font-mono transition-colors duration-100"
          style={{ backgroundColor: C.surfaceRaised, color: C.muted, borderRadius: 4, border: `1px solid ${C.border}` }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
          onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}>
          {isPublic ? "PUBLIC" : "PRIVATE"}
        </button>
        {isPremium && (
          <label
            className="px-4 py-2 text-xs font-mono transition-colors duration-100 cursor-pointer"
            style={{ backgroundColor: C.surfaceRaised, color: uploading ? C.subtle : C.muted, borderRadius: 4, border: `1px solid ${C.border}` }}
            onMouseEnter={(e) => !uploading && ((e.currentTarget as HTMLLabelElement).style.color = C.text)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLLabelElement).style.color = C.muted)}>
            {uploading ? "UPLOADING…" : coverUrl ? "CHANGE COVER" : "◎ UPLOAD COVER"}
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploading} />
          </label>
        )}
        {isPremium && coverUrl && (
          <button
            onClick={handleRemoveCover}
            className="px-4 py-2 text-xs font-mono transition-colors duration-100"
            style={{ backgroundColor: "transparent", color: C.subtle, borderRadius: 4, border: `1px solid ${C.border}` }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.subtle)}>
            REMOVE COVER
          </button>
        )}
        <button
          onClick={handleDelete}
          className="px-4 py-2 text-xs font-mono transition-colors duration-100"
          style={{ backgroundColor: "transparent", color: C.subtle, borderRadius: 4, border: `1px solid ${C.border}` }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.danger; (e.currentTarget as HTMLButtonElement).style.borderColor = C.danger; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.subtle; (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; }}>
          DELETE MIX
        </button>
      </div>
      {isPremium && !coverUrl && (
        <p className="text-xs font-mono" style={{ color: C.subtle }}>◎ Upload a custom cover image for this mix</p>
      )}

      {open && (
        <div className="p-4 space-y-3" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your collection..."
            autoFocus
            className="w-full text-sm px-3 py-2 outline-none transition-colors duration-100"
            style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
            onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
          />
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => handleAdd(item)}
                disabled={adding}
                className="w-full flex items-center gap-3 p-2 text-left transition-colors duration-100"
                style={{ backgroundColor: "transparent", borderRadius: 4, opacity: adding ? 0.5 : 1 }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.surfaceRaised)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                {item.album.coverUrl ? (
                  <Image src={item.album.coverUrl} alt={item.album.title} width={32} height={32}
                    className="object-cover shrink-0" style={{ width: 32, height: 32, borderRadius: 4 }} unoptimized />
                ) : (
                  <div className="shrink-0" style={{ width: 32, height: 32, backgroundColor: C.surfaceRaised, borderRadius: 4 }} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" style={{ color: C.text }}>{item.album.title}</div>
                  <div className="text-xs font-mono truncate" style={{ color: C.muted }}>{item.album.artist}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
