"use client";

import { useState } from "react";
import Image from "next/image";
import SkinPicker from "./SkinPicker";

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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [currentSkin, setCurrentSkin] = useState(user.skin);
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
      body: JSON.stringify({ avatarUrl: avatarUrl || null, bio: bio || null, skin: currentSkin }),
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
      if (data.imported === 0) {
        setSpotifySyncResult(`✓ Up to date — ${data.skipped} already logged`);
      } else {
        setSpotifySyncResult(`✓ Imported ${data.imported} new listen${data.imported !== 1 ? "s" : ""}`);
      }
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

        <form onSubmit={handleSave}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

            {/* Profile Picture */}
            <div className="ms-box" style={{ marginBottom: 16 }}>
              <div className="ms-bar">Profile picture</div>
              <div className="ms-pad">
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
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
            <div className="ms-box" style={{ marginBottom: 16 }}>
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

          </div>

          {error && (
            <p style={{ fontSize: 12, color: "var(--skin-live)", fontFamily: "var(--font-nd-mono)", margin: "0 0 12px" }}>
              {error}
            </p>
          )}
          {saved && (
            <p style={{ fontSize: 12, color: "var(--skin-live)", fontFamily: "var(--font-nd-mono)", margin: "0 0 12px" }}>
              ✓ Preferences saved
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="ms-btn fill"
            style={{ opacity: saving ? 0.4 : 1, width: "100%", marginBottom: 32 }}
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>
        </form>

        {/* Theme */}
        <div className="ms-box" style={{ marginBottom: 16 }}>
          <div className="ms-bar hot">Customize · Theme <span className="cta">your page</span></div>
          <div className="ms-pad">
            <SkinPicker
              currentSkin={currentSkin}
              onSave={(skinId) => setCurrentSkin(skinId)}
            />
          </div>
        </div>

        {/* Streaming */}
        <div className="ms-box" style={{ marginBottom: 16 }}>
          <div className="ms-bar">Streaming · Spotify</div>
          <div className="ms-pad">
            <p style={{ fontSize: 13, color: "var(--skin-muted)", marginBottom: 16, lineHeight: 1.5 }}>
              Connect Spotify to auto-import your recent plays as streaming logs.
            </p>

            {spotifyConnected ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--skin-live)", display: "inline-block" }} />
                  <span style={{ fontSize: 13, fontFamily: "var(--font-nd-mono)", color: "var(--skin-text)" }}>
                    Spotify connected
                  </span>
                  <span style={{ fontSize: 11, color: "var(--skin-subtle)", fontFamily: "var(--font-nd-mono)" }}>
                    ({user.spotifyId})
                  </span>
                </div>
                {lastSyncedAt && (
                  <p style={{ fontSize: 11, color: "var(--skin-subtle)", fontFamily: "var(--font-nd-mono)", marginBottom: 12 }}>
                    Last synced: {new Date(lastSyncedAt).toLocaleString()}
                  </p>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleSpotifySync}
                    disabled={spotifySyncing}
                    className="ms-btn sm"
                    style={{ opacity: spotifySyncing ? 0.4 : 1 }}
                  >
                    {spotifySyncing ? "Syncing…" : "⟳ Sync now"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSpotifyDisconnect}
                    className="ms-btn sm"
                    style={{ color: "var(--skin-subtle)" }}
                  >
                    Disconnect
                  </button>
                </div>
                {spotifySyncResult && (
                  <p style={{ fontSize: 12, color: spotifySyncResult.startsWith("✓") ? "var(--skin-live)" : "var(--skin-hot)", fontFamily: "var(--font-nd-mono)", marginTop: 10 }}>
                    {spotifySyncResult}
                  </p>
                )}
              </div>
            ) : (
              <a
                href="/api/auth/spotify"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px",
                  fontSize: 13, fontWeight: 600, borderRadius: 4, textDecoration: "none",
                  background: "#1DB954", color: "#ffffff",
                }}
              >
                ▶ Connect Spotify
              </a>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
