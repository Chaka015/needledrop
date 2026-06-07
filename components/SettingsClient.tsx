"use client";

import { useState } from "react";
import Image from "next/image";
import SkinPicker from "./SkinPicker";
import { DEFAULT_SKIN_ID } from "@/lib/skins";

interface SettingsClientProps {
  user: {
    username: string;
    avatarUrl: string | null;
    bio: string | null;
    skin: string | null;
    spotifyId: string | null;
    spotifyLastSyncedAt: Date | null;
  };
}

export default function SettingsClient({ user }: SettingsClientProps) {
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [selectedSkin, setSelectedSkin] = useState(user.skin ?? DEFAULT_SKIN_ID);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [spotifyConnected, setSpotifyConnected] = useState(!!user.spotifyId);
  const [spotifySyncing, setSpotifySyncing] = useState(false);
  const [spotifySyncResult, setSpotifySyncResult] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(user.spotifyLastSyncedAt ?? null);

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

  async function handleSpotifySync() {
    setSpotifySyncing(true);
    setSpotifySyncResult(null);
    const [syncRes] = await Promise.all([
      fetch("/api/spotify/sync", { method: "POST" }),
      fetch("/api/spotify/now-playing", { method: "POST" }),
    ]);
    const data = await syncRes.json();
    if (syncRes.ok) {
      if (data.syncedAt) setLastSyncedAt(new Date(data.syncedAt));
      setSpotifySyncResult(
        data.imported === 0
          ? `✓ Up to date — ${data.skipped} already logged`
          : `✓ Imported ${data.imported} new listen${data.imported !== 1 ? "s" : ""}`
      );
    } else if (syncRes.status === 401) {
      setSpotifyConnected(false);
      setSpotifySyncResult("Spotify session expired — please reconnect.");
    } else {
      setSpotifySyncResult(`Error: ${data.error ?? "Sync failed"}`);
    }
    setSpotifySyncing(false);
  }

  async function handleSpotifyDisconnect() {
    await fetch("/api/spotify/disconnect", { method: "POST" });
    setSpotifyConnected(false);
    setSpotifySyncResult(null);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--skin-bg)", color: "var(--skin-text)" }}>
      <div className="ms-page" style={{ maxWidth: 640 }}>

        <h1 style={{ fontFamily: "var(--font-nd-serif)", fontSize: 30, fontWeight: 600, margin: "0 0 32px", color: "var(--skin-text)" }}>
          Preferences
        </h1>

        {/* Profile + Theme — all in one form, one save */}
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>

          {/* Profile Picture */}
          <div className="ms-box">
            <div className="ms-bar">Profile picture</div>
            <div className="ms-pad">
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar preview" width={64} height={64}
                    className="object-cover"
                    style={{ width: 64, height: 64, borderRadius: "50%", border: "2px solid var(--skin-border)", flexShrink: 0 }}
                    unoptimized />
                ) : (
                  <div className="ms-avatar" style={{ width: 64, height: 64, fontSize: 24, flexShrink: 0 }}>
                    {user.username[0].toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://i.imgur.com/yourphoto.jpg"
                    style={{
                      width: "100%", fontSize: 13, padding: "8px 12px",
                      background: "var(--skin-surface)", border: "2px solid var(--skin-border)",
                      borderRadius: 4, color: "var(--skin-text)", outline: "none",
                      fontFamily: "inherit",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--skin-accent)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--skin-border)")}
                  />
                  <p style={{ fontSize: 11, color: "var(--skin-subtle)", marginTop: 4, fontFamily: "var(--font-nd-mono)" }}>
                    Paste an image URL — upload to imgur.com for free hosting
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="ms-box">
            <div className="ms-bar">Bio · mood line</div>
            <div className="ms-pad">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people about your taste…"
                rows={3}
                style={{
                  width: "100%", fontSize: 13, padding: "8px 12px", resize: "none",
                  background: "var(--skin-surface)", border: "2px solid var(--skin-border)",
                  borderRadius: 4, color: "var(--skin-text)", outline: "none",
                  fontFamily: "inherit", lineHeight: 1.55,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--skin-accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--skin-border)")}
              />
            </div>
          </div>

          {/* Theme */}
          <div className="ms-box">
            <div className="ms-bar hot">Customize · Theme <span className="cta">your page</span></div>
            <div className="ms-pad">
              <SkinPicker
                currentSkin={selectedSkin}
                onChange={(skinId) => setSelectedSkin(skinId)}
              />
            </div>
          </div>

          {/* Status messages */}
          {error && (
            <p style={{ fontSize: 12, color: "var(--skin-hot)", fontFamily: "var(--font-nd-mono)", margin: 0 }}>
              ✗ {error}
            </p>
          )}
          {saved && (
            <p style={{ fontSize: 12, color: "var(--skin-live)", fontFamily: "var(--font-nd-mono)", margin: 0 }}>
              ✓ Preferences saved
            </p>
          )}

          {/* Single save button for the whole form */}
          <button
            type="submit"
            disabled={saving}
            className="ms-btn hot"
            style={{ width: "100%", opacity: saving ? 0.5 : 1, fontSize: 14, padding: "12px 24px" }}
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>
        </form>


      </div>
    </div>
  );
}
