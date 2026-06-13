"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import NowSpinningModal from "./NowSpinningModal";
import AddModal from "./AddModal";
import NotificationBell from "./NotificationBell";
import MessageBadge from "./MessageBadge";
import SearchDropdown from "./SearchDropdown";

interface NavbarProps {
  username?: string | null;
  avatarUrl?: string | null;
  nowSpinning?: { title: string; artist: string } | null;
  spotifyConnected?: boolean;
}

export default function Navbar({ username, avatarUrl, nowSpinning, spotifyConnected }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showNowSpinning, setShowNowSpinning] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setShowAdd(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setShowAvatar(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearchDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSpotifySync() {
    if (syncing) return;
    setSyncing(true);
    setShowAdd(false);
    await Promise.all([
      fetch("/api/spotify/sync", { method: "POST" }),
      fetch("/api/spotify/now-playing", { method: "POST" }),
    ]);
    setSyncing(false);
    router.refresh();
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setShowSearchDropdown(false);
    }
  }

  // Determine active nav link
  const isActive = (path: string) => {
    if (path === "/activity") return pathname === "/activity";
    if (path === "/market") return pathname === "/market";
    if (path === "/search") return pathname === "/search";
    if (username && path === `/${username}`) return pathname === `/${username}`;
    return false;
  };

  return (
    <>
      <nav className="ms-nav">
        <div className="ms-nav-inner">

          {/* Logo */}
          <Link href={username ? `/${username}` : "/"} className="ms-logo">
            <span className="ms-logo-mark">
              <span className="ms-logo-disc" />
              <span className="ms-logo-arm" />
            </span>
            <span className="ms-wordmark">
              Needle<span className="drop">Drop</span>
            </span>
          </Link>

          {/* Nav links */}
          {username && (
            <div className="ms-nav-links">
              <Link href="/activity" className={"ms-nav-link" + (isActive("/activity") ? " active" : "")}>
                Social
              </Link>
              <Link href={`/${username}`} className={"ms-nav-link" + (isActive(`/${username}`) ? " active" : "")}>
                Profile
              </Link>
              <Link href="/search" className={"ms-nav-link" + (isActive("/search") ? " active" : "")}>
                Dig
              </Link>
              <Link href="/market" className={"ms-nav-link" + (isActive("/market") ? " active" : "")}>
                Market<span className="ms-soon">soon</span>
              </Link>
            </div>
          )}

          {/* Search */}
          {username && (
            <div ref={searchRef} style={{ position: "relative" }}>
              <form onSubmit={handleSearch} className="ms-nav-search">
                <span style={{ fontSize: 13, flexShrink: 0 }}>⚲</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSearchDropdown(true); }}
                  onFocus={() => setShowSearchDropdown(true)}
                  placeholder="Dig — records, artists, fans…"
                />
              </form>
              {showSearchDropdown && (
                <SearchDropdown
                  query={searchQuery}
                  onClose={() => { setShowSearchDropdown(false); setSearchQuery(""); }}
                />
              )}
            </div>
          )}

          {username ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>

              {/* ON AIR / Log a listen CTA */}
              {nowSpinning ? (
                <button
                  onClick={() => setShowNowSpinning(true)}
                  className="ms-onair"
                  style={{ padding: "7px 12px", background: "var(--skin-surface)", border: "2px solid var(--skin-border)", borderRadius: 4, cursor: "pointer", gap: 8 }}
                >
                  <span className="d" />
                  <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {nowSpinning.artist} — {nowSpinning.title}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setShowNowSpinning(true)}
                  className="ms-btn hot sm"
                  style={{ whiteSpace: "nowrap" }}
                >
                  + Log a listen
                </button>
              )}

              {/* Add menu (import/sync) */}
              <div ref={addRef} style={{ position: "relative" }}>
                <button
                  onClick={() => setShowAdd((v) => !v)}
                  className="ms-icon-btn"
                  title="Add / Import"
                  style={{ fontSize: 18 }}
                >
                  +
                </button>
                {showAdd && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 200, zIndex: 50,
                    background: "var(--skin-surface)", border: "2px solid var(--skin-border)",
                    borderRadius: 4, boxShadow: "3px 3px 0 var(--skin-shadow-soft)", overflow: "hidden",
                  }}>
                    <DropItem onClick={() => { setShowAdd(false); setShowNowSpinning(true); }}>▶ Now Spinning</DropItem>
                    <div style={{ height: 1, background: "var(--skin-line)" }} />
                    <div style={{ padding: "8px 16px", fontSize: 13, cursor: "pointer", color: "var(--skin-muted)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--skin-surface-raised)"; (e.currentTarget as HTMLDivElement).style.color = "var(--skin-text)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; (e.currentTarget as HTMLDivElement).style.color = "var(--skin-muted)"; }}>
                      <AddModal trigger="search" />
                    </div>
                    <DropItem onClick={() => { setShowAdd(false); if (username) router.push(`/${username}`); }}>↓ Import from Discogs</DropItem>
                  </div>
                )}
              </div>

              {/* Messages */}
              <MessageBadge />

              {/* Notifications */}
              <NotificationBell />

              {/* Avatar menu */}
              <div ref={avatarRef} style={{ position: "relative" }}>
                <button onClick={() => setShowAvatar((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt={username} width={34} height={34}
                      className="object-cover"
                      style={{ width: 34, height: 34, borderRadius: "50%", border: "2px solid var(--skin-border)", display: "block" }} />
                  ) : (
                    <div className="ms-avatar" style={{ width: 34, height: 34, fontSize: 13 }}>
                      {username[0].toUpperCase()}
                    </div>
                  )}
                </button>

                {showAvatar && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 160, zIndex: 50,
                    background: "var(--skin-surface)", border: "2px solid var(--skin-border)",
                    borderRadius: 4, boxShadow: "3px 3px 0 var(--skin-shadow-soft)", overflow: "hidden",
                  }}>
                    <DropItem onClick={() => setShowAvatar(false)}>
                      <Link href={`/${username}`} style={{ display: "block", color: "inherit" }}>Profile</Link>
                    </DropItem>
                    <DropItem onClick={() => setShowAvatar(false)}>
                      <Link href="/messages" style={{ display: "block", color: "inherit" }}>Notes</Link>
                    </DropItem>
                    <DropItem onClick={() => setShowAvatar(false)}>
                      <Link href={`/${username}/analytics`} style={{ display: "block", color: "inherit" }}>Record Room</Link>
                    </DropItem>
                    <DropItem onClick={() => setShowAvatar(false)}>
                      <Link href="/settings" style={{ display: "block", color: "inherit" }}>Preferences</Link>
                    </DropItem>
                    <div style={{ height: 1, background: "var(--skin-line)" }} />
                    <div style={{ padding: "8px 16px", fontSize: 13, cursor: "pointer", color: "var(--skin-muted)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--skin-surface-raised)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
                      <SignOutButton>Sign out</SignOutButton>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <Link href="/sign-in" className="ms-btn sm">Sign in</Link>
              <Link href="/sign-up" className="ms-btn sm fill">Join</Link>
            </div>
          )}
        </div>
      </nav>

      {showNowSpinning && (
        <NowSpinningModal
          onClose={() => setShowNowSpinning(false)}
          onSuccess={() => { setShowNowSpinning(false); window.location.reload(); }}
        />
      )}
    </>
  );
}

function DropItem({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{ padding: "8px 16px", fontSize: 13, cursor: "pointer", color: "var(--skin-muted)", transition: "background 100ms, color 100ms" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--skin-surface-raised)"; (e.currentTarget as HTMLDivElement).style.color = "var(--skin-text)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; (e.currentTarget as HTMLDivElement).style.color = "var(--skin-muted)"; }}
    >
      {children}
    </div>
  );
}
