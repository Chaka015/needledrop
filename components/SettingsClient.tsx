"use client";

import { useState } from "react";
import Image from "next/image";

const C = {
  bg: "#2D2926",
  surface: "#3D3834",
  surfaceRaised: "#4A4540",
  border: "#524D48",
  text: "#F7F1E3",
  muted: "#A89F94",
  subtle: "#6B6560",
  accent: "#E67E22",
  accentHover: "#CF711E",
};

const SKINS = [
  {
    id: "analog-warmth",
    name: "Analog Warmth",
    bg: "#2D2926",
    surface: "#3D3834",
    accent: "#E67E22",
    description: "Espresso & terracotta",
  },
  {
    id: "silver-face",
    name: "Silver Face",
    bg: "#1A1A1A",
    surface: "#2A2A2A",
    accent: "#C0C0C0",
    description: "Brushed aluminum",
  },
  {
    id: "midnight-black",
    name: "Midnight Black",
    bg: "#0D0D0D",
    surface: "#1A1A1A",
    accent: "#FF3E3E",
    description: "Matte black & red",
  },
  {
    id: "wood-grain",
    name: "Wood Grain",
    bg: "#3B2F2F",
    surface: "#4A3B35",
    accent: "#D4A96A",
    description: "Warm oak & cream",
  },
  {
    id: "studio-console",
    name: "Studio Console",
    bg: "#1A2420",
    surface: "#243530",
    accent: "#4CAF82",
    description: "Forest green & cream",
  },
];

interface SettingsClientProps {
  user: {
    username: string;
    avatarUrl: string | null;
    bio: string | null;
    skin: string | null;
  };
}

export default function SettingsClient({ user }: SettingsClientProps) {
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [selectedSkin, setSelectedSkin] = useState(user.skin ?? "analog-warmth");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: avatarUrl || null, bio: bio || null, skin: selectedSkin }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg, color: C.text }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-xl font-bold mb-8" style={{ color: C.text }}>Settings</h1>

        <form onSubmit={handleSave} className="space-y-10">

          {/* Profile Picture */}
          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: C.subtle }}>Profile Picture</h2>
            <div className="flex items-center gap-4 mb-3">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Avatar preview" width={64} height={64}
                  className="object-cover" style={{ width: 64, height: 64, borderRadius: "50%", border: `2px solid ${C.border}` }}
                  unoptimized />
              ) : (
                <div className="flex items-center justify-center text-2xl font-bold"
                  style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: C.surface, color: C.subtle, border: `2px solid ${C.border}` }}>
                  {user.username[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://i.imgur.com/yourphoto.jpg"
                  className="w-full text-sm px-3 py-2 outline-none transition-colors duration-100"
                  style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = C.border)} />
                <p className="text-xs font-mono mt-1" style={{ color: C.subtle }}>
                  Paste an image URL — upload to imgur.com for free hosting
                </p>
              </div>
            </div>
          </section>

          {/* Bio */}
          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: C.subtle }}>Bio</h2>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people about your taste..."
              rows={3}
              className="w-full text-sm px-3 py-2 outline-none transition-colors duration-100 resize-none"
              style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 0 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
              onBlur={(e) => (e.currentTarget.style.borderColor = C.border)} />
          </section>

          {/* Colour Variants */}
          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: C.subtle }}>Profile Skin</h2>
            <div className="grid grid-cols-1 gap-3">
              {SKINS.map((skin) => (
                <button
                  key={skin.id}
                  type="button"
                  onClick={() => setSelectedSkin(skin.id)}
                  className="flex items-center gap-4 p-4 text-left transition-colors duration-100"
                  style={{
                    backgroundColor: selectedSkin === skin.id ? C.surfaceRaised : C.surface,
                    border: `1px solid ${selectedSkin === skin.id ? C.accent : C.border}`,
                    borderRadius: 0,
                  }}
                >
                  {/* Skin preview */}
                  <div className="flex gap-1 shrink-0">
                    <div style={{ width: 32, height: 32, backgroundColor: skin.bg, border: `1px solid ${C.border}` }} />
                    <div style={{ width: 32, height: 32, backgroundColor: skin.surface, border: `1px solid ${C.border}` }} />
                    <div style={{ width: 32, height: 32, backgroundColor: skin.accent, border: `1px solid ${C.border}` }} />
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: C.text }}>{skin.name}</div>
                    <div className="text-xs font-mono" style={{ color: C.muted }}>{skin.description}</div>
                  </div>
                  {selectedSkin === skin.id && (
                    <span className="ml-auto text-xs font-mono" style={{ color: C.accent }}>✓ ACTIVE</span>
                  )}
                </button>
              ))}
            </div>
          </section>

          {error && <p className="text-xs font-mono" style={{ color: "#C0392B" }}>{error}</p>}
          {saved && <p className="text-xs font-mono" style={{ color: "#5E9E6E" }}>✓ Settings saved</p>}

          <button type="submit" disabled={saving}
            className="px-8 py-3 text-sm font-medium transition-colors duration-100"
            style={{ backgroundColor: C.accent, color: C.text, borderRadius: 4, opacity: saving ? 0.4 : 1 }}
            onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = C.accentHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.accent)}>
            {saving ? "SAVING..." : "SAVE SETTINGS"}
          </button>
        </form>
      </div>
    </div>
  );
}
