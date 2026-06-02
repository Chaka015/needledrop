"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const C = {
  surface: "#3D3834",
  surfaceRaised: "#4A4540",
  border: "#524D48",
  text: "#F7F1E3",
  muted: "#A89F94",
  subtle: "#6B6560",
  accent: "#E67E22",
  accentHover: "#CF711E",
};

interface MixPreview {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  _count: { items: number };
  items: {
    album: { coverUrl: string | null; title: string; artist: string };
  }[];
}

interface MixesListProps {
  mixes: MixPreview[];
  username: string;
  isOwnProfile: boolean;
}

export default function MixesList({ mixes: initialMixes, username, isOwnProfile }: MixesListProps) {
  const router = useRouter();
  const [mixes, setMixes] = useState(initialMixes);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);

    const res = await fetch("/api/mixes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: description || null }),
    });
    const data = await res.json();
    setCreating(false);

    if (res.ok) {
      setShowCreate(false);
      setTitle("");
      setDescription("");
      router.push(`/${username}/mixes/${data.mix.id}`);
    }
  }

  return (
    <div className="space-y-3">
      {mixes.length === 0 && !isOwnProfile && (
        <div className="p-6 text-center text-xs font-mono" style={{ border: `1px dashed ${C.border}`, color: C.subtle }}>
          No mixes yet.
        </div>
      )}

      {mixes.map((mix) => (
        <Link key={mix.id} href={`/${username}/mixes/${mix.id}`}
          className="flex items-center gap-3 p-3 transition-colors duration-100"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.surfaceRaised)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.surface)}>
          {/* Cover collage */}
          <div className="shrink-0 grid grid-cols-2 gap-0.5" style={{ width: 48, height: 48 }}>
            {[0, 1, 2, 3].map((i) => {
              const item = mix.items[i];
              return item?.album.coverUrl ? (
                <Image key={i} src={item.album.coverUrl} alt="" width={23} height={23}
                  className="object-cover" style={{ width: 23, height: 23 }} unoptimized />
              ) : (
                <div key={i} style={{ width: 23, height: 23, backgroundColor: C.surfaceRaised }} />
              );
            })}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: C.text }}>{mix.title}</div>
            <div className="text-xs font-mono" style={{ color: C.subtle }}>{mix._count.items} RECORDS</div>
          </div>
        </Link>
      ))}

      {isOwnProfile && !showCreate && (
        <button onClick={() => setShowCreate(true)}
          className="w-full py-2 text-xs font-mono transition-colors duration-100"
          style={{ backgroundColor: "transparent", border: `1px dashed ${C.border}`, color: C.subtle, borderRadius: 0 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.text; (e.currentTarget as HTMLButtonElement).style.borderColor = C.accent; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.subtle; (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; }}>
          + NEW MIX
        </button>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="p-4 space-y-3" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Mix title..."
            autoFocus
            required
            className="w-full text-sm px-3 py-2 outline-none transition-colors duration-100"
            style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
            onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)..."
            rows={2}
            className="w-full text-sm px-3 py-2 outline-none transition-colors duration-100 resize-none"
            style={{ backgroundColor: C.surfaceRaised, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
            onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={creating || !title.trim()}
              className="px-4 py-2 text-xs font-mono transition-colors duration-100"
              style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4, opacity: creating ? 0.4 : 1 }}
              onMouseEnter={(e) => !creating && (e.currentTarget.style.backgroundColor = C.accentHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.accent)}>
              {creating ? "CREATING..." : "CREATE"}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); setTitle(""); setDescription(""); }}
              className="px-4 py-2 text-xs font-mono transition-colors duration-100"
              style={{ backgroundColor: "transparent", color: C.subtle, borderRadius: 4, border: `1px solid ${C.border}` }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.subtle)}>
              CANCEL
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
